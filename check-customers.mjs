import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });
        const conn = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('Checking CUSTOMERS table...');
        const result = await conn.execute('SELECT ID, NAME, CNIC, EMAIL FROM CUSTOMERS ORDER BY ID');
        console.log('Current customers:');
        console.table(result.rows);

        console.log('\n\nChecking for duplicate emails or CNICs...');
        const dupEmail = await conn.execute(
            `SELECT EMAIL, COUNT(*) as cnt FROM CUSTOMERS GROUP BY EMAIL HAVING COUNT(*) > 1`
        );
        console.log('Duplicate emails:', dupEmail.rows);

        const dupCnic = await conn.execute(
            `SELECT CNIC, COUNT(*) as cnt FROM CUSTOMERS GROUP BY CNIC HAVING COUNT(*) > 1`
        );
        console.log('Duplicate CNICs:', dupCnic.rows);

        await conn.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
