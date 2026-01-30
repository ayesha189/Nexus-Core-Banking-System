import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });

        const connection = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('\n=== Constraints on TRANSACTIONS table ===');
        const result = await connection.execute(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, TABLE_NAME, SEARCH_CONDITION
      FROM USER_CONSTRAINTS 
      WHERE TABLE_NAME = 'TRANSACTIONS'
      ORDER BY CONSTRAINT_NAME
    `);

        console.log(result.rows);

        console.log('\n=== Unique/Primary Key Constraints ===');
        const uniqueResult = await connection.execute(`
      SELECT UC.CONSTRAINT_NAME, UC.TABLE_NAME, CC.COLUMN_NAME, UC.CONSTRAINT_TYPE
      FROM USER_CONSTRAINTS UC
      JOIN USER_CONS_COLUMNS CC ON UC.CONSTRAINT_NAME = CC.CONSTRAINT_NAME
      WHERE UC.TABLE_NAME = 'TRANSACTIONS' AND UC.CONSTRAINT_TYPE IN ('U', 'P')
      ORDER BY UC.CONSTRAINT_NAME, CC.POSITION
    `);

        console.log(uniqueResult.rows);

        await connection.close();
    } catch (err) {
        console.error(err);
    } finally {
        await oracledb.shutdown();
    }
})();
