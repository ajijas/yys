import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Calendar, DollarSign, Truck, Check, Layers } from 'lucide-react';

export default function PurchasesView() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    color_id: '',
    quantity_kg: '',
    rate_per_kg: '',
    transport_cost: '0',
    other_expenses: '0',
    payment_status: 'Paid',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [pRes, sRes, cRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/master/suppliers'),
        fetch('/api/master/colors')
      ]);
      setPurchases(await pRes.json());
      setSuppliers(await sRes.json());
      setColors(await cRes.json());
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculatedMaterialValue = (parseFloat(formData.quantity_kg) || 0) * (parseFloat(formData.rate_per_kg) || 0);
  const calculatedGrandTotal = calculatedMaterialValue + (parseFloat(formData.transport_cost) || 0) + (parseFloat(formData.other_expenses) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create purchase');
        return;
      }

      setShowAddModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        color_id: '',
        quantity_kg: '',
        rate_per_kg: '',
        transport_cost: '0',
        other_expenses: '0',
        payment_status: 'Paid',
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading purchase history...</div>;
  }

  return (
    <div className="purchases-view">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <ShoppingCart size={20} color="var(--accent-primary)" />
              Fabric Purchases & Raw Inventory Inflow (KG)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Purchases are measured strictly in kilograms (KG). Adding a purchase automatically updates your raw fabric ledger and triggers stock audit records.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> New Fabric Purchase
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Purchase #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Fabric Color</th>
                <th>Quantity (KG)</th>
                <th>Rate / KG</th>
                <th>Total Value</th>
                <th>Payment</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length > 0 ? (
                purchases.map((p) => (
                  <tr key={p.id}>
                    <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{p.purchase_no}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.date}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.supplier_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.supplier_phone}</div>
                    </td>
                    <td>
                      <div className="color-chip">
                        <span className="color-dot" style={{ backgroundColor: p.hex_code }} />
                        <span>{p.color_name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--status-info)' }}>
                        +{p.quantity_kg} KG
                      </span>
                    </td>
                    <td>₹{p.rate_per_kg.toFixed(2)}</td>
                    <td>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        ₹{p.total_amount.toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${
                        p.payment_status === 'Paid' ? 'badge-success' : 
                        p.payment_status === 'Partial' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{p.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No purchases recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Record Fabric Purchase (KG)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input 
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fabric Supplier *</label>
                    <select 
                      required
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fabric Color *</label>
                    <select 
                      required
                      value={formData.color_id}
                      onChange={(e) => setFormData({ ...formData, color_id: e.target.value })}
                    >
                      <option value="">Select Color</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fabric Weight in KG *</label>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      placeholder="e.g. 100"
                      value={formData.quantity_kg}
                      onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Rate per KG (₹) *</label>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      placeholder="e.g. 250"
                      value={formData.rate_per_kg}
                      onChange={(e) => setFormData({ ...formData, rate_per_kg: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Transport / Freight (₹)</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={formData.transport_cost}
                      onChange={(e) => setFormData({ ...formData, transport_cost: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Other Expenses (₹)</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={formData.other_expenses}
                      onChange={(e) => setFormData({ ...formData, other_expenses: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select 
                      value={formData.payment_status}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes / Bill Reference</label>
                  <input 
                    placeholder="e.g. Invoice #9821 from ABC Mills"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Calculation Summary Card */}
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    <span>Fabric Value ({formData.quantity_kg || 0} KG × ₹{formData.rate_per_kg || 0}):</span>
                    <strong>₹{calculatedMaterialValue.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span>Grand Total:</span>
                    <span style={{ color: 'var(--status-success)' }}>₹{calculatedGrandTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    ✔ Raw stock for this color will immediately increase by +{formData.quantity_kg || 0} KG upon saving.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
