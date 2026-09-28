import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET all settings and users
router.get('/', async (req, res) => {
  try {
    const settingsList = await db.all(`SELECT * FROM settings`);
    const settingsObj = {};
    settingsList.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    const users = await db.all(`SELECT * FROM system_users ORDER BY id ASC`);

    res.json({
      settings: settingsObj,
      users: users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update settings
router.post('/', async (req, res) => {
  try {
    const { settings = {} } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, String(value)]
      );
    }

    await db.run(
      `INSERT INTO audit_logs (user_name, action, module, details)
       VALUES ('Admin', 'Update Settings', 'Settings', 'Business configuration parameters updated')`
    );

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create or update user
router.post('/users', async (req, res) => {
  try {
    const { username, full_name, role, status = 'Active' } = req.body;
    if (!username || !full_name || !role) {
      return res.status(400).json({ error: 'Username, Full Name, and Role are required' });
    }

    await db.run(
      `INSERT INTO system_users (username, full_name, role, status) VALUES (?, ?, ?, ?)`,
      [username, full_name, role, status]
    );

    await db.run(
      `INSERT INTO audit_logs (user_name, action, module, details)
       VALUES ('Admin', 'Create User', 'Users', ?)`,
      [`Created system user ${username} (${role})`]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
