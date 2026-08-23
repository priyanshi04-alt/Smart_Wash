import React, { useState } from 'react';
import { WashingMachine, User, Shield, Briefcase, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config';

export default function AuthScreen({ onLoginSuccess }) {
  const [role, setRole] = useState('student'); // student, staff, admin
  const [email, setEmail] = useState('aarav@univ.edu');
  const [password, setPassword] = useState('aarav123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Network error, make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    // Fill mock credentials to make testing easier for user
    if (selectedRole === 'admin') {
      setEmail('admin@univ.edu');
      setPassword('admin123');
    } else if (selectedRole === 'staff') {
      setEmail('staff@univ.edu');
      setPassword('staff123');
    } else {
      setEmail('aarav@univ.edu');
      setPassword('aarav123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.15) 0%, rgba(168, 85, 247, 0.08) 90%), var(--bg-primary)',
      padding: '1.5rem'
    }}>
      <div className="glass-card modal-content" style={{ maxWidth: '440px', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, var(--hostel-color), var(--hostel-color-hover))',
            color: 'white',
            marginBottom: '1rem',
            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
          }}>
            <WashingMachine size={36} className="animate-pulse" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            SmartWash
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Hostel Laundry Management Platform
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--input-bg)',
          borderRadius: '0.75rem',
          padding: '0.25rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          {[
            { id: 'student', label: 'Student', icon: User },
            { id: 'staff', label: 'Staff', icon: Briefcase },
            { id: 'admin', label: 'Admin', icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = role === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleRoleSelect(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: active ? 'var(--bg-secondary)' : 'transparent',
                  color: active ? 'var(--hostel-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: active ? '600' : '500',
                  fontSize: '0.85rem',
                  boxShadow: active ? '0 2px 8px var(--shadow-color)' : 'none'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{
            background: 'var(--status-issue-bg)',
            color: 'var(--status-issue)',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            marginBottom: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                className="custom-input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="email@univ.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="custom-input"
                style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p>Demo accounts credentials pre-filled. Select tabs to switch accounts.</p>
        </div>
      </div>
    </div>
  );
}
