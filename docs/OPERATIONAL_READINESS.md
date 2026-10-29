# Issue #38 — Operational readiness verification

**Verification date:** 2026-10-29 (Asia/Calcutta)  
**Branch/base:** `docs/issue-38-operational-readiness`, based on refreshed `origin/main` at `c0e5b22`  
**Issue state:** Open (queried from GitHub API on verification date); no open pull requests were listed.  
**Scope:** Startup, shutdown, configuration, health checks, diagnostics, and operational dependencies. Backup/restore evidence belongs to [Issue #11 verification](ISSUE_11_31_32_VERIFICATION.md#issue-11--backup-restoration-and-material-integrity); it is not duplicated here.

## Architecture and configuration inspected

- No root `package.json`; the client and server have separate package manifests and lockfiles.
- Runtime: Node.js 20 or later (`server/package.json`); the verification host reported Node `v22.19.0` and npm `11.10.0`.
- Server entry point: `server/src/server.js`; Express app: `server/src/app.js`; database connection: `server/src/config/db.js`.
- Server configuration names are `PORT`, `MONGO_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN`, documented in `server/.env.example`. Real `server/.env` contents were not read, displayed, or used for verification.
- The server calls `listen()` only after MongoDB connects. The client is Vite (`client/package.json`); default dev URL is port 5173.
- `GET /api/health` returns `{ "status": "ok" }`. It is a process/route liveness response, not a runtime MongoDB readiness probe. Startup gating means the server does not initially accept requests until its MongoDB connection succeeds, but the health route does not detect a later database disconnect.
- Production TLS termination, process supervision, persistent file storage, backups, monitoring/alerting, log collection/retention, and deployment topology are not configured in the repository inspected.

## Procedures

### Local setup

1. Install Git, Node.js 20+, npm, and a reachable MongoDB instance.
2. From the repository root, install separately: `npm --prefix server ci` and `npm --prefix client ci`.
3. Copy `server/.env.example` to `server/.env`; set a strong local-only `JWT_SECRET`, a local/test MongoDB URI, `PORT` (default 5050), and `CLIENT_ORIGIN` (default `http://localhost:5173`). Keep real values out of source control and logs.
4. Start the server with `npm --prefix server run dev` and the client with `npm --prefix client run dev` in separate terminals.
5. Check `http://localhost:5050/api/health` and `http://localhost:5173/` after both processes start.
6. Stop each foreground process with Ctrl+C. For a hosted environment, stop via its process supervisor and confirm the service becomes unavailable before maintenance.

`docs/LOCAL_SETUP.md` contains the fuller install and troubleshooting instructions. The commands above do not configure a production deployment.

## Operational check record

| Check | Procedure / expected result | Actual result | Status | Evidence / next action |
|---|---|---|---|---|
| Client production build | From `client/`, `npm run build`; Vite emits production assets and exits 0 | Vite 5.4.21 transformed 114 modules, emitted `dist/`, exited 0 in 2.06 s | **Passed (local build only)** | Command output captured in this task. Does not prove browser compatibility or deployment readiness. |
| Client server startup | `npm run dev -- --host 127.0.0.1 --port 5178 --strictPort` | Vite reported ready in 581 ms at `http://127.0.0.1:5178/` | **Passed (process startup only)** | Dev-server terminal output captured. |
| Client HTTP response | Request the Vite root URL; expect HTTP 200 and app HTML | Request timed out; loopback access was denied by the execution sandbox, including the authorized retry | **Not Executed** | Need loopback HTTP access in an approved environment; do not infer response success from Vite startup. |
| Client shutdown | Stop the test Vite process with Ctrl+C and confirm it exits | Ctrl+C was sent; a subsequent process check found no Node process running | **Passed (local process stop)** | No persistent Vite process remains. |
| Backend startup and health | Start `node src/server.js` with sanitized test-only values and a reachable isolated MongoDB; request `/api/health` | With a test-only URI pointing to local port 27017 and 1 s server-selection timeout, process exited 1 and logged `Failed to connect to MongoDB. Check database configuration and connectivity.` Local MongoDB was not listening | **Blocked** | Provide isolated local/test MongoDB and rerun startup, HTTP health, and shutdown. No repository `.env` credentials were used. |
| Backend shutdown after normal startup | Stop the server with Ctrl+C; confirm clean termination and no listener | No successful backend startup was possible because MongoDB was unavailable | **Not Executed** | Depends on isolated MongoDB and successful server start. |
| Startup failure diagnostics | Start with missing MongoDB; verify useful diagnostic without URI/credentials | Generic database-connectivity message observed; no URI, error text, or stack was logged | **Partially Verified** | Safe from connection-string disclosure by code path/output; add a sanitized error category only if maintainers approve the diagnostic convention. |
| Runtime error diagnostics | Trigger an unexpected API error; expect generic client response and non-secret server log | Code inspection: client receives generic 500; non-test server log includes only `err.name`, never the message/stack. Existing `base.test.js` tests response secrecy but was not executed here | **Partially Verified** | Rerun test after resolving the MongoDB test-binary startup blocker; confirm log capture in an integration environment. |
| Health/readiness | Request `/api/health` while app is running and after a DB disconnect | Route implementation always returns `status: ok`; no DB-state check | **Partially Verified** | Use liveness only. A separate readiness probe and a runtime DB-disconnect test require a deployment-health design decision. |
| Daily backup and restore | See TC-AN-01 and Issue #11 report | No scheduled backup/restore infrastructure or dated artifact was found in repository configuration | **Not Executed** | Tracked under #11; requires an isolated backup/restore environment. |
| TLS, monitoring, alerting, deployed shutdown, and restart recovery | Execute against approved deployment | No deployment target or such infrastructure was available in this repository context | **Not Executed** | Provide the approved host, TLS termination, process supervisor, monitoring, and access procedure. |

## Logging and secret handling

`server/src/server.js` emits a startup line containing the local API origin and a generic MongoDB connectivity failure message. It does not log the connection string or raw driver error. `server/src/middleware/errorHandler.js` returns a generic 500 response and, outside test mode, logs the unexpected error name without the error message or stack. `server/tests/base.test.js` has an assertion for not exposing a secret-like message or stack in the HTTP response; the suite could not be executed in the current environment because the in-memory MongoDB process fails to start.

The repository has no structured request logging, correlation IDs, log rotation/retention policy, centralized collection, or alerts. These are deployment dependencies, not verified capabilities. Never add `MONGO_URI`, `JWT_SECRET`, tokens, or raw error messages to diagnostics.

## Dependency and limitation register

| ID | Dependency / decision | Owner | Needed to close |
|---|---|---|---|
| OPS-01 | Isolated MongoDB test instance; none was listening at `127.0.0.1:27017` | Unassigned in repository | Repeat backend startup, API health, shutdown, and runtime error checks without using an unknown `.env` database. |
| OPS-02 | Approved deployment target, topology, TLS termination, process supervisor, and restart policy | Team decision required | Verify deployment startup/shutdown, TLS, recovery, and deployed health probes. |
| OPS-03 | Monitoring, alerting, log collection, retention, and on-call/check owners | Team decision required | Define evidence source, alert path, retention, owner, and routine cadence. |
| OPS-04 | Readiness behavior during later MongoDB disconnection | Team decision required | Decide whether `/api/health` remains a liveness check and add a separate readiness contract if required. |
| OPS-05 | Daily backup and isolated restore environment | Linked to #11 | See Issue #11; do not close #38 on backup configuration text alone. |
| OPS-06 | Local integration test runtime | Unassigned in repository | Resolve `mongodb-memory-server` `fassert()` startup failure and rerun `server/tests/base.test.js` and related suites. |

## Traceability and GitHub record

Issue #38 has no separately numbered SRS requirement. It supports operational verification of the application and links the backup obligation to NFR-SAFE-01 / TC-AN-01 under Issue #11. GitHub showed #38, #31, #32, and #11 Open and no open PRs at the time queried. The only other open repository issue returned was #49; it is outside this operational-readiness scope.

No deployed operational target or production readiness is claimed from this local verification. The client build and local process start/stop are the only passed checks in this report.
