const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the SQLite database file
const dbPath = path.resolve(process.cwd(), 'src', 'db', 'database.sqlite');

// Initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to the database', err);
  } else {
    console.log('Connected to the SQLite database');
  }
});

// Create the table if it doesn't exist
db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS pastes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            expirationDate INTEGER,
            token TEXT NOT NULL
        )
    `);
});

db.close();
