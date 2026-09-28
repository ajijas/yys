import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Scissors, 
  Layers, 
  ShoppingBag, 
  Package,
  Building2,
  ArrowRight
} from 'lucide-react';
import yssLogo from '../assets/YSS.png';

export default function LoginView({ onLoginSuccess, theme, toggleTheme }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoAccounts, setDemoAccounts] = useState([
    { username: 'admin', password: 'admin123', role: 'Admin', title: 'Owner / Admin' },
    { username: 'manager', password: 'manager123', role: 'Manager', title: 'Factory Manager' },
    { username: 'cutting_sup', password: 'cutting123', role: 'Cutting Supervisor', title: 'Cutting Sup' },
    { username: 'stitching_sup', password: 'stitching123', role: 'Stitching Supervisor', title: 'Stitching Sup' },
    { username: 'packaging_worker', password: 'pack123', role: 'Packaging / Stock', title: 'Packaging' },
    { username: 'sales_pos', password: 'sales123', role: 'Sales User', title: 'Sales Counter' }
  ]);

  // Load demo accounts from backend if available
  useEffect(() => {
    fetch('/api/auth/demo-users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDemoAccounts(data.map(u => ({
            username: u.username,
            password: u.password || 'admin123',
            role: u.role,
            title: u.full_name || u.role
          })));
        }
      })
      .catch(() => {
        // Fallback already pre-set
      });
  }, []);

  const handleSelectDemo = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      if (rememberMe) {
        localStorage.setItem('yss_user', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem('yss_user', JSON.stringify(data.user));
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to connect to YSS Leggings authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      {/* Background Ambient Glow Orbs */}
      <div className="login-ambient-orb orb-magenta"></div>
      <div className="login-ambient-orb orb-blue"></div>
      <div className="login-ambient-orb orb-yellow"></div>
      <div className="login-ambient-orb orb-green"></div>

      {/* Top Bar for Theme Toggle */}
      <div className="login-top-bar">
        <div className="login-badge-location">
          <Building2 size={15} color="var(--accent-primary)" />
          <span>Tiruppur Manufacturing Facility • SIDCO Unit 1</span>
        </div>
        <button 
          type="button"
          className="login-theme-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} color="#f59e0b" />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="login-glass-card">
        {/* Left Side: Brand Showcase with YSS.png */}
        <div className="login-showcase-panel">
          <div className="login-showcase-content">
            <div className="brand-image-glow-container">
              <div className="brand-glow-backdrop"></div>
              <img 
                src={yssLogo} 
                alt="YSS Leggings – A Brand of Sillett" 
                className="brand-poster-img"
              />
            </div>

            <div className="showcase-caption">
              <div className="brand-super-tag">A Brand of Sillett</div>
              <h2 className="brand-display-title">YSS LEGGINGS</h2>
              <p className="brand-display-sub">
                Complete Manufacturing, Quality Control, Inventory Racks & POS Management ERP
              </p>
            </div>

            {/* Feature Highlights Pills */}
            <div className="showcase-highlights-grid">
              <div className="showcase-pill">
                <Scissors size={15} color="#db2777" />
                <span>Fabric Roll to Bundle Cutting</span>
              </div>
              <div className="showcase-pill">
                <Layers size={15} color="#2563eb" />
                <span>Tailoring & Defect Isolation</span>
              </div>
              <div className="showcase-pill">
                <Package size={15} color="#10b981" />
                <span>Color & Size Matrix Storage</span>
              </div>
              <div className="showcase-pill">
                <ShoppingBag size={15} color="#f59e0b" />
                <span>Wholesale & Quick POS Counter</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Sign-In Form */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <div className="login-badge-erp">
              <Sparkles size={14} color="#db2777" />
              <span>YSS Enterprise ERP v2.0</span>
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">
              Sign in with your factory credentials to access production, inventory, or sales operations.
            </p>
          </div>

          {/* Quick Demo Switcher / Preset Roles */}
          <div className="demo-roles-box">
            <div className="demo-roles-label">
              <span>Quick Login / Switch Role:</span>
              <span className="demo-hint">Click any role to autofill</span>
            </div>
            <div className="demo-chips-container">
              {demoAccounts.map((acc) => {
                const isActive = username === acc.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    className={`demo-chip ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectDemo(acc)}
                    title={`Login as ${acc.title} (${acc.username})`}
                  >
                    <span className="demo-chip-role">{acc.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="login-error-alert" role="alert">
              <AlertCircle size={18} color="#ef4444" />
              <div className="login-error-text">{errorMessage}</div>
            </div>
          )}

          {/* Modern Semantic Form */}
          <form className="login-auth-form" onSubmit={handleLoginSubmit} noValidate={false}>
            {/* Username Input */}
            <div className="form-field-group">
              <label htmlFor="login-username" className="field-label">
                Username / Terminal ID
              </label>
              <div className="field-input-wrapper">
                <User size={18} className="field-icon" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  enterKeyHint="next"
                  placeholder="e.g. admin or manager"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="field-input"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-field-group">
              <div className="field-label-row">
                <label htmlFor="login-password" className="field-label">
                  Password
                </label>
                <span className="field-hint-pwd">Default: admin123</span>
              </div>
              <div className="field-input-wrapper">
                <Lock size={18} className="field-icon" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  enterKeyHint="done"
                  placeholder="Enter your security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="form-options-row">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-label">Keep me signed in on this terminal</span>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="login-submit-btn" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="btn-loading-state">
                  <span className="spinner-circle"></span>
                  <span>Verifying Credentials...</span>
                </span>
              ) : (
                <span className="btn-normal-state">
                  <span>Sign In to YSS ERP</span>
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Footer Security Badges */}
          <div className="login-footer-security">
            <div className="security-item">
              <ShieldCheck size={14} color="#10b981" />
              <span>Role-Based Access Control</span>
            </div>
            <div className="security-bullet">•</div>
            <div className="security-item">
              <CheckCircle2 size={14} color="#3b82f6" />
              <span>Permanent Audit Logged</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
