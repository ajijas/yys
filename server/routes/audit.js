import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET all audit logs
router.get('/', async (req, res) => {
  try {
    const { module, limit = 100 } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (module) {
      sql += ` AND module = ?`;
      params.push(module);
    }
    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const logs = await db.all(sql, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new audit log entry
router.post('/', async (req, res) => {
  try {
    const { user_name = 'Admin', action, module, details } = req.body;
    if (!action || !module) return res.status(400).json({ error: 'Action and module required' });

    await db.run(
      `INSERT INTO audit_logs (user_name, action, module, details) VALUES (?, ?, ?, ?)`,
      [user_name, action, module, details || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
