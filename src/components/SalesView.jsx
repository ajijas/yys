import React, { useState, useEffect } from 'react';
import { ShoppingBag, FileText, RotateCcw, Plus, Trash2, Printer, Check, Search, CreditCard, User, AlertCircle } from 'lucide-react';

export default function SalesView() {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'wholesale', 'invoices', 'returns'
  const [finishedStock, setFinishedStock] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  // POS Cart State
  const [posCart, setPosCart] = useState([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState('Cash');
  const [posCustomerName, setPosCustomerName] = useState('Counter Retail Customer');
  const [posDiscount, setPosDiscount] = useState(0);

  // Wholesale Form State
  const [wsCustomer, setWsCustomer] = useState('');
  const [wsDate, setWsDate] = useState(new Date().toISOString().split('T')[0]);
  const [wsItems, setWsItems] = useState([
    { color_id: '', size_id: '', quantity: 10, unit_price: 180 }
  ]);
  const [wsDiscount, setWsDiscount] = useState(0);
  const [wsTax, setWsTax] = useState(0);
  const [wsPaymentMethod, setWsPaymentMethod] = useState('Bank Transfer');
  const [wsPaymentStatus, setWsPaymentStatus] = useState('Paid');

  // Returns Form State
  const [retColor, setRetColor] = useState('');
  const [retSize, setRetSize] = useState('');
  const [retQty, setRetQty] = useState('');
  const [retCondition, setRetCondition] = useState('Good');
  const [retNotes, setRetNotes] = useState('');

  // Invoice Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchData = async () => {
    try {
      const [fRes, cRes, sRes, colRes, sizRes] = await Promise.all([
        fetch('/api/inventory/finished'),
        fetch('/api/master/customers'),
        fetch('/api/sales'),
        fetch('/api/master/colors'),
        fetch('/api/master/sizes')
      ]);

      setFinishedStock(await fRes.json());
      setCustomers(await cRes.json());
      setSales(await sRes.json());
      setColors(await colRes.json());
      setSizes(await sizRes.json());
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // POS Cart Helpers
  const addToPosCart = (item) => {
    if (item.quantity <= 0) {
      alert(`No stock available for ${item.color_name} / Size ${item.size_name}!`);
      return;
    }

    setPosCart(prev => {
      const existing = prev.find(i => i.product_id === item.product_id && i.color_id === item.color_id && i.size_id === item.size_id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          alert(`Cannot add more! Only ${item.quantity} available in finished stock.`);
          return prev;
        }
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: item.product_id,
        color_id: item.color_id,
        size_id: item.size_id,
        color_name: item.color_name,
        hex_code: item.hex_code,
        size_name: item.size_name,
        unit_price: item.base_retail_price || 299,
        quantity: 1,
        maxStock: item.quantity
      }];
    });
  };

  const updateCartQty = (idx, delta) => {
    setPosCart(prev => {
      const item = prev[idx];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      if (newQty > item.maxStock) {
        alert(`Maximum available stock is ${item.maxStock}`);
        return prev;
      }
      return prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it);
    });
  };

  const posSubtotal = posCart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const posGrandTotal = Math.max(0, posSubtotal - (parseFloat(posDiscount) || 0));

  const handlePosCheckout = async () => {
    if (posCart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const payload = {
        sale_type: 'Retail',
        customer_name: posCustomerName,
        date: new Date().toISOString().split('T')[0],
        items: posCart.map(i => ({
          color_id: i.color_id,
          size_id: i.size_id,
          quantity: i.quantity,
          unit_price: i.unit_price
        })),
        discount: posDiscount,
        payment_method: posPaymentMethod,
        payment_status: 'Paid',
        notes: 'Retail counter sale'
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Checkout failed');
        return;
      }

      const data = await res.json();
      alert(`Sale completed successfully! Invoice #${data.invoice_no}`);
      setPosCart([]);
      setPosDiscount(0);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Wholesale Submission
  const handleWholesaleSubmit = async (e) => {
    e.preventDefault();
    if (wsItems.length === 0) {
      alert('Add at least one item');
      return;
    }

    try {
      const payload = {
        sale_type: 'Wholesale',
        customer_id: wsCustomer,
        date: wsDate,
        items: wsItems,
        discount: wsDiscount,
        tax_amount: wsTax,
        payment_method: wsPaymentMethod,
        payment_status: wsPaymentStatus,
        notes: 'Bulk Wholesale Order'
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to place wholesale order');
        return;
      }

      const data = await res.json();
      alert(`Wholesale Order Invoice created: ${data.invoice_no}`);
      setWsItems([{ color_id: '', size_id: '', quantity: 10, unit_price: 180 }]);
      fetchData();
      setActiveTab('invoices');
    } catch (err) {
      alert(err.message);
    }
  };

  // Returns Submission
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sales/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          color_id: retColor,
          size_id: retSize,
          quantity: retQty,
          condition: retCondition,
          notes: retNotes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to process return');
        return;
      }

      alert('Return recorded successfully');
      setRetQty('');
      setRetNotes('');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const viewInvoice = async (id) => {
    try {
      const res = await fetch(`/api/sales/${id}`);
      const data = await res.json();
      setSelectedInvoice(data);
    } catch (err) {
      alert('Failed to load invoice');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading sales desk...</div>;
  }

  const wholesaleCustomers = customers.filter(c => c.customer_type === 'Wholesale');

  return (
    <div className="sales-view">
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
          <ShoppingBag size={16} /> 1. Retail POS Counter
        </button>
        <button className={`tab-btn ${activeTab === 'wholesale' ? 'active' : ''}`} onClick={() => setActiveTab('wholesale')}>
          <FileText size={16} /> 2. Wholesale Order Desk
        </button>
        <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
          Invoices & Sales History ({sales.length})
        </button>
        <button className={`tab-btn ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')}>
          <RotateCcw size={16} /> Customer Returns
        </button>
      </div>

      {/* 1. RETAIL POS TAB */}
      {activeTab === 'pos' && (
        <div className="pos-layout">
          {/* Left: Product Catalog Grid */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Select Leggings by Color & Size</h3>
              <span className="badge badge-info">Fast Counter Billing</span>
            </div>

            <div className="pos-product-grid">
              {finishedStock.map((item) => {
                const isOutOfStock = item.quantity <= 0;
                return (
                  <div 
                    key={item.id} 
                    className={`pos-item-card ${isOutOfStock ? 'disabled' : ''}`}
                    onClick={() => !isOutOfStock && addToPosCart(item)}
                  >
                    <span 
                      className="color-dot" 
                      style={{ backgroundColor: item.hex_code, width: '26px', height: '26px', marginBottom: '0.5rem' }} 
                    />
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.color_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Size {item.size_name}</div>
                    <div style={{ marginTop: '0.4rem', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                      ₹{item.base_retail_price || 299}
                    </div>
                    <div style={{ 
                      marginTop: '0.35rem', 
                      fontSize: '0.72rem',
                      color: isOutOfStock ? 'var(--status-danger)' : item.is_low_stock ? 'var(--status-warning)' : 'var(--status-success)',
                      fontWeight: 600
                    }}>
                      {isOutOfStock ? 'Out of Stock' : `${item.quantity} in stock`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: POS Bill / Cart */}
          <div className="card cart-card">
            <div className="card-header">
              <h3 className="card-title">Counter Bill</h3>
              <span className="badge badge-secondary">{posCart.length} items</span>
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label>Customer Name / Phone</label>
              <input 
                value={posCustomerName}
                onChange={(e) => setPosCustomerName(e.target.value)}
                placeholder="Walk-in Retail Buyer"
              />
            </div>

            {/* Cart Items */}
            <div className="cart-items-list">
              {posCart.length > 0 ? (
                posCart.map((item, idx) => (
                  <div key={idx} className="cart-item-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="color-dot" style={{ backgroundColor: item.hex_code, width: '10px', height: '10px' }} />
                        {item.color_name} (Size {item.size_name})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ₹{item.unit_price} each
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0b0f19', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <button className="btn btn-sm" style={{ padding: '0.1rem 0.4rem' }} onClick={() => updateCartQty(idx, -1)}>-</button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>{item.quantity}</span>
                        <button className="btn btn-sm" style={{ padding: '0.1rem 0.4rem' }} onClick={() => updateCartQty(idx, 1)}>+</button>
                      </div>
                      <div style={{ fontWeight: 700, width: '65px', textAlign: 'right' }}>
                        ₹{(item.quantity * item.unit_price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.85rem' }}>
                  Cart is empty. Tap any leggings color/size to add to bill.
                </div>
              )}
            </div>

            {/* POS Checkout Footer */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Payment Method</label>
                  <select value={posPaymentMethod} onChange={(e) => setPosPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Discount (₹)</label>
                  <input 
                    type="number"
                    value={posDiscount}
                    onChange={(e) => setPosDiscount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Payable:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-success)' }}>
                  ₹{posGrandTotal.toLocaleString()}
                </span>
              </div>

              <button 
                className="btn btn-success" 
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                disabled={posCart.length === 0}
                onClick={handlePosCheckout}
              >
                <Check size={18} /> Complete Sale & Deduct Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. WHOLESALE ORDER DESK */}
      {activeTab === 'wholesale' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <FileText size={20} color="var(--accent-primary)" />
                Wholesale Bulk Order & Invoicing Desk
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Manage bulk sales for garment distributors and retailers at wholesale rates (default ₹180/piece).
              </p>
            </div>
          </div>

          <form onSubmit={handleWholesaleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Select Wholesale Customer *</label>
                <select 
                  required
                  value={wsCustomer}
                  onChange={(e) => setWsCustomer(e.target.value)}
                >
                  <option value="">Choose Wholesale Buyer</option>
                  {wholesaleCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.business_name || c.name} (Credit: ₹{c.credit_limit.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Order Date *</label>
                <input 
                  type="date"
                  required
                  value={wsDate}
                  onChange={(e) => setWsDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items Matrix */}
            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700 }}>Order Line Items:</label>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setWsItems([...wsItems, { color_id: '', size_id: '', quantity: 10, unit_price: 180 }])}
                >
                  <Plus size={14} /> Add Item Row
                </button>
              </div>

              {wsItems.map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', 
                  gap: '0.75rem', 
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <select 
                    required
                    value={item.color_id}
                    onChange={(e) => {
                      const copy = [...wsItems];
                      copy[idx].color_id = e.target.value;
                      setWsItems(copy);
                    }}
                  >
                    <option value="">Select Color</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select 
                    required
                    value={item.size_id}
                    onChange={(e) => {
                      const copy = [...wsItems];
                      copy[idx].size_id = e.target.value;
                      setWsItems(copy);
                    }}
                  >
                    <option value="">Select Size</option>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  <input 
                    type="number"
                    required
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      const copy = [...wsItems];
                      copy[idx].quantity = e.target.value;
                      setWsItems(copy);
                    }}
                  />

                  <input 
                    type="number"
                    required
                    placeholder="Rate ₹"
                    value={item.unit_price}
                    onChange={(e) => {
                      const copy = [...wsItems];
                      copy[idx].unit_price = e.target.value;
                      setWsItems(copy);
                    }}
                  />

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setWsItems(wsItems.filter((_, i) => i !== idx))}
                    disabled={wsItems.length === 1}
                  >
                    <Trash2 size={15} color="var(--status-danger)" />
                  </button>
                </div>
              ))}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Discount (₹)</label>
                <input 
                  type="number" 
                  value={wsDiscount} 
                  onChange={(e) => setWsDiscount(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Tax / GST (₹)</label>
                <input 
                  type="number" 
                  value={wsTax} 
                  onChange={(e) => setWsTax(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Payment Mode</label>
                <select value={wsPaymentMethod} onChange={(e) => setWsPaymentMethod(e.target.value)}>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit (On Account)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Payment Status</label>
                <select value={wsPaymentStatus} onChange={(e) => setWsPaymentStatus(e.target.value)}>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                <Check size={18} /> Confirm Wholesale Sale & Generate Invoice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. INVOICES HISTORY TAB */}
      {activeTab === 'invoices' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">All Sales & Invoices</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th>Subtotal</th>
                  <th>Grand Total</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{s.invoice_no}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.date}</td>
                    <td>
                      <span className={`badge ${s.sale_type === 'Wholesale' ? 'badge-info' : 'badge-secondary'}`}>
                        {s.sale_type}
                      </span>
                    </td>
                    <td><strong>{s.customer_name || s.registered_customer_name || 'Walk-in'}</strong></td>
                    <td>₹{s.subtotal.toLocaleString()}</td>
                    <td><strong style={{ color: 'var(--text-primary)' }}>₹{s.grand_total.toLocaleString()}</strong></td>
                    <td>
                      <span className={`badge ${s.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {s.payment_status} ({s.payment_method})
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => viewInvoice(s.id)}>
                        <FileText size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CUSTOMER RETURNS TAB */}
      {activeTab === 'returns' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <RotateCcw size={20} color="var(--accent-primary)" />
                Process Sales Returns
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Per Section 26: If returned pieces are in Good Condition, they return to Finished Goods Inventory (+). If Damaged, they are routed to Damaged Stock.
              </p>
            </div>
          </div>

          <form onSubmit={handleReturnSubmit} style={{ maxWidth: '600px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Leggings Color *</label>
                <select required value={retColor} onChange={(e) => setRetColor(e.target.value)}>
                  <option value="">Select Color</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Size *</label>
                <select required value={retSize} onChange={(e) => setRetSize(e.target.value)}>
                  <option value="">Select Size</option>
                  {sizes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Return Quantity (Pieces) *</label>
                <input 
                  type="number"
                  required
                  placeholder="e.g. 5"
                  value={retQty}
                  onChange={(e) => setRetQty(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Physical Condition *</label>
                <select value={retCondition} onChange={(e) => setRetCondition(e.target.value)}>
                  <option value="Good">Good Condition ➔ Restock to Finished Inventory</option>
                  <option value="Damaged">Damaged / Defect ➔ Route to Damaged Stock</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Reason / Customer Note</label>
              <textarea 
                rows={2}
                placeholder="e.g. Wrong size purchased by retail customer"
                value={retNotes}
                onChange={(e) => setRetNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Process Return Entry
            </button>
          </form>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Invoice: {selectedInvoice.invoice_no}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  <Printer size={15} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoice(null)}>✕</button>
              </div>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>YYS LEGGINGS</h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manufacturing & Wholesale Hub</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tiruppur, Tamil Nadu</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                  <div><strong>Invoice Date:</strong> {selectedInvoice.date}</div>
                  <div><strong>Customer:</strong> {selectedInvoice.customer_name}</div>
                  <div><strong>Payment Mode:</strong> {selectedInvoice.payment_method}</div>
                </div>
              </div>

              <div className="table-container" style={{ marginBottom: '1.25rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Item & Variant</th>
                      <th>Color</th>
                      <th>Size</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td>Leggings ({item.sku || 'LEG'})</td>
                        <td>
                          <div className="color-chip">
                            <span className="color-dot" style={{ backgroundColor: item.hex_code }} />
                            <span>{item.color_name}</span>
                          </div>
                        </td>
                        <td><span className="badge badge-secondary">{item.size_name}</span></td>
                        <td><strong>{item.quantity}</strong></td>
                        <td>₹{item.unit_price}</td>
                        <td style={{ fontWeight: 700 }}>₹{item.total_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '220px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Subtotal:</span>
                    <span>₹{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--status-danger)' }}>
                      <span>Discount:</span>
                      <span>-₹{selectedInvoice.discount.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedInvoice.tax_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>GST / Tax:</span>
                      <span>+₹{selectedInvoice.tax_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span>Grand Total:</span>
                    <span style={{ color: 'var(--status-success)' }}>₹{selectedInvoice.grand_total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
