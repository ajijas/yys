import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  Layers, 
  Scissors, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag,
  Clock,
  Plus
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading live dashboard analytics...</div>;
  }

  const { today_sales, inventory, production, pending_wages, alerts, recent_movements } = data || {};

  return (
    <div className="dashboard-view">
      {/* Low Stock Warning Banner if alerts exist */}
      {alerts && alerts.length > 0 && (
        <div className="alert-banner warning">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle className="text-warning" size={24} color="#f59e0b" />
            <div>
              <strong style={{ fontSize: '0.95rem' }}>Critical Low-Stock Alerts Detected!</strong>
              <div style={{ fontSize: '0.82rem', marginTop: '0.15rem', opacity: 0.9 }}>
                {alerts.length} item{alerts.length > 1 ? 's are' : ' is'} running below minimum threshold (e.g. {alerts.map(a => `${a.color_name} ${a.size_name ? `Size ${a.size_name}` : 'Fabric'}: ${a.current_quantity} ${a.unit}`).slice(0, 2).join(', ')}).
              </div>
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('inventory')}
            style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
          >
            Review Stock Matrix
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="stat-grid">
        <div className="card stat-card stat-success">
          <div className="stat-header">
            <span>Sales Revenue</span>
            <div className="stat-icon" style={{ backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value">₹{(today_sales?.total || 0).toLocaleString()}</div>
          <div className="stat-subtext" style={{ display: 'flex', gap: '0.75rem' }}>
            <span>Wholesale: ₹{(today_sales?.wholesale || 0).toLocaleString()}</span>
            <span>•</span>
            <span>Retail: ₹{(today_sales?.retail || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="card stat-card stat-info">
          <div className="stat-header">
            <span>Raw Material (Fabric)</span>
            <div className="stat-icon" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="stat-value">{inventory?.raw_fabric_kg || 0} <span style={{ fontSize: '1rem', fontWeight: 500 }}>KG</span></div>
          <div className="stat-subtext">Cotton Lycra bulk inventory</div>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span>Work in Progress (WIP)</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
              <Scissors size={20} />
            </div>
          </div>
          <div className="stat-value">{inventory?.wip_pieces || 0} <span style={{ fontSize: '1rem', fontWeight: 500 }}>Pcs</span></div>
          <div className="stat-subtext">Cut bundles awaiting stitching</div>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span>Finished Leggings</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
              <Package size={20} />
            </div>
          </div>
          <div className="stat-value">{inventory?.finished_pieces || 0} <span style={{ fontSize: '1rem', fontWeight: 500 }}>Pcs</span></div>
          <div className="stat-subtext">Packaged & ready on shelves</div>
        </div>

        <div className="card stat-card stat-warning">
          <div className="stat-header">
            <span>Pending Worker Wages</span>
            <div className="stat-icon" style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value">₹{(pending_wages || 0).toLocaleString()}</div>
          <div className="stat-subtext">Accrued piece-rate earnings</div>
        </div>
      </div>

      {/* Production & Action Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Production Progress Today */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <TrendingUp size={18} color="var(--accent-primary)" />
              Today's Production Journey
            </h3>
            <span className="badge badge-info">Real-time</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '0.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Scissors size={16} /> Cutting Department
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {production?.today_cut_pieces || 0} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>pieces cut</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Grouped into bundles (BND)</div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} /> Tailor Stitching
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--status-success)' }}>
                {production?.today_stitched_pieces || 0} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>pieces finished</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Accrued tailor piece-rates</div>
            </div>
          </div>

          {/* Quick Operations bar */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('purchases')}>
              <Plus size={15} /> Buy Fabric (KG)
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('production')}>
              <Scissors size={15} /> Start Cutting Job
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('sales')}>
              <ShoppingBag size={15} /> Open Retail POS
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('wages')}>
              <DollarSign size={15} /> Disburse Wages
            </button>
          </div>
        </div>

        {/* Low Stock Warning List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={18} color="var(--status-warning)" />
              Reorder & Production Triggers
            </h3>
            <span className="badge badge-warning">{alerts?.length || 0} Alerts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto' }}>
            {alerts && alerts.length > 0 ? (
              alerts.map((al, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(245, 158, 11, 0.05)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(245, 158, 11, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="color-dot" style={{ backgroundColor: al.hex_code || '#64748b' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {al.color_name} {al.size_name && `• Size ${al.size_name}`}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--status-warning)', fontWeight: 700, fontSize: '0.88rem' }}>
                      {al.current_quantity} {al.unit}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      (Min: {al.min_level})
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0', textAlign: 'center' }}>
                All fabric and finished stock are above minimum thresholds!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Movement Audit Log */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Layers size={18} color="var(--accent-primary)" />
            Recent Stock Movement Audit Trail
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('inventory')}>
            View Full Ledger
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Movement Reason</th>
                <th>Item Type</th>
                <th>Color / Size</th>
                <th>Change</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {recent_movements && recent_movements.length > 0 ? (
                recent_movements.map((m) => (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {m.date} <span style={{ opacity: 0.6 }}>{m.timestamp ? m.timestamp.split(' ')[1] : ''}</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{m.movement_reason}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.item_type}</td>
                    <td>
                      <div className="color-chip">
                        {m.hex_code && <span className="color-dot" style={{ backgroundColor: m.hex_code }} />}
                        <span>{m.color_name || 'All Colors'}</span>
                        {m.size_name && <span className="badge badge-secondary">{m.size_name}</span>}
                      </div>
                    </td>
                    <td>
                      {m.change_type === 'IN' ? (
                        <span style={{ color: 'var(--status-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <ArrowDownLeft size={14} /> +{m.quantity} {m.unit}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--status-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <ArrowUpRight size={14} /> -{m.quantity} {m.unit}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{m.notes || m.reference_no}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No stock movements recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
