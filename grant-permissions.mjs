import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });

        const connection = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('\n========== GRANTING PERMISSIONS TO AYESHA USER ==========\n');

        const grants = [
            'GRANT SELECT ON SYSTEM.CUSTOMERS TO AYESHA',
            'GRANT SELECT ON SYSTEM.ACCOUNTS TO AYESHA',
            'GRANT SELECT ON SYSTEM.TRANSACTIONS TO AYESHA',
            'GRANT SELECT ON SYSTEM.COMPLAINTS TO AYESHA',
            'GRANT SELECT ON SYSTEM.AUDIT_LOGS TO AYESHA',
            'GRANT SELECT ON SYSTEM.USERS TO AYESHA'
        ];

        for (const grant of grants) {
            try {
                await connection.execute(grant);
                console.log(`✅ ${grant}`);
            } catch (err) {
                console.log(`⚠️  ${grant} - ${err.message}`);
            }
        }

        console.log('\n========== SYNONYN SETUP (Optional) ==========\n');

        const synonyms = [
            'CREATE OR REPLACE SYNONYM AYESHA.CUSTOMERS FOR SYSTEM.CUSTOMERS',
            'CREATE OR REPLACE SYNONYM AYESHA.ACCOUNTS FOR SYSTEM.ACCOUNTS',
            'CREATE OR REPLACE SYNONYM AYESHA.TRANSACTIONS FOR SYSTEM.TRANSACTIONS',
            'CREATE OR REPLACE SYNONYM AYESHA.COMPLAINTS FOR SYSTEM.COMPLAINTS',
            'CREATE OR REPLACE SYNONYM AYESHA.AUDIT_LOGS FOR SYSTEM.AUDIT_LOGS',
            'CREATE OR REPLACE SYNONYM AYESHA.USERS FOR SYSTEM.USERS'
        ];

        for (const syn of synonyms) {
            try {
                await connection.execute(syn);
                console.log(`✅ ${syn.split('FOR')[0].trim()}`);
            } catch (err) {
                console.log(`⚠️  ${syn} - ${err.message}`);
            }
        }

        await connection.commit();
        console.log('\n✅ All permissions granted!\n');

        await connection.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
