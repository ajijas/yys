import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Package, Scissors, DollarSign, FileSpreadsheet, Layers, PieChart } from 'lucide-react';

export default function ReportsView() {
  const [activeReport, setActiveReport] = useState('sales'); // 'sales', 'inventory', 'production', 'wages'
  const [sales, setSales] = useState([]);
  const [finishedStock, setFinishedStock] = useState([]);
  const [rawStock, setRawStock] = useState([]);
  const [cuttingJobs, setCuttingJobs] = useState([]);
  const [stitchingJobs, setStitchingJobs] = useState([]);
  const [workersSummary, setWorkersSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes, fRes, rRes, cRes, stRes, wRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/inventory/finished'),
          fetch('/api/inventory/raw'),
          fetch('/api/production/cutting'),
          fetch('/api/production/stitching'),
          fetch('/api/wages/summary')
        ]);

        setSales(await sRes.json());
        setFinishedStock(await fRes.json());
        setRawStock(await rRes.json());
        setCuttingJobs(await cRes.json());
        setStitchingJobs(await stRes.json());
        setWorkersSummary(await wRes.json());
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Generating business intelligence reports...</div>;
  }

  // Sales aggregates
  const totalRevenue = sales.reduce((sum, s) => sum + s.grand_total, 0);
  const wholesaleRevenue = sales.filter(s => s.sale_type === 'Wholesale').reduce((sum, s) => sum + s.grand_total, 0);
  const retailRevenue = sales.filter(s => s.sale_type === 'Retail').reduce((sum, s) => sum + s.grand_total, 0);

  // Production aggregates
  const totalFabricCutKg = cuttingJobs.reduce((sum, j) => sum + j.fabric_issued_kg, 0);
  const totalWastageKg = cuttingJobs.reduce((sum, j) => sum + j.wastage_kg, 0);
  const wastageRate = totalFabricCutKg > 0 ? ((totalWastageKg / totalFabricCutKg) * 100).toFixed(1) : 0;
  const totalPiecesCut = cuttingJobs.reduce((sum, j) => sum + j.total_pieces_cut, 0);
  const totalPiecesStitched = stitchingJobs.reduce((sum, j) => sum + j.pieces_completed, 0);
  const totalRejections = stitchingJobs.reduce((sum, j) => sum + j.pieces_rejected, 0);

  // Inventory aggregates
  const totalFinishedPieces = finishedStock.reduce((sum, item) => sum + item.quantity, 0);
  const totalRawKg = rawStock.reduce((sum, r) => sum + r.quantity_kg, 0);
  const estimatedStockValue = finishedStock.reduce((sum, item) => sum + (item.quantity * (item.base_wholesale_price || 180)), 0);

  return (
    <div className="reports-view">
      <div className="tab-nav">
        <button className={`tab-btn ${activeReport === 'sales' ? 'active' : ''}`} onClick={() => setActiveReport('sales')}>
          <TrendingUp size={16} /> Sales & Channel Analytics
        </button>
        <button className={`tab-btn ${activeReport === 'inventory' ? 'active' : ''}`} onClick={() => setActiveReport('inventory')}>
          <Package size={16} /> Inventory Valuation & Reorders
        </button>
        <button className={`tab-btn ${activeReport === 'production' ? 'active' : ''}`} onClick={() => setActiveReport('production')}>
          <Scissors size={16} /> Production Efficiency & Wastage
        </button>
        <button className={`tab-btn ${activeReport === 'wages' ? 'active' : ''}`} onClick={() => setActiveReport('wages')}>
          <DollarSign size={16} /> Worker Wage Distribution
        </button>
      </div>

      {/* 1. SALES REPORT */}
      {activeReport === 'sales' && (
        <div>
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card stat-card stat-success">
              <div className="stat-header"><span>Cumulative Revenue</span><DollarSign size={18} /></div>
              <div className="stat-value">₹{totalRevenue.toLocaleString()}</div>
              <div className="stat-subtext">From {sales.length} customer invoices</div>
            </div>
            <div className="card stat-card stat-info">
              <div className="stat-header"><span>Wholesale Channel</span><BarChart3 size={18} /></div>
              <div className="stat-value">₹{wholesaleRevenue.toLocaleString()}</div>
              <div className="stat-subtext">{totalRevenue > 0 ? ((wholesaleRevenue / totalRevenue) * 100).toFixed(0) : 0}% of total revenue</div>
            </div>
            <div className="card stat-card">
              <div className="stat-header"><span>Retail Counter POS</span><PieChart size={18} /></div>
              <div className="stat-value">₹{retailRevenue.toLocaleString()}</div>
              <div className="stat-subtext">{totalRevenue > 0 ? ((retailRevenue / totalRevenue) * 100).toFixed(0) : 0}% of total revenue</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Sales Channel Breakdown</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Invoices Count</th>
                    <th>Revenue (₹)</th>
                    <th>Average Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Wholesale Bulk Distribution</strong></td>
                    <td>{sales.filter(s => s.sale_type === 'Wholesale').length}</td>
                    <td style={{ fontWeight: 700, color: 'var(--status-info)' }}>₹{wholesaleRevenue.toLocaleString()}</td>
                    <td>₹{sales.filter(s => s.sale_type === 'Wholesale').length > 0 ? Math.round(wholesaleRevenue / sales.filter(s => s.sale_type === 'Wholesale').length).toLocaleString() : 0}</td>
                  </tr>
                  <tr>
                    <td><strong>Retail POS Counter Sales</strong></td>
                    <td>{sales.filter(s => s.sale_type === 'Retail').length}</td>
                    <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>₹{retailRevenue.toLocaleString()}</td>
                    <td>₹{sales.filter(s => s.sale_type === 'Retail').length > 0 ? Math.round(retailRevenue / sales.filter(s => s.sale_type === 'Retail').length).toLocaleString() : 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. INVENTORY REPORT */}
      {activeReport === 'inventory' && (
        <div>
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card stat-card stat-success">
              <div className="stat-header"><span>Finished Stock Valuation</span><DollarSign size={18} /></div>
              <div className="stat-value">₹{estimatedStockValue.toLocaleString()}</div>
              <div className="stat-subtext">Estimated at base wholesale rate</div>
            </div>
            <div className="card stat-card stat-info">
              <div className="stat-header"><span>Finished Leggings Count</span><Package size={18} /></div>
              <div className="stat-value">{totalFinishedPieces} pcs</div>
              <div className="stat-subtext">Distributed across warehouse shelves</div>
            </div>
            <div className="card stat-card">
              <div className="stat-header"><span>Raw Fabric Bulk Inventory</span><Layers size={18} /></div>
              <div className="stat-value">{totalRawKg} KG</div>
              <div className="stat-subtext">Available for future cutting cycles</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Color-wise Finished Stock Concentration</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Stock Count (Pieces)</th>
                    <th>Estimated Value (₹)</th>
                    <th>Availability Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rawStock.map((r) => {
                    const pcsForColor = finishedStock
                      .filter(f => f.color_id === r.color_id)
                      .reduce((sum, f) => sum + f.quantity, 0);
                    const valForColor = pcsForColor * 180;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="color-chip">
                            <span className="color-dot" style={{ backgroundColor: r.hex_code }} />
                            <span>{r.color_name}</span>
                          </div>
                        </td>
                        <td><strong>{pcsForColor} pieces</strong></td>
                        <td>₹{valForColor.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${pcsForColor < 50 ? 'badge-warning' : 'badge-success'}`}>
                            {pcsForColor < 50 ? 'Low Concentration' : 'Healthy Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRODUCTION & WASTAGE REPORT */}
      {activeReport === 'production' && (
        <div>
          <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card stat-card stat-info">
              <div className="stat-header"><span>Fabric Processed (KG)</span><Scissors size={18} /></div>
              <div className="stat-value">{totalFabricCutKg} KG</div>
              <div className="stat-subtext">Yielded {totalPiecesCut} pieces</div>
            </div>
            <div className="card stat-card stat-warning">
              <div className="stat-header"><span>Fabric Wastage Rate</span><BarChart3 size={18} /></div>
              <div className="stat-value">{wastageRate}%</div>
              <div className="stat-subtext">{totalWastageKg} KG total scrap recorded</div>
            </div>
            <div className="card stat-card stat-success">
              <div className="stat-header"><span>Stitching Quality Rate</span><TrendingUp size={18} /></div>
              <div className="stat-value">
                {totalPiecesStitched + totalRejections > 0 
                  ? ((totalPiecesStitched / (totalPiecesStitched + totalRejections)) * 100).toFixed(1)
                  : 100}%
              </div>
              <div className="stat-subtext">{totalPiecesStitched} passed, {totalRejections} defect/rejected</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Production Efficiency Benchmark</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
              • Average Fabric Consumption: <strong>{(totalFabricCutKg / (totalPiecesCut || 1) * 1000).toFixed(0)} grams</strong> per legging piece.<br />
              • Average Wastage per Cutting Cycle: <strong>{((totalWastageKg / (cuttingJobs.length || 1))).toFixed(2)} KG</strong>.<br />
              • Quality Rejection Rate: <strong>{totalPiecesStitched > 0 ? ((totalRejections / totalPiecesStitched) * 100).toFixed(2) : 0}%</strong> of tailored pieces.
            </p>
          </div>
        </div>
      )}

      {/* 4. WAGES REPORT */}
      {activeReport === 'wages' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Piece-Rate Worker Payroll Distribution</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Designation</th>
                  <th>Pieces Finished</th>
                  <th>Total Wages Earned</th>
                  <th>Total Wages Disbursed</th>
                  <th>Pending Balance</th>
                </tr>
              </thead>
              <tbody>
                {workersSummary.map((w) => (
                  <tr key={w.id}>
                    <td><strong>{w.name}</strong> ({w.worker_code})</td>
                    <td><span className="badge badge-secondary">{w.job_type}</span></td>
                    <td>{w.total_pieces} pcs</td>
                    <td><strong style={{ color: 'var(--text-primary)' }}>₹{w.total_earned.toLocaleString()}</strong></td>
                    <td style={{ color: 'var(--status-success)' }}>₹{w.total_paid.toLocaleString()}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: w.pending_wage > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                        ₹{w.pending_wage.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
