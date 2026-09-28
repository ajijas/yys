import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET all sales / invoices
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = `
      SELECT s.*, c.name as registered_customer_name, c.business_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (type) {
      sql += ` AND s.sale_type = ?`;
      params.push(type);
    }
    sql += ` ORDER BY s.date DESC, s.id DESC`;

    const sales = await db.all(sql, params);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET sale by ID with line items
router.get('/:id', async (req, res) => {
  try {
    const sale = await db.get(
      `SELECT s.*, c.name as registered_customer_name, c.business_name, c.phone as customer_phone, c.gst_number as customer_gst
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    sale.items = await db.all(
      `SELECT si.*, c.name as color_name, c.hex_code, s.name as size_name, pv.sku
       FROM sale_items si
       JOIN colors c ON si.color_id = c.id
       JOIN sizes s ON si.size_id = s.id
       LEFT JOIN product_variants pv ON si.product_variant_id = pv.id
       WHERE si.sale_id = ?`,
      [sale.id]
    );

    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new sale (Wholesale or Retail POS)
router.post('/', async (req, res) => {
  try {
    const {
      sale_type = 'Wholesale', // 'Wholesale' or 'Retail'
      customer_id,
      customer_name,
      date,
      items = [], // [{ color_id, size_id, quantity, unit_price }]
      discount = 0,
      tax_amount = 0,
      payment_method = 'Cash',
      payment_status = 'Paid',
      notes = ''
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one sale item is required' });
    }

    const prod = await db.get(`SELECT id FROM products LIMIT 1`);
    const productId = prod ? prod.id : 1;

    // Critical Validation: Check stock for ALL items before committing any changes!
    for (const item of items) {
      const stock = await db.get(
        `SELECT fgs.*, c.name as color_name, s.name as size_name
         FROM finished_goods_stock fgs
         JOIN colors c ON fgs.color_id = c.id
         JOIN sizes s ON fgs.size_id = s.id
         WHERE fgs.product_id = ? AND fgs.color_id = ? AND fgs.size_id = ?`,
        [productId, item.color_id, item.size_id]
      );

      const available = stock ? stock.quantity : 0;
      const requested = parseInt(item.quantity, 10);

      if (available < requested) {
        const cName = stock ? stock.color_name : 'Selected color';
        const sName = stock ? stock.size_name : 'Selected size';
        return res.status(400).json({
          error: `Insufficient stock for ${cName} / Size ${sName}! Available: ${available} pcs, Requested: ${requested} pcs.`
        });
      }
    }

    // Generate Invoice Number
    const countRes = await db.get(`SELECT COUNT(*) as count FROM sales`);
    const prefix = sale_type === 'Wholesale' ? 'INV-WS' : 'INV-RET';
    const invoiceNo = `${prefix}-${String(countRes.count + 1).padStart(5, '0')}`;
    const saleDate = date || new Date().toISOString().split('T')[0];

    // Compute Totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += parseInt(item.quantity, 10) * parseFloat(item.unit_price);
    }
    const grandTotal = subtotal - (parseFloat(discount) || 0) + (parseFloat(tax_amount) || 0);

    // Get customer name if registered
    let resolvedCustomerName = customer_name;
    if (customer_id && !resolvedCustomerName) {
      const cust = await db.get(`SELECT name, business_name FROM customers WHERE id = ?`, [customer_id]);
      if (cust) resolvedCustomerName = cust.business_name || cust.name;
    }
    if (!resolvedCustomerName) resolvedCustomerName = sale_type === 'Retail' ? 'Counter Retail Customer' : 'Walk-in Buyer';

    // Insert Sale
    const saleRes = await db.run(
      `INSERT INTO sales (
        invoice_no, sale_type, customer_id, customer_name, date, 
        subtotal, discount, tax_amount, grand_total, payment_method, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNo, sale_type, customer_id || null, resolvedCustomerName, saleDate,
        subtotal, discount || 0, tax_amount || 0, grandTotal, payment_method, payment_status, notes
      ]
    );
    const saleId = saleRes.lastID;

    // Insert Line Items and Deduct Stock
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const unitPrice = parseFloat(item.unit_price);
      const totalPrice = qty * unitPrice;

      const variant = await db.get(
        `SELECT id FROM product_variants WHERE product_id = ? AND color_id = ? AND size_id = ?`,
        [productId, item.color_id, item.size_id]
      );

      await db.run(
        `INSERT INTO sale_items (sale_id, product_variant_id, color_id, size_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saleId, variant ? variant.id : null, item.color_id, item.size_id, qty, unitPrice, totalPrice]
      );

      // Deduct Finished Goods Stock
      await db.run(
        `UPDATE finished_goods_stock 
         SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP 
         WHERE product_id = ? AND color_id = ? AND size_id = ?`,
        [qty, productId, item.color_id, item.size_id]
      );

      // Record Immutable Stock Movement
      const reason = sale_type === 'Wholesale' ? 'Wholesale Sale' : 'Retail Sale';
      await db.run(
        `INSERT INTO stock_movements (
          date, item_type, movement_reason, reference_no, 
          color_id, size_id, quantity, unit, change_type, notes
        ) VALUES (?, 'FINISHED_GOODS', ?, ?, ?, ?, ?, 'PCS', 'OUT', ?)`,
        [saleDate, reason, invoiceNo, item.color_id, item.size_id, qty, `Sold via ${invoiceNo} to ${resolvedCustomerName}`]
      );
    }

    res.json({
      success: true,
      sale_id: saleId,
      invoice_no: invoiceNo,
      grand_total: grandTotal
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Customer Return
router.post('/returns', async (req, res) => {
  try {
    const {
      color_id,
      size_id,
      quantity,
      condition = 'Good', // 'Good' or 'Damaged'
      notes = ''
    } = req.body;

    const qty = parseInt(quantity, 10);
    if (!color_id || !size_id || !qty || qty <= 0) {
      return res.status(400).json({ error: 'Color, Size, and valid Quantity are required' });
    }

    const prod = await db.get(`SELECT id FROM products LIMIT 1`);
    const productId = prod ? prod.id : 1;
    const returnDate = new Date().toISOString().split('T')[0];

    if (condition === 'Good') {
      // Return to Finished Goods Stock
      await db.run(
        `UPDATE finished_goods_stock 
         SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP 
         WHERE product_id = ? AND color_id = ? AND size_id = ?`,
        [qty, productId, color_id, size_id]
      );

      await db.run(
        `INSERT INTO stock_movements (
          date, item_type, movement_reason, reference_no, 
          color_id, size_id, quantity, unit, change_type, notes
        ) VALUES (?, 'FINISHED_GOODS', 'Return', 'RET-CUST', ?, ?, ?, 'PCS', 'IN', ?)`,
        [returnDate, color_id, size_id, qty, `Customer returned good condition pieces: ${notes}`]
      );
    } else {
      // Damaged goods
      await db.run(
        `INSERT INTO stock_movements (
          date, item_type, movement_reason, reference_no, 
          color_id, size_id, quantity, unit, change_type, notes
        ) VALUES (?, 'FINISHED_GOODS', 'Damage', 'RET-DMG', ?, ?, ?, 'PCS', 'OUT', ?)`,
        [returnDate, color_id, size_id, qty, `Customer returned damaged pieces: ${notes}`]
      );
    }

    res.json({ success: true, message: `Processed return of ${qty} pieces as ${condition}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
