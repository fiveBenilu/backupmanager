import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Setup from './pages/Setup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import api from './services/api';

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
    checkAuth();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await api.get('/api/setup-status');
      setIsSetupComplete(response.data.isSetupComplete);
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.get('/api/auth/verify');
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setIsSetupComplete(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading || isSetupComplete === null) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/setup" 
            element={
              !isSetupComplete ? 
                <Setup onComplete={handleLogin} /> : 
                <Navigate to="/dashboard" />
            } 
          />
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? 
                <Login onLogin={handleLogin} /> : 
                <Navigate to="/dashboard" />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
                <Dashboard onLogout={handleLogout} /> : 
                <Navigate to={!isSetupComplete ? "/setup" : "/login"} />
            } 
          />
          <Route 
            path="*" 
            element={
              <Navigate to={
                !isSetupComplete ? "/setup" : 
                !isAuthenticated ? "/login" : 
                "/dashboard"
              } />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
