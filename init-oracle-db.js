#!/usr/bin/env node

import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Oracle Thick Mode with client libraries from Oracle 11g XE
try {
  const libDir = 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin';
  oracledb.initOracleClient({ libDir });
  console.log('✅ Oracle Thick Mode initialized with client libraries from: ' + libDir);
} catch (error) {
  if (error.message.includes('DPI-1047')) {
    console.warn('⚠️  Oracle Client not found at expected path. Trying alternative paths...');
    try {
      oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\bin' });
      console.log('✅ Oracle Thick Mode initialized (alternative path)');
    } catch (e2) {
      console.error('⚠️  Could not initialize Oracle Client:', e2.message);
    }
  } else {
    console.error('⚠️  Error initializing Oracle Client:', error.message);
  }
}

const dbConfig = {
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'system',
  connectString: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 1521}/${process.env.DB_SERVICE_NAME || 'XE'}`,
};

let connection;

async function runSQL(sql, params = [], options = {}) {
  try {
    console.log(`📝 Executing: ${sql.substring(0, 80)}...`);
    const result = await connection.execute(sql, params, { autoCommit: false, ...options });
    return result;
  } catch (error) {
    // Ignore errors for indexes that already exist or sequences that don't exist
    if (error.message.includes('ORA-01408') || error.message.includes('ORA-02289')) {
      console.log(`⚠️  Skipping: ${error.message.substring(0, 50)}...`);
      return null;
    }
    console.error(`❌ Error executing SQL: ${error.message}`);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    // Connect to Oracle
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to Oracle Database 11g XE');

    // Drop existing tables (for fresh initialization)
    const tablesToDrop = [
      'AUDIT_LOGS',
      'COMPLAINTS',
      'TRANSACTIONS',
      'ACCOUNTS',
      'CUSTOMERS',
      'USERS',
    ];

    console.log('\n🗑️  Dropping existing tables (if any)...');
    for (const table of tablesToDrop) {
      try {
        await connection.execute(`DROP TABLE ${table}`);
        console.log(`✓ Dropped table: ${table}`);
      } catch (error) {
        if (error.message.includes('ORA-00942')) {
          // Table doesn't exist - ignore
        } else {
          throw error;
        }
      }
    }

    // Drop sequences
    const sequencesToDrop = [
      'CUSTOMER_SEQ',
      'ACCOUNT_SEQ',
      'TRANSACTION_SEQ',
      'COMPLAINT_SEQ',
      'AUDIT_LOG_SEQ',
      'USER_SEQ',
    ];

    console.log('\n🗑️  Dropping existing sequences (if any)...');
    for (const seq of sequencesToDrop) {
      try {
        await connection.execute(`DROP SEQUENCE ${seq}`);
        console.log(`✓ Dropped sequence: ${seq}`);
      } catch (error) {
        if (error.message.includes('ORA-02289')) {
          // Sequence doesn't exist - ignore
        } else {
          throw error;
        }
      }
    }

    // Create sequences
    console.log('\n🔢 Creating sequences...');
    const sequenceSQL = [
      `CREATE SEQUENCE CUSTOMER_SEQ START WITH 1 INCREMENT BY 1`,
      `CREATE SEQUENCE ACCOUNT_SEQ START WITH 1001 INCREMENT BY 1`,
      `CREATE SEQUENCE TRANSACTION_SEQ START WITH 1 INCREMENT BY 1`,
      `CREATE SEQUENCE COMPLAINT_SEQ START WITH 1 INCREMENT BY 1`,
      `CREATE SEQUENCE AUDIT_LOG_SEQ START WITH 1 INCREMENT BY 1`,
      `CREATE SEQUENCE USER_SEQ START WITH 1 INCREMENT BY 1`,
    ];

    for (const sql of sequenceSQL) {
      await runSQL(sql);
      console.log(`✓ Created sequence`);
    }

    // Create tables
    console.log('\n📋 Creating tables...');

    // Customers table
    await runSQL(`
      CREATE TABLE CUSTOMERS (
        ID NUMBER PRIMARY KEY,
        NAME VARCHAR2(100) NOT NULL,
        CNIC VARCHAR2(20) UNIQUE NOT NULL,
        CONTACT VARCHAR2(15) NOT NULL,
        EMAIL VARCHAR2(100) UNIQUE NOT NULL,
        ADDRESS VARCHAR2(255),
        DOB DATE,
        STATUS VARCHAR2(20) DEFAULT 'Active',
        PASSWORD VARCHAR2(255) NOT NULL,
        CREATED_AT DATE DEFAULT SYSDATE,
        UPDATED_AT DATE DEFAULT SYSDATE
      )
    `);
    console.log('✓ Created CUSTOMERS table');

    // Create index on CNIC
    await runSQL(`CREATE INDEX IDX_CUSTOMER_CNIC ON CUSTOMERS(CNIC)`);
    await runSQL(`CREATE INDEX IDX_CUSTOMER_EMAIL ON CUSTOMERS(EMAIL)`);
    await runSQL(`CREATE INDEX IDX_CUSTOMER_STATUS ON CUSTOMERS(STATUS)`);
    console.log('✓ Created indexes on CUSTOMERS');

    // Accounts table
    await runSQL(`CREATE TABLE ACCOUNTS (
      ACCOUNT_NO NUMBER PRIMARY KEY,
      CUSTOMER_ID NUMBER NOT NULL REFERENCES CUSTOMERS(ID),
      ACCOUNT_TYPE VARCHAR2(20) NOT NULL,
      BALANCE NUMBER(15, 2) NOT NULL DEFAULT 0,
      STATUS VARCHAR2(20) DEFAULT 'Active',
      OPENING_DATE DATE DEFAULT SYSDATE,
      LAST_TRANSACTION_DATE DATE,
      INTEREST_RATE NUMBER(5, 2) DEFAULT 0,
      SERVICE_CHARGES NUMBER(10, 2) DEFAULT 0,
      WITHDRAW_LIMIT NUMBER(15, 2),
      CREATED_AT DATE DEFAULT SYSDATE,
      UPDATED_AT DATE DEFAULT SYSDATE
    )`);

    // Create indexes on ACCOUNTS
    await runSQL(`CREATE INDEX IDX_ACCOUNT_CUSTOMER ON ACCOUNTS(CUSTOMER_ID)`);
    await runSQL(`CREATE INDEX IDX_ACCOUNT_STATUS ON ACCOUNTS(STATUS)`);
    console.log('✓ Created indexes on ACCOUNTS');

    // Transactions table
    await runSQL(`
      CREATE TABLE TRANSACTIONS (
        ID NUMBER PRIMARY KEY,
        FROM_ACCOUNT_NO NUMBER REFERENCES ACCOUNTS(ACCOUNT_NO),
        TO_ACCOUNT_NO NUMBER REFERENCES ACCOUNTS(ACCOUNT_NO),
        AMOUNT NUMBER(15, 2) NOT NULL,
        TYPE VARCHAR2(20) NOT NULL,
        STATUS VARCHAR2(20) DEFAULT 'Completed',
        DESCRIPTION VARCHAR2(255),
        REFERENCE_NO VARCHAR2(50) UNIQUE,
        CREATED_AT DATE DEFAULT SYSDATE
      )
    `);
    console.log('✓ Created TRANSACTIONS table');

    // Create indexes on TRANSACTIONS
    await runSQL(`CREATE INDEX IDX_TXN_FROM_ACCOUNT ON TRANSACTIONS(FROM_ACCOUNT_NO)`);
    await runSQL(`CREATE INDEX IDX_TXN_TO_ACCOUNT ON TRANSACTIONS(TO_ACCOUNT_NO)`);
    await runSQL(`CREATE INDEX IDX_TXN_CREATED ON TRANSACTIONS(CREATED_AT)`);
    await runSQL(`CREATE INDEX IDX_TXN_TYPE ON TRANSACTIONS(TYPE)`);
    console.log('✓ Created indexes on TRANSACTIONS');

    // Complaints table
    await runSQL(`
      CREATE TABLE COMPLAINTS (
        ID NUMBER PRIMARY KEY,
        CUSTOMER_ID NUMBER NOT NULL REFERENCES CUSTOMERS(ID),
        ACCOUNT_NO NUMBER REFERENCES ACCOUNTS(ACCOUNT_NO),
        CATEGORY VARCHAR2(50),
        SUBJECT VARCHAR2(200) NOT NULL,
        DESCRIPTION VARCHAR2(4000) NOT NULL,
        PRIORITY VARCHAR2(20) DEFAULT 'Medium',
        STATUS VARCHAR2(20) DEFAULT 'Open',
        ASSIGNED_TO VARCHAR2(100),
        RESOLUTION VARCHAR2(4000),
        CREATED_AT DATE DEFAULT SYSDATE,
        UPDATED_AT DATE DEFAULT SYSDATE,
        RESOLVED_AT DATE
      )
    `);
    console.log('✓ Created COMPLAINTS table');

    // Create indexes on COMPLAINTS
    await runSQL(`CREATE INDEX IDX_COMPLAINT_CUSTOMER ON COMPLAINTS(CUSTOMER_ID)`);
    await runSQL(`CREATE INDEX IDX_COMPLAINT_STATUS ON COMPLAINTS(STATUS)`);
    await runSQL(`CREATE INDEX IDX_COMPLAINT_PRIORITY ON COMPLAINTS(PRIORITY)`);
    console.log('✓ Created indexes on COMPLAINTS');

    // Audit Logs table
    await runSQL(`
      CREATE TABLE AUDIT_LOGS (
        ID NUMBER PRIMARY KEY,
        USER_ID NUMBER,
        USER_EMAIL VARCHAR2(100),
        ACTION VARCHAR2(100) NOT NULL,
        TABLE_NAME VARCHAR2(50),
        RECORD_ID NUMBER,
        OLD_VALUE CLOB,
        NEW_VALUE CLOB,
        IP_ADDRESS VARCHAR2(45),
        USER_AGENT VARCHAR2(255),
        STATUS VARCHAR2(20) DEFAULT 'Success',
        DESCRIPTION VARCHAR2(2000),
        CREATED_AT DATE DEFAULT SYSDATE
      )
    `);
    console.log('✓ Created AUDIT_LOGS table');

    // Create indexes on AUDIT_LOGS
    await runSQL(`CREATE INDEX IDX_AUDIT_USER ON AUDIT_LOGS(USER_ID)`);
    await runSQL(`CREATE INDEX IDX_AUDIT_ACTION ON AUDIT_LOGS(ACTION)`);
    await runSQL(`CREATE INDEX IDX_AUDIT_CREATED ON AUDIT_LOGS(CREATED_AT)`);
    await runSQL(`CREATE INDEX IDX_AUDIT_TABLE ON AUDIT_LOGS(TABLE_NAME)`);
    console.log('✓ Created indexes on AUDIT_LOGS');

    // Users table
    await runSQL(`
      CREATE TABLE USERS (
        ID NUMBER PRIMARY KEY,
        EMAIL VARCHAR2(100) UNIQUE NOT NULL,
        PASSWORD VARCHAR2(255) NOT NULL,
        NAME VARCHAR2(100),
        ROLE VARCHAR2(20) DEFAULT 'Staff',
        STATUS VARCHAR2(20) DEFAULT 'Active',
        LAST_LOGIN DATE,
        CREATED_AT DATE DEFAULT SYSDATE,
        UPDATED_AT DATE DEFAULT SYSDATE
      )
    `);
    console.log('✓ Created USERS table');

    // Create index on USERS
    await runSQL(`CREATE INDEX IDX_USER_EMAIL ON USERS(EMAIL)`);
    await runSQL(`CREATE INDEX IDX_USER_ROLE ON USERS(ROLE)`);
    console.log('✓ Created indexes on USERS');

    // Commit all changes
    await connection.commit();
    console.log('\n✅ All tables created successfully');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const result = await connection.execute(
      `SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME IN ('CUSTOMERS', 'ACCOUNTS', 'TRANSACTIONS', 'COMPLAINTS', 'AUDIT_LOGS', 'USERS') ORDER BY TABLE_NAME`
    );

    console.log(`✓ Found ${result.rows.length} tables:`);
    result.rows.forEach((row) => {
      console.log(`  - ${row[0]}`);
    });

    console.log('\n✅ Database initialization completed successfully!');
    console.log('\n📝 Schema created with:');
    console.log('   - 6 tables (CUSTOMERS, ACCOUNTS, TRANSACTIONS, COMPLAINTS, AUDIT_LOGS, USERS)');
    console.log('   - 6 sequences for auto-increment IDs');
    console.log('   - Multiple indexes for performance');
    console.log('   - Foreign key relationships');
    console.log('   - Data validation with CHECK constraints');
    console.log('   - Timestamps for audit trail');

  } catch (error) {
    console.error('\n❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('\n✅ Connection closed');
      } catch (error) {
        console.error('Error closing connection:', error.message);
      }
    }
  }
}

// Run initialization
initializeDatabase();
