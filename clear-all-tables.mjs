import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });
        const conn = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('Clearing all data...');

        // Clear dependent tables first
        await conn.execute('DELETE FROM TRANSACTIONS');
        await conn.commit();
        console.log('✅ TRANSACTIONS cleared');

        await conn.execute('DELETE FROM COMPLAINTS');
        await conn.commit();
        console.log('✅ COMPLAINTS cleared');

        await conn.execute('DELETE FROM ACCOUNTS');
        await conn.commit();
        console.log('✅ ACCOUNTS cleared');

        await conn.execute('DELETE FROM CUSTOMERS');
        await conn.commit();
        console.log('✅ CUSTOMERS cleared');

        await conn.execute('DELETE FROM AUDIT_LOGS');
        await conn.commit();
        console.log('✅ AUDIT_LOGS cleared');

        console.log('\n✨ All data cleared successfully!');

        await conn.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
