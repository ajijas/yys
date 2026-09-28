import React, { useState, useEffect } from 'react';
import { Palette, Maximize, UserCheck, Truck, Users, MapPin, Plus, Edit2, Check, X } from 'lucide-react';

export default function MasterDataView() {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers', 'colors', 'sizes', 'variants', 'suppliers', 'customers', 'locations'
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState({ warehouses: [], racks: [], shelves: [] });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'color', 'worker', 'supplier', 'customer'
  const [formData, setFormData] = useState({});

  const fetchData = async () => {
    try {
      const [cRes, sRes, vRes, wRes, supRes, custRes, locRes] = await Promise.all([
        fetch('/api/master/colors'),
        fetch('/api/master/sizes'),
        fetch('/api/master/variants'),
        fetch('/api/master/workers'),
        fetch('/api/master/suppliers'),
        fetch('/api/master/customers'),
        fetch('/api/master/locations')
      ]);

      setColors(await cRes.json());
      setSizes(await sRes.json());
      setVariants(await vRes.json());
      setWorkers(await wRes.json());
      setSuppliers(await supRes.json());
      setCustomers(await custRes.json());
      setLocations(await locRes.json());
    } catch (err) {
      console.error('Error fetching master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = (type) => {
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let url = '';
      if (modalType === 'worker') url = '/api/master/workers';
      if (modalType === 'color') url = '/api/master/colors';
      if (modalType === 'supplier') url = '/api/master/suppliers';
      if (modalType === 'customer') url = '/api/master/customers';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save');
        return;
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading master data...</div>;
  }

  return (
    <div className="master-data-view">
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'workers' ? 'active' : ''}`} onClick={() => setActiveTab('workers')}>
          <UserCheck size={16} /> Workers & Rates ({workers.length})
        </button>
        <button className={`tab-btn ${activeTab === 'colors' ? 'active' : ''}`} onClick={() => setActiveTab('colors')}>
          <Palette size={16} /> Colors ({colors.length})
        </button>
        <button className={`tab-btn ${activeTab === 'sizes' ? 'active' : ''}`} onClick={() => setActiveTab('sizes')}>
          <Maximize size={16} /> Sizes ({sizes.length})
        </button>
        <button className={`tab-btn ${activeTab === 'variants' ? 'active' : ''}`} onClick={() => setActiveTab('variants')}>
          Product SKUs ({variants.length})
        </button>
        <button className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>
          <Truck size={16} /> Suppliers ({suppliers.length})
        </button>
        <button className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
          <Users size={16} /> Customers ({customers.length})
        </button>
        <button className={`tab-btn ${activeTab === 'locations' ? 'active' : ''}`} onClick={() => setActiveTab('locations')}>
          <MapPin size={16} /> Warehouse Shelves
        </button>
      </div>

      {/* Tab 1: Workers */}
      {activeTab === 'workers' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Production & Factory Workers</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Manage cutters, tailors, packaging operators, and configure piece-rate wage formulas.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => openAddModal('worker')}>
              <Plus size={15} /> Add Worker
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Worker ID</th>
                  <th>Name</th>
                  <th>Job Type</th>
                  <th>Phone & Location</th>
                  <th>Wage Method</th>
                  <th>Piece Rate (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id}>
                    <td><strong style={{ color: 'var(--accent-primary)' }}>{w.worker_code}</strong></td>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>
                      <span className={`badge ${
                        w.job_type === 'Tailor' ? 'badge-info' : 
                        w.job_type === 'Cutter' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {w.job_type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {w.phone} {w.address && `• ${w.address}`}
                    </td>
                    <td>{w.wage_type}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{w.piece_rate.toFixed(2)} / piece
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${w.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Colors */}
      {activeTab === 'colors' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Leggings Color Palette</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Configurable color master used across raw fabric purchases, cutting, bundles, and finished stock.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => openAddModal('color')}>
              <Plus size={15} /> Add Color
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Swatch</th>
                  <th>Color Name</th>
                  <th>Short Code</th>
                  <th>Hex Code</th>
                </tr>
              </thead>
              <tbody>
                {colors.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="color-dot" style={{ backgroundColor: c.hex_code, width: '22px', height: '22px' }} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><span className="badge badge-secondary">{c.code}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.hex_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Sizes */}
      {activeTab === 'sizes' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Size Master</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Standard garment sizing sequence</p>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Size Name</th>
                  <th>Sort Sequence</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s.id}>
                    <td><span className="badge badge-info" style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>{s.name}</span></td>
                    <td>Sequence #{s.sort_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Product Variants */}
      {activeTab === 'variants' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Product Variant Matrix & SKUs</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Each Product × Color × Size combination is assigned an SKU with minimum stock reorder thresholds.
              </p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Product</th>
                  <th>Color</th>
                  <th>Size</th>
                  <th>Min Stock Alert</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{v.sku}</strong></td>
                    <td>{v.product_name}</td>
                    <td>
                      <div className="color-chip">
                        <span className="color-dot" style={{ backgroundColor: v.hex_code }} />
                        <span>{v.color_name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-secondary">{v.size_name}</span></td>
                    <td>{v.min_stock_alert} pieces</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Suppliers */}
      {activeTab === 'suppliers' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Fabric Suppliers & Textile Mills</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openAddModal('supplier')}>
              <Plus size={15} /> Add Supplier
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>GST Number</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.contact_person || '—'}</td>
                    <td>{s.phone}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.address}</td>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{s.gst_number || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Customers */}
      {activeTab === 'customers' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Wholesale & Retail Buyers</h3>
            <button className="btn btn-primary btn-sm" onClick={() => openAddModal('customer')}>
              <Plus size={15} /> Add Customer
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer / Business</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Credit Limit (₹)</th>
                  <th>GST</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.business_name || c.name}</div>
                      {c.business_name && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Contact: {c.name}</div>}
                    </td>
                    <td>
                      <span className={`badge ${c.customer_type === 'Wholesale' ? 'badge-info' : 'badge-secondary'}`}>
                        {c.customer_type}
                      </span>
                    </td>
                    <td>{c.phone}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.address}</td>
                    <td style={{ fontWeight: 600 }}>₹{c.credit_limit.toLocaleString()}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{c.gst_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 7: Locations */}
      {activeTab === 'locations' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Warehouse Racks & Storage Shelves</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {locations.shelves.map((sh) => (
              <div key={sh.id} style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  <MapPin size={18} /> {sh.rack_name} / {sh.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Facility: {sh.warehouse_name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {modalType === 'worker' && 'Add New Factory Worker'}
                {modalType === 'color' && 'Add New Fabric / Leggings Color'}
                {modalType === 'supplier' && 'Add New Fabric Supplier'}
                {modalType === 'customer' && 'Add New Customer Account'}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {modalType === 'worker' && (
                  <>
                    <div className="form-group">
                      <label>Worker Full Name *</label>
                      <input 
                        required 
                        placeholder="e.g. Ramesh Kumar"
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Job Designation *</label>
                        <select 
                          required
                          onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                          defaultValue=""
                        >
                          <option value="" disabled>Select Job</option>
                          <option value="Cutter">Cutter (Cutting Fabric)</option>
                          <option value="Tailor">Tailor (Stitching Bundles)</option>
                          <option value="Packaging">Packaging Operator</option>
                          <option value="Stock Worker">Stock & Warehouse Worker</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Wage Method</label>
                        <select 
                          onChange={(e) => setFormData({ ...formData, wage_type: e.target.value })}
                          defaultValue="Piece Rate"
                        >
                          <option value="Piece Rate">Piece Rate (₹/pc)</option>
                          <option value="Daily">Daily Wage</option>
                          <option value="Monthly">Monthly Salary</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Default Piece Rate (₹) *</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          required 
                          placeholder="e.g. 3.00 for tailor, 1.00 for cutter"
                          onChange={(e) => setFormData({ ...formData, piece_rate: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input 
                          placeholder="10-digit mobile"
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Address / Village</label>
                      <input 
                        placeholder="e.g. Tiruppur / Avinashi"
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {modalType === 'color' && (
                  <>
                    <div className="form-group">
                      <label>Color Name *</label>
                      <input 
                        required 
                        placeholder="e.g. Olive Green"
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Short Code (3 letters)</label>
                        <input 
                          placeholder="e.g. OLV"
                          maxLength={4}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Color Swatch (Hex Code)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input 
                            type="color" 
                            style={{ width: '45px', height: '38px', padding: '2px', cursor: 'pointer' }}
                            defaultValue="#3b82f6"
                            onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                          />
                          <input 
                            placeholder="#3b82f6"
                            value={formData.hex_code || '#3b82f6'}
                            onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {modalType === 'supplier' && (
                  <>
                    <div className="form-group">
                      <label>Mill / Supplier Company Name *</label>
                      <input 
                        required 
                        placeholder="e.g. KPR Mills Ltd"
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Contact Person</label>
                        <input 
                          placeholder="e.g. Suresh"
                          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input 
                          placeholder="Phone number"
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>GST Number</label>
                        <input 
                          placeholder="GST Number"
                          onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Address / Market</label>
                        <input 
                          placeholder="e.g. Erode / Tiruppur"
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {modalType === 'customer' && (
                  <>
                    <div className="form-group">
                      <label>Customer Name / Contact Person *</label>
                      <input 
                        required 
                        placeholder="Customer contact name"
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Business / Store Name</label>
                      <input 
                        placeholder="e.g. Royal Fashion Mart"
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Customer Type</label>
                        <select 
                          onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                          defaultValue="Wholesale"
                        >
                          <option value="Wholesale">Wholesale</option>
                          <option value="Retail">Retail</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Credit Limit (₹)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 50000"
                          onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input 
                          placeholder="Mobile number"
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>GST Number</label>
                        <input 
                          placeholder="GST number if applicable"
                          onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
