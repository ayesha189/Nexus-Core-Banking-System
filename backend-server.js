// backend-server.js - Express.js backend with Oracle Database 11g XE
// Run: node backend-server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConnection, initializePool, closePool } from './oracle-config.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Initialize connection pool on startup
await initializePool();

// Helper function to log audit
async function logAudit(userId, action, tableName, recordId, oldValue, newValue, status = 'Success') {
  try {
    const connection = await getConnection();
    const auditId = (await connection.execute('SELECT AUDIT_LOG_SEQ.NEXTVAL FROM DUAL')).rows[0][0];

    await connection.execute(
      `INSERT INTO AUDIT_LOGS (ID, USER_ID, ACTION, TABLE_NAME, RECORD_ID, OLD_VALUE, NEW_VALUE, STATUS) 
       VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
      [auditId, userId, action, tableName, recordId, JSON.stringify(oldValue), JSON.stringify(newValue), status],
      { autoCommit: true }
    );
    connection.close();
  } catch (error) {
    console.error('Audit logging error:', error.message);
  }
}

// ============ AUTH ENDPOINTS ============

app.post('/api/auth/login', async (req, res) => {
  const connection = await getConnection();
  try {
    const { cnic, password } = req.body;

    if (!cnic || !password) {
      return res.status(400).json({ error: 'CNIC and password are required' });
    }

    // Check if admin login
    if (cnic === 'admin' && password === 'admin') {
      return res.json({
        user: { id: 0, name: 'Administrator', cnic: 'admin', email: 'admin@system', status: 'Active', role: 'admin' },
        token: 'Bearer_admin_token',
      });
    }

    const result = await connection.execute(
      'SELECT * FROM CUSTOMERS WHERE CNIC = :cnic',
      { cnic }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid CNIC or Password' });
    }

    const customer = result.rows[0];
    const custObj = {
      id: customer[0],
      name: customer[1],
      cnic: customer[2],
      contact: customer[3],
      email: customer[4],
      address: customer[5],
      dob: customer[6],
      status: customer[7],
      role: 'customer'
    };

    // TODO: Use proper password hashing (bcrypt)
    if (customer[8] !== password) {
      return res.status(401).json({ error: 'Invalid CNIC or Password' });
    }

    if (custObj.status !== 'Active') {
      return res.status(401).json({ error: 'Account is inactive or suspended' });
    }

    await logAudit(custObj.id, 'LOGIN', 'CUSTOMERS', custObj.id, null, { cnic });

    res.json({
      user: custObj,
      token: 'Bearer_' + custObj.id,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.post('/api/auth/register', async (req, res) => {
  const connection = await getConnection();
  try {
    const { cnic, name, email, password, contact, address, dob } = req.body;

    if (!cnic || !name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Trim and normalize inputs
    const normalizedCnic = (cnic || '').trim().toUpperCase();
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Check if customer already exists
    const existResult = await connection.execute(
      'SELECT ID, CNIC, EMAIL FROM CUSTOMERS WHERE UPPER(CNIC) = UPPER(:cnic) OR LOWER(EMAIL) = LOWER(:email)',
      { cnic: normalizedCnic, email: normalizedEmail }
    );

    if (existResult.rows.length > 0) {
      const existing = existResult.rows[0];
      if (existing[1].toUpperCase() === normalizedCnic) {
        return res.status(400).json({ error: 'A customer with this CNIC already exists. Please use a different CNIC or log in.' });
      }
      if (existing[2].toLowerCase() === normalizedEmail) {
        return res.status(400).json({ error: 'A customer with this email already exists. Please use a different email or log in.' });
      }
    }

    // Get next customer ID
    const seqResult = await connection.execute('SELECT CUSTOMER_SEQ.NEXTVAL FROM DUAL');
    const customerId = seqResult.rows[0][0];

    // Insert new customer
    await connection.execute(
      `INSERT INTO CUSTOMERS (ID, NAME, CNIC, CONTACT, EMAIL, ADDRESS, DOB, STATUS, PASSWORD) 
       VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)`,
      [customerId, name, cnic, contact || '', email, address || '', dob || null, 'Active', password],
      { autoCommit: true }
    );

    // AUTO-CREATE ACCOUNT with 13-digit number
    const customIdStr = String(customerId).padStart(4, '0');
    const timestamp = String(Date.now()).slice(-9);
    const accountNo = customIdStr + timestamp;

    await connection.execute(
      `INSERT INTO ACCOUNTS (ACCOUNT_NO, CUSTOMER_ID, ACCOUNT_TYPE, BALANCE, STATUS) 
       VALUES (:1, :2, :3, :4, :5)`,
      [accountNo, customerId, 'Savings', 0, 'Active'],
      { autoCommit: true }
    );

    await logAudit(customerId, 'REGISTER', 'CUSTOMERS', customerId, null, { name, email, cnic });
    await logAudit(customerId, 'CREATE', 'ACCOUNTS', accountNo, null, { accountNo, accountType: 'Savings', balance: 0 });

    res.status(201).json({
      message: 'Customer registered successfully',
      customerId,
      accountNo,
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    // Handle Oracle unique constraint violation
    if (error.message.includes('ORA-00001') || error.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'This CNIC or email is already registered. Please log in or use different credentials.' });
    }
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    await connection.close();
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const connection = await getConnection();
  try {
    const { cnic, newPassword } = req.body;

    if (!cnic || !newPassword) {
      return res.status(400).json({ error: 'CNIC and new password are required' });
    }

    const result = await connection.execute(
      'SELECT ID, PASSWORD FROM CUSTOMERS WHERE CNIC = :cnic',
      { cnic }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [customerId, oldPassword] = result.rows[0];

    // Update password
    await connection.execute(
      'UPDATE CUSTOMERS SET PASSWORD = :password WHERE CNIC = :cnic',
      { password: newPassword, cnic },
      { autoCommit: true }
    );

    await logAudit(customerId, 'FORGOT_PASSWORD', 'CUSTOMERS', customerId, { password: oldPassword }, { password: newPassword });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

// ============ CUSTOMERS ENDPOINTS ============

app.get('/api/customers', async (req, res) => {
  const connection = await getConnection();
  try {
    const result = await connection.execute('SELECT * FROM CUSTOMERS ORDER BY CREATED_AT DESC');
    const customers = result.rows.map(row => ({
      id: row[0],
      name: row[1],
      cnic: row[2],
      contact: row[3],
      email: row[4],
      address: row[5],
      dob: row[6],
      status: row[7],
      createdAt: row[9],
    }));
    res.json(customers);
  } catch (error) {
    console.error('Fetch customers error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.get('/api/customers/:id', async (req, res) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;
    const result = await connection.execute('SELECT * FROM CUSTOMERS WHERE ID = :id', { id });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row[0],
      name: row[1],
      cnic: row[2],
      contact: row[3],
      email: row[4],
      address: row[5],
      dob: row[6],
      status: row[7],
      createdAt: row[9],
    });
  } catch (error) {
    console.error('Fetch customer error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.post('/api/customers', async (req, res) => {
  const connection = await getConnection();
  try {
    const { name, cnic, contact, email, address, dob, status = 'Active', password, accountType = 'Savings', initialDeposit = 0 } = req.body;

    if (!name || !cnic || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if customer already exists
    const existResult = await connection.execute(
      'SELECT ID FROM CUSTOMERS WHERE CNIC = :cnic OR EMAIL = :email',
      { cnic, email }
    );

    if (existResult.rows.length > 0) {
      return res.status(400).json({ error: 'Customer already exists' });
    }

    // Get next customer ID
    const seqResult = await connection.execute('SELECT CUSTOMER_SEQ.NEXTVAL FROM DUAL');
    const customerId = seqResult.rows[0][0];

    await connection.execute(
      `INSERT INTO CUSTOMERS (ID, NAME, CNIC, CONTACT, EMAIL, ADDRESS, DOB, STATUS, PASSWORD) 
       VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)`,
      [customerId, name, cnic, contact || '', email, address || '', dob || null, status, password],
      { autoCommit: true }
    );

    // AUTO-CREATE ACCOUNT with 13-digit number
    const customIdStr = String(customerId).padStart(4, '0');
    const timestamp = String(Date.now()).slice(-9);
    const accountNo = customIdStr + timestamp;

    await connection.execute(
      `INSERT INTO ACCOUNTS (ACCOUNT_NO, CUSTOMER_ID, ACCOUNT_TYPE, BALANCE, STATUS) 
       VALUES (:1, :2, :3, :4, :5)`,
      [accountNo, customerId, accountType, Number(initialDeposit) || 0, 'Active'],
      { autoCommit: true }
    );

    await logAudit(customerId, 'CREATE', 'CUSTOMERS', customerId, null, { name, cnic, email });
    await logAudit(customerId, 'CREATE', 'ACCOUNTS', accountNo, null, { accountNo, accountType, balance: initialDeposit });

    res.status(201).json({
      id: customerId,
      name,
      cnic,
      contact,
      email,
      address,
      dob,
      status,
      accountNo,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create customer error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    await connection.close();
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;
    const { name, contact, email, address, dob, status } = req.body;

    // Get current customer
    const currentResult = await connection.execute('SELECT * FROM CUSTOMERS WHERE ID = :id', { id });
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Build update query
    const updates = [];
    const params = {};
    let paramCount = 1;

    if (name) {
      updates.push(`NAME = :${paramCount}`);
      params[paramCount] = name;
      paramCount++;
    }
    if (contact) {
      updates.push(`CONTACT = :${paramCount}`);
      params[paramCount] = contact;
      paramCount++;
    }
    if (email) {
      updates.push(`EMAIL = :${paramCount}`);
      params[paramCount] = email;
      paramCount++;
    }
    if (address) {
      updates.push(`ADDRESS = :${paramCount}`);
      params[paramCount] = address;
      paramCount++;
    }
    if (dob) {
      updates.push(`DOB = :${paramCount}`);
      params[paramCount] = dob;
      paramCount++;
    }
    if (status) {
      updates.push(`STATUS = :${paramCount}`);
      params[paramCount] = status;
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`UPDATED_AT = SYSTIMESTAMP`);
    params[paramCount] = id;

    const sql = `UPDATE CUSTOMERS SET ${updates.join(', ')} WHERE ID = :${paramCount}`;

    await connection.execute(sql, params, { autoCommit: true });

    await logAudit(id, 'UPDATE', 'CUSTOMERS', id, currentResult.rows[0], req.body);

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    console.error('Update customer error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;

    const customerResult = await connection.execute('SELECT * FROM CUSTOMERS WHERE ID = :id', { id });
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await connection.execute('DELETE FROM CUSTOMERS WHERE ID = :id', { id }, { autoCommit: true });

    await logAudit(id, 'DELETE', 'CUSTOMERS', id, customerResult.rows[0], null);

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

// ============ ACCOUNTS ENDPOINTS ============

app.get('/api/accounts', async (req, res) => {
  const connection = await getConnection();
  try {
    const result = await connection.execute('SELECT * FROM ACCOUNTS ORDER BY ACCOUNT_NO DESC');
    const accounts = result.rows.map(row => ({
      accountNo: row[0],
      customerId: row[1],
      accountType: row[2],
      balance: row[3],
      status: row[4],
      openingDate: row[5],
      lastTransactionDate: row[6],
      interestRate: row[7],
      serviceCharges: row[8],
      withdrawLimit: row[9],
    }));
    res.json(accounts);
  } catch (error) {
    console.error('Fetch accounts error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.get('/api/accounts/customer/:customerId', async (req, res) => {
  const connection = await getConnection();
  try {
    const { customerId } = req.params;
    const result = await connection.execute('SELECT * FROM ACCOUNTS WHERE CUSTOMER_ID = :customerId', { customerId });
    const accounts = result.rows.map(row => ({
      accountNo: row[0],
      customerId: row[1],
      accountType: row[2],
      balance: row[3],
      status: row[4],
    }));
    res.json(accounts);
  } catch (error) {
    console.error('Fetch customer accounts error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.get('/api/accounts/:accountNo', async (req, res) => {
  const connection = await getConnection();
  try {
    const { accountNo } = req.params;
    const result = await connection.execute('SELECT * FROM ACCOUNTS WHERE ACCOUNT_NO = :accountNo', { accountNo });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const row = result.rows[0];
    res.json({
      accountNo: row[0],
      customerId: row[1],
      accountType: row[2],
      balance: row[3],
      status: row[4],
    });
  } catch (error) {
    console.error('Fetch account error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.post('/api/accounts', async (req, res) => {
  const connection = await getConnection();
  try {
    const { customerId, accountType, initialBalance = 0, interestRate = 0, withdrawLimit } = req.body;

    if (!customerId || !accountType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify customer exists
    const custResult = await connection.execute('SELECT ID FROM CUSTOMERS WHERE ID = :customerId', { customerId });
    if (custResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Generate 13-digit account number: CUST_ID (4 digits) + TIMESTAMP (9 digits)
    const custId = String(customerId).padStart(4, '0');
    const timestamp = String(Date.now()).slice(-9); // Last 9 digits of timestamp
    const accountNo = custId + timestamp;

    await connection.execute(
      `INSERT INTO ACCOUNTS (ACCOUNT_NO, CUSTOMER_ID, ACCOUNT_TYPE, BALANCE, STATUS, INTEREST_RATE, WITHDRAW_LIMIT) 
       VALUES (:1, :2, :3, :4, :5, :6, :7)`,
      [accountNo, customerId, accountType, initialBalance, 'Active', interestRate, withdrawLimit || null],
      { autoCommit: true }
    );

    await logAudit(customerId, 'CREATE', 'ACCOUNTS', accountNo, null, { customerId, accountType, initialBalance });

    res.status(201).json({
      accountNo,
      customerId,
      accountType,
      balance: initialBalance,
      status: 'Active',
      interestRate,
      withdrawLimit,
      openingDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create account error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    await connection.close();
  }
});

app.put('/api/accounts/:accountNo', async (req, res) => {
  const connection = await getConnection();
  try {
    const { accountNo } = req.params;
    const { status, interestRate, withdrawLimit } = req.body;

    const currentResult = await connection.execute('SELECT * FROM ACCOUNTS WHERE ACCOUNT_NO = :accountNo', { accountNo });
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const updates = [];
    const params = {};
    let paramCount = 1;

    if (status) {
      updates.push(`STATUS = :${paramCount}`);
      params[paramCount] = status;
      paramCount++;
    }
    if (interestRate !== undefined) {
      updates.push(`INTEREST_RATE = :${paramCount}`);
      params[paramCount] = interestRate;
      paramCount++;
    }
    if (withdrawLimit !== undefined) {
      updates.push(`WITHDRAW_LIMIT = :${paramCount}`);
      params[paramCount] = withdrawLimit;
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`UPDATED_AT = SYSTIMESTAMP`);
    params[paramCount] = accountNo;

    const sql = `UPDATE ACCOUNTS SET ${updates.join(', ')} WHERE ACCOUNT_NO = :${paramCount}`;

    await connection.execute(sql, params, { autoCommit: true });

    await logAudit(currentResult.rows[0][1], 'UPDATE', 'ACCOUNTS', accountNo, currentResult.rows[0], req.body);

    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('Update account error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

// ============ TRANSACTIONS ENDPOINTS ============

app.get('/api/transactions', async (req, res) => {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT t.ID, t.FROM_ACCOUNT_NO, t.TO_ACCOUNT_NO, t.AMOUNT, t.TYPE, t.STATUS, t.DESCRIPTION, t.REFERENCE_NO, t.CREATED_AT
       FROM TRANSACTIONS t
       ORDER BY t.CREATED_AT DESC`
    );

    const transactions = result.rows.map(row => ({
      id: row[0],
      fromAccountNo: row[1],
      toAccountNo: row[2],
      amount: row[3],
      type: row[4],
      status: row[5],
      description: row[6],
      referenceNo: row[7],
      createdAt: row[8]
    }));

    res.json(transactions);
  } catch (error) {
    console.error('Fetch transactions error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.get('/api/transactions/account/:accountNo', async (req, res) => {
  const connection = await getConnection();
  try {
    const { accountNo } = req.params;
    const result = await connection.execute(
      `SELECT t.ID, t.FROM_ACCOUNT_NO, t.TO_ACCOUNT_NO, t.AMOUNT, t.TYPE, t.STATUS, t.DESCRIPTION, t.REFERENCE_NO, t.CREATED_AT
       FROM TRANSACTIONS t
       WHERE t.FROM_ACCOUNT_NO = :accountNo OR t.TO_ACCOUNT_NO = :accountNo 
       ORDER BY t.CREATED_AT DESC`,
      { accountNo }
    );

    const transactions = result.rows.map(row => ({
      transId: row[0],
      fromAccount: row[1],
      toAccount: row[2],
      amount: row[3],
      type: row[4],
      status: row[5],
      description: row[6],
      referenceNo: row[7],
      dateTime: row[8]
    }));

    res.json(transactions);
  } catch (error) {
    console.error('Fetch account transactions error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.post('/api/transactions', async (req, res) => {
  const connection = await getConnection();
  try {
    const { fromAccountNo, toAccountNo, amount, type = 'Transfer', description } = req.body;

    if (!amount || (type === 'Transfer' && (!fromAccountNo || !toAccountNo))) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      let referenceNo = 'TXN' + Date.now() + randomPart;

      if (type === 'Transfer' && fromAccountNo && toAccountNo) {
        // Transaction: Debit sender, credit receiver
        const fromResult = await connection.execute('SELECT * FROM ACCOUNTS WHERE ACCOUNT_NO = :accountNo', { accountNo: fromAccountNo });
        const toResult = await connection.execute('SELECT * FROM ACCOUNTS WHERE ACCOUNT_NO = :accountNo', { accountNo: toAccountNo });

        if (fromResult.rows.length === 0 || toResult.rows.length === 0) {
          return res.status(404).json({ error: 'One or both accounts not found' });
        }

        const fromAccount = fromResult.rows[0];
        const toAccount = toResult.rows[0];

        if (fromAccount[3] < amount) { // balance is at index 3
          return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct from source account
        await connection.execute(
          'UPDATE ACCOUNTS SET BALANCE = BALANCE - :amount WHERE ACCOUNT_NO = :accountNo',
          { amount, accountNo: fromAccountNo },
          { autoCommit: false }
        );

        // Add to destination account
        await connection.execute(
          'UPDATE ACCOUNTS SET BALANCE = BALANCE + :amount WHERE ACCOUNT_NO = :accountNo',
          { amount, accountNo: toAccountNo },
          { autoCommit: false }
        );

        // Record transaction
        const txnSeq = await connection.execute('SELECT TRANSACTION_SEQ.NEXTVAL FROM DUAL');
        const txnId = txnSeq.rows[0][0];

        await connection.execute(
          `INSERT INTO TRANSACTIONS (ID, FROM_ACCOUNT_NO, TO_ACCOUNT_NO, AMOUNT, TYPE, STATUS, DESCRIPTION, REFERENCE_NO)
           VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
          [txnId, fromAccountNo, toAccountNo, amount, type, 'Completed', description || '', referenceNo],
          { autoCommit: false }
        );

        // Commit transaction
        await connection.commit();

        await logAudit(fromAccount[1], 'TRANSFER', 'TRANSACTIONS', txnId, null, { from: fromAccountNo, to: toAccountNo, amount });

        res.status(201).json({ id: txnId, referenceNo, status: 'Completed' });

      } else if (type === 'Deposit') {
        // Transaction: Add funds to account
        const accountNo = toAccountNo;
        const accResult = await connection.execute('SELECT * FROM ACCOUNTS WHERE ACCOUNT_NO = :accountNo', { accountNo });

        if (accResult.rows.length === 0) {
          return res.status(404).json({ error: 'Account not found' });
        }

        // Add to account
        await connection.execute(
          'UPDATE ACCOUNTS SET BALANCE = BALANCE + :amount WHERE ACCOUNT_NO = :accountNo',
          { amount, accountNo },
          { autoCommit: false }
        );

        // Record transaction
        const txnSeq = await connection.execute('SELECT TRANSACTION_SEQ.NEXTVAL FROM DUAL');
        const txnId = txnSeq.rows[0][0];

        await connection.execute(
          `INSERT INTO TRANSACTIONS (ID, FROM_ACCOUNT_NO, TO_ACCOUNT_NO, AMOUNT, TYPE, STATUS, DESCRIPTION, REFERENCE_NO)
           VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
          [txnId, null, accountNo, amount, 'Deposit', 'Completed', description || '', referenceNo],
          { autoCommit: false }
        );

        // Commit transaction
        await connection.commit();

        const customerId = accResult.rows[0][1];
        await logAudit(customerId, 'DEPOSIT', 'TRANSACTIONS', txnId, null, { accountNo, amount });

        res.status(201).json({ id: txnId, referenceNo, status: 'Completed' });

      } else if (type === 'Withdrawal') {
        // Transaction: Remove funds from account
        const accountNo = fromAccountNo;
        const accResult = await connection.execute('SELECT * FROM ACCOUNTS WHERE ACCOUNT_NO = :accountNo', { accountNo });

        if (accResult.rows.length === 0) {
          return res.status(404).json({ error: 'Account not found' });
        }

        const account = accResult.rows[0];
        if (account[3] < amount) {
          return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct from account
        await connection.execute(
          'UPDATE ACCOUNTS SET BALANCE = BALANCE - :amount WHERE ACCOUNT_NO = :accountNo',
          { amount, accountNo },
          { autoCommit: false }
        );

        // Record transaction
        const txnSeq = await connection.execute('SELECT TRANSACTION_SEQ.NEXTVAL FROM DUAL');
        const txnId = txnSeq.rows[0][0];

        await connection.execute(
          `INSERT INTO TRANSACTIONS (ID, FROM_ACCOUNT_NO, TO_ACCOUNT_NO, AMOUNT, TYPE, STATUS, DESCRIPTION, REFERENCE_NO)
           VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
          [txnId, accountNo, null, amount, 'Withdrawal', 'Completed', description || '', referenceNo],
          { autoCommit: false }
        );

        // Commit transaction
        await connection.commit();

        const customerId = account[1];
        await logAudit(customerId, 'WITHDRAWAL', 'TRANSACTIONS', txnId, null, { accountNo, amount });

        res.status(201).json({ id: txnId, referenceNo, status: 'Completed' });
      }

    } catch (txnError) {
      await connection.rollback();
      throw txnError;
    }
  } catch (error) {
    console.error('Transaction error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    await connection.close();
  }
});

// ============ COMPLAINTS ENDPOINTS ============

app.get('/api/complaints', async (req, res) => {
  const connection = await getConnection();
  try {
    const result = await connection.execute(`
      SELECT c.ID, c.CUSTOMER_ID, c.ACCOUNT_NO, c.CATEGORY, c.SUBJECT, c.DESCRIPTION, 
             c.PRIORITY, c.STATUS, c.RESOLUTION, c.ASSIGNED_TO, c.CREATED_AT, c.UPDATED_AT, 
             c.RESOLVED_AT, cust.NAME, cust.CNIC
      FROM COMPLAINTS c
      LEFT JOIN CUSTOMERS cust ON c.CUSTOMER_ID = cust.ID
      ORDER BY c.CREATED_AT DESC
    `);

    const complaints = result.rows.map(row => ({
      id: row[0],
      customerId: row[1],
      accountNo: row[2],
      category: row[3],
      subject: row[4],
      description: row[5],
      priority: row[6],
      status: row[7],
      resolution: row[8],
      assignedTo: row[9],
      createdAt: row[10],
      updatedAt: row[11],
      resolvedAt: row[12],
      customerName: row[13] || 'Unknown',
      customerCnic: row[14] || 'N/A'
    }));

    res.json(complaints);
  } catch (error) {
    console.error('Fetch complaints error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.get('/api/complaints/customer/:customerId', async (req, res) => {
  const connection = await getConnection();
  try {
    const { customerId } = req.params;
    const result = await connection.execute(`
      SELECT ID, CUSTOMER_ID, ACCOUNT_NO, CATEGORY, SUBJECT, DESCRIPTION, 
             PRIORITY, STATUS, RESOLUTION, ASSIGNED_TO, CREATED_AT, UPDATED_AT, RESOLVED_AT
      FROM COMPLAINTS 
      WHERE CUSTOMER_ID = :customerId 
      ORDER BY CREATED_AT DESC
    `, { customerId });

    const complaints = result.rows.map(row => ({
      id: row[0],
      customerId: row[1],
      accountNo: row[2],
      category: row[3],
      subject: row[4],
      description: row[5],
      priority: row[6],
      status: row[7],
      resolution: row[8],
      assignedTo: row[9],
      createdAt: row[10],
      updatedAt: row[11],
      resolvedAt: row[12]
    }));

    res.json(complaints);
  } catch (error) {
    console.error('Fetch customer complaints error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

app.post('/api/complaints', async (req, res) => {
  const connection = await getConnection();
  try {
    const { customerId, accountNo, category, subject, description, priority = 'Medium' } = req.body;

    if (!customerId || !subject || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const custResult = await connection.execute('SELECT ID FROM CUSTOMERS WHERE ID = :customerId', { customerId });
    if (custResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const compSeq = await connection.execute('SELECT COMPLAINT_SEQ.NEXTVAL FROM DUAL');
    const complaintId = compSeq.rows[0][0];

    await connection.execute(
      `INSERT INTO COMPLAINTS (ID, CUSTOMER_ID, ACCOUNT_NO, CATEGORY, SUBJECT, DESCRIPTION, PRIORITY, STATUS)
       VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
      [complaintId, customerId, accountNo || null, category || '', subject, description, priority, 'Open'],
      { autoCommit: true }
    );

    await logAudit(customerId, 'CREATE_COMPLAINT', 'COMPLAINTS', complaintId, null, { subject, description });

    res.status(201).json({
      id: complaintId,
      customerId,
      subject,
      status: 'Open',
      priority,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create complaint error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    await connection.close();
  }
});

app.put('/api/complaints/:id', async (req, res) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;
    const { status, resolution, assignedTo, priority } = req.body;

    const currentResult = await connection.execute('SELECT * FROM COMPLAINTS WHERE ID = :id', { id });
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const updates = [];
    const params = {};
    let paramCount = 1;

    if (status) {
      updates.push(`STATUS = :${paramCount}`);
      params[paramCount] = status;
      paramCount++;
      if (status === 'Resolved') {
        updates.push(`RESOLVED_AT = SYSTIMESTAMP`);
      }
    }
    if (resolution) {
      updates.push(`RESOLUTION = :${paramCount}`);
      params[paramCount] = resolution;
      paramCount++;
    }
    if (assignedTo) {
      updates.push(`ASSIGNED_TO = :${paramCount}`);
      params[paramCount] = assignedTo;
      paramCount++;
    }
    if (priority) {
      updates.push(`PRIORITY = :${paramCount}`);
      params[paramCount] = priority;
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`UPDATED_AT = SYSTIMESTAMP`);
    params[paramCount] = id;

    const sql = `UPDATE COMPLAINTS SET ${updates.join(', ')} WHERE ID = :${paramCount}`;

    await connection.execute(sql, params, { autoCommit: true });

    await logAudit(currentResult.rows[0][1], 'UPDATE_COMPLAINT', 'COMPLAINTS', id, currentResult.rows[0], req.body);

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Update complaint error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

// ============ AUDIT LOG ENDPOINTS ============

app.get('/api/audit-logs', async (req, res) => {
  const connection = await getConnection();
  try {
    const { action, tableName, limit = 100, role } = req.query;
    let sql = 'SELECT ID, USER_ID, ACTION, TABLE_NAME, RECORD_ID, STATUS, CREATED_AT FROM AUDIT_LOGS WHERE 1=1';
    const params = {};

    if (action) {
      sql += ' AND ACTION = :action';
      params.action = action;
    }
    if (tableName) {
      sql += ' AND TABLE_NAME = :tableName';
      params.tableName = tableName;
    }

    sql += ` ORDER BY CREATED_AT DESC`;

    const result = await connection.execute(sql, params);

    const logs = result.rows.slice(0, parseInt(limit)).map(row => ({
      id: row[0],
      userId: row[1],
      action: row[2],
      tableName: row[3],
      recordId: row[4],
      status: row[5],
      createdAt: row[6],
    }));
    res.json(logs);
  } catch (error) {
    console.error('Fetch audit logs error:', error.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await connection.close();
  }
});

// Admin endpoint to view all audit logs
app.get('/api/admin/audit-logs', async (req, res) => {
  const connection = await getConnection();
  try {
    const adminToken = req.headers.admintoken || req.headers['admin-token'];

    // Verify admin access
    if (adminToken !== 'Bearer_admin_token') {
      return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
    }

    try {
      const result = await connection.execute('SELECT * FROM AUDIT_LOGS ORDER BY CREATED_AT DESC');
      const logs = result.rows.map(row => ({
        id: row[0],
        userId: row[1],
        action: row[2],
        tableName: row[3],
        recordId: row[4],
        oldValue: row[5] ? (typeof row[5] === 'string' ? JSON.parse(row[5]) : row[5]) : null,
        newValue: row[6] ? (typeof row[6] === 'string' ? JSON.parse(row[6]) : row[6]) : null,
        status: row[7],
        createdAt: row[8],
      }));

      res.json({
        total: logs.length,
        logs: logs,
      });
    } catch (dbError) {
      console.error('Database query error:', dbError.message);
      throw dbError;
    }
  } catch (error) {
    console.error('Fetch admin audit logs error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    await connection.close();
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), database: 'Oracle 11g XE' });
});

// ============ GRACEFUL SHUTDOWN ============

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 API Base: http://localhost:${PORT}/api`);
  console.log(`🗄️  Database: Oracle Database 11g XE`);
});
