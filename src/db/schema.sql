CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    expirationDate INTEGER,
    token TEXT NOT NULL
);
