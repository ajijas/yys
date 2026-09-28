import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET worker wage summary & pending balances
router.get('/summary', async (req, res) => {
  try {
    const workers = await db.all(`
      SELECT w.id, w.worker_code, w.name, w.phone, w.job_type, w.wage_type, w.piece_rate,
             COALESCE(SUM(ww.pieces_count), 0) as total_pieces,
             COALESCE(SUM(ww.wage_amount), 0) as total_earned,
             COALESCE((
               SELECT SUM(amount) FROM worker_payments wp WHERE wp.worker_id = w.id
             ), 0) as total_paid,
             COALESCE((
               SELECT SUM(wage_amount) FROM worker_wages WHERE worker_id = w.id AND status = 'Pending'
             ), 0) as pending_wage
      FROM workers w
      LEFT JOIN worker_wages ww ON w.id = ww.worker_id
      GROUP BY w.id
      ORDER BY w.name ASC
    `);

    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET detailed wage records
router.get('/records', async (req, res) => {
  try {
    const { worker_id, status } = req.query;
    let sql = `
      SELECT ww.*, w.name as worker_name, w.worker_code, w.job_type as worker_job_type
      FROM worker_wages ww
      JOIN workers w ON ww.worker_id = w.id
      WHERE 1=1
    `;
    const params = [];
    if (worker_id) {
      sql += ` AND ww.worker_id = ?`;
      params.push(worker_id);
    }
    if (status) {
      sql += ` AND ww.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY ww.date DESC, ww.id DESC`;

    const records = await db.all(sql, params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET payment history
router.get('/payments', async (req, res) => {
  try {
    const payments = await db.all(`
      SELECT wp.*, w.name as worker_name, w.worker_code, w.job_type
      FROM worker_payments wp
      JOIN workers w ON wp.worker_id = w.id
      ORDER BY wp.date DESC, wp.id DESC
    `);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST disburse wage payment
router.post('/pay', async (req, res) => {
  try {
    const { worker_id, amount, payment_method = 'Cash', date, notes = '' } = req.body;
    const payAmount = parseFloat(amount);

    if (!worker_id || !payAmount || payAmount <= 0) {
      return res.status(400).json({ error: 'Worker and a valid payment amount are required' });
    }

    const payDate = date || new Date().toISOString().split('T')[0];
    const countRes = await db.get(`SELECT COUNT(*) as count FROM worker_payments`);
    const paymentNo = `PAY-${String(countRes.count + 1).padStart(5, '0')}`;

    // Record payment disbursement
    await db.run(
      `INSERT INTO worker_payments (payment_no, worker_id, date, amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [paymentNo, worker_id, payDate, payAmount, payment_method, notes]
    );

    // Mark pending wage items as paid up to the payment amount
    const pendingWages = await db.all(
      `SELECT * FROM worker_wages WHERE worker_id = ? AND status = 'Pending' ORDER BY date ASC, id ASC`,
      [worker_id]
    );

    let remainingToClear = payAmount;
    for (const wage of pendingWages) {
      if (remainingToClear >= wage.wage_amount) {
        await db.run(
          `UPDATE worker_wages SET status = 'Paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [wage.id]
        );
        remainingToClear -= wage.wage_amount;
      }
    }

    res.json({
      success: true,
      payment_no: paymentNo,
      amount: payAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
