export interface Customer {
  id: number;
  name: string;
  cnic: string;
  contact: string;
  email: string;
  address: string;
  dob: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdAt: string;
  password?: string; // Added for auth
}

export interface Account {
  accountNo: number;
  customerId: number;
  accountType: 'Savings' | 'Current' | 'Fixed Deposit';
  balance: number;
  status: 'Active' | 'Closed' | 'Frozen' | 'Inactive';
  openingDate: string;
  lastTransactionDate: string | null;

  // EERD Specific Attributes for Subtypes
  interestRate?: number;      // For Savings (and Fixed Deposit)
  withdrawLimit?: number;     // For Savings
  serviceCharges?: number;    // For Current
}

export interface Transaction {
  transId: number;
  fromAccount?: number;
  toAccount?: number;
  amount: number;
  type: 'Deposit' | 'Withdrawal' | 'Transfer';
  description: string;
  dateTime: string;
  status: 'Completed' | 'Failed' | 'Rolled Back';

  // EERD Specific Attributes
  withdrawalMethod?: 'ATM' | 'Online' | 'Cheque' | 'Branch'; // For Withdrawal subtype
}

export interface AuditLogEntry {
  logId: number;
  operation: string;
  tableAffected: string;
  recordId?: number;
  userAction: string;
  tclCommand: 'BEGIN' | 'COMMIT' | 'ROLLBACK' | 'SAVEPOINT' | null;
  dateTime: string;
  statusMessage: string;
  sqlQuery?: string;
}

export interface Complaint {
  id: number;
  customerId: number;
  description: string;
  date: string;
  status: 'Pending' | 'Resolved';
  adminResponse?: string; // Added for Admin reply
}

export interface PasswordResetRequest {
  id: number;
  cnic: string;
  name: string;
  newPassword: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
}

export interface TCLScenarioStep {
  step: number;
  action: string; // e.g., "BEGIN", "UPDATE", "CHECK"
  description: string;
  sql: string;
  isError?: boolean;
  stateSnapshot?: any; // To visualize data at this step
}