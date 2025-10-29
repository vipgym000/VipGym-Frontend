import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';  // make sure file extension is correct
import UserRegistration from './components/UserRegistration.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register-user" element={<UserRegistration />} />
        
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
  