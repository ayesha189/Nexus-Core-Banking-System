# 🏦 Nexus Core Banking System


A comprehensive, production-ready web application demonstrating enterprise-level banking operations with modern web technologies.Nexus Core Banking System is a full-featured banking platform with separate interfaces for administrators and customers, implementing industry-standard banking workflows and security practices. This system provides a complete banking ecosystem with customer management, account services, transaction processing, and administrative controls.

### Key Highlights

- 🎯 **Dual Interface System** - Separate admin and customer portals
- 🔐 **Secure Authentication** - CNIC-based authentication with role-based access control
- 💰 **Multiple Account Types** - Savings, Current, and Fixed Deposit accounts
- 📊 **Real-time Analytics** - Interactive dashboards with charts and statistics
- 🔄 **TCL Operations** - Transaction Control Language demonstration (BEGIN, COMMIT, ROLLBACK)
- 📝 **Audit Logging** - Complete audit trail of all system operations
- 🎫 **Complaint Management** - Customer service ticket system with admin response

## ✨ Features

### 👨‍💼 Administrator Portal

- **Dashboard Analytics**
  - Real-time metrics (customers, accounts, transactions)
  - Account distribution charts by type and status
  - Transaction trends and activity graphs
  
- **Customer Management**
  - Full CRUD operations for customer accounts
  - CNIC validation and status management
  - Customer search and filtering

- **Account Services**
  - Create/manage Savings, Current, and Fixed Deposit accounts
  - Account lifecycle management (close, freeze, activate)
  - Account history and transaction records

- **Transaction Processing**
  - Deposits, withdrawals, and transfers
  - Multiple withdrawal methods (ATM, Branch, Cheque, Online)
  - Complete transaction history with status tracking

- **TCL Demo**
  - Interactive demonstration of database transaction management
  - Step-by-step visualization of BEGIN, COMMIT, ROLLBACK
  - Real-time state snapshots

- **Audit Logging**
  - Chronological log of all database operations
  - TCL command tracking
  - Detailed SQL query logging

- **Complaint Management**
  - View and respond to customer complaints
  - Status tracking and resolution workflow

### 👤 Customer Portal

- **Personal Dashboard** - View all accounts and balances
- **Transaction History** - Complete record of account activities
- **Fund Transfers** - Transfer money between accounts
- **Complaint Submission** - Report issues and track status
- **Password Management** - Secure password reset workflow

## 🛠️ Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | Frontend framework |
| TypeScript | 5.8.2 | Type-safe development |
| Vite | 6.2.0 | Build tool & dev server |
| React Router | 7.9.6 | Client-side routing |

### UI Libraries

- **Lucide React** - Icon system
- **Recharts** - Data visualization
- **Tailwind CSS** - Utility-first CSS framework

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0
- npm >= 7.0
- Modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nexus-banking-system.git
   cd nexus-banking-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   Navigate to http://localhost:5173
   ```

### Build for Production

```bash
npm run build
```

The optimized production files will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📖 Usage

### Default Login Credentials

#### Administrator Account
```
CNIC: 11111-1111111-1
Password: admin123
```

#### Sample Customer Account
```
CNIC: 12345-6789012-3
Password: customer123
```

### Quick Start Guide

1. **Login** with default credentials
2. **Explore Dashboard** to view system analytics
3. **Manage Customers** - Add, edit, or view customer profiles
4. **Create Accounts** - Set up Savings, Current, or Fixed Deposit accounts
5. **Process Transactions** - Execute deposits, withdrawals, and transfers
6. **View Audit Logs** - Track all system operations

## 🏗️ Architecture

### Project Structure

```
nexus-banking-system/
├── src/
│   ├── components/
│   │   ├── auth/           # Login & Signup
│   │   ├── customer/       # Customer portal
│   │   └── admin/          # Admin components
│   ├── services/
│   │   └── mockDatabase.ts # In-memory database
│   ├── types.ts            # TypeScript definitions
│   └── App.tsx             # Main application
├── public/
├── package.json
└── vite.config.ts
```

### Data Models

- **Customer** - User accounts with personal information and authentication
- **Account** - Banking accounts with type-specific attributes
- **Transaction** - Financial operations (deposits, withdrawals, transfers)
- **AuditLogEntry** - Complete audit trail with TCL tracking
- **Complaint** - Customer service tickets
- **PasswordResetRequest** - Secure password recovery workflow

### Entity Relationships

```
Customer (1) ──── (Many) Account
Account (1) ──── (Many) Transaction
Customer (1) ──── (Many) Complaint
Customer (1) ──── (Many) PasswordResetRequest
```

### Account Type Hierarchy

- **Savings Account**
  - Interest rate
  - Monthly withdrawal limit
  
- **Current Account**
  - Monthly service charges
  
- **Fixed Deposit**
  - Higher interest rate for term deposits

## 📸 Screenshots

### Admin Dashboard
![Admin Dashboard](https://via.placeholder.com/800x400?text=Admin+Dashboard)

### Customer Portal
![Customer Portal](https://via.placeholder.com/800x400?text=Customer+Portal)

### Transaction Processing
![Transactions](https://via.placeholder.com/800x400?text=Transaction+Processing)

## 🔮 Future Enhancements

### Backend Integration
- [ ] PostgreSQL/MySQL database integration
- [ ] RESTful API with Node.js/Express
- [ ] JWT authentication

### Advanced Features
- [ ] Loan management with EMI calculations
- [ ] Automatic interest calculation and posting
- [ ] Scheduled transactions
- [ ] Multi-currency support
- [ ] Document upload and KYC management

### Reporting & Analytics
- [ ] Financial reports and statements
- [ ] PDF/Excel/CSV export functionality
- [ ] Predictive analytics dashboard

### Security Enhancements
- [ ] Two-factor authentication (2FA)
- [ ] Biometric authentication
- [ ] Enhanced data encryption
- [ ] Auto-logout and session timeout


### Development Guidelines

- Follow existing code style and structure
- Add comments for complex logic
- Test all changes thoroughly
- Update documentation as needed

## 🐛 Troubleshooting

### Common Issues

**Dependencies not installing**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Development server not starting**
- Check if port 5173 is already in use
- Ensure Node.js and npm are properly installed

**Login not working**
- Verify CNIC format: `XXXXX-XXXXXXX-X`
- Check password matches default credentials

### Browser Compatibility

✅ Google Chrome (latest)  
✅ Mozilla Firefox (latest)  
✅ Safari (latest)  
✅ Microsoft Edge (latest)

---

## 📄 License

This project is created for educational purposes as part of a university course assignment.

---
## 👥 Authors

- **Ayesha rauf**  - [https://github.com/ayesha189]

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Charts powered by [Recharts](https://recharts.org/)



---

## ⭐ Show Your Support

If you found this project helpful or interesting, please consider giving it a ⭐!

---

