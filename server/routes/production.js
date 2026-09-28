import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// ==========================================
// 1. CUTTING MODULE
// ==========================================

// GET all cutting jobs
router.get('/cutting', async (req, res) => {
  try {
    const jobs = await db.all(`
      SELECT cj.*, c.name as color_name, c.hex_code, w.name as worker_name,
             rm.name as material_name
      FROM cutting_jobs cj
      JOIN colors c ON cj.color_id = c.id
      JOIN raw_materials rm ON cj.material_id = rm.id
      LEFT JOIN workers w ON cj.worker_id = w.id
      ORDER BY cj.date DESC, cj.id DESC
    `);

    // Attach size items to each job
    for (const job of jobs) {
      job.items = await db.all(`
        SELECT cji.*, s.name as size_name
        FROM cutting_job_items cji
        JOIN sizes s ON cji.size_id = s.id
        WHERE cji.cutting_job_id = ?
        ORDER BY s.sort_order
      `, [job.id]);
    }

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new cutting job (Converts Fabric KG -> Cut Pieces & Bundles)
router.post('/cutting', async (req, res) => {
  try {
    const {
      date,
      color_id,
      fabric_issued_kg,
      wastage_kg = 0,
      remaining_fabric_kg = 0,
      worker_id,
      items = [], // [{ size_id, pieces_count }]
      bundle_size = 50,
      notes = ''
    } = req.body;

    const issuedKg = parseFloat(fabric_issued_kg);
    const wasteKg = parseFloat(wastage_kg) || 0;
    const remainingKg = parseFloat(remaining_fabric_kg) || 0;

    if (!color_id || !issuedKg || items.length === 0) {
      return res.status(400).json({ error: 'Color, Fabric Issued (KG) and at least one size item are required' });
    }

    const mat = await db.get(`SELECT id FROM raw_materials LIMIT 1`);
    const materialId = mat ? mat.id : 1;

    // Critical Validation: Check raw fabric stock availability (Prevent Negative Stock!)
    const stock = await db.get(
      `SELECT * FROM raw_material_stock WHERE material_id = ? AND color_id = ?`,
      [materialId, color_id]
    );

    if (!stock || stock.quantity_kg < issuedKg) {
      const available = stock ? stock.quantity_kg : 0;
      return res.status(400).json({
        error: `Insufficient raw material stock! Available: ${available} KG, Requested: ${issuedKg} KG.`
      });
    }

    // Deduct fabric from raw_material_stock
    await db.run(
      `UPDATE raw_material_stock 
       SET quantity_kg = quantity_kg - ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [issuedKg - remainingKg, stock.id]
    );

    // Generate Cutting Job Number
    const countRes = await db.get(`SELECT COUNT(*) as count FROM cutting_jobs`);
    const jobNo = `CUT-${String(countRes.count + 1).padStart(5, '0')}`;
    const jobDate = date || new Date().toISOString().split('T')[0];

    const totalPieces = items.reduce((sum, item) => sum + parseInt(item.pieces_count || 0, 10), 0);

    // Insert Cutting Job
    const jobRes = await db.run(
      `INSERT INTO cutting_jobs (
        job_no, date, material_id, color_id, fabric_issued_kg, 
        wastage_kg, remaining_fabric_kg, total_pieces_cut, worker_id, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)`,
      [jobNo, jobDate, materialId, color_id, issuedKg, wasteKg, remainingKg, totalPieces, worker_id || null, notes]
    );
    const cuttingJobId = jobRes.lastID;

    // Record Immutable Stock Movement for Fabric Deduction
    await db.run(
      `INSERT INTO stock_movements (
        date, item_type, movement_reason, reference_no, 
        color_id, quantity, unit, change_type, notes
      ) VALUES (?, 'RAW_MATERIAL', 'Cutting Issue', ?, ?, ?, 'KG', 'OUT', ?)`,
      [jobDate, jobNo, color_id, issuedKg - remainingKg, `Fabric issued for cutting job ${jobNo}`]
    );

    if (wasteKg > 0) {
      await db.run(
        `INSERT INTO stock_movements (
          date, item_type, movement_reason, reference_no, 
          color_id, quantity, unit, change_type, notes
        ) VALUES (?, 'RAW_MATERIAL', 'Wastage', ?, ?, ?, 'KG', 'OUT', ?)`,
        [jobDate, jobNo, color_id, wasteKg, `Wastage recorded during cutting job ${jobNo}`]
      );
    }

    // Insert Cutting Items and Generate Bundles
    const bundleCountRes = await db.get(`SELECT COUNT(*) as count FROM cutting_bundles`);
    let currentBundleIndex = bundleCountRes.count + 1;

    for (const item of items) {
      const sizeId = parseInt(item.size_id, 10);
      const pieces = parseInt(item.pieces_count, 10);
      if (pieces <= 0) continue;

      await db.run(
        `INSERT INTO cutting_job_items (cutting_job_id, size_id, pieces_cut) VALUES (?, ?, ?)`,
        [cuttingJobId, sizeId, pieces]
      );

      // Break into standard bundles (e.g., 50 pcs max or remaining)
      let remPieces = pieces;
      const bSize = parseInt(bundle_size, 10) || 50;
      while (remPieces > 0) {
        const thisBundleQty = Math.min(remPieces, bSize);
        const bundleNo = `BND-${String(currentBundleIndex).padStart(5, '0')}`;
        currentBundleIndex++;

        await db.run(
          `INSERT INTO cutting_bundles (
            bundle_no, cutting_job_id, color_id, size_id, pieces_count, status
          ) VALUES (?, ?, ?, ?, ?, 'Ready for Stitching')`,
          [bundleNo, cuttingJobId, color_id, sizeId, thisBundleQty]
        );

        remPieces -= thisBundleQty;
      }
    }

    // Accrue Cutter Wage if worker assigned
    if (worker_id) {
      const worker = await db.get(`SELECT * FROM workers WHERE id = ?`, [worker_id]);
      if (worker && worker.piece_rate > 0) {
        const cutterWage = totalPieces * worker.piece_rate;
        await db.run(
          `INSERT INTO worker_wages (
            worker_id, date, job_type, reference_no, pieces_count, rate_per_piece, wage_amount, status
          ) VALUES (?, ?, 'Cutting', ?, ?, ?, ?, 'Pending')`,
          [worker.id, jobDate, jobNo, totalPieces, worker.piece_rate, cutterWage]
        );
      }
    }

    res.json({
      success: true,
      job_no: jobNo,
      total_pieces_cut: totalPieces
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. BUNDLES MODULE
// ==========================================

// GET all bundles
router.get('/bundles', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT b.*, c.name as color_name, c.hex_code, s.name as size_name,
             cj.job_no as cutting_job_no, w.name as assigned_tailor_name
      FROM cutting_bundles b
      JOIN colors c ON b.color_id = c.id
      JOIN sizes s ON b.size_id = s.id
      JOIN cutting_jobs cj ON b.cutting_job_id = cj.id
      LEFT JOIN workers w ON b.assigned_worker_id = w.id
    `;
    const params = [];
    if (status) {
      sql += ` WHERE b.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY b.id DESC`;

    const bundles = await db.all(sql, params);
    res.json(bundles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE bundle (Assign tailor / change status)
router.patch('/bundles/:id', async (req, res) => {
  try {
    const { status, assigned_worker_id } = req.body;
    await db.run(
      `UPDATE cutting_bundles 
       SET status = COALESCE(?, status), 
           assigned_worker_id = COALESCE(?, assigned_worker_id)
       WHERE id = ?`,
      [status, assigned_worker_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. STITCHING MODULE
// ==========================================

// GET stitching jobs
router.get('/stitching', async (req, res) => {
  try {
    const jobs = await db.all(`
      SELECT sj.*, b.bundle_no, c.name as color_name, c.hex_code, s.name as size_name,
             w.name as tailor_name, w.worker_code
      FROM stitching_jobs sj
      JOIN cutting_bundles b ON sj.bundle_id = b.id
      JOIN colors c ON b.color_id = c.id
      JOIN sizes s ON b.size_id = s.id
      JOIN workers w ON sj.worker_id = w.id
      ORDER BY sj.date DESC, sj.id DESC
    `);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new stitching job
router.post('/stitching', async (req, res) => {
  try {
    const {
      date,
      bundle_id,
      worker_id,
      pieces_completed,
      pieces_rejected = 0,
      notes = ''
    } = req.body;

    const completed = parseInt(pieces_completed, 10) || 0;
    const rejected = parseInt(pieces_rejected, 10) || 0;

    if (!bundle_id || !worker_id || completed <= 0) {
      return res.status(400).json({ error: 'Bundle, Tailor worker, and Pieces Completed are required' });
    }

    const bundle = await db.get(`SELECT * FROM cutting_bundles WHERE id = ?`, [bundle_id]);
    if (!bundle) return res.status(404).json({ error: 'Cutting bundle not found' });

    // Critical Validation: Prevent completing more pieces than issued in bundle
    if (completed + rejected > bundle.pieces_count) {
      return res.status(400).json({
        error: `Cannot process ${completed + rejected} pieces! Bundle only contains ${bundle.pieces_count} pieces.`
      });
    }

    const worker = await db.get(`SELECT * FROM workers WHERE id = ?`, [worker_id]);
    if (!worker) return res.status(404).json({ error: 'Tailor worker not found' });

    const pieceRate = worker.piece_rate || 3.00;
    const totalWage = completed * pieceRate; // Wage calculated deterministically

    const countRes = await db.get(`SELECT COUNT(*) as count FROM stitching_jobs`);
    const jobNo = `ST-${String(countRes.count + 1).padStart(5, '0')}`;
    const jobDate = date || new Date().toISOString().split('T')[0];

    // Insert Stitching Job
    const result = await db.run(
      `INSERT INTO stitching_jobs (
        job_no, date, bundle_id, worker_id, pieces_issued, 
        pieces_completed, pieces_rejected, piece_rate, total_wage, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)`,
      [
        jobNo, jobDate, bundle_id, worker_id, bundle.pieces_count,
        completed, rejected, pieceRate, totalWage, notes
      ]
    );

    // Update bundle status
    await db.run(
      `UPDATE cutting_bundles SET status = 'Completed', assigned_worker_id = ? WHERE id = ?`,
      [worker_id, bundle_id]
    );

    // Accrue Piece Wage for Tailor in worker_wages
    await db.run(
      `INSERT INTO worker_wages (
        worker_id, date, job_type, reference_no, pieces_count, rate_per_piece, wage_amount, status
      ) VALUES (?, ?, 'Stitching', ?, ?, ?, ?, 'Pending')`,
      [worker_id, jobDate, jobNo, completed, pieceRate, totalWage]
    );

    res.json({
      success: true,
      job_no: jobNo,
      pieces_completed: completed,
      pieces_rejected: rejected,
      total_wage: totalWage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. PACKAGING MODULE
// ==========================================

// GET packaging jobs
router.get('/packaging', async (req, res) => {
  try {
    const jobs = await db.all(`
      SELECT pj.*, c.name as color_name, c.hex_code, s.name as size_name,
             r.name as rack_name, sh.name as shelf_name, w.name as worker_name
      FROM packaging_jobs pj
      JOIN colors c ON pj.color_id = c.id
      JOIN sizes s ON pj.size_id = s.id
      LEFT JOIN racks r ON pj.rack_id = r.id
      LEFT JOIN shelves sh ON pj.shelf_id = sh.id
      LEFT JOIN workers w ON pj.worker_id = w.id
      ORDER BY pj.date DESC, pj.id DESC
    `);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST packaging entry (Increments Finished Goods Stock & Assigns Shelf)
router.post('/packaging', async (req, res) => {
  try {
    const {
      date,
      color_id,
      size_id,
      pieces_packed,
      rack_id,
      shelf_id,
      worker_id,
      notes = ''
    } = req.body;

    const packed = parseInt(pieces_packed, 10);
    if (!color_id || !size_id || !packed || packed <= 0) {
      return res.status(400).json({ error: 'Color, Size, and Pieces Packed are required' });
    }

    const prod = await db.get(`SELECT id FROM products LIMIT 1`);
    const productId = prod ? prod.id : 1;

    const countRes = await db.get(`SELECT COUNT(*) as count FROM packaging_jobs`);
    const packagingNo = `PKG-${String(countRes.count + 1).padStart(5, '0')}`;
    const packDate = date || new Date().toISOString().split('T')[0];

    // Insert Packaging Job
    await db.run(
      `INSERT INTO packaging_jobs (
        packaging_no, date, color_id, size_id, pieces_received, 
        pieces_packed, rack_id, shelf_id, worker_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [packagingNo, packDate, color_id, size_id, packed, packed, rack_id || null, shelf_id || null, worker_id || null, notes]
    );

    // Upsert Finished Goods Stock
    const existingStock = await db.get(
      `SELECT * FROM finished_goods_stock WHERE product_id = ? AND color_id = ? AND size_id = ?`,
      [productId, color_id, size_id]
    );

    if (existingStock) {
      await db.run(
        `UPDATE finished_goods_stock 
         SET quantity = quantity + ?, 
             shelf_id = COALESCE(?, shelf_id), 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [packed, shelf_id || null, existingStock.id]
      );
    } else {
      await db.run(
        `INSERT INTO finished_goods_stock (product_id, color_id, size_id, quantity, shelf_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [productId, color_id, size_id, packed, shelf_id || null]
      );
    }

    // Record Stock Movement
    await db.run(
      `INSERT INTO stock_movements (
        date, item_type, movement_reason, reference_no, 
        color_id, size_id, quantity, unit, change_type, notes
      ) VALUES (?, 'FINISHED_GOODS', 'Packaging', ?, ?, ?, ?, 'PCS', 'IN', ?)`,
      [packDate, packagingNo, color_id, size_id, packed, `Packaged leggings added to finished goods inventory`]
    );

    // Accrue Packaging Wage if worker selected
    if (worker_id) {
      const worker = await db.get(`SELECT * FROM workers WHERE id = ?`, [worker_id]);
      if (worker && worker.piece_rate > 0) {
        const packWage = packed * worker.piece_rate;
        await db.run(
          `INSERT INTO worker_wages (
            worker_id, date, job_type, reference_no, pieces_count, rate_per_piece, wage_amount, status
          ) VALUES (?, ?, 'Packaging', ?, ?, ?, ?, 'Pending')`,
          [worker_id, packDate, packagingNo, packed, worker.piece_rate, packWage]
        );
      }
    }

    res.json({
      success: true,
      packaging_no: packagingNo,
      pieces_packed: packed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
