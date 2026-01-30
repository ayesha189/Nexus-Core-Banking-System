


import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Activity, ShieldCheck, Database, Menu, X, LogOut, MessageSquare } from 'lucide-react';
import { Customer } from './types';

// Admin Components
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import AuditLog from './components/AuditLog';
import AdminComplaints from './components/AdminComplaints';

// New Components
import CoverPage from './components/CoverPage';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import CustomerDashboard from './components/customer/CustomerDashboard';

// Admin Sidebar
const AdminSidebar = ({ onLogout }: { onLogout: () => void }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const SidebarLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center space-x-3 px-6 py-3 transition-colors ${isActive
          ? 'bg-blue-800 text-white border-r-4 border-yellow-400'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden fixed top-4 left-4 z-50 text-slate-800 bg-white p-2 rounded shadow">
        <Menu size={24} />
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-xl`}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950">
          <div className="flex items-center space-x-2">
            <Database className="text-blue-500" size={28} />
            <span className="text-xl font-bold tracking-tight brand-font">NEXUS<span className="text-blue-500">CBS</span></span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="py-6 space-y-1">
          <div className="px-6 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Core Modules</div>
          <SidebarLink to="/admin" icon={LayoutDashboard} label="Dashboard" />
          <SidebarLink to="/admin/customers" icon={Users} label="Customers" />
          <SidebarLink to="/admin/accounts" icon={CreditCard} label="Accounts" />
          <SidebarLink to="/admin/transactions" icon={Activity} label="Transactions" />

          <div className="px-6 mt-8 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Support</div>
          <SidebarLink to="/admin/complaints" icon={MessageSquare} label="Complaints" />

          <div className="px-6 mt-8 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">System & Security</div>
          <SidebarLink to="/admin/audit-log" icon={ShieldCheck} label="Audit Logs" />
        </div>

        <div className="absolute bottom-0 w-full p-6 bg-slate-950 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center text-slate-400 hover:text-white transition-colors w-full">
            <LogOut size={18} className="mr-2" /> Logout Admin
          </button>
        </div>
      </aside>
    </>
  );
};

// Admin Layout
const AdminLayout = ({ children, onLogout }: any) => (
  <div className="flex h-screen bg-slate-100 overflow-hidden">
    <AdminSidebar onLogout={onLogout} />
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10 pl-16 md:pl-6">
        <div className="flex items-center text-slate-500 text-sm">
          <span className="font-semibold">Administration Portal</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
            Admin Mode
          </span>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  </div>
);

const App = () => {
  // Simple session persistence
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('cbs_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('cbs_role') === 'admin');

  const handleLogin = (user: any, admin: boolean) => {
    setCurrentUser(user);
    setIsAdmin(admin);
    localStorage.setItem('cbs_session', JSON.stringify(user));
    localStorage.setItem('cbs_role', admin ? 'admin' : 'customer');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    localStorage.removeItem('cbs_session');
    localStorage.removeItem('cbs_role');
  };

  const handleProfileUpdate = (updatedUser: Customer) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('cbs_session', JSON.stringify(updatedUser));
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<CoverPage />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<Signup />} />

        {/* Customer Route */}
        <Route path="/customer" element={
          currentUser && !isAdmin ? (
            <CustomerDashboard user={currentUser} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />
          ) : <Navigate to="/login" />
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          currentUser && isAdmin ? (
            <AdminLayout onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="customers" element={<Customers />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="complaints" element={<AdminComplaints />} />
                <Route path="audit-log" element={<AuditLog />} />
              </Routes>
            </AdminLayout>
          ) : <Navigate to="/login" />
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
