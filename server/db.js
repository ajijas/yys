import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'yys_leggings.db');

const rawDb = new sqlite3.Database(dbPath);

// Promise helpers for clean async/await
export const db = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      rawDb.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

export async function initDatabase() {
  await db.exec(`
    PRAGMA foreign_keys = ON;

    -- Master Data: Colors
    CREATE TABLE IF NOT EXISTS colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      hex_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Data: Sizes
    CREATE TABLE IF NOT EXISTS sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Data: Products
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      base_wholesale_price REAL DEFAULT 180,
      base_retail_price REAL DEFAULT 299,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Product Variants (Product + Color + Size + SKU)
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      color_id INTEGER NOT NULL REFERENCES colors(id),
      size_id INTEGER NOT NULL REFERENCES sizes(id),
      sku TEXT UNIQUE NOT NULL,
      min_stock_alert INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, color_id, size_id)
    );

    -- Master Data: Workers (Cutters, Tailors, Packers)
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_code TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      job_type TEXT NOT NULL, -- 'Cutter', 'Tailor', 'Packaging', 'Stock Worker'
      wage_type TEXT DEFAULT 'Piece Rate', -- 'Piece Rate', 'Daily', 'Monthly'
      piece_rate REAL DEFAULT 0, -- ₹/piece (e.g. ₹3/piece for tailor)
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Data: Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      gst_number TEXT,
      contact_person TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Data: Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      business_name TEXT,
      phone TEXT,
      address TEXT,
      customer_type TEXT DEFAULT 'Wholesale', -- 'Wholesale', 'Retail'
      credit_limit REAL DEFAULT 0,
      gst_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Data: Warehouse, Racks & Shelves
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS racks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shelves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rack_id INTEGER NOT NULL REFERENCES racks(id),
      name TEXT NOT NULL
    );

    -- Raw Materials Master
    CREATE TABLE IF NOT EXISTS raw_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fabric_type TEXT,
      unit TEXT DEFAULT 'KG',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Raw Material Inventory (Stock in KG per Material & Color)
    CREATE TABLE IF NOT EXISTS raw_material_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES raw_materials(id),
      color_id INTEGER NOT NULL REFERENCES colors(id),
      quantity_kg REAL DEFAULT 0,
      min_stock_kg REAL DEFAULT 20,
      storage_location TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(material_id, color_id)
    );

    -- Purchase Entries (Fabric in KG)
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      material_id INTEGER NOT NULL REFERENCES raw_materials(id),
      color_id INTEGER NOT NULL REFERENCES colors(id),
      quantity_kg REAL NOT NULL,
      rate_per_kg REAL NOT NULL,
      material_value REAL NOT NULL,
      transport_cost REAL DEFAULT 0,
      other_expenses REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_status TEXT DEFAULT 'Paid', -- 'Paid', 'Partial', 'Pending'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cutting Jobs (Fabric in KG -> Cut Pieces by Size)
    CREATE TABLE IF NOT EXISTS cutting_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      material_id INTEGER NOT NULL REFERENCES raw_materials(id),
      color_id INTEGER NOT NULL REFERENCES colors(id),
      fabric_issued_kg REAL NOT NULL,
      wastage_kg REAL DEFAULT 0,
      remaining_fabric_kg REAL DEFAULT 0,
      total_pieces_cut INTEGER DEFAULT 0,
      worker_id INTEGER REFERENCES workers(id),
      status TEXT DEFAULT 'Completed', -- 'In Progress', 'Completed'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cutting_job_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cutting_job_id INTEGER NOT NULL REFERENCES cutting_jobs(id),
      size_id INTEGER NOT NULL REFERENCES sizes(id),
      pieces_cut INTEGER NOT NULL
    );

    -- Cutting Bundles (BND-XXXXX)
    CREATE TABLE IF NOT EXISTS cutting_bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_no TEXT UNIQUE NOT NULL,
      cutting_job_id INTEGER NOT NULL REFERENCES cutting_jobs(id),
      color_id INTEGER NOT NULL REFERENCES colors(id),
      size_id INTEGER NOT NULL REFERENCES sizes(id),
      pieces_count INTEGER NOT NULL,
      status TEXT DEFAULT 'Ready for Stitching', -- 'Created', 'Ready for Stitching', 'Issued to Tailor', 'Stitching in Progress', 'Completed'
      assigned_worker_id INTEGER REFERENCES workers(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stitching Jobs (Bundles -> Finished Leggings, Rejections, Tailor wage)
    CREATE TABLE IF NOT EXISTS stitching_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      bundle_id INTEGER NOT NULL REFERENCES cutting_bundles(id),
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      pieces_issued INTEGER NOT NULL,
      pieces_completed INTEGER NOT NULL,
      pieces_rejected INTEGER DEFAULT 0,
      piece_rate REAL NOT NULL,
      total_wage REAL NOT NULL,
      status TEXT DEFAULT 'Completed', -- 'In Progress', 'Completed'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Packaging Jobs (Finished Leggings -> Packaged & Allocated to Shelf)
    CREATE TABLE IF NOT EXISTS packaging_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      packaging_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      color_id INTEGER NOT NULL REFERENCES colors(id),
      size_id INTEGER NOT NULL REFERENCES sizes(id),
      pieces_received INTEGER NOT NULL,
      pieces_packed INTEGER NOT NULL,
      rack_id INTEGER REFERENCES racks(id),
      shelf_id INTEGER REFERENCES shelves(id),
      worker_id INTEGER REFERENCES workers(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Finished Goods Stock (Pieces per Color & Size + Shelf Location)
    CREATE TABLE IF NOT EXISTS finished_goods_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      color_id INTEGER NOT NULL REFERENCES colors(id),
      size_id INTEGER NOT NULL REFERENCES sizes(id),
      quantity INTEGER DEFAULT 0,
      shelf_id INTEGER REFERENCES shelves(id),
      min_stock_level INTEGER DEFAULT 30,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, color_id, size_id)
    );

    -- Immutable Stock Movements Audit Ledger
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      date TEXT NOT NULL,
      item_type TEXT NOT NULL, -- 'RAW_MATERIAL', 'WIP_PIECES', 'FINISHED_GOODS'
      movement_reason TEXT NOT NULL, -- 'Stock Purchase', 'Cutting Issue', 'Cutting Output', 'Stitching Issue', 'Stitching Output', 'Packaging', 'Wholesale Sale', 'Retail Sale', 'Return', 'Damage', 'Wastage', 'Stock Adjustment'
      reference_no TEXT,
      color_id INTEGER REFERENCES colors(id),
      size_id INTEGER REFERENCES sizes(id),
      quantity REAL NOT NULL,
      unit TEXT NOT NULL, -- 'KG', 'PCS'
      change_type TEXT NOT NULL, -- 'IN', 'OUT'
      notes TEXT
    );

    -- Sales (Wholesale & Retail POS)
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      sale_type TEXT NOT NULL, -- 'Wholesale', 'Retail'
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT,
      date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash', -- 'Cash', 'UPI', 'Bank Transfer', 'Credit'
      payment_status TEXT DEFAULT 'Paid', -- 'Paid', 'Pending', 'Partial'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sale Line Items
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_variant_id INTEGER REFERENCES product_variants(id),
      color_id INTEGER NOT NULL REFERENCES colors(id),
      size_id INTEGER NOT NULL REFERENCES sizes(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    -- Worker Wage Records (Piece count * Rate)
    CREATE TABLE IF NOT EXISTS worker_wages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      date TEXT NOT NULL,
      job_type TEXT NOT NULL, -- 'Cutting', 'Stitching', 'Packaging'
      reference_no TEXT,
      pieces_count INTEGER NOT NULL,
      rate_per_piece REAL NOT NULL,
      wage_amount REAL NOT NULL,
      status TEXT DEFAULT 'Pending', -- 'Pending', 'Paid'
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Worker Wage Payment Disbursements
    CREATE TABLE IF NOT EXISTS worker_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_no TEXT UNIQUE NOT NULL,
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Quality Checks & Defect Inspection (Section 14)
    CREATE TABLE IF NOT EXISTS quality_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      bundle_id INTEGER REFERENCES cutting_bundles(id),
      color_id INTEGER REFERENCES colors(id),
      size_id INTEGER REFERENCES sizes(id),
      total_checked INTEGER NOT NULL,
      passed_count INTEGER NOT NULL,
      rejected_count INTEGER DEFAULT 0,
      defect_type TEXT,
      inspector_name TEXT DEFAULT 'QC Supervisor',
      tailor_worker_id INTEGER REFERENCES workers(id),
      status TEXT DEFAULT 'Passed',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Audit Logs (Section 37)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT DEFAULT 'Admin',
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Business Settings (Section 38)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general'
    );

    -- System Users (Section 3 & 38)
    CREATE TABLE IF NOT EXISTS system_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await seedInitialData();
}

async function seedInitialData() {
  const colorsCount = await db.get(`SELECT COUNT(*) as count FROM colors`);
  if (colorsCount.count > 0) return; // Already seeded

  console.log('Seeding initial master data and demo inventory for YYS Leggings...');

  // 1. Colors
  const colors = [
    { name: 'Black', code: 'BLK', hex: '#1e293b' },
    { name: 'Navy Blue', code: 'NAV', hex: '#1e3a8a' },
    { name: 'Maroon', code: 'MAR', hex: '#881337' },
    { name: 'Grey', code: 'GRY', hex: '#64748b' },
    { name: 'White', code: 'WHT', hex: '#f8fafc' },
    { name: 'Brown', code: 'BRN', hex: '#78350f' }
  ];
  for (const c of colors) {
    await db.run(`INSERT INTO colors (name, code, hex_code) VALUES (?, ?, ?)`, [c.name, c.code, c.hex]);
  }

  // 2. Sizes
  const sizes = [
    { name: 'S', sort: 1 },
    { name: 'M', sort: 2 },
    { name: 'L', sort: 3 },
    { name: 'XL', sort: 4 },
    { name: 'XXL', sort: 5 }
  ];
  for (const s of sizes) {
    await db.run(`INSERT INTO sizes (name, sort_order) VALUES (?, ?)`, [s.name, s.sort]);
  }

  // 3. Product
  const prodRes = await db.run(
    `INSERT INTO products (name, description, base_wholesale_price, base_retail_price) 
     VALUES (?, ?, ?, ?)`,
    ["Women's Leggings", 'Premium 4-way stretch cotton lycra leggings', 180, 299]
  );
  const productId = prodRes.lastID;

  // 4. Product Variants
  const dbColors = await db.all(`SELECT * FROM colors`);
  const dbSizes = await db.all(`SELECT * FROM sizes ORDER BY sort_order`);
  for (const c of dbColors) {
    for (const s of dbSizes) {
      const sku = `LEG-${c.code}-${s.name}`;
      await db.run(
        `INSERT INTO product_variants (product_id, color_id, size_id, sku, min_stock_alert) 
         VALUES (?, ?, ?, ?, ?)`,
        [productId, c.id, s.id, sku, 25]
      );
    }
  }

  // 5. Warehouse, Racks & Shelves
  const whRes = await db.run(`INSERT INTO warehouses (name, location) VALUES ('Main Facility Warehouse', 'Unit 1, Floor 2')`);
  const whId = whRes.lastID;

  const rackA = await db.run(`INSERT INTO racks (warehouse_id, name) VALUES (?, 'Rack A')`, [whId]);
  const rackB = await db.run(`INSERT INTO racks (warehouse_id, name) VALUES (?, 'Rack B')`, [whId]);

  const shelfA1 = await db.run(`INSERT INTO shelves (rack_id, name) VALUES (?, 'Shelf 1')`, [rackA.lastID]);
  const shelfA2 = await db.run(`INSERT INTO shelves (rack_id, name) VALUES (?, 'Shelf 2')`, [rackA.lastID]);
  const shelfA3 = await db.run(`INSERT INTO shelves (rack_id, name) VALUES (?, 'Shelf 3')`, [rackA.lastID]);
  const shelfB1 = await db.run(`INSERT INTO shelves (rack_id, name) VALUES (?, 'Shelf 1')`, [rackB.lastID]);
  const shelfB2 = await db.run(`INSERT INTO shelves (rack_id, name) VALUES (?, 'Shelf 2')`, [rackB.lastID]);

  // 6. Workers
  const workers = [
    { code: 'WRK-001', name: 'Ramesh Cutter', phone: '9876543210', address: 'Tiruppur', job_type: 'Cutter', wage_type: 'Piece Rate', piece_rate: 1.00 },
    { code: 'WRK-002', name: 'Kumar Tailor', phone: '9876543211', address: 'Tiruppur', job_type: 'Tailor', wage_type: 'Piece Rate', piece_rate: 3.00 },
    { code: 'WRK-003', name: 'Selvan Tailor', phone: '9876543212', address: 'Avinashi', job_type: 'Tailor', wage_type: 'Piece Rate', piece_rate: 3.00 },
    { code: 'WRK-004', name: 'Mani Packaging', phone: '9876543213', address: 'Palladam', job_type: 'Packaging', wage_type: 'Piece Rate', piece_rate: 0.50 }
  ];
  for (const w of workers) {
    await db.run(
      `INSERT INTO workers (worker_code, name, phone, address, job_type, wage_type, piece_rate) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [w.code, w.name, w.phone, w.address, w.job_type, w.wage_type, w.piece_rate]
    );
  }

  // 7. Suppliers
  const suppliers = [
    { name: 'ABC Textiles & Mills', phone: '9443210987', address: 'Erode Fabric Market', gst_number: '33ABCDE1234F1Z5', contact: 'Anand Kumar' },
    { name: 'Sri Murugan Knitting', phone: '9443210988', address: 'Tiruppur SIPCOT', gst_number: '33FGHIJ5678K1Z2', contact: 'Murugesan' }
  ];
  for (const sup of suppliers) {
    await db.run(
      `INSERT INTO suppliers (name, phone, address, gst_number, contact_person) 
       VALUES (?, ?, ?, ?, ?)`,
      [sup.name, sup.phone, sup.address, sup.gst_number, sup.contact]
    );
  }

  // 8. Customers
  const customers = [
    { name: 'XYZ Garments Wholesale', business: 'XYZ Garments', phone: '9842101234', address: 'Commercial St, Bangalore', type: 'Wholesale', credit_limit: 50000, gst: '29AAACZ1122D1Z9' },
    { name: 'Lakshmi Fashions', business: 'Lakshmi Retailers', phone: '9842105678', address: 'Cross Cut Road, Coimbatore', type: 'Wholesale', credit_limit: 30000, gst: '33AAACL3344E1Z1' },
    { name: 'Walk-in Retail Buyer', business: '', phone: '9999999999', address: 'Tiruppur Counter', type: 'Retail', credit_limit: 0, gst: '' }
  ];
  for (const cust of customers) {
    await db.run(
      `INSERT INTO customers (name, business_name, phone, address, customer_type, credit_limit, gst_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cust.name, cust.business, cust.phone, cust.address, cust.type, cust.credit_limit, cust.gst]
    );
  }

  // 9. Raw Material Master
  const matRes = await db.run(
    `INSERT INTO raw_materials (name, fabric_type, unit) VALUES ('4-Way Cotton Lycra Fabric', 'Cotton Lycra 95/5 210 GSM', 'KG')`
  );
  const materialId = matRes.lastID;

  // 10. Initial Raw Material Stock (KG)
  const blackColor = dbColors.find(c => c.name === 'Black');
  const navyColor = dbColors.find(c => c.name === 'Navy Blue');
  const maroonColor = dbColors.find(c => c.name === 'Maroon');

  await db.run(`INSERT INTO raw_material_stock (material_id, color_id, quantity_kg, storage_location) VALUES (?, ?, 80.0, 'Bay 1')`, [materialId, blackColor.id]);
  await db.run(`INSERT INTO raw_material_stock (material_id, color_id, quantity_kg, storage_location) VALUES (?, ?, 45.0, 'Bay 2')`, [materialId, navyColor.id]);
  await db.run(`INSERT INTO raw_material_stock (material_id, color_id, quantity_kg, storage_location) VALUES (?, ?, 15.0, 'Bay 3')`, [materialId, maroonColor.id]); // Low stock alert!

  // 11. Sample Purchase Record
  const purRes = await db.run(
    `INSERT INTO purchases (purchase_no, date, supplier_id, material_id, color_id, quantity_kg, rate_per_kg, material_value, total_amount, payment_status, notes) 
     VALUES ('PUR-00025', '2026-09-09', 1, ?, ?, 100.0, 250, 25000, 25000, 'Paid', 'Initial fabric batch for production')`,
    [materialId, blackColor.id]
  );
  await db.run(
    `INSERT INTO stock_movements (date, item_type, movement_reason, reference_no, color_id, quantity, unit, change_type, notes) 
     VALUES ('2026-09-09', 'RAW_MATERIAL', 'Stock Purchase', 'PUR-00025', ?, 100.0, 'KG', 'IN', 'Fabric purchased from ABC Textiles')`,
    [blackColor.id]
  );

  // 12. Sample Cutting Job & Bundles
  const rameshWorker = await db.get(`SELECT id FROM workers WHERE job_type = 'Cutter' LIMIT 1`);
  const cutRes = await db.run(
    `INSERT INTO cutting_jobs (job_no, date, material_id, color_id, fabric_issued_kg, wastage_kg, remaining_fabric_kg, total_pieces_cut, worker_id, status, notes) 
     VALUES ('CUT-00045', '2026-09-09', ?, ?, 20.0, 1.5, 0, 500, ?, 'Completed', 'Processed 20 KG Black fabric')`,
    [materialId, blackColor.id, rameshWorker.id]
  );
  await db.run(
    `INSERT INTO stock_movements (date, item_type, movement_reason, reference_no, color_id, quantity, unit, change_type, notes) 
     VALUES ('2026-09-09', 'RAW_MATERIAL', 'Cutting Issue', 'CUT-00045', ?, 20.0, 'KG', 'OUT', 'Issued to Cutter Ramesh')`,
    [blackColor.id]
  );

  // Wage for Ramesh Cutter: 500 pcs * ₹1 = ₹500
  await db.run(
    `INSERT INTO worker_wages (worker_id, date, job_type, reference_no, pieces_count, rate_per_piece, wage_amount, status) 
     VALUES (?, '2026-09-09', 'Cutting', 'CUT-00045', 500, 1.0, 500, 'Pending')`,
    [rameshWorker.id]
  );

  const sizeM = dbSizes.find(s => s.name === 'M');
  const sizeL = dbSizes.find(s => s.name === 'L');
  const sizeXL = dbSizes.find(s => s.name === 'XL');

  await db.run(`INSERT INTO cutting_job_items (cutting_job_id, size_id, pieces_cut) VALUES (?, ?, 150)`, [cutRes.lastID, sizeM.id]);
  await db.run(`INSERT INTO cutting_job_items (cutting_job_id, size_id, pieces_cut) VALUES (?, ?, 180)`, [cutRes.lastID, sizeL.id]);
  await db.run(`INSERT INTO cutting_job_items (cutting_job_id, size_id, pieces_cut) VALUES (?, ?, 170)`, [cutRes.lastID, sizeXL.id]);

  // Bundles for CUT-00045
  await db.run(`INSERT INTO cutting_bundles (bundle_no, cutting_job_id, color_id, size_id, pieces_count, status) VALUES ('BND-00101', ?, ?, ?, 50, 'Completed')`, [cutRes.lastID, blackColor.id, sizeM.id]);
  await db.run(`INSERT INTO cutting_bundles (bundle_no, cutting_job_id, color_id, size_id, pieces_count, status) VALUES ('BND-00102', ?, ?, ?, 100, 'Completed')`, [cutRes.lastID, blackColor.id, sizeM.id]);
  await db.run(`INSERT INTO cutting_bundles (bundle_no, cutting_job_id, color_id, size_id, pieces_count, status) VALUES ('BND-00103', ?, ?, ?, 180, 'Ready for Stitching')`, [cutRes.lastID, blackColor.id, sizeL.id]);
  await db.run(`INSERT INTO cutting_bundles (bundle_no, cutting_job_id, color_id, size_id, pieces_count, status) VALUES ('BND-00104', ?, ?, ?, 170, 'Issued to Tailor')`, [cutRes.lastID, blackColor.id, sizeXL.id]);

  // 13. Stitching Job
  const kumarTailor = await db.get(`SELECT id FROM workers WHERE job_type = 'Tailor' LIMIT 1`);
  await db.run(
    `INSERT INTO stitching_jobs (job_no, date, bundle_id, worker_id, pieces_issued, pieces_completed, pieces_rejected, piece_rate, total_wage, status, notes) 
     VALUES ('ST-00089', '2026-09-09', 1, ?, 100, 96, 4, 3.0, 288.0, 'Completed', 'Stitched Bundle BND-00101 & BND-00102 with 4 defect pieces')`,
    [kumarTailor.id]
  );
  await db.run(
    `INSERT INTO worker_wages (worker_id, date, job_type, reference_no, pieces_count, rate_per_piece, wage_amount, status) 
     VALUES (?, '2026-09-09', 'Stitching', 'ST-00089', 96, 3.0, 288.0, 'Pending')`,
    [kumarTailor.id]
  );

  // 14. Finished Goods Initial Stock & Locations
  // Black M -> 250 pcs (Rack A / Shelf 1)
  // Black L -> 300 pcs (Rack A / Shelf 2)
  // Black XL -> 180 pcs (Rack A / Shelf 3)
  // Navy M -> 120 pcs (Rack B / Shelf 1)
  // Maroon L -> 18 pcs (Rack B / Shelf 2) - LOW STOCK ALERT (< 25)
  await db.run(`INSERT INTO finished_goods_stock (product_id, color_id, size_id, quantity, shelf_id, min_stock_level) VALUES (?, ?, ?, 250, ?, 30)`, [productId, blackColor.id, sizeM.id, shelfA1.lastID]);
  await db.run(`INSERT INTO finished_goods_stock (product_id, color_id, size_id, quantity, shelf_id, min_stock_level) VALUES (?, ?, ?, 300, ?, 30)`, [productId, blackColor.id, sizeL.id, shelfA2.lastID]);
  await db.run(`INSERT INTO finished_goods_stock (product_id, color_id, size_id, quantity, shelf_id, min_stock_level) VALUES (?, ?, ?, 180, ?, 30)`, [productId, blackColor.id, sizeXL.id, shelfA3.lastID]);
  await db.run(`INSERT INTO finished_goods_stock (product_id, color_id, size_id, quantity, shelf_id, min_stock_level) VALUES (?, ?, ?, 120, ?, 30)`, [productId, navyColor.id, sizeM.id, shelfB1.lastID]);
  await db.run(`INSERT INTO finished_goods_stock (product_id, color_id, size_id, quantity, shelf_id, min_stock_level) VALUES (?, ?, ?, 18, ?, 25)`, [productId, maroonColor.id, sizeL.id, shelfB2.lastID]);

  // Log stock movements for finished goods
  await db.run(
    `INSERT INTO stock_movements (date, item_type, movement_reason, reference_no, color_id, size_id, quantity, unit, change_type, notes) 
     VALUES ('2026-09-09', 'FINISHED_GOODS', 'Packaging', 'PKG-00052', ?, ?, 96, 'PCS', 'IN', 'Packed leggings added to Rack A Shelf 1')`,
    [blackColor.id, sizeM.id]
  );

  // 15. Quality Check Sample Log (Section 14)
  await db.run(
    `INSERT INTO quality_checks (check_no, date, bundle_id, color_id, size_id, total_checked, passed_count, rejected_count, defect_type, inspector_name, remarks)
     VALUES ('QC-00012', '2026-09-09', 1, ?, ?, 100, 96, 4, 'Stitch Skipping', 'Senthil QC', '4 minor seam skip defects isolated')`,
    [blackColor.id, sizeM.id]
  );

  // 16. Business Settings (Section 38)
  const defaultSettings = [
    ['company_name', 'YYS Leggings Manufacturing', 'general'],
    ['gstin', '33AABBC1234F1Z1', 'tax'],
    ['factory_location', 'Unit 1, SIDCO Industrial Estate, Tiruppur - 641603', 'general'],
    ['support_phone', '+91 98421 23456', 'general'],
    ['default_wholesale_rate', '180', 'pricing'],
    ['default_retail_rate', '299', 'pricing'],
    ['min_fabric_threshold_kg', '20', 'inventory'],
    ['min_finished_stock_pcs', '25', 'inventory']
  ];
  for (const [k, v, cat] of defaultSettings) {
    await db.run(`INSERT OR IGNORE INTO settings (key, value, category) VALUES (?, ?, ?)`, [k, v, cat]);
  }

  // 17. User Roles (Section 3)
  const defaultUsers = [
    ['admin', 'YYS Owner (Admin)', 'Admin'],
    ['manager', 'Gopal (Factory Manager)', 'Manager'],
    ['cutting_sup', 'Karthik (Cutting Supervisor)', 'Cutting Supervisor'],
    ['stitching_sup', 'Muthu (Stitching Supervisor)', 'Stitching Supervisor'],
    ['packaging_worker', 'Mani (Packaging / Stock)', 'Packaging / Stock'],
    ['sales_pos', 'Priya (Sales Counter User)', 'Sales User']
  ];
  for (const [u, name, role] of defaultUsers) {
    await db.run(`INSERT OR IGNORE INTO system_users (username, full_name, role) VALUES (?, ?, ?)`, [u, name, role]);
  }

  // 18. Initial Audit Log Entry (Section 37)
  await db.run(
    `INSERT INTO audit_logs (user_name, action, module, details)
     VALUES ('Admin', 'System Initialized', 'Setup', 'YYS Leggings ERP database configured and master catalog initialized')`
  );

  console.log('Database initialization and seeding completed successfully!');
}
