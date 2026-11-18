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

// Buat Tabel Pengguna, Transaksi, Tabungan, dan Hutang-Piutang
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
        category TEXT,
        scope TEXT, -- 'Pribadi' atau 'Bisnis'
        amount REAL,
        description TEXT,
        date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        deadline TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        person_name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'hutang' atau 'piutang'
        amount REAL NOT NULL,
        due_date TEXT,
        status TEXT DEFAULT 'Belum Lunas',
        description TEXT,
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
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// Route Login & Logout
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Username atau password salah' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Username atau password salah' });
        req.session.userId = user.id;
        res.json({ message: 'Login berhasil' });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ message: 'Logout berhasil' }));
});

// --- TRANSACTIONS API ---
app.get('/api/transactions', isAuthenticated, (req, res) => {
    const { month } = req.query;
    let query = `SELECT * FROM transactions WHERE user_id = ?`;
    let params = [req.session.userId];
    if (month) {
        query += ` AND date LIKE ?`;
        params.push(`${month}%`);
    }
    query += ` ORDER BY date DESC`;
    db.all(query, params, (err, rows) => res.json(rows));
});

app.post('/api/transactions', isAuthenticated, (req, res) => {
    const { type, category, scope, amount, description, date } = req.body;
    db.run(`INSERT INTO transactions (user_id, type, category, scope, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.session.userId, type, category, scope || 'Pribadi', amount, description, date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Transaksi berhasil ditambahkan' });
        }
    );
});

app.delete('/api/transactions/:id', isAuthenticated, (req, res) => {
    db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId], (err) => {
        res.json({ message: 'Transaksi berhasil dihapus' });
    });
});

// --- SAVINGS API ---
app.get('/api/savings', isAuthenticated, (req, res) => {
    db.all(`SELECT * FROM savings WHERE user_id = ?`, [req.session.userId], (err, rows) => res.json(rows));
});

app.post('/api/savings', isAuthenticated, (req, res) => {
    const { title, target_amount, deadline } = req.body;
    db.run(`INSERT INTO savings (user_id, title, target_amount, current_amount, deadline) VALUES (?, ?, ?, 0, ?)`,
        [req.session.userId, title, target_amount, deadline],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Target tabungan dibuat' });
        }
    );
});

app.post('/api/savings/:id/deposit', isAuthenticated, (req, res) => {
    const { amount } = req.body;
    db.run(`UPDATE savings SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?`,
        [amount, req.params.id, req.session.userId],
        (err) => res.json({ message: 'Setoran tabungan berhasil' })
    );
});

app.delete('/api/savings/:id', isAuthenticated, (req, res) => {
    db.run(`DELETE FROM savings WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId], (err) => {
        res.json({ message: 'Tabungan dihapus' });
    });
});

// --- DEBTS API ---
app.get('/api/debts', isAuthenticated, (req, res) => {
    db.all(`SELECT * FROM debts WHERE user_id = ?`, [req.session.userId], (err, rows) => res.json(rows));
});

app.post('/api/debts', isAuthenticated, (req, res) => {
    const { person_name, type, amount, due_date, description } = req.body;
    db.run(`INSERT INTO debts (user_id, person_name, type, amount, due_date, status, description) VALUES (?, ?, ?, ?, ?, 'Belum Lunas', ?)`,
        [req.session.userId, person_name, type, amount, due_date, description],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Catatan hutang/piutang ditambahkan' });
        }
    );
});

app.post('/api/debts/:id/pay', isAuthenticated, (req, res) => {
    db.run(`UPDATE debts SET status = 'Lunas' WHERE id = ? AND user_id = ?`,
        [req.params.id, req.session.userId],
        (err) => res.json({ message: 'Status hutang diperbarui menjadi Lunas' })
    );
});

app.delete('/api/debts/:id', isAuthenticated, (req, res) => {
    db.run(`DELETE FROM debts WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId], (err) => {
        res.json({ message: 'Catatan hutang dihapus' });
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
