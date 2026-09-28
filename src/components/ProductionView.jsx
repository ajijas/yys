import React, { useState, useEffect } from 'react';
import { Scissors, Layers, CheckCircle2, Package, Plus, AlertCircle, ArrowRight, User } from 'lucide-react';

export default function ProductionView() {
  const [activeTab, setActiveTab] = useState('cutting'); // 'cutting', 'bundles', 'stitching', 'packaging'
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [rawStock, setRawStock] = useState([]);
  const [locations, setLocations] = useState({ shelves: [] });

  // Data lists
  const [cuttingJobs, setCuttingJobs] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [stitchingJobs, setStitchingJobs] = useState([]);
  const [packagingJobs, setPackagingJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCutModal, setShowCutModal] = useState(false);
  const [showStitchModal, setShowStitchModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);

  // Forms
  const [cutForm, setCutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    color_id: '',
    fabric_issued_kg: '',
    wastage_kg: '0',
    worker_id: '',
    bundle_size: '50',
    items: {}, // { size_id: pieces_count }
    notes: ''
  });

  const [stitchForm, setStitchForm] = useState({
    date: new Date().toISOString().split('T')[0],
    bundle_id: '',
    worker_id: '',
    pieces_completed: '',
    pieces_rejected: '0',
    notes: ''
  });

  const [packForm, setPackForm] = useState({
    date: new Date().toISOString().split('T')[0],
    color_id: '',
    size_id: '',
    pieces_packed: '',
    shelf_id: '',
    worker_id: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [cRes, sRes, wRes, rawRes, locRes, cutRes, bndRes, stRes, pkgRes] = await Promise.all([
        fetch('/api/master/colors'),
        fetch('/api/master/sizes'),
        fetch('/api/master/workers'),
        fetch('/api/inventory/raw'),
        fetch('/api/master/locations'),
        fetch('/api/production/cutting'),
        fetch('/api/production/bundles'),
        fetch('/api/production/stitching'),
        fetch('/api/production/packaging')
      ]);

      setColors(await cRes.json());
      setSizes(await sRes.json());
      setWorkers(await wRes.json());
      setRawStock(await rawRes.json());
      setLocations(await locRes.json());
      setCuttingJobs(await cutRes.json());
      setBundles(await bndRes.json());
      setStitchingJobs(await stRes.json());
      setPackagingJobs(await pkgRes.json());
    } catch (err) {
      console.error('Failed to load production data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helpers for cutting form
  const selectedRawStock = rawStock.find(r => String(r.color_id) === String(cutForm.color_id));
  const availableFabricKg = selectedRawStock ? selectedRawStock.quantity_kg : 0;
  const totalPiecesCut = Object.values(cutForm.items).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
  const selectedCutter = workers.find(w => String(w.id) === String(cutForm.worker_id));
  const estimatedCutterWage = totalPiecesCut * (selectedCutter?.piece_rate || 0);

  // Helpers for stitching form
  const selectedBundle = bundles.find(b => String(b.id) === String(stitchForm.bundle_id));
  const selectedTailor = workers.find(w => String(w.id) === String(stitchForm.worker_id));
  const stitchWage = (parseInt(stitchForm.pieces_completed, 10) || 0) * (selectedTailor?.piece_rate || 3.0);

  // Submit Cutting
  const handleCuttingSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemsPayload = Object.entries(cutForm.items)
        .filter(([_, count]) => parseInt(count, 10) > 0)
        .map(([sizeId, count]) => ({ size_id: sizeId, pieces_count: parseInt(count, 10) }));

      if (itemsPayload.length === 0) {
        alert('Please enter piece count for at least one size.');
        return;
      }

      const res = await fetch('/api/production/cutting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cutForm,
          items: itemsPayload
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit cutting job');
        return;
      }

      setShowCutModal(false);
      setCutForm({
        date: new Date().toISOString().split('T')[0],
        color_id: '',
        fabric_issued_kg: '',
        wastage_kg: '0',
        worker_id: '',
        bundle_size: '50',
        items: {},
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit Stitching
  const handleStitchingSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/production/stitching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stitchForm)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit stitching job');
        return;
      }

      setShowStitchModal(false);
      setStitchForm({
        date: new Date().toISOString().split('T')[0],
        bundle_id: '',
        worker_id: '',
        pieces_completed: '',
        pieces_rejected: '0',
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit Packaging
  const handlePackagingSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/production/packaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packForm)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit packaging job');
        return;
      }

      setShowPackModal(false);
      setPackForm({
        date: new Date().toISOString().split('T')[0],
        color_id: '',
        size_id: '',
        pieces_packed: '',
        shelf_id: '',
        worker_id: '',
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading production pipeline...</div>;
  }

  const cutters = workers.filter(w => w.job_type === 'Cutter');
  const tailors = workers.filter(w => w.job_type === 'Tailor');
  const packers = workers.filter(w => w.job_type === 'Packaging');

  return (
    <div className="production-view">
      {/* Top Tabs */}
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'cutting' ? 'active' : ''}`} onClick={() => setActiveTab('cutting')}>
          <Scissors size={16} /> 1. Cutting Desk ({cuttingJobs.length})
        </button>
        <button className={`tab-btn ${activeTab === 'bundles' ? 'active' : ''}`} onClick={() => setActiveTab('bundles')}>
          <Layers size={16} /> 2. Bundles Tracker ({bundles.length})
        </button>
        <button className={`tab-btn ${activeTab === 'stitching' ? 'active' : ''}`} onClick={() => setActiveTab('stitching')}>
          <CheckCircle2 size={16} /> 3. Tailor Stitching ({stitchingJobs.length})
        </button>
        <button className={`tab-btn ${activeTab === 'packaging' ? 'active' : ''}`} onClick={() => setActiveTab('packaging')}>
          <Package size={16} /> 4. Packaging & Shelf Storage ({packagingJobs.length})
        </button>
      </div>

      {/* 1. CUTTING TAB */}
      {activeTab === 'cutting' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Scissors size={20} color="var(--accent-primary)" />
                Cutting Operations (Fabric KG ➔ Cut Pieces & Bundles)
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Converts bulk fabric rolls into size-based pieces, calculates wastage, automatically generates bundles (`BND-xxxxx`), and tracks cutter wages.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCutModal(true)}>
              <Plus size={16} /> Start Cutting Job
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Date</th>
                  <th>Fabric Color</th>
                  <th>Fabric Issued</th>
                  <th>Pieces Produced</th>
                  <th>Wastage</th>
                  <th>Assigned Cutter</th>
                  <th>Size Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {cuttingJobs.map((j) => (
                  <tr key={j.id}>
                    <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{j.job_no}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{j.date}</td>
                    <td>
                      <div className="color-chip">
                        <span className="color-dot" style={{ backgroundColor: j.hex_code }} />
                        <span>{j.color_name}</span>
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{j.fabric_issued_kg} KG</span></td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: '0.95rem' }}>
                        {j.total_pieces_cut} pcs
                      </span>
                    </td>
                    <td style={{ color: j.wastage_kg > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                      {j.wastage_kg} KG
                    </td>
                    <td>{j.worker_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {j.items?.map((item) => (
                          <span key={item.id} className="badge badge-secondary">
                            {item.size_name}: <strong>{item.pieces_cut}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. BUNDLES TRACKER TAB */}
      {activeTab === 'bundles' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Layers size={20} color="var(--accent-primary)" />
                Cutting Bundles Tracker
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Every bundle has a unique number (`BND-xxxxx`) by Color, Size, and Quantity, ready for issue to tailors.
              </p>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                const ready = bundles.find(b => b.status === 'Ready for Stitching');
                if (ready) {
                  setStitchForm({ ...stitchForm, bundle_id: ready.id, pieces_completed: ready.pieces_count });
                  setShowStitchModal(true);
                } else {
                  setShowStitchModal(true);
                }
              }}
            >
              <CheckCircle2 size={16} /> Issue Bundle to Stitching
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bundle #</th>
                  <th>Cutting Job</th>
                  <th>Color</th>
                  <th>Size</th>
                  <th>Pieces</th>
                  <th>Status</th>
                  <th>Assigned Tailor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((b) => (
                  <tr key={b.id}>
                    <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{b.bundle_no}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{b.cutting_job_no}</td>
                    <td>
                      <div className="color-chip">
                        <span className="color-dot" style={{ backgroundColor: b.hex_code }} />
                        <span>{b.color_name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-info">{b.size_name}</span></td>
                    <td><strong style={{ fontSize: '0.95rem' }}>{b.pieces_count} pcs</strong></td>
                    <td>
                      <span className={`badge ${
                        b.status === 'Completed' ? 'badge-success' : 
                        b.status === 'Ready for Stitching' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td>{b.assigned_tailor_name || 'Unassigned'}</td>
                    <td>
                      {b.status !== 'Completed' && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setStitchForm({ 
                              ...stitchForm, 
                              bundle_id: b.id, 
                              pieces_completed: b.pieces_count 
                            });
                            setShowStitchModal(true);
                          }}
                        >
                          Stitch <ArrowRight size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. STITCHING TAB */}
      {activeTab === 'stitching' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <CheckCircle2 size={20} color="var(--status-success)" />
                Tailor Stitching Production & Quality Log
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Records completed pieces vs defective/rejected pieces per tailor, and deterministically calculates piece wages (e.g. ₹3/piece).
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowStitchModal(true)}>
              <Plus size={16} /> New Stitching Entry
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Date</th>
                  <th>Bundle #</th>
                  <th>Tailor</th>
                  <th>Color / Size</th>
                  <th>Issued</th>
                  <th>Passed</th>
                  <th>Rejected</th>
                  <th>Piece Rate</th>
                  <th>Earned Wage</th>
                </tr>
              </thead>
              <tbody>
                {stitchingJobs.map((sj) => (
                  <tr key={sj.id}>
                    <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{sj.job_no}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{sj.date}</td>
                    <td><span className="badge badge-secondary">{sj.bundle_no}</span></td>
                    <td><strong>{sj.tailor_name}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({sj.worker_code})</span></td>
                    <td>
                      <div className="color-chip">
                        <span className="color-dot" style={{ backgroundColor: sj.hex_code }} />
                        <span>{sj.color_name}</span>
                        <span className="badge badge-info">{sj.size_name}</span>
                      </div>
                    </td>
                    <td>{sj.pieces_issued}</td>
                    <td><strong style={{ color: 'var(--status-success)' }}>{sj.pieces_completed}</strong></td>
                    <td style={{ color: sj.pieces_rejected > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>
                      {sj.pieces_rejected}
                    </td>
                    <td>₹{sj.piece_rate.toFixed(2)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{sj.total_wage.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PACKAGING TAB */}
      {activeTab === 'packaging' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Package size={20} color="#a855f7" />
                Packaging & Warehouse Shelf Allocation
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Packages stitched leggings and adds them into Finished Goods Inventory under specific Warehouse Racks & Shelves.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowPackModal(true)}>
              <Plus size={16} /> Record Packaged Goods
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Packaging #</th>
                  <th>Date</th>
                  <th>Color / Size</th>
                  <th>Packed Quantity</th>
                  <th>Storage Location</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {packagingJobs.map((pj) => (
                  <tr key={pj.id}>
                    <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{pj.packaging_no}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{pj.date}</td>
                    <td>
                      <div className="color-chip">
                        <span className="color-dot" style={{ backgroundColor: pj.hex_code }} />
                        <span>{pj.color_name}</span>
                        <span className="badge badge-info">{pj.size_name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: '0.95rem' }}>
                        +{pj.pieces_packed} pcs
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-secondary">
                        {pj.rack_name ? `${pj.rack_name} / ${pj.shelf_name}` : 'Main Warehouse'}
                      </span>
                    </td>
                    <td>{pj.worker_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: New Cutting Job */}
      {showCutModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Cutting Job (Fabric KG ➔ Pieces)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCutModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCuttingSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Cutting Date *</label>
                    <input 
                      type="date"
                      required
                      value={cutForm.date}
                      onChange={(e) => setCutForm({ ...cutForm, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fabric Color to Cut *</label>
                    <select 
                      required
                      value={cutForm.color_id}
                      onChange={(e) => setCutForm({ ...cutForm, color_id: e.target.value })}
                    >
                      <option value="">Select Fabric Color</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fabric Stock Status Alert */}
                {cutForm.color_id && (
                  <div style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    backgroundColor: availableFabricKg > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${availableFabricKg > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontSize: '0.84rem'
                  }}>
                    Available In Raw Inventory: <strong>{availableFabricKg} KG</strong>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Fabric Issued (KG) *</label>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      placeholder="e.g. 20"
                      value={cutForm.fabric_issued_kg}
                      onChange={(e) => setCutForm({ ...cutForm, fabric_issued_kg: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Wastage (KG)</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="e.g. 1.5"
                      value={cutForm.wastage_kg}
                      onChange={(e) => setCutForm({ ...cutForm, wastage_kg: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Assigned Cutter</label>
                    <select 
                      value={cutForm.worker_id}
                      onChange={(e) => setCutForm({ ...cutForm, worker_id: e.target.value })}
                    >
                      <option value="">Select Cutter</option>
                      {cutters.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} (Rate: ₹{w.piece_rate}/pc)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sizing Breakdown Matrix */}
                <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem' }}>
                    Pieces Cut by Size (Will be auto-chunked into Bundles):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem' }}>
                    {sizes.map((s) => (
                      <div key={s.id} style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        padding: '0.6rem', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>Size {s.name}</div>
                        <input 
                          type="number"
                          placeholder="0"
                          style={{ textAlign: 'center', width: '100%' }}
                          value={cutForm.items[s.id] || ''}
                          onChange={(e) => setCutForm({
                            ...cutForm,
                            items: { ...cutForm.items, [s.id]: e.target.value }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation summary */}
                <div style={{
                  padding: '0.85rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Pieces Cut:</span>
                    <strong>{totalPiecesCut} pieces</strong>
                  </div>
                  {selectedCutter && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      <span>Cutter Wage Accrual:</span>
                      <strong style={{ color: 'var(--status-success)' }}>
                        {totalPiecesCut} pcs × ₹{selectedCutter.piece_rate} = ₹{estimatedCutterWage.toFixed(2)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCutModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Job & Generate Bundles</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Stitching Job */}
      {showStitchModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tailor Stitching Assignment & Quality Entry</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStitchModal(false)}>✕</button>
            </div>

            <form onSubmit={handleStitchingSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input 
                      type="date"
                      required
                      value={stitchForm.date}
                      onChange={(e) => setStitchForm({ ...stitchForm, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Select Cut Bundle *</label>
                    <select 
                      required
                      value={stitchForm.bundle_id}
                      onChange={(e) => {
                        const b = bundles.find(item => String(item.id) === e.target.value);
                        setStitchForm({ 
                          ...stitchForm, 
                          bundle_id: e.target.value,
                          pieces_completed: b ? b.pieces_count : ''
                        });
                      }}
                    >
                      <option value="">Select Bundle</option>
                      {bundles.filter(b => b.status !== 'Completed').map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bundle_no} — {b.color_name} Size {b.size_name} ({b.pieces_count} pcs)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Assign Tailor Worker *</label>
                  <select 
                    required
                    value={stitchForm.worker_id}
                    onChange={(e) => setStitchForm({ ...stitchForm, worker_id: e.target.value })}
                  >
                    <option value="">Select Tailor</option>
                    {tailors.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.worker_code} — Piece Rate: ₹{w.piece_rate}/pc)</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Pieces Completed (Passed) *</label>
                    <input 
                      type="number"
                      required
                      value={stitchForm.pieces_completed}
                      onChange={(e) => setStitchForm({ ...stitchForm, pieces_completed: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pieces Defective / Rejected</label>
                    <input 
                      type="number"
                      value={stitchForm.pieces_rejected}
                      onChange={(e) => setStitchForm({ ...stitchForm, pieces_rejected: e.target.value })}
                    />
                  </div>
                </div>

                {selectedTailor && (
                  <div style={{
                    padding: '0.85rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Tailor Piece Wage Accrual:</span>
                      <span style={{ color: 'var(--status-success)', fontSize: '1rem' }}>
                        {stitchForm.pieces_completed || 0} pcs × ₹{selectedTailor.piece_rate} = ₹{stitchWage.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStitchModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete Stitching</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Packaging Job */}
      {showPackModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Record Packaging & Shelf Placement</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPackModal(false)}>✕</button>
            </div>

            <form onSubmit={handlePackagingSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input 
                      type="date"
                      required
                      value={packForm.date}
                      onChange={(e) => setPackForm({ ...packForm, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Leggings Color *</label>
                    <select 
                      required
                      value={packForm.color_id}
                      onChange={(e) => setPackForm({ ...packForm, color_id: e.target.value })}
                    >
                      <option value="">Select Color</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Size *</label>
                    <select 
                      required
                      value={packForm.size_id}
                      onChange={(e) => setPackForm({ ...packForm, size_id: e.target.value })}
                    >
                      <option value="">Select Size</option>
                      {sizes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Pieces Packed *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 100"
                      value={packForm.pieces_packed}
                      onChange={(e) => setPackForm({ ...packForm, pieces_packed: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Storage Shelf Location</label>
                    <select 
                      value={packForm.shelf_id}
                      onChange={(e) => setPackForm({ ...packForm, shelf_id: e.target.value })}
                    >
                      <option value="">Assign Later</option>
                      {locations.shelves.map((sh) => (
                        <option key={sh.id} value={sh.id}>{sh.rack_name} / {sh.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Packaging Worker</label>
                    <select 
                      value={packForm.worker_id}
                      onChange={(e) => setPackForm({ ...packForm, worker_id: e.target.value })}
                    >
                      <option value="">Select Operator</option>
                      {packers.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} (₹{w.piece_rate}/pc)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--status-success)', marginTop: '0.5rem' }}>
                  ✔ Finished goods stock will automatically increase by +{packForm.pieces_packed || 0} pieces.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPackModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add to Finished Goods Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
