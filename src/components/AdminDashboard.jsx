import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { FiTrendingUp, FiUsers, FiUserPlus, FiAlertCircle, FiHome, FiUser, FiCreditCard, FiCalendar, FiMail, FiLogOut, FiActivity, FiTrash2, FiMenu, FiX } from 'react-icons/fi';
import '../css/AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function AdminDashboard() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('dashboard');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- Data States ---
    const [users, setUsers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [revenue, setRevenue] = useState({});
    const [activeMembers, setActiveMembers] = useState([]);
    const [expiredMembers, setExpiredMembers] = useState([]);
    const [expiringSoonMembers, setExpiringSoonMembers] = useState([]);
    const [membershipDistribution, setMembershipDistribution] = useState({ labels: [], data: [] });
    const [newMembersThisMonth, setNewMembersThisMonth] = useState(0);

    // --- Form States ---
    const [newMembership, setNewMembership] = useState({ name: '', durationInMonths: '', fee: '' });
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userPayments, setUserPayments] = useState({ payments: [], daysLeft: null });
    const [reminderMessage, setReminderMessage] = useState('');
    const [customRevenueDates, setCustomRevenueDates] = useState({ startDate: '', endDate: '' });

    // --- Effects ---
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [usersData, membershipsData, revenueData] = await Promise.all([
                apiCall('/admin/users/all'),
                apiCall('/admin/memberships/all'),
                apiCall('/api/payments/revenue')
            ]);
            if (usersData && membershipsData && revenueData) {
                setUsers(usersData);
                setMemberships(membershipsData);
                setRevenue(revenueData);
                processUserData(usersData, membershipsData);
            }
        } catch (error) {
            showMessage("Failed to load dashboard data.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Data Processing Logic ---
    const processUserData = (allUsers, allMemberships) => {
        const now = new Date();
        let newMembersCount = 0;
        let expired = [];
        let expiringSoon = [];
        let active = [];

        const membershipCounts = allMemberships.reduce((acc, m) => { acc[m.name] = 0; return acc; }, {});

        allUsers.forEach(user => {
            const joinDate = new Date(user.joinDate);
            if (joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear()) {
                newMembersCount++;
            }

            if (user.payments && user.payments.length > 0) {
                const latestPayment = user.payments[0];
                const nextDueDate = new Date(latestPayment.nextDueDate);
                const daysLeft = Math.ceil((nextDueDate - now) / (1000 * 60 * 60 * 24));
                const userWithStatus = { ...user, daysLeft, nextDueDate: nextDueDate.toDateString() };

                if (daysLeft < 0) {
                    expired.push(userWithStatus);
                } else if (daysLeft <= 7) {
                    expiringSoon.push(userWithStatus);
                } else {
                    active.push(userWithStatus);
                }

                if (user.membership && membershipCounts.hasOwnProperty(user.membership.name)) {
                    membershipCounts[user.membership.name]++;
                }
            }
        });

        expired.sort((a, b) => a.daysLeft - b.daysLeft);
        expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft);
        active.sort((a, b) => b.daysLeft - a.daysLeft);

        setActiveMembers(active.slice(0, 5));
        setExpiredMembers(expired.slice(0, 5));
        setExpiringSoonMembers(expiringSoon.slice(0, 5));
        setMembershipDistribution({ labels: Object.keys(membershipCounts), data: Object.values(membershipCounts) });
        setNewMembersThisMonth(newMembersCount);
    };

    // --- API Fetching ---
    const apiCall = async (url, options = {}) => {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, { headers: { 'Content-Type': 'application/json' }, ...options });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("API Call Failed:", error);
            throw error;
        }
    };

    // --- Action Handlers ---
    const showMessage = (text, type) => { setMessage({ text, type }); setTimeout(() => setMessage({ text: '', type: '' }), 5000); };
    const handleLogout = () => { localStorage.removeItem('isLoggedIn'); navigate('/login', { replace: true }); };
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    
    const handleAddMembership = async (e) => {
        e.preventDefault();
        try {
            const result = await apiCall('/admin/memberships/add', { method: 'POST', body: JSON.stringify(newMembership) });
            showMessage(result, 'success');
            setNewMembership({ name: '', durationInMonths: '', fee: '' });
            fetchInitialData();
        } catch (error) {
            showMessage("Failed to add membership.", 'error');
        }
    };

    const handleDeleteMembership = async (id) => {
        if (window.confirm('Are you sure you want to delete this membership plan?')) {
            try {
                const result = await apiCall(`/admin/memberships/delete/${id}`, { method: 'DELETE' });
                if (result) {
                    showMessage(result, 'success');
                    fetchInitialData();
                }
            } catch (error) {
                showMessage("Failed to delete membership.", 'error');
            }
        }
    };

    const handleFetchUserPayments = async () => {
        if (!selectedUserId) { showMessage('Please enter a User ID', 'error'); return; }
        const data = await apiCall(`/api/payments/user/${selectedUserId}`);
        if (data) setUserPayments(data);
    };

    const handleGetReminder = async () => {
        if (!selectedUserId) { showMessage('Please enter a User ID', 'error'); return; }
        const data = await apiCall(`/api/reminder/message/${selectedUserId}`);
        if (data) setReminderMessage(data.message || 'No message found.');
    };

    const handleSendReminderEmail = async () => {
        if (!selectedUserId) { showMessage('Please enter a User ID', 'error'); return; }
        const data = await apiCall(`/api/reminder/send/${selectedUserId}`, { method: 'POST' });
        if (data) showMessage(data.status, 'success');
    };
    
    const handleFetchCustomRevenue = async () => {
        if (!customRevenueDates.startDate || !customRevenueDates.endDate) {
            showMessage('Please provide both start and end dates.', 'error');
            return;
        }
        const data = await apiCall(`/api/payments/revenue/custom?startDate=${customRevenueDates.startDate}&endDate=${customRevenueDates.endDate}`);
        if(data) {
            showMessage(`Custom Revenue: $${data.customRevenue}`, 'success');
        }
    };

    const generateWhatsAppMessage = (daysLeft) => {
        if (daysLeft < 0) return `Hello from VipGym! Your membership expired ${Math.abs(daysLeft)} days ago. Please renew to continue enjoying our services.`;
        if (daysLeft <= 7) return `Hello from VipGym! Your membership will expire in ${daysLeft} days. Renew soon to avoid interruption!`;
        return "Hello from VipGym!";
    };

    const handleSendWhatsApp = (user) => {
        const phoneNumber = user.mobileNumber?.replace(/\D/g, '');
        if (!phoneNumber) { showMessage('User does not have a valid mobile number.', 'error'); return; }
        const message = generateWhatsAppMessage(user.daysLeft);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    // --- FIX: Chart Data is now fully defined ---
    const revenueChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Monthly Revenue',
            data: [3000, 4500, 5200, 4800, 6100, 5500, 7200, 6900, 8000, 9100, 10500, revenue.monthlyRevenue || 0],
            borderColor: 'rgb(102, 126, 234)',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.3,
        }],
    };

    const membershipChartData = {
        labels: membershipDistribution.labels,
        datasets: [{
            label: 'Members per Plan',
            data: membershipDistribution.data,
            backgroundColor: ['rgba(102, 126, 234, 0.8)', 'rgba(118, 75, 162, 0.8)', 'rgba(40, 167, 69, 0.8)', 'rgba(255, 193, 7, 0.8)'],
            borderWidth: 0,
        }],
    };

    // --- Render Functions ---
    const renderLoadingSkeleton = () => (
        <div className="content-area animate-fade-in">
            <div className="dashboard-grid"><div className="skeleton" style={{height: '120px'}}></div><div className="skeleton" style={{height: '120px'}}></div><div className="skeleton" style={{height: '120px'}}></div><div className="skeleton" style={{height: '120px'}}></div></div>
            <div className="dashboard-grid" style={{ marginTop: '1rem' }}><div className="skeleton" style={{height: '400px'}}></div><div className="skeleton" style={{height: '400px'}}></div></div>
        </div>
    );
    
    const renderDashboard = () => (
        <div className="animate-fade-in">
            <div className="dashboard-grid">
                <div className="card kpi-card revenue"><div className="icon"><FiTrendingUp /></div><div className="kpi-details"><h3>Total Revenue</h3><p>${revenue.totalRevenue || 0}</p></div></div>
                <div className="card kpi-card members"><div className="icon"><FiUsers /></div><div className="kpi-details"><h3>Active Members</h3><p>{activeMembers.length}</p></div></div>
                <div className="card kpi-card new-members"><div className="icon"><FiUserPlus /></div><div className="kpi-details"><h3>New This Month</h3><p>{newMembersThisMonth}</p></div></div>
                <div className="card kpi-card expiring"><div className="icon"><FiAlertCircle /></div><div className="kpi-details"><h3>Expiring Soon</h3><p>{expiringSoonMembers.length}</p></div></div>
            </div>
            <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <div className="card"><h2 className="card-title">Revenue Trend</h2><div style={{ height: '300px', position: 'relative' }}><Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div>
                <div className="card"><h2 className="card-title">Membership Distribution</h2><div style={{ height: '300px', position: 'relative' }}><Doughnut data={membershipChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div>
            </div>
            <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <div className="card"><h2 className="card-title"><FiActivity /> Most Active Members</h2><ul className="member-list">{activeMembers.map(user => (<li key={user.id}><div className="member-info"><p>{user.fullName}</p><span>{user.membership?.name} - {user.daysLeft} days left</span></div><span className="member-status status-active">Active</span></li>))}</ul></div>
                <div className="card"><h2 className="card-title"><FiAlertCircle /> Expiring Soon</h2><ul className="member-list">{expiringSoonMembers.map(user => (<li key={user.id}><div className="member-info"><p>{user.fullName}</p><span>{user.membership?.name} - {user.daysLeft} days left</span></div><span className="member-status status-expiring">Expiring</span></li>))}</ul></div>
            </div>
            <div className="card" style={{ marginTop: '1rem' }}>
                <h2 className="card-title"><FiX /> Expired Members</h2>
                <ul className="member-list">{expiredMembers.length > 0 ? expiredMembers.map(user => (<li key={user.id}><div className="member-info"><p>{user.fullName}</p><span>Expired {Math.abs(user.daysLeft)} days ago</span></div><span className="member-status status-expired">Expired</span></li>)) : <p>No expired members.</p>}</ul>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="card animate-fade-in">
            <h2 className="card-title">All Users</h2>
            <div className="table-container">
                <table className="data-table">
                    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Membership</th><th>Actions</th></tr></thead>
                    <tbody>{users.map(user => (<tr key={user.id}><td>{user.id}</td><td>{user.fullName}</td><td>{user.email}</td><td>{user.membership?.name || 'N/A'}</td><td><button onClick={() => handleSendWhatsApp(user)}>WhatsApp</button></td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );

    const renderMemberships = () => (
        <div className="animate-fade-in">
            <div className="card">
                <h2 className="card-title">Add New Membership Plan</h2>
                <form onSubmit={handleAddMembership}>
                    <div className="dashboard-grid grid-cols-3">
                        <div className="form-group"><label>Name</label><input type="text" value={newMembership.name} onChange={(e) => setNewMembership({...newMembership, name: e.target.value})} required /></div>
                        <div className="form-group"><label>Duration (Months)</label><input type="number" value={newMembership.durationInMonths} onChange={(e) => setNewMembership({...newMembership, durationInMonths: e.target.value})} required /></div>
                        <div className="form-group"><label>Fee</label><input type="number" step="0.01" value={newMembership.fee} onChange={(e) => setNewMembership({...newMembership, fee: e.target.value})} required /></div>
                    </div>
                    <button type="submit">Add Plan</button>
                </form>
            </div>
            <div className="card" style={{marginTop: '1.5rem'}}>
                <h2 className="card-title">Existing Plans</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>ID</th><th>Name</th><th>Duration</th><th>Fee</th><th>Actions</th></tr></thead>
                        <tbody>{memberships.map(m => (<tr key={m.id}><td>{m.id}</td><td>{m.name}</td><td>{m.durationInMonths} months</td><td>${m.fee}</td><td><button className="delete-btn" onClick={() => handleDeleteMembership(m.id)}><FiTrash2/></button></td></tr>))}</tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderPayments = () => (
        <div className="card animate-fade-in">
            <h2 className="card-title">Payment History</h2>
            <div className="form-group">
                <label>User ID</label>
                <input type="number" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} placeholder="Enter User ID" />
            </div>
            <button onClick={handleFetchUserPayments}>Fetch Payments</button>
            {userPayments.payments.length > 0 && (
                <div style={{marginTop: '1rem'}}>
                    <p><strong>Days Left for Plan:</strong> {userPayments.daysLeftForPlan}</p>
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Receipt</th></tr></thead>
                            <tbody>{userPayments.payments.map(p => (<tr key={p.id}><td>{p.paymentDate}</td><td>${p.amount}</td><td>{p.paymentMethod}</td><td><a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">View</a></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );

    const renderReminders = () => (
        <div className="card animate-fade-in">
            <h2 className="card-title">Send Reminder</h2>
            <div className="form-group"><label>User ID</label><input type="number" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} placeholder="Enter User ID" /></div>
            <button onClick={handleGetReminder}>Generate Message</button>
            <button onClick={handleSendReminderEmail} style={{marginLeft: '10px'}}>Send Email</button>
            {reminderMessage && (<div className="card" style={{marginTop: '1rem', background: '#eef'}}><h3>Generated Message:</h3><p>{reminderMessage}</p></div>)}
        </div>
    );

    return (
        <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            <aside className="sidebar animate-slide-in">
                <h2>VipGym Admin</h2>
                <button className={`nav-link ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveSection('dashboard'); toggleSidebar(); }}><FiHome /> Dashboard</button>
                <button className={`nav-link ${activeSection === 'users' ? 'active' : ''}`} onClick={() => { setActiveSection('users'); toggleSidebar(); }}><FiUser /> Users</button>
                <button className={`nav-link ${activeSection === 'memberships' ? 'active' : ''}`} onClick={() => { setActiveSection('memberships'); toggleSidebar(); }}><FiCreditCard /> Memberships</button>
                <button className={`nav-link ${activeSection === 'payments' ? 'active' : ''}`} onClick={() => { setActiveSection('payments'); toggleSidebar(); }}><FiCalendar /> Payments</button>
                <button className={`nav-link ${activeSection === 'reminders' ? 'active' : ''}`} onClick={() => { setActiveSection('reminders'); toggleSidebar(); }}><FiMail /> Reminders</button>
                <button className="nav-link logout" onClick={handleLogout}><FiLogOut /> Logout</button>
            </aside>
            <div className="sidebar-overlay" onClick={toggleSidebar}></div>
            <main className="main-content">
                <header className="dashboard-header">
                    <button className="hamburger" onClick={toggleSidebar}>{isSidebarOpen ? <FiX /> : <FiMenu />}</button>
                    <h1>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
                </header>
                {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
                {isLoading ? renderLoadingSkeleton() : (
                    <div className="content-area">
                        <section className={`section ${activeSection === 'dashboard' ? 'active' : ''}`}>{renderDashboard()}</section>
                        <section className={`section ${activeSection === 'users' ? 'active' : ''}`}>{renderUsers()}</section>
                        <section className={`section ${activeSection === 'memberships' ? 'active' : ''}`}>{renderMemberships()}</section>
                        <section className={`section ${activeSection === 'payments' ? 'active' : ''}`}>{renderPayments()}</section>
                        <section className={`section ${activeSection === 'reminders' ? 'active' : ''}`}>{renderReminders()}</section>
                    </div>
                )}
            </main>
        </div>
    );
}

export default AdminDashboard;