# Local Development Setup

This guide explains how to install, configure, run, and test the Collaborative Study Material & Quiz Platform.

## 1. Prerequisites

Install the following software:

- **Git** — to clone the repository.
- **Node.js 20 or later** — includes npm.
- **MongoDB** — a local MongoDB server or a reachable MongoDB deployment.

Verify the Node.js and npm installations:

```powershell
node --version
npm --version
```

The server requires a reachable MongoDB instance to start successfully.

## 2. Clone the repository

```powershell
git clone https://github.com/SE-MiniProject-Team17/SE_MiniProject_Team17.git
cd SE_MiniProject_Team17
```

If you already have a local checkout, change to the repository directory instead.

## 3. Install dependencies

Run these commands from the repository root:

```powershell
npm --prefix server ci
npm --prefix client ci
```

The `ci` command installs dependencies from each application's lockfile.

## 4. Configure the server environment

Create a local environment file from the example.

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

Open `server/.env` and set values appropriate for your environment.

| Variable | Purpose | Example or default |
|---|---|---|
| `PORT` | Server listening port | `5050` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/csmqp` |
| `JWT_SECRET` | Secret used to sign and verify JWTs | Replace the example with a long, random secret |
| `CLIENT_ORIGIN` | Allowed browser client origin | `http://localhost:5173` |

The values in `.env.example` are examples, not production credentials. Keep real secrets in `.env` and never commit them. The repository's `.gitignore` excludes `.env` files while allowing `.env.example`.

Ensure MongoDB is running and reachable through the configured `MONGO_URI` before starting the server.

## 5. Start the application

Open two terminals from the repository root.

**Terminal 1 — Server**

```powershell
npm --prefix server run dev
```

The server defaults to port `5050`. The health endpoint is expected at:

`http://localhost:5050/api/health`

**Terminal 2 — Client**

```powershell
npm --prefix client run dev
```

Vite normally serves the client at:

`http://localhost:5173`

If you change the client origin or development port, make sure `CLIENT_ORIGIN` matches the origin from which the browser loads the client.

## 6. Run checks

**Server tests**

```powershell
npm --prefix server test
```

The server test suite uses Jest and Supertest with an in-memory MongoDB setup. The test helper may download the MongoDB binary on the first run, so initial execution can take longer and may require network access.

**Client production build**

```powershell
npm --prefix client run build
```

A successful build produces the client production assets in `client/dist/`.

## 7. Troubleshooting

### Server reports a missing `JWT_SECRET`

Check that `server/.env` exists and contains a non-empty `JWT_SECRET`. Restart the server after changing environment variables.

### MongoDB connection fails

Confirm that MongoDB is running, that `MONGO_URI` is correct, and that the database host and port are reachable. For a local MongoDB instance, check that the service is running on `127.0.0.1:27017`.

### The client cannot reach the API

Check that the server is running on the configured port and that `CLIENT_ORIGIN` matches the browser client's origin. Restart the server after updating the environment file.

### A port is already in use

Stop the other process using the port or configure an available server port through `PORT`. If the client uses a different origin, update `CLIENT_ORIGIN` accordingly.

### Dependency installation fails

Verify that Node.js 20 or later and npm are installed. Retry the relevant `npm ci` command from the repository root and review the error output. If the lockfile was changed, ensure the corresponding package manifest and lockfile are committed together.

### Server tests fail on first run

The in-memory MongoDB test helper may need to download its MongoDB binary. Check network access and the test output for details. Do not point tests at a production database.

### Client build fails

Run `npm --prefix client ci` and then `npm --prefix client run build`. Review the first build error and fix the reported source or dependency issue.

## 8. Security reminders

- Never commit `server/.env` or other files containing real credentials.
- Use a strong, randomly generated `JWT_SECRET` for local development.
- Do not use development secrets in production.
- Keep `.env.example` limited to variable names and safe example values.
- Review test and application logs before sharing them to ensure they contain no credentials.