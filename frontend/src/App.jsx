import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import StudentPortal from './components/StudentPortal';
import StaffPortal from './components/StaffPortal';
import AdminPortal from './components/AdminPortal';
import { Sun, Moon } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      
      {/* Global Theme Toggle Button */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        padding: '0.5rem 0.8rem',
        borderRadius: '2rem',
        boxShadow: '0 8px 32px var(--shadow-color)',
        cursor: 'pointer'
      }}
      onClick={toggleTheme}
      title="Toggle Dark/Light Mode"
      >
        <div className="theme-switch" style={{ margin: 0 }}>
          <div className="theme-switch-knob"></div>
        </div>
        {theme === 'dark' ? <Moon size={16} style={{ color: 'var(--text-secondary)' }} /> : <Sun size={16} style={{ color: 'var(--text-secondary)' }} />}
      </div>

      {/* Main Switcher */}
      {!token || !user ? (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          {user.role === 'admin' && (
            <AdminPortal user={user} onLogout={handleLogout} />
          )}
          {user.role === 'student' && (
            <StudentPortal user={user} onLogout={handleLogout} />
          )}
          {user.role === 'staff' && (
            <StaffPortal user={user} onLogout={handleLogout} />
          )}
        </>
      )}

    </div>
  );
}
