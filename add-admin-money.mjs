import oracledb from 'oracledb';

(async () => {
    try {
        oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin' });
        const conn = await oracledb.getConnection({
            user: 'system',
            password: 'system',
            connectionString: 'localhost:1521/XE'
        });

        console.log('Adding admin user with funds...\n');

        // Check if admin already exists
        const checkAdmin = await conn.execute(
            `SELECT ID FROM CUSTOMERS WHERE CNIC = '99999-9999999-9'`
        );

        let adminId;
        if (checkAdmin.rows.length > 0) {
            adminId = checkAdmin.rows[0][0];
            console.log(`✅ Admin user already exists (ID: ${adminId})`);
        } else {
            // Get next sequence ID
            const seqResult = await conn.execute('SELECT CUSTOMER_SEQ.NEXTVAL FROM DUAL');
            adminId = seqResult.rows[0][0];

            // Insert admin customer
            await conn.execute(
                `INSERT INTO CUSTOMERS (ID, NAME, CNIC, CONTACT, EMAIL, ADDRESS, DOB, STATUS, PASSWORD) 
                 VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)`,
                [adminId, 'Admin User', '99999-9999999-9', '0300-0000000', 'admin@bank.com', 'Bank HQ', null, 'Active', 'admin123'],
                { autoCommit: true }
            );
            console.log(`✅ Created admin user (ID: ${adminId})`);
        }

        // Check if admin account already exists
        const checkAccount = await conn.execute(
            `SELECT ACCOUNT_NO FROM ACCOUNTS WHERE CUSTOMER_ID = :1`,
            [adminId]
        );

        let accountNo;
        if (checkAccount.rows.length > 0) {
            accountNo = checkAccount.rows[0][0];
            // Update balance
            await conn.execute(
                `UPDATE ACCOUNTS SET BALANCE = 999999999.99 WHERE ACCOUNT_NO = :1`,
                [accountNo],
                { autoCommit: true }
            );
            console.log(`✅ Updated admin account balance to 999,999,999.99`);
        } else {
            // Create new admin account
            const customIdStr = String(adminId).padStart(4, '0');
            const timestamp = String(Date.now()).slice(-9);
            accountNo = customIdStr + timestamp;

            await conn.execute(
                `INSERT INTO ACCOUNTS (ACCOUNT_NO, CUSTOMER_ID, ACCOUNT_TYPE, BALANCE, STATUS, OPENING_DATE) 
                 VALUES (:1, :2, :3, :4, :5, SYSDATE)`,
                [accountNo, adminId, 'Admin', 999999999.99, 'Active'],
                { autoCommit: true }
            );
            console.log(`✅ Created admin account (${accountNo}) with balance: 999,999,999.99`);
        }

        console.log('\n📊 Admin Account Details:');
        console.log(`   Customer ID: ${adminId}`);
        console.log(`   Account No: ${accountNo}`);
        console.log(`   Balance: 999,999,999.99 PKR`);
        console.log(`   Login CNIC: 99999-9999999-9`);
        console.log(`   Password: admin123`);

        await conn.close();
        await oracledb.shutdown();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
