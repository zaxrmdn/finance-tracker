const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Database SQLite
const dbPath = path.resolve(__dirname, 'finance.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Gagal terhubung ke database:', err.message);
  } else {
    console.log('Terhubung ke database SQLite.');
  }
});

// Buat Tabel Users & Transactions
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT NOT NULL,       
    category TEXT NOT NULL,   
    amount REAL NOT NULL,     
    description TEXT,         
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);
});

// Endpoint: Registrasi Akun Baru (Aman dengan Bcrypt)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi!' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(query, [username, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username sudah digunakan, pilih yang lain.' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Registrasi berhasil! Silakan login.' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// Endpoint: Login Aman
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi!' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Username atau password salah!' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Username atau password salah!' });

    res.json({ 
      success: true, 
      message: 'Login berhasil', 
      userId: user.id, 
      username: user.username 
    });
  });
});

// Endpoint: Ambil Transaksi Berdasarkan User yang Login
app.get('/api/transactions', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  db.all(`SELECT * FROM transactions WHERE userId = ? ORDER BY id DESC`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ transactions: rows });
  });
});

// Endpoint: Tambah Transaksi
app.post('/api/transactions', (req, res) => {
  const { userId, type, category, amount, description } = req.body;
  if (!userId || !type || !category || !amount) {
    return res.status(400).json({ error: 'Data tidak lengkap!' });
  }

  const query = `INSERT INTO transactions (userId, type, category, amount, description) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [userId, type, category, amount, description], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Transaksi berhasil disimpan!' });
  });
});

// Endpoint: Edit / Update Transaksi
app.put('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { type, category, amount, description } = req.body;
  
  const query = `UPDATE transactions SET type = ?, category = ?, amount = ?, description = ? WHERE id = ?`;
  db.run(query, [type, category, amount, description, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Transaksi berhasil diperbarui!' });
  });
});

// Endpoint: Hapus Transaksi
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM transactions WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Transaksi berhasil dihapus!' });
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
