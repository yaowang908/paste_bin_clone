import { Database } from 'bun:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// State location is configurable so it can be pointed at a mounted volume in
// production. Defaults to a repo-local ./data dir for development.
const dataDir = process.env.DATA_DIR ?? './data';
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, 'pastes.db');
const db = new Database(dbPath, { create: true });

// WAL improves reliability/concurrency for a long-running containerized server.
db.run('PRAGMA journal_mode = WAL;');

// Initialize the schema on startup so a fresh (empty) DATA_DIR is immediately
// usable. schema.sql is resolved relative to this module, not the cwd, so it
// works regardless of where the process is launched from (e.g. in a container).
const schema = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf8');
db.run(schema);

console.log(`Connected to the SQLite database at ${dbPath}`);

export default db;
