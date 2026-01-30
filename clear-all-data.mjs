import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });
        const conn = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('Clearing CUSTOMERS table...');
        await conn.execute('DELETE FROM TRANSACTIONS');
        await conn.execute('DELETE FROM COMPLAINTS');
        await conn.execute('DELETE FROM ACCOUNTS');
        await conn.execute('DELETE FROM CUSTOMERS');
        await conn.commit();
        console.log('✅ CUSTOMERS, ACCOUNTS, TRANSACTIONS, COMPLAINTS cleared');

        await conn.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
