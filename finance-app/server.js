const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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
    date TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Masukkan akun default baru (username: zakaria, password: password123)
  db.get(`SELECT * FROM users WHERE username = ?`, ['zakaria'], (err, row) => {
    if (!row) {
      db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['zakaria', 'password123']);
    }
  });
});

// Endpoint: Login 
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Username atau password salah!' });
    res.json({ success: true, message: 'Login berhasil', userId: row.id, username: row.username });
  });
});

// Endpoint: Ambil Transaksi Berdasarkan User
app.get('/api/transactions', (req, res) => {
  const userId = req.query.userId || 1;
  db.all(`SELECT * FROM transactions WHERE userId = ? ORDER BY id DESC`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ transactions: rows });
  });
});

// Endpoint: Tambah Transaksi
app.post('/api/transactions', (req, res) => {
  const { userId, type, category, amount, description } = req.body;
  if (!type || !category || !amount) {
    return res.status(400).json({ error: 'Data tidak lengkap!' });
  }

  const query = `INSERT INTO transactions (userId, type, category, amount, description) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [userId || 1, type, category, amount, description], function(err) {
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
});
