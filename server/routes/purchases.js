import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET all purchases
router.get('/', async (req, res) => {
  try {
    const purchases = await db.all(`
      SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, 
             c.name as color_name, c.hex_code, rm.name as material_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN colors c ON p.color_id = c.id
      JOIN raw_materials rm ON p.material_id = rm.id
      ORDER BY p.date DESC, p.id DESC
    `);
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new purchase
router.post('/', async (req, res) => {
  try {
    const {
      date,
      supplier_id,
      color_id,
      quantity_kg,
      rate_per_kg,
      transport_cost = 0,
      other_expenses = 0,
      payment_status = 'Paid',
      notes = ''
    } = req.body;

    if (!supplier_id || !color_id || !quantity_kg || !rate_per_kg) {
      return res.status(400).json({ error: 'Supplier, Color, Quantity (KG) and Rate/KG are required' });
    }

    const qty = parseFloat(quantity_kg);
    const rate = parseFloat(rate_per_kg);
    const transport = parseFloat(transport_cost) || 0;
    const expenses = parseFloat(other_expenses) || 0;
    const matValue = qty * rate;
    const grandTotal = matValue + transport + expenses;

    // Get material ID (default first raw material)
    const mat = await db.get(`SELECT id FROM raw_materials LIMIT 1`);
    const materialId = mat ? mat.id : 1;

    // Generate purchase number
    const countRes = await db.get(`SELECT COUNT(*) as count FROM purchases`);
    const purchaseNo = `PUR-${String(countRes.count + 1).padStart(5, '0')}`;
    const purchaseDate = date || new Date().toISOString().split('T')[0];

    // Insert purchase record
    const result = await db.run(
      `INSERT INTO purchases (
        purchase_no, date, supplier_id, material_id, color_id, 
        quantity_kg, rate_per_kg, material_value, transport_cost, 
        other_expenses, total_amount, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseNo, purchaseDate, supplier_id, materialId, color_id,
        qty, rate, matValue, transport, expenses, grandTotal, payment_status, notes
      ]
    );

    // Update raw_material_stock (Upsert)
    const existingStock = await db.get(
      `SELECT * FROM raw_material_stock WHERE material_id = ? AND color_id = ?`,
      [materialId, color_id]
    );

    if (existingStock) {
      await db.run(
        `UPDATE raw_material_stock 
         SET quantity_kg = quantity_kg + ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [qty, existingStock.id]
      );
    } else {
      await db.run(
        `INSERT INTO raw_material_stock (material_id, color_id, quantity_kg) 
         VALUES (?, ?, ?)`,
        [materialId, color_id, qty]
      );
    }

    // Record immutable stock movement
    await db.run(
      `INSERT INTO stock_movements (
        date, item_type, movement_reason, reference_no, 
        color_id, quantity, unit, change_type, notes
      ) VALUES (?, 'RAW_MATERIAL', 'Stock Purchase', ?, ?, ?, 'KG', 'IN', ?)`,
      [purchaseDate, purchaseNo, color_id, qty, `Purchased from supplier ID ${supplier_id}`]
    );

    res.json({
      id: result.lastID,
      purchase_no: purchaseNo,
      total_amount: grandTotal,
      quantity_kg: qty
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
