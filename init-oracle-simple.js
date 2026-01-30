#!/usr/bin/env node

import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Oracle Thick Mode
try {
    const libDir = 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin';
    oracledb.initOracleClient({ libDir });
    console.log('✅ Oracle Thick Mode initialized');
} catch (error) {
    console.error('⚠️  Oracle Client init error:', error.message);
}

const dbConfig = {
    user: process.env.DB_USER || 'system',
    password: process.env.DB_PASSWORD || 'system',
    connectString: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 1521}/${process.env.DB_SERVICE_NAME || 'XE'}`,
};

async function initializeDatabase() {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('✅ Connected to Oracle Database 11g XE\n');

        // Drop existing tables
        console.log('🗑️  Dropping existing tables...');
        const tables = ['AUDIT_LOGS', 'COMPLAINTS', 'TRANSACTIONS', 'ACCOUNTS', 'CUSTOMERS', 'USERS'];
        for (const table of tables) {
            try {
                await connection.execute(`DROP TABLE ${table}`);
                console.log(`✓ Dropped: ${table}`);
            } catch (e) {
                if (!e.message.includes('ORA-00942')) throw e;
            }
        }

        // Drop sequences
        console.log('\n🗑️  Dropping existing sequences...');
        const sequences = ['CUSTOMER_SEQ', 'ACCOUNT_SEQ', 'TRANSACTION_SEQ', 'COMPLAINT_SEQ', 'AUDIT_LOG_SEQ', 'USER_SEQ'];
        for (const seq of sequences) {
            try {
                await connection.execute(`DROP SEQUENCE ${seq}`);
                console.log(`✓ Dropped: ${seq}`);
            } catch (e) {
                if (!e.message.includes('ORA-02289')) throw e;
            }
        }

        // Create sequences
        console.log('\n🔢 Creating sequences...');
        const sequenceSQL = [
            'CREATE SEQUENCE CUSTOMER_SEQ START WITH 1 INCREMENT BY 1',
            'CREATE SEQUENCE ACCOUNT_SEQ START WITH 1001 INCREMENT BY 1',
            'CREATE SEQUENCE TRANSACTION_SEQ START WITH 1 INCREMENT BY 1',
            'CREATE SEQUENCE COMPLAINT_SEQ START WITH 1 INCREMENT BY 1',
            'CREATE SEQUENCE AUDIT_LOG_SEQ START WITH 1 INCREMENT BY 1',
            'CREATE SEQUENCE USER_SEQ START WITH 1 INCREMENT BY 1',
        ];

        for (const sql of sequenceSQL) {
            await connection.execute(sql);
            console.log(`✓ ${sql.split(' ')[2]}`);
        }

        // Create CUSTOMERS table
        console.log('📋 Creating CUSTOMERS table...');
        await connection.execute(`
      CREATE TABLE CUSTOMERS (
        ID NUMBER PRIMARY KEY,
        NAME VARCHAR2(100) NOT NULL,
        CNIC VARCHAR2(20) UNIQUE NOT NULL,
        CONTACT VARCHAR2(15),
        EMAIL VARCHAR2(100) UNIQUE NOT NULL,
        ADDRESS VARCHAR2(255),
        DOB DATE,
        STATUS VARCHAR2(20) DEFAULT 'Active',
        PASSWORD VARCHAR2(255) NOT NULL,
        CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP,
        UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
      )
    `);
        console.log('✓ CUSTOMERS table created');

        // Create ACCOUNTS table
        console.log('📋 Creating ACCOUNTS table...');
        await connection.execute(`
      CREATE TABLE ACCOUNTS (
        ACCOUNT_NO NUMBER PRIMARY KEY,
        CUSTOMER_ID NUMBER NOT NULL REFERENCES CUSTOMERS(ID),
        ACCOUNT_TYPE VARCHAR2(20) NOT NULL,
        BALANCE NUMBER(15, 2) DEFAULT 0,
        STATUS VARCHAR2(20) DEFAULT 'Active',
        OPENING_DATE DATE DEFAULT SYSDATE,
        LAST_TRANSACTION_DATE DATE,
        INTEREST_RATE NUMBER(5, 2) DEFAULT 0,
        SERVICE_CHARGES NUMBER(10, 2) DEFAULT 0,
        WITHDRAW_LIMIT NUMBER(15, 2),
        CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP,
        UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
      )
    `);
        console.log('✓ ACCOUNTS table created');

        // Create TRANSACTIONS table
        console.log('📋 Creating TRANSACTIONS table...');
        await connection.execute(`
      CREATE TABLE TRANSACTIONS (
        ID NUMBER PRIMARY KEY,
        FROM_ACCOUNT_NO NUMBER REFERENCES ACCOUNTS(ACCOUNT_NO),
        TO_ACCOUNT_NO NUMBER REFERENCES ACCOUNTS(ACCOUNT_NO),
        AMOUNT NUMBER(15, 2) NOT NULL,
        TYPE VARCHAR2(20) NOT NULL,
        STATUS VARCHAR2(20) DEFAULT 'Completed',
        DESCRIPTION VARCHAR2(255),
        REFERENCE_NO VARCHAR2(50) UNIQUE,
        CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
      )
    `);
        console.log('✓ TRANSACTIONS table created');

        // Create COMPLAINTS table
        console.log('📋 Creating COMPLAINTS table...');
        await connection.execute(`
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
        CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP,
        UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP,
        RESOLVED_AT TIMESTAMP
      )
    `);
        console.log('✓ COMPLAINTS table created');

        // Create AUDIT_LOGS table
        console.log('📋 Creating AUDIT_LOGS table...');
        await connection.execute(`
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
        CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
      )
    `);
        console.log('✓ AUDIT_LOGS table created');

        // Create USERS table
        console.log('📋 Creating USERS table...');
        await connection.execute(`
      CREATE TABLE USERS (
        ID NUMBER PRIMARY KEY,
        EMAIL VARCHAR2(100) UNIQUE NOT NULL,
        PASSWORD VARCHAR2(255) NOT NULL,
        NAME VARCHAR2(100),
        ROLE VARCHAR2(20) DEFAULT 'Staff',
        STATUS VARCHAR2(20) DEFAULT 'Active',
        LAST_LOGIN TIMESTAMP,
        CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP,
        UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
      )
    `);
        console.log('✓ USERS table created');

        // Create indexes
        console.log('\n📊 Creating indexes...');
        const indexes = [
            'CREATE INDEX IDX_CUSTOMER_CNIC ON CUSTOMERS(CNIC)',
            'CREATE INDEX IDX_CUSTOMER_EMAIL ON CUSTOMERS(EMAIL)',
            'CREATE INDEX IDX_ACCOUNT_CUSTOMER ON ACCOUNTS(CUSTOMER_ID)',
            'CREATE INDEX IDX_TXN_FROM_ACCOUNT ON TRANSACTIONS(FROM_ACCOUNT_NO)',
            'CREATE INDEX IDX_TXN_TO_ACCOUNT ON TRANSACTIONS(TO_ACCOUNT_NO)',
            'CREATE INDEX IDX_COMPLAINT_CUSTOMER ON COMPLAINTS(CUSTOMER_ID)',
            'CREATE INDEX IDX_AUDIT_USER ON AUDIT_LOGS(USER_ID)',
            'CREATE INDEX IDX_AUDIT_ACTION ON AUDIT_LOGS(ACTION)',
            'CREATE INDEX IDX_USER_EMAIL ON USERS(EMAIL)',
        ];

        for (const idx of indexes) {
            try {
                await connection.execute(idx);
            } catch (e) {
                if (!e.message.includes('ORA-01408')) throw e;
            }
        }
        console.log('✓ Indexes created');

        // Commit changes
        await connection.commit();
        console.log('\n✅ Database initialization completed successfully!');
        console.log('\n📊 Schema Summary:');
        console.log('   - 6 tables created (CUSTOMERS, ACCOUNTS, TRANSACTIONS, COMPLAINTS, AUDIT_LOGS, USERS)');
        console.log('   - 6 sequences created for auto-increment IDs');
        console.log('   - Multiple indexes for performance');
        console.log('   - Relationships enforced via FOREIGN KEYs');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error('Error closing connection:', e.message);
            }
        }
    }
}

initializeDatabase();
