import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const trimmedUser = String(username).trim();
    const trimmedPass = String(password).trim();

    const user = await db.get(
      `SELECT id, username, full_name, role, password, status 
       FROM system_users 
       WHERE LOWER(username) = LOWER(?)`,
      [trimmedUser]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or credentials' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account is deactivated. Contact factory administrator.' });
    }

    // Direct password match
    if (user.password !== trimmedPass) {
      return res.status(401).json({ error: 'Incorrect password entered' });
    }

    // Record audit log
    await db.run(
      `INSERT INTO audit_logs (user_name, action, module, details)
       VALUES (?, 'User Login', 'Authentication', ?)`,
      [user.full_name || user.username, `Logged into YSS Leggings ERP as ${user.role}`]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/demo-users (For quick switch & prototype testing)
router.get('/demo-users', async (req, res) => {
  try {
    const users = await db.all(
      `SELECT id, username, full_name, role, password 
       FROM system_users 
       WHERE status = 'Active' 
       ORDER BY id ASC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { username, full_name } = req.body;
    if (username || full_name) {
      await db.run(
        `INSERT INTO audit_logs (user_name, action, module, details)
         VALUES (?, 'User Logout', 'Authentication', 'Session ended successfully')`,
        [full_name || username]
      );
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
