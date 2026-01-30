import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'], credentials: true }));
app.use(express.json());

// Simple in-memory sample data (matches values in services/mockDatabase.ts)
let customers = [
    { id: 1, name: 'Ahmed Hassan', cnic: '35202-1234567-1', contact: '03001234567', email: 'ahmed@example.com', address: 'House 123, F-7, Islamabad', dob: '1990-05-15', status: 'Active', createdAt: new Date().toISOString(), password: 'password123' },
    { id: 2, name: 'Fatima Khan', cnic: '42101-9876543-2', contact: '03219876543', email: 'fatima@example.com', address: 'Flat 45, DHA Phase 5, Karachi', dob: '1988-08-22', status: 'Active', createdAt: new Date().toISOString(), password: 'password123' }
];

let accounts = [
    { accountNo: 1001, customerId: 1, accountType: 'Savings', balance: 15000.00, status: 'Active' },
    { accountNo: 1002, customerId: 1, accountType: 'Current', balance: 128500.00, status: 'Active' },
    { accountNo: 1003, customerId: 2, accountType: 'Savings', balance: 80000.00, status: 'Active' }
];

let transactions = [
    { id: 1, fromAccount: null, toAccount: 1001, amount: 5000, type: 'Deposit', dateTime: new Date(Date.now() - 86400000 * 6).toISOString(), status: 'Completed' },
    { id: 2, fromAccount: 1001, toAccount: 1002, amount: 2000, type: 'Transfer', dateTime: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'Completed' },
    { id: 3, fromAccount: 1002, toAccount: null, amount: 1500, type: 'Withdrawal', dateTime: new Date(Date.now() - 86400000 * 4).toISOString(), status: 'Completed' },
    { id: 4, fromAccount: null, toAccount: 1002, amount: 10000, type: 'Deposit', dateTime: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'Completed' },
    { id: 5, fromAccount: 1001, toAccount: 1003, amount: 3500, type: 'Transfer', dateTime: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'Completed' },
    { id: 6, fromAccount: 1003, toAccount: null, amount: 2000, type: 'Withdrawal', dateTime: new Date(Date.now() - 86400000).toISOString(), status: 'Completed' },
    { id: 7, fromAccount: null, toAccount: 1003, amount: 7500, type: 'Deposit', dateTime: new Date().toISOString(), status: 'Completed' }
];
let complaints = [];

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', (req, res) => {
    const { cnic, password } = req.body || {};
    if (!cnic || !password) return res.status(400).json({ error: 'CNIC and password required' });

    if (cnic === 'admin' && password === 'admin') {
        return res.json({ user: { id: 0, name: 'Administrator', cnic: 'admin', email: 'admin@system', status: 'Active', role: 'admin' }, token: 'Bearer_admin_token' });
    }

    const user = customers.find(c => c.cnic === cnic && c.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid CNIC or Password' });
    if (user.status !== 'Active') return res.status(401).json({ error: 'Account inactive' });

    res.json({ user: { id: user.id, name: user.name, cnic: user.cnic, email: user.email, status: user.status, role: 'customer' }, token: 'Bearer_' + user.id });
});

app.post('/api/auth/register', (req, res) => {
    const { cnic, name, email, password } = req.body || {};
    if (!cnic || !name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

    if (customers.some(c => c.cnic === cnic || c.email === email)) {
        return res.status(400).json({ error: 'Customer already exists' });
    }

    const newId = customers.length ? Math.max(...customers.map(c => c.id)) + 1 : 1;
    const newCustomer = { id: newId, name, cnic, contact: '', email, address: '', dob: null, status: 'Active', createdAt: new Date().toISOString(), password };
    customers.push(newCustomer);

    // AUTO-CREATE SAVINGS ACCOUNT FOR NEW CUSTOMER
    const newAccountNo = accounts.length ? Math.max(...accounts.map(a => a.accountNo)) + 1 : 1001;
    accounts.push({ accountNo: newAccountNo, customerId: newId, accountType: 'Savings', balance: 0, status: 'Active' });

    res.status(201).json({ message: 'Customer registered successfully', customerId: newId, accountNo: newAccountNo });
});

app.get('/api/customers', (req, res) => {
    const out = customers.map(c => ({ id: c.id, name: c.name, cnic: c.cnic, contact: c.contact, email: c.email, address: c.address, dob: c.dob, status: c.status, createdAt: c.createdAt }));
    res.json(out);
});

app.get('/api/customers/:id', (req, res) => {
    const id = Number(req.params.id);
    const c = customers.find(x => x.id === id);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    res.json({ id: c.id, name: c.name, cnic: c.cnic, contact: c.contact, email: c.email, address: c.address, dob: c.dob, status: c.status, createdAt: c.createdAt });
});

app.get('/api/accounts', (req, res) => res.json(accounts));

app.get('/api/accounts/customer/:id', (req, res) => {
    const id = Number(req.params.id);
    res.json(accounts.filter(a => a.customerId === id));
});

app.get('/api/transactions/account/:accountNo', (req, res) => {
    const acc = Number(req.params.accountNo);
    res.json(transactions.filter(t => t.fromAccount === acc || t.toAccount === acc));
});

app.get('/api/transactions', (req, res) => {
    res.json(transactions);
});

app.post('/api/transactions', (req, res) => {
    const { fromAccountNo, toAccountNo, amount, type } = req.body || {};
    if (!toAccountNo && !fromAccountNo) {
        return res.status(400).json({ error: 'Either fromAccountNo or toAccountNo is required' });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const id = transactions.length ? Math.max(...transactions.map(t => t.id || 0)) + 1 : 1;
    const tx = { id, fromAccount: fromAccountNo || null, toAccount: toAccountNo || null, amount: Number(amount), type, dateTime: new Date().toISOString(), status: 'Completed' };

    // Update account balances
    if (fromAccountNo) {
        const fromAcc = accounts.find(a => a.accountNo === fromAccountNo);
        if (fromAcc) {
            fromAcc.balance -= Number(amount);
        }
    }

    if (toAccountNo) {
        const toAcc = accounts.find(a => a.accountNo === toAccountNo);
        if (toAcc) {
            toAcc.balance += Number(amount);
        }
    }

    transactions.push(tx);
    res.status(201).json(tx);
});

app.get('/api/complaints', (req, res) => {
    const out = complaints.map(c => ({ id: c.id, customerId: c.customerId, description: c.description, date: c.date, status: c.status, adminResponse: c.adminResponse }));
    res.json(out);
});

app.post('/api/complaints', (req, res) => {
    const { customerId, subject, description, category } = req.body || {};
    const id = complaints.length ? Math.max(...complaints.map(c => c.id || 0)) + 1 : 1;
    const complaint = { id, customerId, subject: subject || 'Complaint', description, category: category || 'General', date: new Date().toISOString(), status: 'Pending' };
    complaints.push(complaint);
    res.status(201).json(complaint);
});

app.listen(PORT, () => console.log(`✅ Dev backend listening on http://localhost:${PORT}`));

export default app;
