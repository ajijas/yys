import React, { useState, useEffect } from 'react';
import { Settings, Users, Shield, Save, Plus, Check } from 'lucide-react';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('business'); // 'business', 'users'
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    role: 'Cutting Supervisor',
    status: 'Active'
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings || {});
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
        return;
      }

      setShowUserModal(false);
      setUserForm({ username: '', full_name: '', role: 'Cutting Supervisor', status: 'Active' });
      fetchSettings();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading business settings...</div>;
  }

  return (
    <div className="settings-view">
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'business' ? 'active' : ''}`} onClick={() => setActiveTab('business')}>
          <Settings size={16} /> Business Configuration (Section 38)
        </button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} /> User Roles & Access (Section 3) ({users.length})
        </button>
      </div>

      {activeTab === 'business' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">YSS Enterprise & Factory Settings</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Configure company identity, GSTIN for invoices, and threshold parameters for low-stock triggers.
              </p>
            </div>
            {savedSuccess && (
              <span className="badge badge-success">
                <Check size={13} /> Settings Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings}>
            <div className="form-row">
              <div className="form-group">
                <label>Company Legal / Trade Name</label>
                <input 
                  value={settings.company_name || ''} 
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>GSTIN Number</label>
                <input 
                  value={settings.gstin || ''} 
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Manufacturing Facility / Mill Address</label>
              <input 
                value={settings.factory_location || ''} 
                onChange={(e) => setSettings({ ...settings, factory_location: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Factory Phone / WhatsApp</label>
                <input 
                  value={settings.support_phone || ''} 
                  onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Default Wholesale Price (₹/pc)</label>
                <input 
                  type="number"
                  value={settings.default_wholesale_rate || '180'} 
                  onChange={(e) => setSettings({ ...settings, default_wholesale_rate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Default Retail POS Price (₹/pc)</label>
                <input 
                  type="number"
                  value={settings.default_retail_rate || '299'} 
                  onChange={(e) => setSettings({ ...settings, default_retail_rate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Min Raw Fabric Stock Alert (KG)</label>
                <input 
                  type="number"
                  value={settings.min_fabric_threshold_kg || '20'} 
                  onChange={(e) => setSettings({ ...settings, min_fabric_threshold_kg: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Min Finished Stock Alert (Pieces)</label>
                <input 
                  type="number"
                  value={settings.min_finished_stock_pcs || '25'} 
                  onChange={(e) => setSettings({ ...settings, min_finished_stock_pcs: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save Business Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">System Users & Role-Based Access (Section 3)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Roles define access boundaries: Admin, Manager, Cutting Supervisor, Stitching Supervisor, Packaging/Stock, and Sales Counter User.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUserModal(true)}>
              <Plus size={15} /> Add System User
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Role Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.full_name}</strong></td>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>@{u.username}</span></td>
                    <td>
                      <span className={`badge ${
                        u.role === 'Admin' ? 'badge-primary' : 
                        u.role === 'Manager' ? 'badge-info' : 
                        u.role.includes('Supervisor') ? 'badge-warning' : 'badge-secondary'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Create New System User</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowUserModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input 
                    required 
                    placeholder="e.g. Senthil Kumar"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Username / Login ID *</label>
                  <input 
                    required 
                    placeholder="e.g. senthil_cut"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  />
                </div>
                <div className="form-group">
                  <label>Role Designation (Section 3) *</label>
                  <select 
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="Admin">Admin (Full System Control)</option>
                    <option value="Manager">Manager (Operations, Purchases, Sales)</option>
                    <option value="Cutting Supervisor">Cutting Supervisor (Cutting jobs, Fabric issue, Bundles)</option>
                    <option value="Stitching Supervisor">Stitching Supervisor (Tailor assignment, QC)</option>
                    <option value="Packaging / Stock">Packaging / Stock Worker (Shelf location, Box count)</option>
                    <option value="Sales User">Sales User (Wholesale orders & Retail POS)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
