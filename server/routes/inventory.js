import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET inventory summary overview
router.get('/summary', async (req, res) => {
  try {
    const rawTotal = await db.get(`SELECT COALESCE(SUM(quantity_kg), 0) as total_kg FROM raw_material_stock`);
    const wipTotal = await db.get(`SELECT COALESCE(SUM(pieces_count), 0) as total_wip FROM cutting_bundles WHERE status != 'Completed'`);
    const finishedTotal = await db.get(`SELECT COALESCE(SUM(quantity), 0) as total_pcs FROM finished_goods_stock`);

    const lowStockRaw = await db.get(`SELECT COUNT(*) as count FROM raw_material_stock WHERE quantity_kg <= min_stock_kg`);
    const lowStockFinished = await db.get(`SELECT COUNT(*) as count FROM finished_goods_stock WHERE quantity <= min_stock_level`);

    res.json({
      raw_fabric_kg: rawTotal.total_kg,
      wip_pieces: wipTotal.total_wip,
      finished_pieces: finishedTotal.total_pcs,
      low_stock_alerts_count: lowStockRaw.count + lowStockFinished.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Raw Material Stock (KG)
router.get('/raw', async (req, res) => {
  try {
    const stock = await db.all(`
      SELECT rms.*, c.name as color_name, c.code as color_code, c.hex_code,
             rm.name as material_name, rm.fabric_type,
             CASE WHEN rms.quantity_kg <= rms.min_stock_kg THEN 1 ELSE 0 END as is_low_stock
      FROM raw_material_stock rms
      JOIN colors c ON rms.color_id = c.id
      JOIN raw_materials rm ON rms.material_id = rm.id
      ORDER BY rms.quantity_kg ASC
    `);
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET WIP Stock (Bundles)
router.get('/wip', async (req, res) => {
  try {
    const wip = await db.all(`
      SELECT b.*, c.name as color_name, c.hex_code, s.name as size_name,
             w.name as worker_name, cj.job_no as cutting_job_no
      FROM cutting_bundles b
      JOIN colors c ON b.color_id = c.id
      JOIN sizes s ON b.size_id = s.id
      JOIN cutting_jobs cj ON b.cutting_job_id = cj.id
      LEFT JOIN workers w ON b.assigned_worker_id = w.id
      WHERE b.status != 'Completed'
      ORDER BY b.id DESC
    `);
    res.json(wip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Finished Goods Stock (Matrix + Location)
router.get('/finished', async (req, res) => {
  try {
    const stock = await db.all(`
      SELECT fgs.*, p.name as product_name, p.base_wholesale_price, p.base_retail_price,
             c.name as color_name, c.code as color_code, c.hex_code,
             s.name as size_name, s.sort_order,
             pv.sku,
             sh.name as shelf_name, r.name as rack_name, w.name as warehouse_name,
             CASE WHEN fgs.quantity <= fgs.min_stock_level THEN 1 ELSE 0 END as is_low_stock
      FROM finished_goods_stock fgs
      JOIN products p ON fgs.product_id = p.id
      JOIN colors c ON fgs.color_id = c.id
      JOIN sizes s ON fgs.size_id = s.id
      LEFT JOIN product_variants pv ON (pv.product_id = fgs.product_id AND pv.color_id = fgs.color_id AND pv.size_id = fgs.size_id)
      LEFT JOIN shelves sh ON fgs.shelf_id = sh.id
      LEFT JOIN racks r ON sh.rack_id = r.id
      LEFT JOIN warehouses w ON r.warehouse_id = w.id
      ORDER BY c.name, s.sort_order
    `);
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Stock Movements Audit Ledger
router.get('/movements', async (req, res) => {
  try {
    const { item_type, reason, limit = 100 } = req.query;
    let sql = `
      SELECT sm.*, c.name as color_name, c.hex_code, s.name as size_name
      FROM stock_movements sm
      LEFT JOIN colors c ON sm.color_id = c.id
      LEFT JOIN sizes s ON sm.size_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (item_type) {
      sql += ` AND sm.item_type = ?`;
      params.push(item_type);
    }
    if (reason) {
      sql += ` AND sm.movement_reason = ?`;
      params.push(reason);
    }
    sql += ` ORDER BY sm.id DESC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const movements = await db.all(sql, params);
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Manual Stock Adjustment (With Mandatory Reason & Audit Trail)
router.post('/adjust', async (req, res) => {
  try {
    const {
      item_type, // 'RAW_MATERIAL' or 'FINISHED_GOODS'
      color_id,
      size_id,
      quantity,
      change_type, // 'IN' or 'OUT'
      reason = 'Stock Adjustment',
      notes = ''
    } = req.body;

    const qty = parseFloat(quantity);
    if (!item_type || !color_id || !qty || !change_type || !notes) {
      return res.status(400).json({ error: 'Item type, color, quantity, change type, and explanation note are required' });
    }

    const adjDate = new Date().toISOString().split('T')[0];

    if (item_type === 'RAW_MATERIAL') {
      const mat = await db.get(`SELECT id FROM raw_materials LIMIT 1`);
      const stock = await db.get(
        `SELECT * FROM raw_material_stock WHERE material_id = ? AND color_id = ?`,
        [mat.id, color_id]
      );
      if (!stock) return res.status(404).json({ error: 'Raw material stock item not found' });

      if (change_type === 'OUT' && stock.quantity_kg < qty) {
        return res.status(400).json({ error: `Cannot deduct ${qty} KG. Only ${stock.quantity_kg} KG available.` });
      }

      const diff = change_type === 'IN' ? qty : -qty;
      await db.run(
        `UPDATE raw_material_stock SET quantity_kg = quantity_kg + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [diff, stock.id]
      );

      await db.run(
        `INSERT INTO stock_movements (
          date, item_type, movement_reason, reference_no, color_id, quantity, unit, change_type, notes
        ) VALUES (?, 'RAW_MATERIAL', ?, 'ADJ-MANUAL', ?, ?, 'KG', ?, ?)`,
        [adjDate, reason, color_id, qty, change_type, notes]
      );
    } else if (item_type === 'FINISHED_GOODS') {
      if (!size_id) return res.status(400).json({ error: 'Size is required for finished goods' });
      const prod = await db.get(`SELECT id FROM products LIMIT 1`);
      const stock = await db.get(
        `SELECT * FROM finished_goods_stock WHERE product_id = ? AND color_id = ? AND size_id = ?`,
        [prod.id, color_id, size_id]
      );

      if (change_type === 'OUT' && (!stock || stock.quantity < qty)) {
        const avail = stock ? stock.quantity : 0;
        return res.status(400).json({ error: `Cannot deduct ${qty} pcs. Only ${avail} pcs available.` });
      }

      const diff = change_type === 'IN' ? qty : -qty;
      if (stock) {
        await db.run(
          `UPDATE finished_goods_stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [diff, stock.id]
        );
      } else if (change_type === 'IN') {
        await db.run(
          `INSERT INTO finished_goods_stock (product_id, color_id, size_id, quantity) VALUES (?, ?, ?, ?)`,
          [prod.id, color_id, size_id, qty]
        );
      }

      await db.run(
        `INSERT INTO stock_movements (
          date, item_type, movement_reason, reference_no, color_id, size_id, quantity, unit, change_type, notes
        ) VALUES (?, 'FINISHED_GOODS', ?, 'ADJ-MANUAL', ?, ?, ?, 'PCS', ?, ?)`,
        [adjDate, reason, color_id, size_id, qty, change_type, notes]
      );
    }

    res.json({ success: true, message: 'Stock adjusted and audit movement logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
