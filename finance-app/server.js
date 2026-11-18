const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Database SQLite
const db = new sqlite3.Database('./finance.db', (err) => {
    if (err) console.error('Gagal terhubung ke database', err.message);
    else console.log('Terhubung ke database SQLite.');
});

// Buat Tabel Pengguna dan Transaksi
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT, -- 'income' atau 'expense'
        category TEXT, -- contoh: 'Makanan', 'Transportasi', dll
        scope TEXT, -- 'Pribadi' atau 'Bisnis'
        amount REAL,
        description TEXT,
        date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'finance-app-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 Hari
}));

// Middleware Cek Autentikasi
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// Route Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Username atau password salah' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Username atau password salah' });

        req.session.userId = user.id;
        req.json({ message: 'Login berhasil' });
    });
});

// Route Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logout berhasil' });
    });
});

// Ambil Semua Transaksi (Mendukung Filter Bulan YYYY-MM)
app.get('/api/transactions', isAuthenticated, (req, res) => {
    const { month } = req.query; // Format: YYYY-MM
    let query = `SELECT * FROM transactions WHERE user_id = ?`;
    let params = [req.session.userId];

    if (month) {
        query += ` AND date LIKE ?`;
        params.push(`${month}%`);
    }

    query += ` ORDER BY date DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Tambah Transaksi Baru
app.post('/api/transactions', isAuthenticated, (req, res) => {
    const { type, category, scope, amount, description, date } = req.body;
    const query = `INSERT INTO transactions (user_id, type, category, scope, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [req.session.userId, type, category, scope || 'Pribadi', amount, description, date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Transaksi berhasil ditambahkan' });
    });
});

// Hapus Transaksi
app.delete('/api/transactions/:id', isAuthenticated, (req, res) => {
    db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaksi berhasil dihapus' });
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
