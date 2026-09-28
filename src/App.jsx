import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  ShoppingCart, 
  Scissors, 
  Layers, 
  ShoppingBag, 
  DollarSign, 
  BarChart3, 
  Bell, 
  Package, 
  Sparkles,
  Search,
  Mic,
  MicOff,
  Sun,
  Moon,
  ShieldCheck,
  History,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  LogOut
} from 'lucide-react';

import yssLogo from './assets/YSS.png';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import MasterDataView from './components/MasterDataView';
import PurchasesView from './components/PurchasesView';
import ProductionView from './components/ProductionView';
import InventoryView from './components/InventoryView';
import SalesView from './components/SalesView';
import WagesView from './components/WagesView';
import ReportsView from './components/ReportsView';
import QualityView from './components/QualityView';
import AuditView from './components/AuditView';
import SettingsView from './components/SettingsView';

export default function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [alertCount, setAlertCount] = useState(0);

  // Theme State - Default to 'light' as explicitly requested!
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('yss_theme') || localStorage.getItem('yys_theme') || 'light';
  });

  // Current User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('yss_user') || sessionStorage.getItem('yss_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Voice / Smart Quick Command State (Section 41 & 42)
  const [smartInput, setSmartInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yss_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of YSS Leggings ERP?')) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: currentUser?.username, 
            full_name: currentUser?.full_name 
          })
        });
      } catch (e) {
        // Continue with local cleanup
      }
      localStorage.removeItem('yss_user');
      sessionStorage.removeItem('yss_user');
      setCurrentUser(null);
    }
  };

  // Poll alert count for notifications badge
  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        setAlertCount(data.alerts?.length || 0);
      } catch (err) {
        // quiet error
      }
    };
    checkAlerts();
  }, [activeModule]);

  // Voice recognition handler using browser Web Speech API
  const handleVoiceToggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not natively supported in this browser. You can type commands directly into the input bar!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSmartInput(transcript);
      processSmartCommand(transcript);
    };

    recognition.start();
  };

  // Natural Language & Voice intent processor (Section 41-42)
  const processSmartCommand = (text) => {
    const query = text.toLowerCase().trim();
    setVoiceFeedback(null);

    // Intent 1: Navigate to modules
    if (query.includes('purchase') || query.includes('fabric') || query.includes('buy')) {
      setActiveModule('purchases');
      setVoiceFeedback({ type: 'success', text: `Routing to Fabric Purchases: "${text}"` });
      return;
    }
    if (query.includes('cut') || query.includes('bundle') || query.includes('stitch')) {
      setActiveModule('production');
      setVoiceFeedback({ type: 'success', text: `Routing to Production: "${text}"` });
      return;
    }
    if (query.includes('quality') || query.includes('defect') || query.includes('qc') || query.includes('inspect')) {
      setActiveModule('quality');
      setVoiceFeedback({ type: 'success', text: `Routing to Quality Check: "${text}"` });
      return;
    }
    if (query.includes('inventory') || query.includes('stock') || query.includes('shelf') || query.includes('rack')) {
      setActiveModule('inventory');
      setVoiceFeedback({ type: 'success', text: `Routing to Inventory Matrix: "${text}"` });
      return;
    }
    if (query.includes('sale') || query.includes('pos') || query.includes('retail') || query.includes('bill')) {
      setActiveModule('sales');
      setVoiceFeedback({ type: 'success', text: `Routing to Sales & POS Counter: "${text}"` });
      return;
    }
    if (query.includes('wage') || query.includes('payroll') || query.includes('pay') || query.includes('worker')) {
      setActiveModule('wages');
      setVoiceFeedback({ type: 'success', text: `Routing to Worker Payroll: "${text}"` });
      return;
    }
    if (query.includes('report') || query.includes('analytics') || query.includes('revenue')) {
      setActiveModule('reports');
      setVoiceFeedback({ type: 'success', text: `Routing to Analytics Reports: "${text}"` });
      return;
    }
    if (query.includes('audit') || query.includes('log')) {
      setActiveModule('audit');
      setVoiceFeedback({ type: 'success', text: `Routing to Audit Logs: "${text}"` });
      return;
    }
    if (query.includes('setting') || query.includes('user')) {
      setActiveModule('settings');
      setVoiceFeedback({ type: 'success', text: `Routing to Settings: "${text}"` });
      return;
    }

    // Default match
    setVoiceFeedback({ 
      type: 'info', 
      text: `Parsed command "${text}". Try commands like "Show stock", "Open POS", "Quality check", or "Calculate wages"` 
    });
  };

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (smartInput) {
      processSmartCommand(smartInput);
    }
  };

  // Render Login Screen if no authenticated user session
  if (!currentUser) {
    return (
      <div data-theme={theme}>
        <LoginView 
          onLoginSuccess={(user) => setCurrentUser(user)} 
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </div>
    );
  }

  return (
    <div className="app-container" data-theme={theme}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon" style={{ padding: '0', background: 'transparent', width: '38px', height: '38px', overflow: 'hidden' }}>
            <img 
              src={yssLogo} 
              alt="YSS Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
            />
          </div>
          <div>
            <div className="brand-name">YSS LEGGINGS</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>A Brand of Sillett ERP</div>
          </div>
        </div>

        {/* Current Active User Status Card */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-names">
              <span className="sidebar-user-fullname">{currentUser?.full_name || currentUser?.username}</span>
              <span className="sidebar-user-role-badge">{currentUser?.role || 'User'}</span>
            </div>
          </div>
          <button 
            type="button"
            className="sidebar-logout-btn" 
            onClick={handleLogout}
            title="Log Out of System"
          >
            <LogOut size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-category">Main Overview</div>
          <div 
            className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveModule('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
            {alertCount > 0 && (
              <span className="nav-badge nav-badge-warning">{alertCount}</span>
            )}
          </div>

          <div className="nav-category">Manufacturing & Supply</div>
          <div 
            className={`nav-item ${activeModule === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveModule('purchases')}
          >
            <ShoppingCart size={18} />
            <span>Fabric Purchases (KG)</span>
          </div>

          <div 
            className={`nav-item ${activeModule === 'production' ? 'active' : ''}`}
            onClick={() => setActiveModule('production')}
          >
            <Scissors size={18} />
            <span>Production Pipeline</span>
          </div>

          <div 
            className={`nav-item ${activeModule === 'quality' ? 'active' : ''}`}
            onClick={() => setActiveModule('quality')}
          >
            <ShieldCheck size={18} />
            <span>Quality Check (QC)</span>
          </div>

          <div 
            className={`nav-item ${activeModule === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveModule('inventory')}
          >
            <Layers size={18} />
            <span>Inventory & Storage</span>
          </div>

          <div className="nav-category">Sales & Revenue</div>
          <div 
            className={`nav-item ${activeModule === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveModule('sales')}
          >
            <ShoppingBag size={18} />
            <span>Sales & POS Counter</span>
          </div>

          <div className="nav-category">Workforce & Pay</div>
          <div 
            className={`nav-item ${activeModule === 'wages' ? 'active' : ''}`}
            onClick={() => setActiveModule('wages')}
          >
            <DollarSign size={18} />
            <span>Worker Payroll</span>
          </div>

          <div className="nav-category">Management & System</div>
          <div 
            className={`nav-item ${activeModule === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveModule('reports')}
          >
            <BarChart3 size={18} />
            <span>Reports & Analytics</span>
          </div>

          <div 
            className={`nav-item ${activeModule === 'master' ? 'active' : ''}`}
            onClick={() => setActiveModule('master')}
          >
            <Database size={18} />
            <span>Master Catalog</span>
          </div>

          <div 
            className={`nav-item ${activeModule === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveModule('audit')}
          >
            <History size={18} />
            <span>Audit Log (Sec 37)</span>
          </div>

          <div 
            className={`nav-item ${activeModule === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveModule('settings')}
          >
            <SettingsIcon size={18} />
            <span>Business Settings</span>
          </div>
        </nav>
      </aside>

      {/* Main Canvas */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-title-group">
            <h1>
              {activeModule === 'dashboard' && 'Operations Dashboard'}
              {activeModule === 'master' && 'Master Data & Configuration'}
              {activeModule === 'purchases' && 'Fabric Material Purchases (KG)'}
              {activeModule === 'production' && 'Garment Production & Tailoring'}
              {activeModule === 'quality' && 'Quality Inspection & Defect Control (Section 14)'}
              {activeModule === 'inventory' && 'Inventory Control & Warehouse Racks'}
              {activeModule === 'sales' && 'Sales, Wholesale & Counter POS'}
              {activeModule === 'wages' && 'Worker Piece-Rate Payroll (Section 11)'}
              {activeModule === 'reports' && 'Management Intelligence & Reports'}
              {activeModule === 'audit' && 'System Activity & Audit Log (Section 37)'}
              {activeModule === 'settings' && 'Business Settings & User Roles (Section 38)'}
            </h1>
            <p>
              {activeModule === 'dashboard' && 'Real-time heartbeat of leggings manufacturing, inventory, and sales.'}
              {activeModule === 'master' && 'Manage colors, sizes, workers, suppliers, and customer master lists.'}
              {activeModule === 'purchases' && 'Track raw fabric roll intake in kilograms and mill payments.'}
              {activeModule === 'production' && 'Track fabric cutting, bundles, tailoring quality, and shelf packaging.'}
              {activeModule === 'quality' && 'Inspect stitched bundles, isolate defect reasons, and verify garment standards.'}
              {activeModule === 'inventory' && 'Complete dual-unit inventory ledger and shelf location matrix.'}
              {activeModule === 'sales' && 'Fast counter POS billing, wholesale dispatch, and customer returns.'}
              {activeModule === 'wages' && 'Deterministic piece count worker wage calculation and disbursements.'}
              {activeModule === 'reports' && 'Channel revenue breakdown, production yield, and inventory valuation.'}
              {activeModule === 'audit' && 'Permanent verifiable audit trail for every operational transaction.'}
              {activeModule === 'settings' && 'Company details, GSTIN, default pricing, and user role privileges.'}
            </p>
          </div>

          {/* Center Voice / Smart Input Bar (Sections 41 & 42) */}
          <form className="voice-bar" onSubmit={handleCommandSubmit}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              placeholder='Voice / Quick command (e.g. "Show stock", "Buy fabric", "QC")'
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
            />
            <button 
              type="button" 
              className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceToggle}
              title={isListening ? "Listening... click to stop" : "Click to speak voice command"}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          </form>

          {/* Right Header Actions */}
          <div className="header-actions">
            {/* Theme Toggle (Light / Dark) */}
            <button 
              className="btn btn-secondary btn-sm"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem' }}
            >
              {theme === 'light' ? <Moon size={15} color="var(--accent-primary)" /> : <Sun size={15} color="#f59e0b" />}
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {theme === 'light' ? 'Dark Mode' : 'Light Theme'}
              </span>
            </button>

            {alertCount > 0 && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveModule('inventory')}
                style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Bell size={14} />
                <span>{alertCount} Alert{alertCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {/* User Profile Pill in Top Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-full)', 
              padding: '0.3rem 0.65rem 0.3rem 0.4rem' 
            }}>
              <div style={{ 
                width: '26px', 
                height: '26px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #e11d48, #6366f1)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.75rem', 
                fontWeight: 700 
              }}>
                {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentUser?.full_name || currentUser?.username}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {currentUser?.role}
                </span>
              </div>
              <button 
                type="button"
                onClick={handleLogout}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '4px',
                  marginLeft: '0.2rem'
                }}
                title="Log Out of System"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Feedback alert toast for voice commands */}
        {voiceFeedback && (
          <div style={{
            margin: '1rem 2rem 0 2rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: voiceFeedback.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-info-bg)',
            border: `1px solid ${voiceFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              <span>{voiceFeedback.text}</span>
            </div>
            <button 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              onClick={() => setVoiceFeedback(null)}
            >
              ✕
            </button>
          </div>
        )}

        <section className="page-body">
          {activeModule === 'dashboard' && <DashboardView onNavigate={setActiveModule} />}
          {activeModule === 'master' && <MasterDataView />}
          {activeModule === 'purchases' && <PurchasesView />}
          {activeModule === 'production' && <ProductionView />}
          {activeModule === 'quality' && <QualityView />}
          {activeModule === 'inventory' && <InventoryView />}
          {activeModule === 'sales' && <SalesView />}
          {activeModule === 'wages' && <WagesView />}
          {activeModule === 'reports' && <ReportsView />}
          {activeModule === 'audit' && <AuditView />}
          {activeModule === 'settings' && <SettingsView />}
        </section>
      </main>
    </div>
  );
}
