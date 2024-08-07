const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'src', 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to database');
  }
});

module.exports = db;
