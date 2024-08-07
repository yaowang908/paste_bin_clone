const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'src', 'db', 'database.sqlite');

// Create and export the database connection
let db;

const connectDB = () => {
  if (!db) {
    // TODO preserve the connection
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Could not connect to the database', err);
      } else {
        console.log('Connected to the SQLite database');
      }
    });
  }
  return db;
};

module.exports = connectDB();
