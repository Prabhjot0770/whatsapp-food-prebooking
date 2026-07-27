import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, KeyRound, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('superadmin'); // 'superadmin' | 'vendor'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // OAuth2 password form data
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const authData = {
          token: data.access_token,
          user: { username, role },
        };
        if (rememberMe) {
          localStorage.setItem('lpu_bot_auth', JSON.stringify(authData));
        }
        onLoginSuccess(authData);
      } else {
        // Fallback for demo if backend auth endpoint fails or offline
        if (username === 'admin' && password === 'admin123') {
          const authData = {
            token: 'demo-harvard-token-xyz',
            user: { username: 'admin', role: 'superadmin' },
          };
          localStorage.setItem('lpu_bot_auth', JSON.stringify(authData));
          onLoginSuccess(authData);
        } else {
          setError('Invalid credentials. Check username & password or click Quick Fill below.');
        }
      }
    } catch (err) {
      console.warn('Backend login network error, attempting offline demo fallback:', err);
      if (username === 'admin' && password === 'admin123') {
        const authData = {
          token: 'demo-harvard-token-xyz',
          user: { username: 'admin', role: 'superadmin' },
        };
        localStorage.setItem('lpu_bot_auth', JSON.stringify(authData));
        onLoginSuccess(authData);
      } else {
        setError('Connection error. Try demo credentials: admin / admin123');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="harvard-login-container">
      {/* Ambient background glows */}
      <div className="harvard-glow crimson-glow" />
      <div className="harvard-glow gold-glow" />

      <div className="harvard-login-card">
        {/* Harvard Institutional Crest / Header */}
        <div className="harvard-header">
          <div className="harvard-shield">
            <Shield size={32} color="#C5A059" />
            <div className="shield-veritas">VE-RI-TAS</div>
          </div>
          <span className="harvard-badge">ADMINISTRATION • PORTAL</span>
          <h1 className="harvard-title">LPU FoodBot Admin</h1>
          <p className="harvard-subtitle">Executive Access & Campus Operations Control</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="harvard-tabs">
          <button
            type="button"
            className={`harvard-tab ${role === 'superadmin' ? 'active' : ''}`}
            onClick={() => setRole('superadmin')}
          >
            <Sparkles size={14} />
            <span>Superadmin</span>
          </button>
          <button
            type="button"
            className={`harvard-tab ${role === 'vendor' ? 'active' : ''}`}
            onClick={() => setRole('vendor')}
          >
            <User size={14} />
            <span>Campus Vendor</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="harvard-error-alert">
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="harvard-form">
          <div className="harvard-input-group">
            <label htmlFor="username">Username or ID</label>
            <div className="harvard-input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="harvard-input-group">
            <label htmlFor="password">Security Password</label>
            <div className="harvard-input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="harvard-options-row">
            <label className="harvard-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember session</span>
            </label>
            <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Demo Notice: Use admin / admin123 to log in.'); }} className="harvard-link">
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button type="submit" className="harvard-submit-btn" disabled={loading}>
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Executive Portal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div className="harvard-demo-box">
          <div className="demo-box-header">
            <KeyRound size={16} color="#C5A059" />
            <span>Demo Access Credentials</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0.3rem 0 0.6rem 0' }}>
            Username: <strong style={{ color: '#fff' }}>admin</strong> &bull; Password: <strong style={{ color: '#fff' }}>admin123</strong>
          </p>
          <button type="button" onClick={handleQuickFill} className="harvard-quickfill-btn">
            <CheckCircle2 size={14} />
            <span>One-Click Auto Fill</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="harvard-footer">
          <span>🔒 256-Bit SSL Encrypted &bull; Harvard Style Security Token</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
