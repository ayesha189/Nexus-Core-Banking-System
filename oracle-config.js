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

// Set output format
oracledb.outFormat = oracledb.OUT_FORMAT_ARRAY;

const dbConfig = {
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'system',
  connectString: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 1521}/${process.env.DB_SERVICE_NAME || 'XE'}`,
};

// Create connection pool
let pool = null;

export async function initializePool() {
  try {
    if (!pool) {
      pool = await oracledb.createPool({
        ...dbConfig,
        max: 10,
        min: 2,
        increment: 1,
        timeout: 60,
        stmtCacheSize: 21,
      });
      console.log('✅ Oracle connection pool created successfully');
    }
    return pool;
  } catch (error) {
    console.error('❌ Error creating Oracle connection pool:', error.message);
    throw error;
  }
}

export async function getConnection() {
  if (!pool) {
    await initializePool();
  }
  return await pool.getConnection();
}

export async function closePool() {
  if (pool) {
    try {
      await pool.close(0);
      console.log('✅ Oracle connection pool closed');
    } catch (error) {
      console.error('❌ Error closing pool:', error.message);
    }
  }
}

export default { initializePool, getConnection, closePool };
