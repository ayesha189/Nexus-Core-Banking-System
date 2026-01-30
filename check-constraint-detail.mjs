import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });

        const connection = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('\n========== CHECKING CONSTRAINT SYS_C007190 ==========\n');

        const result = await connection.execute(`
      SELECT UC.CONSTRAINT_NAME, UC.TABLE_NAME, CC.COLUMN_NAME, UC.CONSTRAINT_TYPE
      FROM USER_CONSTRAINTS UC
      JOIN USER_CONS_COLUMNS CC ON UC.CONSTRAINT_NAME = CC.CONSTRAINT_NAME
      WHERE UC.CONSTRAINT_NAME = 'SYS_C007190'
      ORDER BY UC.CONSTRAINT_NAME, CC.POSITION
    `);

        console.log('Constraint Details:');
        result.rows.forEach(row => {
            console.log(`  Constraint: ${row[0]}`);
            console.log(`  Table: ${row[1]}`);
            console.log(`  Column: ${row[2]}`);
            console.log(`  Type: ${row[3]} (P=Primary Key, U=Unique)`);
        });

        await connection.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
