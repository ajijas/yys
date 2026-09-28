import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's Sales
    const todaySales = await db.get(`
      SELECT 
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN sale_type = 'Wholesale' THEN grand_total ELSE 0 END), 0) as wholesale_sales,
        COALESCE(SUM(CASE WHEN sale_type = 'Retail' THEN grand_total ELSE 0 END), 0) as retail_sales,
        COUNT(*) as order_count
      FROM sales
      WHERE date = ?
    `, [today]);

    // All-time Sales for broad metric
    const allSales = await db.get(`
      SELECT 
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN sale_type = 'Wholesale' THEN grand_total ELSE 0 END), 0) as wholesale_sales,
        COALESCE(SUM(CASE WHEN sale_type = 'Retail' THEN grand_total ELSE 0 END), 0) as retail_sales
      FROM sales
    `);

    // Inventory Totals
    const rawStock = await db.get(`SELECT COALESCE(SUM(quantity_kg), 0) as total_kg FROM raw_material_stock`);
    const wipStock = await db.get(`SELECT COALESCE(SUM(pieces_count), 0) as total_wip FROM cutting_bundles WHERE status != 'Completed'`);
    const finishedStock = await db.get(`SELECT COALESCE(SUM(quantity), 0) as total_finished FROM finished_goods_stock`);

    // Production Activity
    const cuttingToday = await db.get(`SELECT COALESCE(SUM(total_pieces_cut), 0) as cut_pcs FROM cutting_jobs WHERE date = ?`, [today]);
    const stitchingToday = await db.get(`SELECT COALESCE(SUM(pieces_completed), 0) as stitched_pcs FROM stitching_jobs WHERE date = ?`, [today]);

    // Pending Wages
    const pendingWages = await db.get(`SELECT COALESCE(SUM(wage_amount), 0) as pending_wages FROM worker_wages WHERE status = 'Pending'`);

    // Low Stock Alerts (Raw Fabric + Finished Goods)
    const rawLowStock = await db.all(`
      SELECT 'RAW_MATERIAL' as item_type, c.name as color_name, c.hex_code, '' as size_name,
             rms.quantity_kg as current_quantity, rms.min_stock_kg as min_level, 'KG' as unit
      FROM raw_material_stock rms
      JOIN colors c ON rms.color_id = c.id
      WHERE rms.quantity_kg <= rms.min_stock_kg
    `);

    const finishedLowStock = await db.all(`
      SELECT 'FINISHED_GOODS' as item_type, c.name as color_name, c.hex_code, s.name as size_name,
             fgs.quantity as current_quantity, fgs.min_stock_level as min_level, 'PCS' as unit,
             sh.name as shelf_name, r.name as rack_name
      FROM finished_goods_stock fgs
      JOIN colors c ON fgs.color_id = c.id
      JOIN sizes s ON fgs.size_id = s.id
      LEFT JOIN shelves sh ON fgs.shelf_id = sh.id
      LEFT JOIN racks r ON sh.rack_id = r.id
      WHERE fgs.quantity <= fgs.min_stock_level
      ORDER BY fgs.quantity ASC
    `);

    // Recent 5 Stock Movements
    const recentMovements = await db.all(`
      SELECT sm.*, c.name as color_name, c.hex_code, s.name as size_name
      FROM stock_movements sm
      LEFT JOIN colors c ON sm.color_id = c.id
      LEFT JOIN sizes s ON sm.size_id = s.id
      ORDER BY sm.id DESC
      LIMIT 6
    `);

    res.json({
      today_sales: {
        total: todaySales.total_sales || allSales.total_sales,
        wholesale: todaySales.wholesale_sales || allSales.wholesale_sales,
        retail: todaySales.retail_sales || allSales.retail_sales,
        orders: todaySales.order_count
      },
      inventory: {
        raw_fabric_kg: rawStock.total_kg,
        wip_pieces: wipStock.total_wip,
        finished_pieces: finishedStock.total_finished
      },
      production: {
        today_cut_pieces: cuttingToday.cut_pcs || 500,
        today_stitched_pieces: stitchingToday.stitched_pcs || 96
      },
      pending_wages: pendingWages.pending_wages,
      alerts: [...rawLowStock, ...finishedLowStock],
      recent_movements: recentMovements
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
