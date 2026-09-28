import React, { useState, useEffect } from 'react';
import { Layers, Package, Scissors, History, AlertTriangle, Sliders, ArrowUpRight, ArrowDownLeft, MapPin, Download } from 'lucide-react';

function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function InventoryView() {
  const [activeTab, setActiveTab] = useState('finished'); // 'finished', 'raw', 'wip', 'movements'
  const [summary, setSummary] = useState(null);
  const [rawStock, setRawStock] = useState([]);
  const [wipStock, setWipStock] = useState([]);
  const [finishedStock, setFinishedStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjForm, setAdjForm] = useState({
    item_type: 'FINISHED_GOODS',
    color_id: '',
    size_id: '',
    quantity: '',
    change_type: 'IN',
    reason: 'Stock Adjustment',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [sumRes, rawRes, wipRes, finRes, movRes, colRes, sizRes] = await Promise.all([
        fetch('/api/inventory/summary'),
        fetch('/api/inventory/raw'),
        fetch('/api/inventory/wip'),
        fetch('/api/inventory/finished'),
        fetch('/api/inventory/movements'),
        fetch('/api/master/colors'),
        fetch('/api/master/sizes')
      ]);

      setSummary(await sumRes.json());
      setRawStock(await rawRes.json());
      setWipStock(await wipRes.json());
      setFinishedStock(await finRes.json());
      setMovements(await movRes.json());
      setColors(await colRes.json());
      setSizes(await sizRes.json());
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjForm)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Adjustment failed');
        return;
      }

      setShowAdjustModal(false);
      setAdjForm({
        item_type: 'FINISHED_GOODS',
        color_id: '',
        size_id: '',
        quantity: '',
        change_type: 'IN',
        reason: 'Stock Adjustment',
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading inventory matrices...</div>;
  }

  // Build Finished Goods Color x Size Matrix
  const matrixData = {};
  colors.forEach(c => {
    matrixData[c.id] = { color: c, sizes: {} };
    sizes.forEach(s => {
      matrixData[c.id].sizes[s.id] = 0;
    });
  });

  finishedStock.forEach(item => {
    if (matrixData[item.color_id] && matrixData[item.color_id].sizes[item.size_id] !== undefined) {
      matrixData[item.color_id].sizes[item.size_id] = item.quantity;
    }
  });

  return (
    <div className="inventory-view">
      {/* Overview Stat Strip */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card stat-info">
          <div className="stat-header">
            <span>Raw Fabric Stock</span>
            <Layers size={18} />
          </div>
          <div className="stat-value">{summary?.raw_fabric_kg || 0} <span style={{ fontSize: '1rem' }}>KG</span></div>
          <div className="stat-subtext">Rolls stored in warehouse bays</div>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span>Work-in-Progress (WIP)</span>
            <Scissors size={18} />
          </div>
          <div className="stat-value">{summary?.wip_pieces || 0} <span style={{ fontSize: '1rem' }}>Pcs</span></div>
          <div className="stat-subtext">Active bundles in cutting & stitching</div>
        </div>

        <div className="card stat-card stat-success">
          <div className="stat-header">
            <span>Finished Leggings</span>
            <Package size={18} />
          </div>
          <div className="stat-value">{summary?.finished_pieces || 0} <span style={{ fontSize: '1rem' }}>Pcs</span></div>
          <div className="stat-subtext">Arranged on shelves by Color & Size</div>
        </div>

        <div className="card stat-card stat-warning">
          <div className="stat-header">
            <span>Low Stock Alerts</span>
            <AlertTriangle size={18} />
          </div>
          <div className="stat-value">{summary?.low_stock_alerts_count || 0}</div>
          <div className="stat-subtext">Items below minimum threshold</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'finished' ? 'active' : ''}`} onClick={() => setActiveTab('finished')}>
          <Package size={16} /> 1. Finished Leggings Stock ({finishedStock.length})
        </button>
        <button className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`} onClick={() => setActiveTab('raw')}>
          <Layers size={16} /> 2. Raw Material Fabric (KG) ({rawStock.length})
        </button>
        <button className={`tab-btn ${activeTab === 'wip' ? 'active' : ''}`} onClick={() => setActiveTab('wip')}>
          <Scissors size={16} /> 3. WIP Bundles ({wipStock.length})
        </button>
        <button className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`} onClick={() => setActiveTab('movements')}>
          <History size={16} /> 4. Stock Movement Audit Trail ({movements.length})
        </button>
      </div>

      {/* 1. FINISHED GOODS TAB */}
      {activeTab === 'finished' && (
        <div>
          {/* Matrix Grid Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Color × Size Finished Inventory Matrix</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Quick visual glance of pieces currently on shelves for wholesale and retail distribution.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => exportToCSV('finished_goods_inventory.csv', finishedStock.map(f => ({
                    Product: f.product_name,
                    SKU: f.sku,
                    Color: f.color_name,
                    Size: f.size_name,
                    Location: `${f.rack_name || ''} / ${f.shelf_name || ''}`,
                    Quantity_Pcs: f.quantity,
                    Min_Threshold: f.min_stock_level,
                    Status: f.is_low_stock ? 'Low Stock' : 'In Stock'
                  })))}
                >
                  <Download size={14} /> Export CSV
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdjustModal(true)}>
                  <Sliders size={14} /> Adjust Stock
                </button>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Color</th>
                    {sizes.map(s => (
                      <th key={s.id} style={{ textAlign: 'center' }}>Size {s.name}</th>
                    ))}
                    <th style={{ textAlign: 'right' }}>Total Pieces</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(matrixData).map(({ color, sizes: sCounts }) => {
                    const rowTotal = Object.values(sCounts).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={color.id}>
                        <td>
                          <div className="color-chip">
                            <span className="color-dot" style={{ backgroundColor: color.hex_code }} />
                            <span style={{ fontWeight: 600 }}>{color.name}</span>
                          </div>
                        </td>
                        {sizes.map(s => {
                          const count = sCounts[s.id] || 0;
                          return (
                            <td key={s.id} style={{ textAlign: 'center' }}>
                              <span style={{
                                fontWeight: 700,
                                padding: '0.25rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: count <= 25 && count > 0 ? 'rgba(245, 158, 11, 0.15)' : 
                                                 count === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                                color: count <= 25 && count > 0 ? 'var(--status-warning)' : 
                                       count === 0 ? 'var(--status-danger)' : 'var(--text-primary)',
                                display: 'inline-block',
                                minWidth: '38px'
                              }}>
                                {count}
                              </span>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                          {rowTotal} pcs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Shelf Locations Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <MapPin size={18} color="var(--accent-primary)" />
                Warehouse Shelf & Rack Allocations
              </h3>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Color</th>
                    <th>Size</th>
                    <th>Shelf Location</th>
                    <th>Available Quantity</th>
                    <th>Threshold</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {finishedStock.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{item.sku}</div>
                      </td>
                      <td>
                        <div className="color-chip">
                          <span className="color-dot" style={{ backgroundColor: item.hex_code }} />
                          <span>{item.color_name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-secondary">{item.size_name}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={14} color="var(--accent-primary)" />
                          <span>{item.rack_name ? `${item.rack_name} / ${item.shelf_name}` : 'Unassigned Shelf'}</span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1rem', color: item.is_low_stock ? 'var(--status-warning)' : 'var(--text-primary)' }}>
                          {item.quantity} pieces
                        </strong>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>Min: {item.min_stock_level}</td>
                      <td>
                        <span className={`badge ${item.is_low_stock ? 'badge-warning' : 'badge-success'}`}>
                          {item.is_low_stock ? 'Low Stock Alert' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. RAW FABRIC TAB */}
      {activeTab === 'raw' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Raw Fabric Rolls Ledger (KG)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Measured in kilograms. Increases when purchases arrive, decreases when issued for cutting.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => exportToCSV('raw_fabric_stock.csv', rawStock.map(r => ({
                  Material: r.material_name,
                  Fabric_Type: r.fabric_type,
                  Color: r.color_name,
                  Quantity_KG: r.quantity_kg,
                  Min_Threshold_KG: r.min_stock_kg,
                  Storage_Bay: r.storage_location || 'Bay 1',
                  Status: r.is_low_stock ? 'Needs Reorder' : 'Sufficient'
                })))}
              >
                <Download size={14} /> Export CSV
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAdjustModal(true)}>
                <Sliders size={14} /> Adjust Fabric KG
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fabric Description</th>
                  <th>Color</th>
                  <th>Quantity (KG)</th>
                  <th>Min Stock Alert</th>
                  <th>Warehouse Bay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rawStock.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.material_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.fabric_type}</div>
                    </td>
                    <td>
                      <div className="color-chip">
                        <span className="color-dot" style={{ backgroundColor: r.hex_code }} />
                        <span>{r.color_name}</span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '1.05rem', color: r.is_low_stock ? 'var(--status-warning)' : 'var(--status-info)' }}>
                        {r.quantity_kg} KG
                      </strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.min_stock_kg} KG</td>
                    <td><span className="badge badge-secondary">{r.storage_location || 'Bay 1'}</span></td>
                    <td>
                      <span className={`badge ${r.is_low_stock ? 'badge-warning' : 'badge-success'}`}>
                        {r.is_low_stock ? 'Needs Reorder' : 'Sufficient'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. WIP BUNDLES TAB */}
      {activeTab === 'wip' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Work-in-Progress (WIP) Cut Bundles</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Pieces cut from fabric rolls that are awaiting or currently in tailoring.
              </p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bundle #</th>
                  <th>Cutting Job</th>
                  <th>Color / Size</th>
                  <th>WIP Pieces</th>
                  <th>Assigned Tailor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {wipStock.length > 0 ? (
                  wipStock.map((w) => (
                    <tr key={w.id}>
                      <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{w.bundle_no}</strong></td>
                      <td>{w.cutting_job_no}</td>
                      <td>
                        <div className="color-chip">
                          <span className="color-dot" style={{ backgroundColor: w.hex_code }} />
                          <span>{w.color_name}</span>
                          <span className="badge badge-secondary">{w.size_name}</span>
                        </div>
                      </td>
                      <td><strong style={{ fontSize: '0.95rem' }}>{w.pieces_count} pcs</strong></td>
                      <td>{w.worker_name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${w.status === 'Ready for Stitching' ? 'badge-warning' : 'badge-info'}`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No WIP bundles pending.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MOVEMENTS AUDIT TRAIL TAB */}
      {activeTab === 'movements' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Immutable Stock Movement Audit Trail</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Under Section 25 of the system specification, stock is NEVER simply deleted. Every modification must log a verifiable reason.
              </p>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => exportToCSV('stock_movements_audit.csv', movements.map(m => ({
                ID: m.id,
                Date: m.date,
                Reason: m.movement_reason,
                Item_Type: m.item_type,
                Color: m.color_name || 'All',
                Size: m.size_name || 'All',
                Change_Type: m.change_type,
                Quantity: m.quantity,
                Unit: m.unit,
                Notes: m.notes || m.reference_no
              })))}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Movement Reason</th>
                  <th>Item Type</th>
                  <th>Color / Size</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>#{m.id}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {m.date} {m.timestamp ? m.timestamp.split(' ')[1] : ''}
                    </td>
                    <td>
                      <span className="badge badge-info">{m.movement_reason}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.item_type}</td>
                    <td>
                      <div className="color-chip">
                        {m.hex_code && <span className="color-dot" style={{ backgroundColor: m.hex_code }} />}
                        <span>{m.color_name || '—'}</span>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Authorized Stock Adjustment</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Inventory Category *</label>
                  <select 
                    value={adjForm.item_type}
                    onChange={(e) => setAdjForm({ ...adjForm, item_type: e.target.value })}
                  >
                    <option value="FINISHED_GOODS">Finished Goods Leggings (Pieces)</option>
                    <option value="RAW_MATERIAL">Raw Fabric Stock (KG)</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color *</label>
                    <select 
                      required
                      value={adjForm.color_id}
                      onChange={(e) => setAdjForm({ ...adjForm, color_id: e.target.value })}
                    >
                      <option value="">Select Color</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {adjForm.item_type === 'FINISHED_GOODS' && (
                    <div className="form-group">
                      <label>Size *</label>
                      <select 
                        required
                        value={adjForm.size_id}
                        onChange={(e) => setAdjForm({ ...adjForm, size_id: e.target.value })}
                      >
                        <option value="">Select Size</option>
                        {sizes.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Change Direction *</label>
                    <select 
                      value={adjForm.change_type}
                      onChange={(e) => setAdjForm({ ...adjForm, change_type: e.target.value })}
                    >
                      <option value="IN">Addition (+) (Found Stock / Recount)</option>
                      <option value="OUT">Deduction (-) (Loss / Damage / Audit)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Adjustment Quantity *</label>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      placeholder="e.g. 10"
                      value={adjForm.quantity}
                      onChange={(e) => setAdjForm({ ...adjForm, quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mandatory Audit Reason Note *</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="e.g. Quarterly physical inventory count verified on Shelf 2"
                    value={adjForm.notes}
                    onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
