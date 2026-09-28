import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// --- Colors ---
router.get('/colors', async (req, res) => {
  try {
    const colors = await db.all(`SELECT * FROM colors ORDER BY name ASC`);
    res.json(colors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/colors', async (req, res) => {
  try {
    const { name, code, hex_code } = req.body;
    if (!name) return res.status(400).json({ error: 'Color name is required' });
    const result = await db.run(
      `INSERT INTO colors (name, code, hex_code) VALUES (?, ?, ?)`,
      [name, code || name.slice(0, 3).toUpperCase(), hex_code || '#3b82f6']
    );
    res.json({ id: result.lastID, name, code, hex_code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sizes ---
router.get('/sizes', async (req, res) => {
  try {
    const sizes = await db.all(`SELECT * FROM sizes ORDER BY sort_order ASC`);
    res.json(sizes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sizes', async (req, res) => {
  try {
    const { name, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Size name is required' });
    const result = await db.run(
      `INSERT INTO sizes (name, sort_order) VALUES (?, ?)`,
      [name, sort_order || 0]
    );
    res.json({ id: result.lastID, name, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Products & Variants ---
router.get('/products', async (req, res) => {
  try {
    const products = await db.all(`SELECT * FROM products`);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/variants', async (req, res) => {
  try {
    const variants = await db.all(`
      SELECT pv.*, p.name as product_name, c.name as color_name, c.hex_code, s.name as size_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN colors c ON pv.color_id = c.id
      JOIN sizes s ON pv.size_id = s.id
      ORDER BY c.name, s.sort_order
    `);
    res.json(variants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Workers ---
router.get('/workers', async (req, res) => {
  try {
    const workers = await db.all(`SELECT * FROM workers ORDER BY name ASC`);
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/workers', async (req, res) => {
  try {
    const { name, phone, address, job_type, wage_type, piece_rate } = req.body;
    if (!name || !job_type) return res.status(400).json({ error: 'Worker name and job type are required' });
    
    // Auto generate worker code
    const count = await db.get(`SELECT COUNT(*) as count FROM workers`);
    const code = `WRK-${String(count.count + 1).padStart(3, '0')}`;

    const result = await db.run(
      `INSERT INTO workers (worker_code, name, phone, address, job_type, wage_type, piece_rate) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code, name, phone, address, job_type, wage_type || 'Piece Rate', piece_rate || 0]
    );
    res.json({ id: result.lastID, worker_code: code, name, job_type, piece_rate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/workers/:id', async (req, res) => {
  try {
    const { name, phone, address, job_type, wage_type, piece_rate, status } = req.body;
    await db.run(
      `UPDATE workers 
       SET name = ?, phone = ?, address = ?, job_type = ?, wage_type = ?, piece_rate = ?, status = ?
       WHERE id = ?`,
      [name, phone, address, job_type, wage_type, piece_rate, status || 'Active', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Suppliers ---
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await db.all(`SELECT * FROM suppliers ORDER BY name ASC`);
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const { name, phone, address, gst_number, contact_person } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });
    const result = await db.run(
      `INSERT INTO suppliers (name, phone, address, gst_number, contact_person) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, phone, address, gst_number, contact_person]
    );
    res.json({ id: result.lastID, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Customers ---
router.get('/customers', async (req, res) => {
  try {
    const customers = await db.all(`SELECT * FROM customers ORDER BY name ASC`);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const { name, business_name, phone, address, customer_type, credit_limit, gst_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });
    const result = await db.run(
      `INSERT INTO customers (name, business_name, phone, address, customer_type, credit_limit, gst_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, business_name, phone, address, customer_type || 'Wholesale', credit_limit || 0, gst_number]
    );
    res.json({ id: result.lastID, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Warehouse Locations (Racks & Shelves) ---
router.get('/locations', async (req, res) => {
  try {
    const warehouses = await db.all(`SELECT * FROM warehouses`);
    const racks = await db.all(`SELECT * FROM racks`);
    const shelves = await db.all(`
      SELECT s.*, r.name as rack_name, w.name as warehouse_name
      FROM shelves s
      JOIN racks r ON s.rack_id = r.id
      JOIN warehouses w ON r.warehouse_id = w.id
    `);
    res.json({ warehouses, racks, shelves });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
