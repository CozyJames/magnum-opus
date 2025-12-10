const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: Date.now() });
});

app.get('/api/users', (req, res) => {
  try {
    const users = readDb();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read database' });
  }
});

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

app.post('/api/register', (req, res) => {
  try {
    const newUser = req.body;
    const users = readDb();

    if (!newUser.username || !newUser.id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = users.find(
      u => u.username.toLowerCase() === newUser.username.toLowerCase()
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

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
