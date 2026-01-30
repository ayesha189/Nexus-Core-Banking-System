import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });

        // Connect as SYSTEM first
        const systemConn = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('\n========== CHECKING TABLE OWNERS ==========\n');

        const result = await systemConn.execute(`
      SELECT OWNER, TABLE_NAME 
      FROM DBA_TABLES 
      WHERE TABLE_NAME IN ('CUSTOMERS', 'ACCOUNTS', 'TRANSACTIONS', 'COMPLAINTS', 'AUDIT_LOGS', 'USERS')
      ORDER BY OWNER, TABLE_NAME
    `);

        if (result.rows.length === 0) {
            console.log('❌ No tables found. Checking all tables in database...\n');
            const allTables = await systemConn.execute(`
        SELECT DISTINCT OWNER FROM DBA_TABLES WHERE OWNER NOT IN ('SYS', 'SYSTEM', 'OUTLN', 'DBSNMP', 'APPQOSSYS')
        ORDER BY OWNER
      `);

            console.log('📋 Available Schemas:');
            allTables.rows.forEach(row => {
                console.log(`  • ${row[0]}`);
            });
        } else {
            console.log('✅ Found Tables:\n');
            result.rows.forEach(row => {
                console.log(`  Owner: ${row[0]}, Table: ${row[1]}`);
            });
        }

        await systemConn.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
