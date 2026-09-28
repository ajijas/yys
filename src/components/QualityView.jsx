import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertOctagon, Plus, Search, Filter } from 'lucide-react';

export default function QualityView() {
  const [checks, setChecks] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bundle_id: '',
    color_id: '',
    size_id: '',
    total_checked: '',
    passed_count: '',
    rejected_count: '0',
    defect_type: 'None',
    inspector_name: 'QC Supervisor',
    tailor_worker_id: '',
    remarks: ''
  });

  const fetchData = async () => {
    try {
      const [qRes, bRes, wRes, cRes, sRes] = await Promise.all([
        fetch('/api/quality'),
        fetch('/api/production/bundles'),
        fetch('/api/master/workers'),
        fetch('/api/master/colors'),
        fetch('/api/master/sizes')
      ]);

      setChecks(await qRes.json());
      setBundles(await bRes.json());
      setWorkers(await wRes.json());
      setColors(await cRes.json());
      setSizes(await sRes.json());
    } catch (err) {
      console.error('Failed to load QC data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit QC log');
        return;
      }

      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bundle_id: '',
        color_id: '',
        size_id: '',
        total_checked: '',
        passed_count: '',
        rejected_count: '0',
        defect_type: 'None',
        inspector_name: 'QC Supervisor',
        tailor_worker_id: '',
        remarks: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading quality control desk...</div>;
  }

  const totalInspected = checks.reduce((sum, c) => sum + c.total_checked, 0);
  const totalPassed = checks.reduce((sum, c) => sum + c.passed_count, 0);
  const totalRejected = checks.reduce((sum, c) => sum + c.rejected_count, 0);
  const passRate = totalInspected > 0 ? ((totalPassed / totalInspected) * 100).toFixed(1) : 100;

  const tailors = workers.filter(w => w.job_type === 'Tailor');

  return (
    <div className="quality-view">
      {/* Stat Strip */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card stat-success">
          <div className="stat-header">
            <span>Overall Quality Pass Rate</span>
            <ShieldCheck size={18} />
          </div>
          <div className="stat-value">{passRate}%</div>
          <div className="stat-subtext">{totalPassed} pieces verified defect-free</div>
        </div>

        <div className="card stat-card stat-info">
          <div className="stat-header">
            <span>Total Checked Pieces</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="stat-value">{totalInspected} pcs</div>
          <div className="stat-subtext">From {checks.length} inspection batches</div>
        </div>

        <div className="card stat-card stat-danger">
          <div className="stat-header">
            <span>Defects / Rejections</span>
            <AlertOctagon size={18} />
          </div>
          <div className="stat-value">{totalRejected} pcs</div>
          <div className="stat-subtext">Isolated before shelf packaging</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <ShieldCheck size={20} color="var(--accent-primary)" />
              Quality Check Inspection Log (Section 14)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Inspect stitched bundles before packaging. Identifies defect types (Stitch Skipping, Seam Puckering, Fabric Hole, Measurement Variance, Oil/Stain) to maintain brand standards.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={15} /> New Inspection
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>QC Check #</th>
                <th>Date</th>
                <th>Bundle #</th>
                <th>Color / Size</th>
                <th>Checked</th>
                <th>Passed</th>
                <th>Rejected</th>
                <th>Defect Category</th>
                <th>Tailor</th>
                <th>Inspector</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((qc) => (
                <tr key={qc.id}>
                  <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{qc.check_no}</strong></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{qc.date}</td>
                  <td><span className="badge badge-secondary">{qc.bundle_no || 'Direct'}</span></td>
                  <td>
                    <div className="color-chip">
                      {qc.hex_code && <span className="color-dot" style={{ backgroundColor: qc.hex_code }} />}
                      <span>{qc.color_name || 'Standard'}</span>
                      {qc.size_name && <span className="badge badge-info">{qc.size_name}</span>}
                    </div>
                  </td>
                  <td><strong>{qc.total_checked}</strong></td>
                  <td><strong style={{ color: 'var(--status-success)' }}>{qc.passed_count}</strong></td>
                  <td>
                    <span style={{ 
                      color: qc.rejected_count > 0 ? 'var(--status-danger)' : 'var(--text-muted)',
                      fontWeight: qc.rejected_count > 0 ? 700 : 400
                    }}>
                      {qc.rejected_count}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${qc.defect_type && qc.defect_type !== 'None' ? 'badge-danger' : 'badge-success'}`}>
                      {qc.defect_type || 'None'}
                    </span>
                  </td>
                  <td>{qc.tailor_name || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{qc.inspector_name}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{qc.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QC Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Record Quality Inspection</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Inspection Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Inspector Name</label>
                    <input 
                      value={formData.inspector_name}
                      onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Production Bundle (Optional)</label>
                  <select 
                    value={formData.bundle_id}
                    onChange={(e) => {
                      const b = bundles.find(item => String(item.id) === e.target.value);
                      if (b) {
                        setFormData({
                          ...formData,
                          bundle_id: e.target.value,
                          color_id: b.color_id,
                          size_id: b.size_id,
                          total_checked: b.pieces_count,
                          passed_count: b.pieces_count,
                          tailor_worker_id: b.assigned_worker_id || ''
                        });
                      } else {
                        setFormData({ ...formData, bundle_id: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select Bundle (or enter manually)</option>
                    {bundles.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bundle_no} — {b.color_name} Size {b.size_name} ({b.pieces_count} pcs)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color</label>
                    <select 
                      value={formData.color_id} 
                      onChange={(e) => setFormData({ ...formData, color_id: e.target.value })}
                    >
                      <option value="">Select Color</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Size</label>
                    <select 
                      value={formData.size_id} 
                      onChange={(e) => setFormData({ ...formData, size_id: e.target.value })}
                    >
                      <option value="">Select Size</option>
                      {sizes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Checked Pieces *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 50"
                      value={formData.total_checked}
                      onChange={(e) => setFormData({ ...formData, total_checked: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Passed (Accepted) Pieces *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 48"
                      value={formData.passed_count}
                      onChange={(e) => {
                        const passed = parseInt(e.target.value, 10) || 0;
                        const total = parseInt(formData.total_checked, 10) || 0;
                        setFormData({
                          ...formData,
                          passed_count: e.target.value,
                          rejected_count: Math.max(0, total - passed)
                        });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rejected / Defective Pieces</label>
                    <input 
                      type="number"
                      value={formData.rejected_count}
                      onChange={(e) => setFormData({ ...formData, rejected_count: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Defect Category</label>
                    <select 
                      value={formData.defect_type}
                      onChange={(e) => setFormData({ ...formData, defect_type: e.target.value })}
                    >
                      <option value="None">None (Perfect Quality)</option>
                      <option value="Stitch Skipping">Stitch Skipping / Loose Seam</option>
                      <option value="Seam Puckering">Seam Puckering</option>
                      <option value="Fabric Hole">Fabric Hole / Needle Cut</option>
                      <option value="Shade Variation">Color Shade Variation</option>
                      <option value="Measurement Defect">Size / Measurement Deviation</option>
                      <option value="Oil/Stain">Machine Oil / Stain</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Responsible Tailor</label>
                    <select 
                      value={formData.tailor_worker_id}
                      onChange={(e) => setFormData({ ...formData, tailor_worker_id: e.target.value })}
                    >
                      <option value="">Select Tailor</option>
                      {tailors.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.worker_code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Remarks & Inspection Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. Minor needle cuts on left ankle hem"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Quality Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
