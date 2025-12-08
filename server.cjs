// ============================================================================
// MAGNUM OPUS v2.0 — Backend Server
// Simple Express server for user profile storage
// ============================================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'database.json');

// ============================================================================
// Middleware
// ============================================================================

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for biometric data

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Database Helpers
// ============================================================================

const readDb = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Database read error:', error);
    return [];
  }
};

const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Database write error:', error);
    return false;
  }
};

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: Date.now() });
});

// Get all users
app.get('/api/users', (req, res) => {
  try {
    const users = readDb();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Get single user by ID
app.get('/api/users/:id', (req, res) => {
  try {
    const users = readDb();
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Register new user
app.post('/api/register', (req, res) => {
  try {
    const newUser = req.body;
    const users = readDb();
    
    // Validation: Check required fields
    if (!newUser.username || !newUser.id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validation: Check if username exists
    const existingUser = users.find(
      u => u.username.toLowerCase() === newUser.username.toLowerCase()
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Add user
    users.push(newUser);
    
    if (writeDb(users)) {
      console.log(`[REGISTER] New user: ${newUser.username} (${newUser.id})`);
      res.status(201).json({ 
        message: 'User created', 
        userId: newUser.id,
        username: newUser.username 
      });
    } else {
      res.status(500).json({ error: 'Failed to save user' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Update user
app.put('/api/users/:id', (req, res) => {
  try {
    const users = readDb();
    const index = users.findIndex(u => u.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    users[index] = { ...users[index], ...req.body };
    
    if (writeDb(users)) {
      res.json({ message: 'User updated', user: users[index] });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Check username availability
app.post('/api/check-username', (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }
    
    const users = readDb();
    const exists = users.some(
      u => u.username.toLowerCase() === username.toLowerCase()
    );
    
    res.json({ exists });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  try {
    const users = readDb();
    const filtered = users.filter(u => u.id !== req.params.id);
    
    if (filtered.length === users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (writeDb(filtered)) {
      console.log(`[DELETE] User removed: ${req.params.id}`);
      res.json({ message: 'User deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Clear database (dangerous!)
app.delete('/api/reset', (req, res) => {
  try {
    if (writeDb([])) {
      console.log('[RESET] Database cleared');
      res.json({ message: 'Database cleared' });
    } else {
      res.status(500).json({ error: 'Failed to reset' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset' });
  }
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                                                  ║');
  console.log('║   MAGNUM OPUS v2.0 Backend Server                ║');
  console.log('║   Keystroke Dynamics Biometric Authentication    ║');
  console.log('║                                                  ║');
  console.log(`║   Running on: http://localhost:${PORT}              ║`);
  console.log('║                                                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});
