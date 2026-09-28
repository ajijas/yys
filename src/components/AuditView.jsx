import React, { useState, useEffect } from 'react';
import { History, Shield, Search, Filter } from 'lucide-react';

export default function AuditView() {
  const [logs, setLogs] = useState([]);
  const [filterModule, setFilterModule] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      let url = '/api/audit';
      if (filterModule) url += `?module=${encodeURIComponent(filterModule)}`;
      const res = await fetch(url);
      setLogs(await res.json());
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterModule]);

  const filteredLogs = logs.filter(l => 
    !searchQuery || 
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="audit-view">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <History size={20} color="var(--accent-primary)" />
              System Activity & Audit Log (Section 37)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Every stock change, purchase, sale, wage payment, user creation, and configuration update creates a permanent security audit record.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select 
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            >
              <option value="">All System Modules</option>
              <option value="Purchases">Purchases</option>
              <option value="Cutting">Cutting</option>
              <option value="Stitching">Stitching</option>
              <option value="QC">Quality Control</option>
              <option value="Inventory">Inventory Adjustments</option>
              <option value="Sales">Sales & POS</option>
              <option value="Wages">Wages & Payments</option>
              <option value="Settings">Settings & Users</option>
            </select>
            <input 
              placeholder="Search audit details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', width: '220px' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>User / Operator</th>
                <th>Module</th>
                <th>Action</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {log.created_at}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <Shield size={13} color="var(--accent-primary)" />
                        {log.user_name}
                      </div>
                    </td>
                    <td><span className="badge badge-secondary">{log.module}</span></td>
                    <td><strong>{log.action}</strong></td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No audit events found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
