## ADDED Requirements

### Requirement: App builds into a runnable container image
The repository SHALL provide a `Dockerfile` that builds a self-contained image running the Hono/Bun server, using a multi-stage build (install dependencies, run `bun run build` to produce `dist`, then run the server). The image SHALL run as a non-root user and listen on port 3000.

#### Scenario: Image builds and serves
- **WHEN** the image is built and run with a volume mounted at the container's `DATA_DIR`
- **THEN** the app is reachable on port 3000 and serves the built frontend
- **AND** creating a paste writes the SQLite file into the mounted volume

#### Scenario: Container runs as non-root
- **WHEN** inspecting the running container's process user
- **THEN** it is a non-root user, and that user can read and write `DATA_DIR`

### Requirement: Build context is minimized
The repository SHALL include a `.dockerignore` that excludes `node_modules`, `dist`, `.git`, `.github`, local data directories, and env files, while retaining `server.ts` and `src/db/schema.sql` needed at build/run time.

#### Scenario: Excluded paths are absent from context
- **WHEN** the image is built
- **THEN** `node_modules`, `dist`, and `.git` are not copied from the host into the build context

### Requirement: Images publish to GHCR on merge to main
A GitHub Actions workflow SHALL build and push the image to `ghcr.io/yaowang908/paste_bin_clone` on push to `main`, tagging both `latest` and the commit SHA. It SHALL authenticate using the built-in `GITHUB_TOKEN` with `packages: write` permission and SHALL NOT require any additional stored secret. Third-party actions SHALL be pinned to commit SHAs.

#### Scenario: Successful publish
- **WHEN** a commit is pushed to `main`
- **THEN** the workflow builds the image and pushes `:latest` and `:<sha>` tags to the GHCR package
- **AND** the package is publicly pullable without credentials

### Requirement: Pull requests validate the image build without publishing
A CI job SHALL build the Docker image on pull requests with `push: false`, so a broken Dockerfile or server build fails the PR rather than surfacing after merge. This job SHALL NOT push to the registry.

#### Scenario: Broken Dockerfile fails the PR
- **WHEN** a pull request contains a change that breaks the image build
- **THEN** the PR docker-build job fails
- **AND** no image is pushed to GHCR

### Requirement: Legacy SSH deploy workflow is removed
The old SSH `git pull` deploy workflow and its droplet SSH secrets SHALL be removed, since deployment moves to a droplet-side image pull.

#### Scenario: Old workflow no longer present
- **WHEN** inspecting `.github/workflows/`
- **THEN** the SSH `git pull`/pm2 deploy workflow is absent
- **AND** no workflow references droplet SSH credentials
