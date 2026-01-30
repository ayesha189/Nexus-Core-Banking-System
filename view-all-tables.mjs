import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });

        const connection = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('\n========== ALL TABLES ==========\n');
        const tables = await connection.execute(`
      SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME
    `);

        tables.rows.forEach(row => {
            console.log(`📋 ${row[0]}`);
        });

        console.log('\n========== TABLE DETAILS ==========\n');

        for (const row of tables.rows) {
            const tableName = row[0];
            console.log(`\n--- ${tableName} ---`);

            const cols = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, NULLABLE FROM USER_TAB_COLUMNS 
        WHERE TABLE_NAME = :tableName 
        ORDER BY COLUMN_ID
      `, { tableName });

            cols.rows.forEach(col => {
                const nullable = col[2] === 'Y' ? '(NULL)' : '(NOT NULL)';
                console.log(`  • ${col[0]}: ${col[1]} ${nullable}`);
            });
        }

        console.log('\n========== ROW COUNTS ==========\n');

        for (const row of tables.rows) {
            const tableName = row[0];
            const count = await connection.execute(`
        SELECT COUNT(*) FROM ${tableName}
      `);
            console.log(`${tableName}: ${count.rows[0][0]} rows`);
        }

        await connection.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
