import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    FiTrendingUp,
    FiUsers,
    FiUserPlus,
    FiAlertCircle,
    FiHome,
    FiUser,
    FiCreditCard,
    FiLogOut,
    FiActivity,
    FiTrash2,
    FiMenu,
    FiX,
    FiDollarSign,
    FiDownload,
    FiSearch,
    FiEdit,
    FiEye,
    FiRefreshCw,
    FiClock,
    FiSend,
    FiMessageSquare,
    FiPlus,
    FiFilter,
    FiChevronDown,
    FiChevronLeft,
    FiSettings,
    FiImage,
    FiUserCheck,
    FiUserX,
    FiGrid,
    FiList,
    FiPrinter,
    FiAtSign,
    FiMoreVertical
} from 'react-icons/fi';
import '../css/AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function AdminDashboard() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('dashboard');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [memberFilter, setMemberFilter] = useState('active');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30000);
    const intervalRef = useRef(null);
    const [viewMode, setViewMode] = useState('grid');

    // Data States
    const [users, setUsers] = useState([]);
    const [memberships, setMemberships] = useState([]);
    const [payments, setPayments] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [revenue, setRevenue] = useState({});
    const [activeMembers, setActiveMembers] = useState([]);
    const [expiredMembers, setExpiredMembers] = useState([]);
    const [expiringSoonMembers, setExpiringSoonMembers] = useState([]);
    const [pendingPaymentMembers, setPendingPaymentMembers] = useState([]);
    const [membershipDistribution, setMembershipDistribution] = useState({ labels: [], data: [] });
    const [newMembersThisMonth, setNewMembersThisMonth] = useState(0);

    // Form States
    const [newMembership, setNewMembership] = useState({ name: '', durationInMonths: '', fee: '' });
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPayments, setUserPayments] = useState({ payments: [], daysLeft: null });
    const [reminderMessage, setReminderMessage] = useState('');
    const [editingMembership, setEditingMembership] = useState(null);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showMembershipModal, setShowMembershipModal] = useState(false);
    const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showMarkPaymentModal, setShowMarkPaymentModal] = useState(false);
    const [markPaymentForm, setMarkPaymentForm] = useState({
        userId: '',
        amount: '',
        paymentMethod: 'CASH',
        remarks: '',
        nextDueDate: ''
    });
    const [showSwitchMembershipModal, setShowSwitchMembershipModal] = useState(false);
    const [switchMembershipForm, setSwitchMembershipForm] = useState({
        userId: '',
        newMembershipId: ''
    });

    // Dropdown states
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRefs = useRef({});

    // Effects
    useEffect(() => {
        fetchInitialData();

        if (autoRefresh) {
            intervalRef.current = setInterval(() => {
                fetchDashboardData();
            }, refreshInterval);
        }

        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsSidebarOpen(false);
            }
        };

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (activeDropdown && !event.target.closest('.dropdown-container')) {
                setActiveDropdown(null);
            }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousedown', handleClickOutside);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoRefresh, refreshInterval]);

    // Handle dropdown clicks
    const handleDropdownClick = (e, dropdownId) => {
        e.stopPropagation();
        const newActive = activeDropdown === dropdownId ? null : dropdownId;
        setActiveDropdown(newActive);
    };

    // API Functions
    const apiCall = async (url, options = {}) => {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                if (data && typeof data === 'object' && data.message) {
                    return data.message;
                }
                return data;
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error("API Call Failed:", error);
            throw error;
        }
    };

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [usersResponse, membershipsResponse, paymentsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/users/all`),
                fetch(`${API_BASE_URL}/admin/memberships/all`),
                fetch(`${API_BASE_URL}/api/payments/history/all`)
            ]);

            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                setUsers(usersData);
                processUserData(usersData);
            }

            if (membershipsResponse.ok) {
                const membershipsData = await membershipsResponse.json();
                setMemberships(membershipsData);
            }

            if (paymentsResponse.ok) {
                const paymentsData = await paymentsResponse.json();
                setPayments(paymentsData);
                setAllPayments(paymentsData);
                processPaymentData(paymentsData);
            }

            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error fetching initial data:", error);
            showMessage(`Failed to load dashboard data: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const [usersResponse, paymentsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/users/all`),
                fetch(`${API_BASE_URL}/api/payments/history/all`)
            ]);

            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                setUsers(usersData);
                processUserData(usersData);
            }

            if (paymentsResponse.ok) {
                const paymentsData = await paymentsResponse.json();
                setPayments(paymentsData);
                setAllPayments(paymentsData);
                processPaymentData(paymentsData);
            }

            setLastUpdated(new Date());
        } catch (error) {
            console.error("Failed to refresh dashboard data:", error);
        }
    };

    // Data Processing
    const processUserData = (allUsers) => {
        const now = new Date();
        let newMembersCount = 0;
        let expired = [];
        let expiringSoon = [];
        let active = [];
        let pendingPayments = [];

        const membershipCounts = memberships.reduce((acc, m) => {
            acc[m.name] = 0;
            return acc;
        }, {});

        allUsers.forEach(user => {
            const joinDate = new Date(user.joinDate);
            if (joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear()) {
                newMembersCount++;
            }

            if (user.payments && user.payments.length > 0) {
                const latestPayment = user.payments[0];
                const nextDueDate = new Date(latestPayment.nextDueDate);
                const daysLeft = Math.ceil((nextDueDate - now) / (1000 * 60 * 60 * 24));

                if (user.membership) {
                    const totalPaid = user.payments.reduce((sum, payment) => sum + payment.amount, 0);
                    const totalFee = user.membership.fee;

                    if (totalPaid < totalFee) {
                        pendingPayments.push({
                            ...user,
                            daysLeft,
                            nextDueDate: nextDueDate.toDateString(),
                            totalPaid,
                            totalFee,
                            pendingAmount: totalFee - totalPaid
                        });
                    }
                }

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

        setActiveMembers(active.slice(0, 5));
        setExpiredMembers(expired);
        setExpiringSoonMembers(expiringSoon);
        setPendingPaymentMembers(pendingPayments);
        setMembershipDistribution({
            labels: Object.keys(membershipCounts),
            data: Object.values(membershipCounts)
        });
        setNewMembersThisMonth(newMembersCount);
    };

    const processPaymentData = (allPayments) => {
        const monthlyRevenue = Array(12).fill(0);
        let totalRevenue = 0;
        let todayRevenue = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        allPayments.forEach(payment => {
            const paymentDate = new Date(payment.paymentDate);
            const month = paymentDate.getMonth();
            monthlyRevenue[month] += payment.amount;
            totalRevenue += payment.amount;

            if (paymentDate >= today) {
                todayRevenue += payment.amount;
            }
        });

        setRevenue({
            monthlyRevenue,
            totalRevenue,
            todayRevenue
        });
    };

    // Action Handlers
    const showMessage = (text, type) => {
        const messageText = typeof text === 'object' ? JSON.stringify(text) : String(text);
        setMessage({ text: messageText, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        navigate('/login', { replace: true });
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleRefreshData = async () => {
        setIsRefreshing(true);
        try {
            await fetchInitialData();
            showMessage("Dashboard data refreshed successfully", 'success');
        } catch (error) {
            showMessage("Failed to refresh data", 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleViewUserDetails = async (userId) => {
        try {
            const userData = await apiCall(`/admin/users/${userId}`);
            if (userData) {
                setSelectedUser(userData);
                setShowUserDetails(true);
            }
        } catch (error) {
            showMessage("Failed to fetch user details", 'error');
        }
    };

    const handleViewPaymentHistory = async (userId) => {
        try {
            const data = await apiCall(`/api/payments/user/${userId}`);
            if (data) {
                setUserPayments(data);
                setShowPaymentModal(true);
            }
        } catch (error) {
            showMessage("Failed to fetch payment history", 'error');
        }
    };

    const handleSwitchMembership = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/memberships/switch/${switchMembershipForm.userId}/${switchMembershipForm.newMembershipId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const result = await response.json();
                showMessage(result.message || 'Membership switched successfully', 'success');
                setShowSwitchMembershipModal(false);
                fetchInitialData();
                if (showUserDetails && selectedUser && selectedUser.id === switchMembershipForm.userId) {
                    handleViewUserDetails(switchMembershipForm.userId);
                }
            } else {
                throw new Error('Failed to switch membership');
            }
        } catch (error) {
            showMessage("Failed to switch membership: " + error.message, 'error');
        }
    };

    const openSwitchMembershipModal = (user) => {
        if (!user) {
            showMessage("Invalid user data", 'error');
            return;
        }

        setSwitchMembershipForm({
            userId: user.id,
            newMembershipId: user.membership?.id || ''
        });
        setShowSwitchMembershipModal(true);
    };

    const handleBlockUser = async (userId) => {
        if (window.confirm('Are you sure you want to block this user?')) {
            try {
                const result = await apiCall(`/admin/users/block/${userId}`, { method: 'POST' });
                showMessage(result || 'User blocked successfully', 'success');
                fetchInitialData();
                if (showUserDetails && selectedUser && selectedUser.id === userId) {
                    handleViewUserDetails(userId);
                }
            } catch (error) {
                showMessage("Failed to block user", 'error');
            }
        }
    };

    const handleUnblockUser = async (userId) => {
        if (window.confirm('Are you sure you want to unblock this user?')) {
            try {
                const result = await apiCall(`/admin/users/unblock/${userId}`, { method: 'POST' });
                showMessage(result || 'User unblocked successfully', 'success');
                fetchInitialData();
                if (showUserDetails && selectedUser && selectedUser.id === userId) {
                    handleViewUserDetails(userId);
                }
            } catch (error) {
                showMessage("Failed to unblock user", 'error');
            }
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user and all related data?')) {
            try {
                const result = await apiCall(`/admin/users/delete/${userId}`, { method: 'DELETE' });
                showMessage(result || 'User deleted successfully', 'success');
                fetchInitialData();
                setShowUserDetails(false);
            } catch (error) {
                showMessage("Failed to delete user", 'error');
            }
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (window.confirm('Are you sure you want to delete this payment record?')) {
            try {
                const result = await apiCall(`/api/payments/history/${paymentId}`, { method: 'DELETE' });
                showMessage(result || 'Payment deleted successfully', 'success');
                fetchInitialData();
                if (showPaymentModal && selectedUser) {
                    handleViewPaymentHistory(selectedUser.id);
                }
                if (showPaymentDetailsModal) {
                    setShowPaymentDetailsModal(false);
                }
            } catch (error) {
                showMessage("Failed to delete payment", 'error');
            }
        }
    };

    const handleExportPaymentHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/payments/history/export/csv`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'payment_history.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showMessage("Payment history exported successfully", 'success');
            } else {
                throw new Error(`Failed to export payment history: ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to export payment history:", error);
            showMessage("Failed to export payment history", 'error');
        }
    };

    const handleViewImage = (imageUrl) => {
        setSelectedImage(imageUrl);
        setShowImageModal(true);
    };

    // Unified WhatsApp function that always uses the backend endpoint
    const handleSendWhatsApp = (user, payment = null, customMessage = null) => {
        const phoneNumber = user.mobileNumber?.replace(/\D/g, '');
        if (!phoneNumber) {
            showMessage('Member does not have a valid mobile number.', 'error');
            return;
        }

        let nextDueDate = '';

        // If we have a payment object, use its nextDueDate
        if (payment?.nextDueDate) {
            nextDueDate = payment.nextDueDate;
        }
        // Otherwise use the user's nextDueDate
        else if (user.nextDueDate) {
            nextDueDate = user.nextDueDate;
        }

        // Build the URL to our backend endpoint
        let whatsappUrl = `${API_BASE_URL}/api/whatsapp/send?phoneNumber=${phoneNumber}`;

        // Add nextDueDate if available
        if (nextDueDate) {
            whatsappUrl += `&nextDueDate=${nextDueDate}`;
        }

        console.log("Sending WhatsApp via backend:", whatsappUrl);

        // Open the backend endpoint which will redirect to WhatsApp
        window.open(whatsappUrl, '_blank');
    };

    const fetchReminderMessage = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reminder/message/${userId}`);
            if (response.ok) {
                const data = await response.json();
                return data.message;
            } else {
                throw new Error('Failed to fetch reminder message');
            }
        } catch (error) {
            console.error("Failed to fetch reminder message:", error);
            throw error;
        }
    };

    const handleSendReminder = async (userId) => {
        try {
            const message = await fetchReminderMessage(userId);
            const userData = await apiCall(`/admin/users/${userId}`);
            if (userData) {
                setSelectedUser(userData);
                setReminderMessage(message);
                setShowReminderModal(true);
            }
        } catch (error) {
            showMessage("Failed to prepare reminder: " + error.message, 'error');
        }
    };

    const handleSendEmailReminder = async () => {
        if (!selectedUser) {
            showMessage("No user selected", 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/reminder/send/${selectedUser.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const result = await response.json();
                showMessage(result.status || 'Email sent successfully', 'success');
                setShowReminderModal(false);
            } else {
                throw new Error('Failed to send email reminder');
            }
        } catch (error) {
            showMessage("Failed to send email reminder: " + error.message, 'error');
        }
    };

    // Now uses the unified handleSendWhatsApp function
    const handleSendWhatsAppReminder = () => {
        if (!selectedUser) {
            showMessage("No user selected", 'error');
            return;
        }

        // Use the unified WhatsApp function
        handleSendWhatsApp(selectedUser, null, reminderMessage);
    };

    const handleViewPaymentDetails = (payment) => {
        setSelectedPayment(payment);
        setShowPaymentDetailsModal(true);
    };

    const handleAddMembership = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/memberships/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMembership)
            });

            if (response.ok) {
                const result = await response.json();
                showMessage(result.message || 'Membership added successfully', 'success');
                setShowMembershipModal(false);
                setNewMembership({ name: '', durationInMonths: '', fee: '' });
                fetchInitialData();
            } else {
                throw new Error('Failed to add membership');
            }
        } catch (error) {
            showMessage("Failed to add membership", 'error');
        }
    };

    const handleUpdateMembership = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/memberships/update/${editingMembership.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingMembership)
            });

            if (response.ok) {
                const result = await response.json();
                showMessage(result.message || 'Membership updated successfully', 'success');
                setShowMembershipModal(false);
                setEditingMembership(null);
                fetchInitialData();
            } else {
                throw new Error('Failed to update membership');
            }
        } catch (error) {
            showMessage("Failed to update membership", 'error');
        }
    };

    const handleDeleteMembership = async (membershipId) => {
        if (window.confirm('Are you sure you want to delete this membership plan?')) {
            try {
                const result = await apiCall(`/admin/memberships/delete/${membershipId}`, { method: 'DELETE' });
                showMessage(result || 'Membership deleted successfully', 'success');
                fetchInitialData();
            } catch (error) {
                showMessage("Failed to delete membership", 'error');
            }
        }
    };

    const openMarkPaymentModal = (member) => {
        if (!member) {
            console.error("❌ openMarkPaymentModal: member is undefined");
            return;
        }
        console.log("✅ Opening payment modal for:", member.fullName);

        setMarkPaymentForm({
            userId: member.id,
            amount: '',
            paymentMethod: 'CASH',
            remarks: '',
            nextDueDate: member.nextDueDate || ''
        });
        setShowMarkPaymentModal(true);
    };

    const handleMarkPaymentSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/payments/mark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(markPaymentForm)
            });

            if (response.ok) {
                const result = await response.json();
                showMessage(result.message || 'Payment marked successfully', 'success');
                setShowMarkPaymentModal(false);
                fetchInitialData();
                if (showUserDetails && selectedUser && selectedUser.id === markPaymentForm.userId) {
                    handleViewUserDetails(selectedUser.id);
                }
            } else {
                throw new Error('Failed to mark payment');
            }
        } catch (error) {
            showMessage("Failed to mark payment", 'error');
        }
    };

    const handlePrintReceipt = (payment) => {
        if (!payment.receiptUrl) {
            showMessage("No receipt available for this payment", 'error');
            return;
        }

        const printWindow = window.open(payment.receiptUrl, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            showMessage("Failed to open receipt for printing", 'error');
        }
    };

    // Chart Data
    const revenueChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Monthly Revenue',
            data: revenue.monthlyRevenue || Array(12).fill(0),
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
            backgroundColor: [
                'rgba(102, 126, 234, 0.8)',
                'rgba(118, 75, 162, 0.8)',
                'rgba(40, 167, 69, 0.8)',
                'rgba(255, 193, 7, 0.8)'
            ],
            borderWidth: 0,
        }],
    };

    // Get filtered members
    const getFilteredMembers = () => {
        const allMembersWithStatus = users.map(user => {
            if (user.payments && user.payments.length > 0) {
                const latestPayment = user.payments[0];
                const nextDueDate = new Date(latestPayment.nextDueDate);
                const daysLeft = Math.ceil((nextDueDate - new Date()) / (1000 * 60 * 60 * 24));

                let pendingAmount = null;
                let totalPaid = 0;
                if (user.membership) {
                    totalPaid = user.payments.reduce((sum, payment) => sum + payment.amount, 0);
                    const totalFee = user.membership.fee;
                    if (totalPaid < totalFee) {
                        pendingAmount = totalFee - totalPaid;
                    }
                }

                return {
                    ...user,
                    daysLeft,
                    nextDueDate: nextDueDate.toDateString(),
                    pendingAmount,
                    totalPaid
                };
            }
            return user;
        });

        switch (memberFilter) {
            case 'active':
                return allMembersWithStatus.filter(member => member.status === 'ACTIVE');
            case 'inactive':
                return allMembersWithStatus.filter(member => member.status === 'INACTIVE');
            case 'expiring':
                return allMembersWithStatus.filter(member => member.daysLeft <= 7 && member.daysLeft >= 0);
            case 'expired':
                return allMembersWithStatus.filter(member => member.daysLeft < 0);
            case 'pending':
                return allMembersWithStatus.filter(member => member.pendingAmount !== null);
            default:
                return allMembersWithStatus;
        }
    };

    // Get filtered payments
    const getFilteredPayments = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (paymentFilter) {
            case 'today':
                return allPayments.filter(payment => {
                    const paymentDate = new Date(payment.paymentDate);
                    return paymentDate >= today;
                });
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return allPayments.filter(payment => {
                    const paymentDate = new Date(payment.paymentDate);
                    return paymentDate >= weekAgo;
                });
            case 'month':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return allPayments.filter(payment => {
                    const paymentDate = new Date(payment.paymentDate);
                    return paymentDate >= monthAgo;
                });
            default:
                return allPayments;
        }
    };

    // Render Functions
    const renderLoadingSkeleton = () => (
        <div className="content-area animate-fade-in">
            <div className="dashboard-grid">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="card kpi-card skeleton-card">
                        <div className="skeleton skeleton-icon"></div>
                        <div className="skeleton skeleton-text"></div>
                        <div className="skeleton skeleton-number"></div>
                    </div>
                ))}
            </div>
            <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                {[1, 2].map(i => (
                    <div key={i} className="card skeleton-card" style={{ height: '400px' }}></div>
                ))}
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="animate-fade-in">
            <div className="dashboard-header-controls">
                <div className="refresh-controls">
                    <button
                        className={`btn-refresh ${isRefreshing ? 'refreshing' : ''}`}
                        onClick={handleRefreshData}
                    >
                        <FiRefreshCw className={isRefreshing ? 'spin' : ''} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>

                    <button
                        className="btn-export"
                        onClick={handleExportPaymentHistory}
                    >
                        <FiDownload />
                        Export CSV
                    </button>

                    <div className="last-updated">
                        <FiClock />
                        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="card kpi-card revenue">
                    <div className="icon"><FiTrendingUp /></div>
                    <div className="kpi-details">
                        <h3>Total Revenue</h3>
                        <p>₹{(revenue.totalRevenue || 0).toFixed(2)}</p>
                        {revenue.todayRevenue > 0 && (
                            <span className="kpi-change positive">
                                +₹{revenue.todayRevenue.toFixed(2)} today
                            </span>
                        )}
                    </div>
                </div>
                <div className="card kpi-card members">
                    <div className="icon"><FiUsers /></div>
                    <div className="kpi-details">
                        <h3>Total Members</h3>
                        <p>{users.length}</p>
                        {newMembersThisMonth > 0 && (
                            <span className="kpi-change positive">
                                +{newMembersThisMonth} this month
                            </span>
                        )}
                    </div>
                </div>
                <div className="card kpi-card new-members">
                    <div className="icon"><FiUserPlus /></div>
                    <div className="kpi-details">
                        <h3>New This Month</h3>
                        <p>{newMembersThisMonth}</p>
                    </div>
                </div>
                <div className="card kpi-card expiring">
                    <div className="icon"><FiAlertCircle /></div>
                    <div className="kpi-details">
                        <h3>Expiring Soon</h3>
                        <p>{expiringSoonMembers.length}</p>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Cards */}
            <div className="mobile-nav-cards">
                <div className="nav-card" onClick={() => setActiveSection('members')}>
                    <div className="nav-card-icon">
                        <FiUser />
                    </div>
                    <div className="nav-card-content">
                        <h3>Members</h3>
                        <p>Manage gym members</p>
                    </div>
                    <div className="nav-card-arrow">
                        <FiChevronDown />
                    </div>
                </div>

                <div className="nav-card" onClick={() => setActiveSection('memberships')}>
                    <div className="nav-card-icon">
                        <FiCreditCard />
                    </div>
                    <div className="nav-card-content">
                        <h3>Memberships</h3>
                        <p>Manage membership plans</p>
                    </div>
                    <div className="nav-card-arrow">
                        <FiChevronDown />
                    </div>
                </div>

                <div className="nav-card" onClick={() => setActiveSection('payments')}>
                    <div className="nav-card-icon">
                        <FiDollarSign />
                    </div>
                    <div className="nav-card-content">
                        <h3>Payments</h3>
                        <p>View payment history</p>
                    </div>
                    <div className="nav-card-arrow">
                        <FiChevronDown />
                    </div>
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <div className="card">
                    <h2 className="card-title">Revenue Trend</h2>
                    <div style={{ height: '300px', position: 'relative' }}>
                        <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                </div>
                <div className="card">
                    <h2 className="card-title">Membership Distribution</h2>
                    <div style={{ height: '300px', position: 'relative' }}>
                        <Doughnut data={membershipChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <div className="card">
                    <h2 className="card-title"><FiActivity /> Recent Activity</h2>
                    <ul className="activity-list">
                        {activeMembers.slice(0, 5).map(user => (
                            <li key={user.id} className="activity-item">
                                <div className="activity-avatar">
                                    {user.profilePictureUrl ? (
                                        <img src={user.profilePictureUrl} alt={user.fullName} />
                                    ) : (
                                        user.fullName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="activity-content">
                                    <p className="activity-name">{user.fullName}</p>
                                    <span className="activity-detail">{user.membership?.name} - {user.daysLeft} days left</span>
                                </div>
                                <span className="activity-status status-active">Active</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="card">
                    <h2 className="card-title"><FiAlertCircle /> Urgent Actions</h2>
                    <ul className="activity-list">
                        {expiringSoonMembers.slice(0, 3).map(user => (
                            <li key={user.id} className="activity-item">
                                <div className="activity-avatar warning">
                                    <FiAlertCircle />
                                </div>
                                <div className="activity-content">
                                    <p className="activity-name">{user.fullName}</p>
                                    <span className="activity-detail">Expires in {user.daysLeft} days</span>
                                </div>
                                <span className="activity-status status-expiring">Expiring</span>
                            </li>
                        ))}
                        {pendingPaymentMembers.slice(0, 2).map(user => (
                            <li key={user.id} className="activity-item">
                                <div className="activity-avatar pending">
                                    <FiDollarSign />
                                </div>
                                <div className="activity-content">
                                    <p className="activity-name">{user.fullName}</p>
                                    <span className="activity-detail">₹{user.pendingAmount.toFixed(2)} pending</span>
                                </div>
                                <span className="activity-status status-pending">Pending</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );

    const renderMembers = () => {
        const filteredMembers = getFilteredMembers();
        const getFilterTitle = () => {
            switch (memberFilter) {
                case 'active': return 'Active Members';
                case 'inactive': return 'Inactive Members';
                case 'expiring': return 'Members Expiring Soon (7 days or less)';
                case 'expired': return 'Expired Members';
                case 'pending': return 'Members with Pending Payments';
                default: return 'All Members';
            }
        };

        return (
            <div className="animate-fade-in">
                <div className="card-header">
                    <h2 className="card-title">{getFilterTitle()}</h2>
                    <div className="header-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/register-user')}
                        >
                            <FiPlus /> Register New Member
                        </button>
                        <div className="filter-dropdown">
                            <FiFilter className="filter-icon" />
                            <select
                                value={memberFilter}
                                onChange={(e) => setMemberFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="active">Active Members</option>
                                <option value="inactive">Inactive Members</option>
                                <option value="expiring">Expiring Soon</option>
                                <option value="expired">Expired</option>
                                <option value="pending">Pending Payments</option>
                            </select>
                            <FiChevronDown className="dropdown-arrow" />
                        </div>
                        <div className="view-toggle">
                            <button
                                className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Grid View"
                            >
                                <FiGrid />
                            </button>
                            <button
                                className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                <FiList />
                            </button>
                        </div>
                        <div className="search-container">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>
                </div>

                {filteredMembers.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="members-grid">
                            {filteredMembers
                                .filter(member =>
                                    !searchTerm ||
                                    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    member.email.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map(member => {
                                    const status = getStatusBadge(member);
                                    const dropdownId = `member-${member.id}`;

                                    return (
                                        <div className="member-card compact" key={member.id}>
                                            <div className="member-card-header">
                                                <div
                                                    className="member-avatar"
                                                    onClick={() => member.profilePictureUrl && handleViewImage(member.profilePictureUrl)}
                                                >
                                                    {member.profilePictureUrl ? (
                                                        <img src={member.profilePictureUrl} alt={member.fullName} />
                                                    ) : (
                                                        member.fullName.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="member-info">
                                                    <h3>{member.fullName}</h3>
                                                    <p>{member.mobileNumber}</p>
                                                </div>
                                                <div className={`member-status-badge ${status.class}`}>
                                                    {status.text}
                                                </div>
                                            </div>
                                            <div className="member-card-body">
                                                <div className="member-details">
                                                    <div className="detail-item">
                                                        <span className="detail-label">Membership:</span>
                                                        <span className="detail-value">{member.membership?.name || 'N/A'}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Join Date:</span>
                                                        <span className="detail-value">{new Date(member.joinDate).toLocaleDateString()}</span>
                                                    </div>
                                                    {member.nextDueDate && (
                                                        <div className="detail-item">
                                                            <span className="detail-label">Next Due:</span>
                                                            <span className="detail-value">{member.nextDueDate}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="member-card-footer">
                                                <div className="dropdown-container" ref={el => dropdownRefs.current[dropdownId] = el}>
                                                    <button
                                                        className="dropdown-toggle"
                                                        onClick={(e) => handleDropdownClick(e, dropdownId)}
                                                    >
                                                        <FiMoreVertical />
                                                    </button>

                                                    <div className={`dropdown-menu ${activeDropdown === dropdownId ? 'show' : ''}`}>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                handleViewUserDetails(member.id);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            <FiEye /> View Details
                                                        </button>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                handleViewPaymentHistory(member.id);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            <FiDollarSign /> Payment History
                                                        </button>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                openMarkPaymentModal(member);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            <FiPlus /> Mark Payment
                                                        </button>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                handleSendReminder(member.id);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            <FiSend /> Send Reminder
                                                        </button>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                handleSendWhatsApp(member);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            <FiMessageSquare /> Send WhatsApp
                                                        </button>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                openSwitchMembershipModal(member);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            <FiCreditCard /> Switch Membership
                                                        </button>
                                                        {member.status === 'ACTIVE' ? (
                                                            <button
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    handleBlockUser(member.id);
                                                                    setActiveDropdown(null);
                                                                }}
                                                            >
                                                                <FiUserX /> Block User
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    handleUnblockUser(member.id);
                                                                    setActiveDropdown(null);
                                                                }}
                                                            >
                                                                <FiUserCheck /> Unblock User
                                                            </button>
                                                        )}
                                                        <button
                                                            className="dropdown-item danger"
                                                            onClick={() => {
                                                                handleDeleteUser(member.id);
                                                                setActiveDropdown(null);
                                                            }}
                                                        >
                                                            <FiTrash2 /> Delete User
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Contact</th>
                                        <th>Membership</th>
                                        <th>Join Date</th>
                                        <th>Next Due</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMembers
                                        .filter(member =>
                                            !searchTerm ||
                                            member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            member.email.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map(member => {
                                            const status = getStatusBadge(member);
                                            const dropdownId = `member-list-${member.id}`;

                                            return (
                                                <tr key={member.id}>
                                                    <td>
                                                        <div className="table-member-info">
                                                            <div
                                                                className="table-avatar"
                                                                onClick={() => member.profilePictureUrl && handleViewImage(member.profilePictureUrl)}
                                                            >
                                                                {member.profilePictureUrl ? (
                                                                    <img src={member.profilePictureUrl} alt={member.fullName} />
                                                                ) : (
                                                                    member.fullName.charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <span>{member.fullName}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="table-contact-info">
                                                            <div>{member.email}</div>
                                                            <div>{member.mobileNumber}</div>
                                                        </div>
                                                    </td>
                                                    <td>{member.membership?.name || 'N/A'}</td>
                                                    <td>{new Date(member.joinDate).toLocaleDateString()}</td>
                                                    <td>{member.nextDueDate || 'N/A'}</td>
                                                    <td>
                                                        <span className={`status-badge ${status.class}`}>
                                                            {status.text}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="dropdown-container" ref={el => dropdownRefs.current[dropdownId] = el}>
                                                            <button
                                                                className="dropdown-toggle"
                                                                onClick={(e) => handleDropdownClick(e, dropdownId)}
                                                            >
                                                                <FiMoreVertical />
                                                            </button>
                                                            <div className={`dropdown-menu ${activeDropdown === dropdownId ? 'show' : ''}`}>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        handleViewUserDetails(member.id);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiEye /> View Details
                                                                </button>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        handleViewPaymentHistory(member.id);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiDollarSign /> Payment History
                                                                </button>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        openMarkPaymentModal(member);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiPlus /> Mark Payment
                                                                </button>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        handleSendReminder(member.id);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiSend /> Send Reminder
                                                                </button>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        handleSendWhatsApp(member);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiMessageSquare /> Send WhatsApp
                                                                </button>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        openSwitchMembershipModal(member);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiCreditCard /> Switch Membership
                                                                </button>
                                                                {member.status === 'ACTIVE' ? (
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => {
                                                                            handleBlockUser(member.id);
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                    >
                                                                        <FiUserX /> Block User
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => {
                                                                            handleUnblockUser(member.id);
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                    >
                                                                        <FiUserCheck /> Unblock User
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="dropdown-item danger"
                                                                    onClick={() => {
                                                                        handleDeleteUser(member.id);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                >
                                                                    <FiTrash2 /> Delete User
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">
                            <FiUsers size={48} />
                        </div>
                        <p>No members found for the selected filter.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderMemberships = () => (
        <div className="animate-fade-in">
            <div className="card-header">
                <h2 className="card-title">Membership Plans</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowMembershipModal(true)}
                >
                    <FiPlus /> Add New Plan
                </button>
            </div>
            <div className="memberships-grid">
                {memberships.map(membership => {
                    const dropdownId = `membership-${membership.id}`;
                    return (
                        <div className="membership-card" key={membership.id}>
                            <div className="membership-header">
                                <h3>{membership.name}</h3>
                                <div className="dropdown-container" ref={el => dropdownRefs.current[dropdownId] = el}>
                                    <button
                                        className="dropdown-toggle"
                                        onClick={(e) => handleDropdownClick(e, dropdownId)}
                                    >
                                        <FiMoreVertical />
                                    </button>
                                    <div className={`dropdown-menu ${activeDropdown === dropdownId ? 'show' : ''}`}>
                                        <button
                                            className="dropdown-item"
                                            onClick={() => {
                                                setEditingMembership(membership);
                                                setShowMembershipModal(true);
                                                setActiveDropdown(null);
                                            }}
                                        >
                                            <FiEdit /> Edit
                                        </button>
                                        <button
                                            className="dropdown-item danger"
                                            onClick={() => {
                                                handleDeleteMembership(membership.id);
                                                setActiveDropdown(null);
                                            }}
                                        >
                                            <FiTrash2 /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="membership-body">
                                <div className="membership-detail">
                                    <span className="detail-label">Duration</span>
                                    <span className="detail-value">{membership.durationInMonths} months</span>
                                </div>
                                <div className="membership-detail">
                                    <span className="detail-label">Fee</span>
                                    <span className="detail-value">₹{membership.fee}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderPayments = () => {
        const filteredPayments = getFilteredPayments();
        const getFilterTitle = () => {
            switch (paymentFilter) {
                case 'today': return 'Today\'s Payments';
                case 'week': return 'Payments from Last Week';
                case 'month': return 'Payments from Last Month';
                default: return 'All Payments';
            }
        };

        const handleDeleteAllPayments = async () => {
            if (window.confirm('Are you sure you want to delete ALL payment records? This action cannot be undone and will also delete all associated receipts.')) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/payments/history/all`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        const result = await response.text();
                        showMessage(result || 'All payments deleted successfully', 'success');
                        fetchInitialData();
                    } else {
                        throw new Error('Failed to delete all payments');
                    }
                } catch (error) {
                    showMessage("Failed to delete all payments", 'error');
                }
            }
        };

        return (
            <div className="animate-fade-in">
                <div className="card-header">
                    <h2 className="card-title">{getFilterTitle()}</h2>
                    <div className="header-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleExportPaymentHistory}
                        >
                            <FiDownload /> Export CSV
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleDeleteAllPayments}
                        >
                            <FiTrash2 /> Delete All
                        </button>
                        <div className="filter-dropdown">
                            <FiFilter className="filter-icon" />
                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Payments</option>
                                <option value="today">Today</option>
                                <option value="week">Last Week</option>
                                <option value="month">Last Month</option>
                            </select>
                            <FiChevronDown className="dropdown-arrow" />
                        </div>
                        <div className="search-container">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search payments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>
                </div>

                {filteredPayments.length > 0 ? (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Receipt</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments
                                    .filter(payment =>
                                        !searchTerm ||
                                        (payment.userFullName && payment.userFullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                        (payment.userEmail && payment.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                        payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map(payment => {
                                        const dropdownId = `payment-${payment.id}`;
                                        return (
                                            <tr key={payment.id}>
                                                <td>
                                                    {payment.userFullName ? (
                                                        <div className="table-member-info">
                                                            <div
                                                                className="table-avatar"
                                                                onClick={() =>
                                                                    payment.userProfilePictureUrl && handleViewImage(payment.userProfilePictureUrl)
                                                                }
                                                            >
                                                                {payment.userProfilePictureUrl ? (
                                                                    <img
                                                                        src={payment.userProfilePictureUrl}
                                                                        alt={payment.userFullName}
                                                                        style={{ objectFit: "cover" }}
                                                                    />
                                                                ) : (
                                                                    payment.userFullName.charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <span>{payment.userFullName}</span>
                                                        </div>
                                                    ) : (
                                                        "N/A"
                                                    )}
                                                </td>
                                                <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                                <td>₹{payment.amount.toFixed(2)}</td>
                                                <td>{payment.paymentMethod || 'N/A'}</td>
                                                <td>
                                                    {payment.receiptUrl ? (
                                                        <div className="receipt-actions">
                                                            <button
                                                                className="btn-icon"
                                                                onClick={() => handleViewImage(payment.receiptUrl)}
                                                                title="View Receipt"
                                                            >
                                                                <FiImage />
                                                            </button>
                                                            <button
                                                                className="btn-icon"
                                                                onClick={() => handlePrintReceipt(payment)}
                                                                title="Print Receipt"
                                                            >
                                                                <FiPrinter />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="no-receipt">No receipt</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="dropdown-container" ref={el => dropdownRefs.current[dropdownId] = el}>
                                                        <button
                                                            className="dropdown-toggle"
                                                            onClick={(e) => handleDropdownClick(e, dropdownId)}
                                                        >
                                                            <FiMoreVertical />
                                                        </button>
                                                        <div className={`dropdown-menu ${activeDropdown === dropdownId ? 'show' : ''}`}>
                                                            <button
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    handleViewPaymentDetails(payment);
                                                                    setActiveDropdown(null);
                                                                }}
                                                            >
                                                                <FiEye /> View Details
                                                            </button>
                                                            <button
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    handleSendWhatsApp(
                                                                        {
                                                                            fullName: payment.userFullName,
                                                                            mobileNumber: payment.userMobileNumber,
                                                                            payments: [payment]
                                                                        },
                                                                        payment
                                                                    );
                                                                    setActiveDropdown(null);
                                                                }}
                                                            >
                                                                <FiMessageSquare /> Share Receipt via WhatsApp
                                                            </button>
                                                            <button
                                                                className="dropdown-item danger"
                                                                onClick={() => {
                                                                    handleDeletePayment(payment.id);
                                                                    setActiveDropdown(null);
                                                                }}
                                                            >
                                                                <FiTrash2 /> Delete Payment
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">
                            <FiDollarSign size={48} />
                        </div>
                        <p>No payments found for the selected filter.</p>
                    </div>
                )}
            </div>
        );
    };

    const getStatusBadge = (member) => {
        // First check account status
        if (member.status === 'INACTIVE') {
            return { class: 'status-inactive', text: 'Inactive' };
        }

        // Then check payment/membership status
        if (member.pendingAmount !== null) {
            return { class: 'status-pending', text: `₹${member.pendingAmount.toFixed(2)} Pending` };
        }
        if (member.daysLeft < 0) {
            return { class: 'status-expired', text: `Expired ${Math.abs(member.daysLeft)} days ago` };
        }
        if (member.daysLeft <= 7) {
            return { class: 'status-expiring', text: `${member.daysLeft} days left` };
        }
        return { class: 'status-active', text: 'Active' };
    };

    return (
        <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>VipGym</h2>
                    <button className="sidebar-close" onClick={() => setIsSidebarOpen(false)}>
                        <FiX />
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <button
                        className={`nav-link ${activeSection === 'dashboard' ? 'active' : ''}`}
                        onClick={() => { setActiveSection('dashboard'); setIsSidebarOpen(false); }}
                    >
                        <FiHome /> Dashboard
                    </button>
                    <button
                        className={`nav-link ${activeSection === 'members' ? 'active' : ''}`}
                        onClick={() => { setActiveSection('members'); setIsSidebarOpen(false); }}
                    >
                        <FiUser /> Members
                    </button>
                    <button
                        className={`nav-link ${activeSection === 'memberships' ? 'active' : ''}`}
                        onClick={() => { setActiveSection('memberships'); setIsSidebarOpen(false); }}
                    >
                        <FiCreditCard /> Memberships
                    </button>
                    <button
                        className={`nav-link ${activeSection === 'payments' ? 'active' : ''}`}
                        onClick={() => { setActiveSection('payments'); setIsSidebarOpen(false); }}
                    >
                        <FiDollarSign /> Payments
                    </button>
                    <button className="nav-link logout" onClick={handleLogout}>
                        <FiLogOut /> Logout
                    </button>
                </nav>
            </aside>

            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="dashboard-header">
                    {activeSection !== 'dashboard' && (
                        <button className="back-btn" onClick={() => setActiveSection('dashboard')}>
                            <FiChevronLeft /> Back
                        </button>
                    )}
                    <button className="hamburger" onClick={toggleSidebar}>
                        <FiMenu />
                    </button>
                    <h1>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
                    <div className="header-right">
                        <button className="header-btn">
                            <FiSettings />
                        </button>
                    </div>
                </header>

                {/* Messages */}
                {message.text && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* Content */}
                {isLoading ? renderLoadingSkeleton() : (
                    <div className="content-area">
                        <section className={`section ${activeSection === 'dashboard' ? 'active' : ''}`}>
                            {renderDashboard()}
                        </section>
                        <section className={`section ${activeSection === 'members' ? 'active' : ''}`}>
                            {renderMembers()}
                        </section>
                        <section className={`section ${activeSection === 'memberships' ? 'active' : ''}`}>
                            {renderMemberships()}
                        </section>
                        <section className={`section ${activeSection === 'payments' ? 'active' : ''}`}>
                            {renderPayments()}
                        </section>
                    </div>
                )}
            </main>

            {/* User Details Modal */}
            {showUserDetails && selectedUser && (
                <div className="modal-overlay show" onClick={() => setShowUserDetails(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Member Details</h2>
                            <button className="btn-icon" onClick={() => setShowUserDetails(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="member-details-modal">
                                <div
                                    className="member-avatar-large"
                                    onClick={() => selectedUser.profilePictureUrl && handleViewImage(selectedUser.profilePictureUrl)}
                                >
                                    {selectedUser.profilePictureUrl ? (
                                        <img src={selectedUser.profilePictureUrl} alt={selectedUser.fullName} />
                                    ) : (
                                        selectedUser.fullName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <h3>{selectedUser.fullName}</h3>
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <label>Email</label>
                                        <p>{selectedUser.email}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Mobile Number</label>
                                        <p>{selectedUser.mobileNumber}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Membership</label>
                                        <p>{selectedUser.membership?.name || 'N/A'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Membership Fee</label>
                                        <p>₹{selectedUser.membership?.fee || '0'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Join Date</label>
                                        <p>{new Date(selectedUser.joinDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Status</label>
                                        <p>{selectedUser.status || 'Active'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Total Paid</label>
                                        <p>₹{selectedUser.totalPaid || '0'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Balance</label>
                                        <p style={{ color: (selectedUser.pendingAmount || 0) > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
                                            ₹{(selectedUser.pendingAmount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    {selectedUser.nextDueDate && (
                                        <div className="detail-item">
                                            <label>Next Due Date</label>
                                            <p>{new Date(selectedUser.nextDueDate).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowUserDetails(false);
                                        handleViewPaymentHistory(selectedUser.id);
                                    }}
                                >
                                    <FiDollarSign /> View Payments
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => openMarkPaymentModal(selectedUser)}
                                >
                                    <FiPlus /> Mark Payment
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleSendReminder(selectedUser.id)}
                                >
                                    <FiSend /> Send Reminder
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleSendWhatsApp(selectedUser)}
                                >
                                    <FiMessageSquare /> Send WhatsApp
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => openSwitchMembershipModal(selectedUser)}
                                >
                                    <FiCreditCard /> Switch Membership
                                </button>
                                {selectedUser.status === 'ACTIVE' ? (
                                    <button
                                        className="btn btn-warning"
                                        onClick={() => handleBlockUser(selectedUser.id)}
                                    >
                                        <FiUserX /> Block User
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleUnblockUser(selectedUser.id)}
                                    >
                                        <FiUserCheck /> Unblock User
                                    </button>
                                )}
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteUser(selectedUser.id)}
                                >
                                    <FiTrash2 /> Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSwitchMembershipModal && (
                <div className="modal-overlay show" onClick={() => setShowSwitchMembershipModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>Switch Membership Plan</h2>
                            <button
                                className="btn-icon"
                                onClick={() => setShowSwitchMembershipModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleSwitchMembership}>
                                <div className="form-group">
                                    <label htmlFor="newMembershipId">Select New Membership</label>
                                    <select
                                        id="newMembershipId"
                                        value={switchMembershipForm.newMembershipId}
                                        onChange={(e) =>
                                            setSwitchMembershipForm({
                                                ...switchMembershipForm,
                                                newMembershipId: e.target.value
                                            })
                                        }
                                        required
                                        className="form-control"
                                    >
                                        <option value="">-- Select Membership --</option>
                                        {memberships.map((membership) => (
                                            <option key={membership.id} value={membership.id}>
                                                {membership.name} (₹{membership.fee}) — {membership.durationInMonths} months
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </form>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowSwitchMembershipModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                onClick={handleSwitchMembership}
                            >
                                Switch Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment History Modal */}
            {showPaymentModal && userPayments && (
                <div className="modal-overlay show" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Payment History</h2>
                            <button className="btn-icon" onClick={() => setShowPaymentModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="payment-history">
                                <h3>{userPayments.user?.fullName || 'User'}</h3>
                                <div className="payment-summary">
                                    <div className="summary-item">
                                        <span className="summary-label">Total Paid:</span>
                                        <span className="summary-value">
                                            ₹{userPayments.payments ? userPayments.payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Membership Fee:</span>
                                        <span className="summary-value">
                                            ₹{userPayments.user?.membership?.fee || '0'}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Balance:</span>
                                        <span className="summary-value" style={{ color: (userPayments.user?.pendingAmount || 0) > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
                                            ₹{(userPayments.user?.pendingAmount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="payment-list">
                                    <h4>Payment Records</h4>
                                    {userPayments.payments && userPayments.payments.length > 0 ? (
                                        <table className="payment-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Method</th>
                                                    <th>Receipt</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userPayments.payments.map(payment => {
                                                    const dropdownId = `payment-modal-${payment.id}`;
                                                    return (
                                                        <tr key={payment.id}>
                                                            <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                                            <td>₹{payment.amount.toFixed(2)}</td>
                                                            <td>{payment.paymentMethod || 'N/A'}</td>
                                                            <td>
                                                                {payment.receiptUrl ? (
                                                                    <div className="receipt-actions">
                                                                        <button
                                                                            className="btn-icon"
                                                                            onClick={() => handleViewImage(payment.receiptUrl)}
                                                                            title="View Receipt"
                                                                        >
                                                                            <FiImage />
                                                                        </button>
                                                                        <button
                                                                            className="btn-icon"
                                                                            onClick={() => handlePrintReceipt(payment)}
                                                                            title="Print Receipt"
                                                                        >
                                                                            <FiPrinter />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="no-receipt">No receipt</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div className="dropdown-container" ref={el => dropdownRefs.current[dropdownId] = el}>
                                                                    <button
                                                                        className="dropdown-toggle"
                                                                        onClick={(e) => handleDropdownClick(e, dropdownId)}
                                                                    >
                                                                        <FiMoreVertical />
                                                                    </button>
                                                                    <div className={`dropdown-menu ${activeDropdown === dropdownId ? 'show' : ''}`}>
                                                                        <button
                                                                            className="dropdown-item"
                                                                            onClick={() => {
                                                                                handleViewPaymentDetails(payment);
                                                                                setActiveDropdown(null);
                                                                            }}
                                                                        >
                                                                            <FiEye /> View Details
                                                                        </button>
                                                                        <button
                                                                            className="dropdown-item"
                                                                            onClick={() => {
                                                                                handleSendWhatsApp(
                                                                                    {
                                                                                        fullName: userPayments.user?.fullName,
                                                                                        mobileNumber: userPayments.user?.mobileNumber,
                                                                                        payments: [payment]
                                                                                    },
                                                                                    payment
                                                                                );
                                                                                setActiveDropdown(null);
                                                                            }}
                                                                        >
                                                                            <FiMessageSquare /> Share Receipt via WhatsApp
                                                                        </button>
                                                                        <button
                                                                            className="dropdown-item danger"
                                                                            onClick={() => {
                                                                                handleDeletePayment(payment.id);
                                                                                setActiveDropdown(null);
                                                                            }}
                                                                        >
                                                                            <FiTrash2 /> Delete Payment
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="no-payments">No payment records found</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Details Modal */}
            {showPaymentDetailsModal && selectedPayment && (
                <div className="modal-overlay show" onClick={() => setShowPaymentDetailsModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Payment Details</h2>
                            <button className="btn-icon" onClick={() => setShowPaymentDetailsModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="payment-details">
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <label>Payment ID</label>
                                        <p>{selectedPayment.id}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Member</label>
                                        <p>{selectedPayment.user ? selectedPayment.user.fullName : 'N/A'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Payment Date</label>
                                        <p>{new Date(selectedPayment.paymentDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Amount</label>
                                        <p>₹{selectedPayment.amount.toFixed(2)}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Payment Method</label>
                                        <p>{selectedPayment.paymentMethod || 'N/A'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <label>Receipt</label>
                                        <p>
                                            {selectedPayment.receiptUrl ? (
                                                <div className="receipt-actions">
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => handleViewImage(selectedPayment.receiptUrl)}
                                                        title="View Receipt"
                                                    >
                                                        <FiImage /> View Receipt
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => handlePrintReceipt(selectedPayment)}
                                                        title="Print Receipt"
                                                    >
                                                        <FiPrinter /> Print Receipt
                                                    </button>
                                                </div>
                                            ) : (
                                                'No receipt'
                                            )}
                                        </p>
                                    </div>
                                    {selectedPayment.remarks && (
                                        <div className="detail-item full-width">
                                            <label>Remarks</label>
                                            <p>{selectedPayment.remarks}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleSendWhatsApp(
                                        {
                                            fullName: selectedPayment.user?.fullName,
                                            mobileNumber: selectedPayment.user?.mobileNumber,
                                            payments: [selectedPayment]
                                        },
                                        selectedPayment
                                    )}
                                >
                                    <FiMessageSquare /> Share Receipt via WhatsApp
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDeletePayment(selectedPayment.id)}
                                >
                                    <FiTrash2 /> Delete Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reminder Modal */}
            {showReminderModal && selectedUser && (
                <div className="modal-overlay show" onClick={() => setShowReminderModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Send Reminder</h2>
                            <button className="btn-icon" onClick={() => setShowReminderModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="reminder-form">
                                <div className="form-group">
                                    <label>Member</label>
                                    <p>{selectedUser.fullName}</p>
                                </div>
                                <div className="form-group">
                                    <label>Message</label>
                                    <textarea
                                        value={reminderMessage}
                                        onChange={(e) => setReminderMessage(e.target.value)}
                                        rows="5"
                                        placeholder="Enter your reminder message..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowReminderModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSendEmailReminder}
                            >
                                <FiAtSign /> Send Email
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSendWhatsAppReminder}
                            >
                                <FiMessageSquare /> Send WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Membership Modal */}
            {showMembershipModal && (
                <div className="modal-overlay show" onClick={() => {
                    setShowMembershipModal(false);
                    setEditingMembership(null);
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingMembership ? 'Edit Membership Plan' : 'Add New Membership Plan'}</h2>
                            <button className="btn-icon" onClick={() => {
                                setShowMembershipModal(false);
                                setEditingMembership(null);
                            }}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={editingMembership ? handleUpdateMembership : handleAddMembership} className="membership-form">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Plan Name</label>
                                        <input
                                            type="text"
                                            value={editingMembership ? editingMembership.name : newMembership.name}
                                            onChange={(e) => {
                                                if (editingMembership) {
                                                    setEditingMembership({ ...editingMembership, name: e.target.value });
                                                } else {
                                                    setNewMembership({ ...newMembership, name: e.target.value });
                                                }
                                            }}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Duration (Months)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editingMembership ? editingMembership.durationInMonths : newMembership.durationInMonths}
                                            onChange={(e) => {
                                                if (editingMembership) {
                                                    setEditingMembership({ ...editingMembership, durationInMonths: parseInt(e.target.value) });
                                                } else {
                                                    setNewMembership({ ...newMembership, durationInMonths: e.target.value });
                                                }
                                            }}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Fee (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editingMembership ? editingMembership.fee : newMembership.fee}
                                            onChange={(e) => {
                                                if (editingMembership) {
                                                    setEditingMembership({ ...editingMembership, fee: parseFloat(e.target.value) });
                                                } else {
                                                    setNewMembership({ ...newMembership, fee: e.target.value });
                                                }
                                            }}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => {
                                        setShowMembershipModal(false);
                                        setEditingMembership(null);
                                    }}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingMembership ? 'Update Plan' : 'Add Plan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark Payment Modal */}
            {showMarkPaymentModal && (
                <div className="modal-overlay show" onClick={() => setShowMarkPaymentModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Mark Payment</h2>
                            <button className="btn-icon" onClick={() => setShowMarkPaymentModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleMarkPaymentSubmit} className="payment-form">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Amount (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={markPaymentForm.amount}
                                            onChange={(e) => setMarkPaymentForm({ ...markPaymentForm, amount: e.target.value })}
                                            required
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Payment Method</label>
                                        <select
                                            value={markPaymentForm.paymentMethod}
                                            onChange={(e) => setMarkPaymentForm({ ...markPaymentForm, paymentMethod: e.target.value })}
                                            className="form-control"
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="CARD">Card</option>
                                            <option value="ONLINE">Online</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Remarks</label>
                                        <textarea
                                            value={markPaymentForm.remarks}
                                            onChange={(e) => setMarkPaymentForm({ ...markPaymentForm, remarks: e.target.value })}
                                            rows="3"
                                            className="form-control"
                                        ></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Next Due Date (optional)</label>
                                        <input
                                            type="date"
                                            value={markPaymentForm.nextDueDate}
                                            onChange={(e) => setMarkPaymentForm({ ...markPaymentForm, nextDueDate: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowMarkPaymentModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Mark Payment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Switch Membership Modal */}
            {showSwitchMembershipModal && selectedUser && (
                <div className="modal-overlay show" onClick={() => setShowSwitchMembershipModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Switch Membership Plan</h2>
                            <button className="btn-icon" onClick={() => setShowSwitchMembershipModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="switch-membership-form">
                                <div className="form-group">
                                    <label>Member</label>
                                    <p>{selectedUser.fullName}</p>
                                </div>
                                <div className="form-group">
                                    <label>Current Membership</label>
                                    <p>{selectedUser.membership?.name || 'No membership'}</p>
                                </div>
                                <form onSubmit={handleSwitchMembership}>
                                    <div className="form-group">
                                        <label htmlFor="newMembership">Select New Membership Plan</label>
                                        <select
                                            id="newMembership"
                                            value={switchMembershipForm.newMembershipId}
                                            onChange={(e) => setSwitchMembershipForm({
                                                ...switchMembershipForm,
                                                newMembershipId: e.target.value
                                            })}
                                            required
                                            className="form-control"
                                        >
                                            <option value="">Select a membership plan</option>
                                            {memberships
                                                .filter(membership => membership.id !== selectedUser.membership?.id)
                                                .map(membership => (
                                                    <option key={membership.id} value={membership.id}>
                                                        {membership.name} - ₹{membership.fee} ({membership.durationInMonths} months)
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowSwitchMembershipModal(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Switch Membership
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Modal */}
            {showImageModal && selectedImage && (
                <div className="modal-overlay show" onClick={() => setShowImageModal(false)}>
                    <div className="image-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="image-modal-header">
                            <h3>Image Preview</h3>
                            <button className="btn-icon" onClick={() => setShowImageModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="image-modal-body">
                            <img src={selectedImage} alt="Preview" />
                        </div>
                        <div className="image-modal-footer">
                            <a
                                href={selectedImage}
                                download="image"
                                className="btn btn-primary"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FiDownload /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;