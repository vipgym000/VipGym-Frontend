import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // <-- import
import '../css/LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();  // <-- initialize navigate

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.text();
        setMessage(data); // "Login successful"
        // Redirect to admin dashboard after successful login
        navigate('/dashboard');
      } else if (response.status === 401) {
        const error = await response.text();
        setMessage(error); // "Invalid username or password"
      } else {
        setMessage('Something went wrong. Please try again.');
      }
    } catch (error) {
      setMessage('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </label>

        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {message && (
        <p className={`message ${message.toLowerCase().includes('successful') ? 'success' : 'error'}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoginPage;
