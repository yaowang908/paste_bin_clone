## ADDED Requirements

### Requirement: SQLite access uses the Bun-native driver
The application SHALL access SQLite exclusively through `bun:sqlite` and SHALL NOT depend on the native node `sqlite3` package at runtime.

#### Scenario: Reads and writes succeed without a runtime crash
- **WHEN** the server handles a paste read (`GET /api/pastes/:id`), create (`POST /api/pastes`), or update (`PUT /api/pastes/:id`)
- **THEN** the query executes against the database and returns a normal response
- **AND** the Bun process does not emit a NAPI fatal error or panic

### Requirement: Database location is configurable via DATA_DIR
The database file path SHALL be derived from a `DATA_DIR` environment variable rather than a hardcoded project-relative path. `DATA_DIR` SHALL default to a local directory for development and be set to the mounted volume path in the container.

#### Scenario: Custom DATA_DIR is honored
- **WHEN** the server starts with `DATA_DIR=/some/path`
- **THEN** the SQLite file is opened at `/some/path/pastes.db`

#### Scenario: Default applies when DATA_DIR is unset
- **WHEN** the server starts with no `DATA_DIR` set
- **THEN** it uses the documented local default directory and creates it if missing

### Requirement: Schema initializes on startup
The application SHALL create the `pastes` table if it does not exist when the database connection is opened, so a fresh (empty) data directory becomes usable without a manual init step.

#### Scenario: Fresh volume self-initializes
- **WHEN** the server starts against an empty `DATA_DIR` with no existing database file
- **THEN** the `pastes` table is created
- **AND** a subsequent `POST /api/pastes` succeeds instead of returning a database error

### Requirement: State persists across restarts
Data written to the database SHALL survive process restarts and image redeploys, given the same `DATA_DIR` (a mounted volume in production).

#### Scenario: Paste survives a restart
- **WHEN** a paste is created, then the process is stopped and started again pointing at the same `DATA_DIR`
- **THEN** the previously created paste is still readable
