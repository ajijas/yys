import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import masterRouter from './routes/master.js';
import purchasesRouter from './routes/purchases.js';
import productionRouter from './routes/production.js';
import inventoryRouter from './routes/inventory.js';
import salesRouter from './routes/sales.js';
import wagesRouter from './routes/wages.js';
import dashboardRouter from './routes/dashboard.js';
import qualityRouter from './routes/quality.js';
import settingsRouter from './routes/settings.js';
import auditRouter from './routes/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/master', masterRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/production', productionRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/sales', salesRouter);
app.use('/api/wages', wagesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/quality', qualityRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit', auditRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'YYS Leggings Management API', time: new Date().toISOString() });
});

// Serve frontend static files if dist exists (production build)
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 YYS Leggings Backend API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database or start server:', err);
    process.exit(1);
  }
}

start();

export default app;

