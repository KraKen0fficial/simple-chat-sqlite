const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Setup SQLite database
const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        console.error('Database opening error: ', err);
    } else {
        console.log('Connected to SQLite database.');
        db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
    }
});

app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.get('/messages', (req, res) => {
    db.all("SELECT * FROM messages ORDER BY timestamp ASC", [], (err, rows) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.send(rows);
        }
    });
});

app.post('/messages', (req, res) => {
    const { name, message } = req.body;
    if(!name || !message) return res.sendStatus(400);

    const stmt = db.prepare("INSERT INTO messages (name, message) VALUES (?, ?)");
    stmt.run(name, message, function(err) {
        if (err) {
            res.sendStatus(500);
            return console.error(err.message);
        }
        // Emit the message to all connected clients
        io.emit('message', { name, message, timestamp: new Date() });
        res.sendStatus(200);
    });
    stmt.finalize();
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});