import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css'; 

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:3300/register', {
        name,
        email,
        password
      });

      if (response.data.status === 'success') {
        setMessage(response.data.message);
        setMessageType('success');
        
        // Redirect to login page after successful registration
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setMessage(response.data.message);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('An error occurred. Please try again.');
      setMessageType('error');
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <>
      <div className="header">
        REGISTER
      </div>

      <div className="auth-container">
        <div className="form-container">
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
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
              <div className="action-buttons">
                <button type="submit" className="register-btn">SAVE</button>
                <button type="button" className="cancel-btn" onClick={handleCancel}>CANCEL</button>
              </div>
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

export default Register;