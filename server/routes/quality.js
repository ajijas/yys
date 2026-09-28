import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET all QC logs
router.get('/', async (req, res) => {
  try {
    const checks = await db.all(`
      SELECT qc.*, c.name as color_name, c.hex_code, s.name as size_name,
             b.bundle_no, w.name as tailor_name, w.worker_code as tailor_code
      FROM quality_checks qc
      LEFT JOIN colors c ON qc.color_id = c.id
      LEFT JOIN sizes s ON qc.size_id = s.id
      LEFT JOIN cutting_bundles b ON qc.bundle_id = b.id
      LEFT JOIN workers w ON qc.tailor_worker_id = w.id
      ORDER BY qc.date DESC, qc.id DESC
    `);
    res.json(checks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new QC inspection
router.post('/', async (req, res) => {
  try {
    const {
      date,
      bundle_id,
      color_id,
      size_id,
      total_checked,
      passed_count,
      rejected_count = 0,
      defect_type = 'None',
      inspector_name = 'QC Supervisor',
      tailor_worker_id,
      remarks = ''
    } = req.body;

    const total = parseInt(total_checked, 10);
    const passed = parseInt(passed_count, 10);
    const rejected = parseInt(rejected_count, 10) || 0;

    if (!total || isNaN(passed)) {
      return res.status(400).json({ error: 'Total checked and passed count are required' });
    }

    const countRes = await db.get(`SELECT COUNT(*) as count FROM quality_checks`);
    const checkNo = `QC-${String(countRes.count + 1).padStart(5, '0')}`;
    const checkDate = date || new Date().toISOString().split('T')[0];

    const result = await db.run(
      `INSERT INTO quality_checks (
        check_no, date, bundle_id, color_id, size_id, total_checked, 
        passed_count, rejected_count, defect_type, inspector_name, 
        tailor_worker_id, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        checkNo, checkDate, bundle_id || null, color_id || null, size_id || null,
        total, passed, rejected, defect_type, inspector_name, tailor_worker_id || null,
        rejected > 0 ? 'Defects Found' : 'Passed', remarks
      ]
    );

    // Audit log entry
    await db.run(
      `INSERT INTO audit_logs (user_name, action, module, details)
       VALUES (?, 'Quality Inspection', 'QC', ?)`,
      [inspector_name, `Completed inspection ${checkNo}: ${passed} passed, ${rejected} rejected (${defect_type})`]
    );

    res.json({
      success: true,
      check_no: checkNo,
      passed_count: passed,
      rejected_count: rejected
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
