import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:3300/login', {
        email,
        password
      });

      if (response.data.status === 'success') {
        localStorage.setItem("isAuthenticated", "true"); // Store login state
        setMessage(response.data.message);
        setMessageType('success');
        
        // Redirect after successful login
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setMessage(response.data.message);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('An error occurred. Please try again.');
      setMessageType('error');
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <>
      <div className="header">
        LOGIN
      </div>

      <div className="auth-container">
        <div className="form-container">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Username</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="button-container">
              <button type="submit" className="login-btn">LOGIN</button>
            </div>
            
            <div className="register-link">
              <span>Don't have an account? </span>
              <button 
                type="button" 
                className="register-link-btn" 
                onClick={handleRegister}
              >
                Register
              </button>
            </div>
          </form>
          
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;