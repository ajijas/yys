import React, { useState, useEffect } from 'react';
import { DollarSign, UserCheck, CheckCircle2, History, Plus, CreditCard, ArrowRight } from 'lucide-react';

export default function WagesView() {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'records', 'payments'
  const [workersSummary, setWorkersSummary] = useState([]);
  const [wageRecords, setWageRecords] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pay Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    worker_id: '',
    amount: '',
    payment_method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [sumRes, recRes, payRes] = await Promise.all([
        fetch('/api/wages/summary'),
        fetch('/api/wages/records'),
        fetch('/api/wages/payments')
      ]);

      setWorkersSummary(await sumRes.json());
      setWageRecords(await recRes.json());
      setPaymentHistory(await payRes.json());
    } catch (err) {
      console.error('Failed to load wages data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/wages/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payForm)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Payment failed');
        return;
      }

      setShowPayModal(false);
      setPayForm({
        worker_id: '',
        amount: '',
        payment_method: 'Cash',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openPayForWorker = (worker) => {
    setPayForm({
      worker_id: worker.id,
      amount: worker.pending_wage,
      payment_method: 'Cash',
      date: new Date().toISOString().split('T')[0],
      notes: `Wage clearance for ${worker.name}`
    });
    setShowPayModal(true);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading worker payroll...</div>;
  }

  const totalPendingWages = workersSummary.reduce((sum, w) => sum + w.pending_wage, 0);
  const totalPaidWages = workersSummary.reduce((sum, w) => sum + w.total_paid, 0);

  return (
    <div className="wages-view">
      {/* Top Stat Strip */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card stat-warning">
          <div className="stat-header">
            <span>Total Pending Wages</span>
            <DollarSign size={18} />
          </div>
          <div className="stat-value">₹{totalPendingWages.toLocaleString()}</div>
          <div className="stat-subtext">Accrued across completed piece counts</div>
        </div>

        <div className="card stat-card stat-success">
          <div className="stat-header">
            <span>Total Wages Disbursed</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="stat-value">₹{totalPaidWages.toLocaleString()}</div>
          <div className="stat-subtext">Paid via cash, bank, or UPI</div>
        </div>
      </div>

      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          <UserCheck size={16} /> 1. Worker Wage Ledger ({workersSummary.length})
        </button>
        <button className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>
          <DollarSign size={16} /> 2. Piece-Rate Accrual Records ({wageRecords.length})
        </button>
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          <History size={16} /> 3. Payment Disbursement History ({paymentHistory.length})
        </button>
      </div>

      {/* 1. WORKERS SUMMARY */}
      {activeTab === 'summary' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Worker Piece-Rate Payroll & Balance Summary</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Per Section 11: Worker wages are calculated based on production piece count × individual piece rate.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPayModal(true)}>
              <CreditCard size={15} /> Disburse Payment
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Job Designation</th>
                  <th>Piece Rate</th>
                  <th>Total Pieces</th>
                  <th>Total Earned</th>
                  <th>Total Paid</th>
                  <th>Pending Wage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workersSummary.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{w.name}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{w.worker_code}</div>
                    </td>
                    <td><span className="badge badge-secondary">{w.job_type}</span></td>
                    <td>₹{w.piece_rate.toFixed(2)} / pc</td>
                    <td><strong>{w.total_pieces} pcs</strong></td>
                    <td style={{ fontWeight: 600 }}>₹{w.total_earned.toLocaleString()}</td>
                    <td style={{ color: 'var(--status-success)' }}>₹{w.total_paid.toLocaleString()}</td>
                    <td>
                      <strong style={{ 
                        fontSize: '1rem',
                        color: w.pending_wage > 0 ? 'var(--status-warning)' : 'var(--text-muted)' 
                      }}>
                        ₹{w.pending_wage.toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      {w.pending_wage > 0 ? (
                        <button className="btn btn-primary btn-sm" onClick={() => openPayForWorker(w)}>
                          Pay ₹{w.pending_wage} <ArrowRight size={13} />
                        </button>
                      ) : (
                        <span className="badge badge-success">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PIECE-RATE ACCRUAL RECORDS */}
      {activeTab === 'records' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Detailed Piece Count Wage Sheet</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Operation</th>
                  <th>Reference Job</th>
                  <th>Pieces</th>
                  <th>Rate / Piece</th>
                  <th>Wage Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {wageRecords.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.date}</td>
                    <td>
                      <strong>{r.worker_name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                        ({r.worker_code})
                      </span>
                    </td>
                    <td><span className="badge badge-info">{r.job_type}</span></td>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{r.reference_no}</span></td>
                    <td><strong>{r.pieces_count} pcs</strong></td>
                    <td>₹{r.rate_per_piece.toFixed(2)}</td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        ₹{r.wage_amount.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PAYMENT HISTORY */}
      {activeTab === 'payments' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Wage Disbursement Receipts</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Amount Paid</th>
                  <th>Payment Mode</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((p) => (
                    <tr key={p.id}>
                      <td><strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{p.payment_no}</strong></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.date}</td>
                      <td><strong>{p.worker_name}</strong> ({p.worker_code})</td>
                      <td>
                        <strong style={{ color: 'var(--status-success)', fontSize: '0.95rem' }}>
                          ₹{p.amount.toLocaleString()}
                        </strong>
                      </td>
                      <td><span className="badge badge-secondary">{p.payment_method}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No wage disbursements made yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Disburse Wage Payment</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>✕</button>
            </div>

            <form onSubmit={handlePaySubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Worker *</label>
                  <select 
                    required
                    value={payForm.worker_id}
                    onChange={(e) => {
                      const w = workersSummary.find(item => String(item.id) === e.target.value);
                      setPayForm({
                        ...payForm,
                        worker_id: e.target.value,
                        amount: w ? w.pending_wage : ''
                      });
                    }}
                  >
                    <option value="">Select Worker</option>
                    {workersSummary.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.job_type} — Pending: ₹{w.pending_wage})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Date *</label>
                    <input 
                      type="date"
                      required
                      value={payForm.date}
                      onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount to Pay (₹) *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 1500"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Payment Method *</label>
                  <select 
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  >
                    <option value="Cash">Cash Counter</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes / Voucher Reference</label>
                  <input 
                    placeholder="e.g. Weekly piece wage clearance"
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm & Disburse</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
