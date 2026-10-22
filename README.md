# Collaborative Study Material & Quiz Platform – Team 17

Web app for sharing study material, building a question bank, taking auto-graded quizzes and tracking performance.
Stack (SAD 3.6): **MongoDB · Express · React · Node.js**.

Project documents: `SRS-Team17.docx`, `SAD_Team17.docx`, `STP_Team17.docx`.

## Folder structure

```
server/                 Express API (SAD 4.1 layers)
  src/
    routes/             URL -> middleware -> controller   (routes/index.js mounts every module)
    controllers/        thin: read request, call service, send response
    services/           business rules from the SRS
    models/             Mongoose models (the only code that touches MongoDB)
    validators/         express-validator rules
    middleware/         authenticate, requireRole, validate, errorHandler
    utils/AppError.js   throw this for any expected error
    config/             db connection, role names
  tests/                Jest + Supertest (helpers/ has an in-memory DB and test tokens)
client/                 React (Vite)
  src/
    pages/              one component per screen
    components/         shared UI (Navbar, ProtectedRoute, FieldError)
    api/                Axios calls (client.js adds the token automatically)
    context/            AuthContext – useAuth() gives { user, login, logout }
.github/workflows/ci.yml  runs server tests + client build on every PR
```

## Run it locally

Needs Node.js 20+ and MongoDB running locally.

```bash
# 1. API
cd server
npm install
cp .env.example .env          # then edit JWT_SECRET
npm run dev                   # http://localhost:5050/api/health

# 2. Web app (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173
```

## Tests

```bash
cd server && npm test
```
Tests use an in-memory MongoDB, so they don't touch your local database. The first run downloads it (~100 MB).

## API documentation

See [`docs/API.md`](docs/API.md) for the implemented API endpoint, request validation rules, authorization requirements, and standardized error responses.

## Team

| Member | Area | Issues |
|---|---|---|
| Pulla Jagadeeshwar Reddy | Accounts, Materials | #4 – #12 |
| Alifiya Sadikot | Question Bank & Quizzes | #13 – #21 |
| Pushkar Kulkarni | Performance, Collaboration, Integration | #22 – #32 |

See **CONTRIBUTING.md** for how we work (branches, PRs, API conventions).

## Continuous Integration (CI)

GitHub Actions runs the workflow defined in `.github/workflows/ci.yml`.

### Automated checks

For pull requests targeting `main`, CI runs these jobs independently:

- **Server tests** � installs server dependencies with `npm ci` and runs `npm test`.
- **Client build** � installs client dependencies with `npm ci` and runs `npm run build`.

The workflow also runs when commits are pushed directly to `main`.

### Checking a workflow result

1. Open the pull request on GitHub.
2. Review the **Server tests** and **Client build** checks.
3. Both checks should pass before merging.
4. If a check fails, open its details in the Actions logs, identify the failing step, fix the issue, and push a new commit.

A passing CI run confirms that the configured tests and build completed successfully; it does not guarantee that every requirement or behavior has been tested.

### Environment variables and secrets

For local server configuration, copy `server/.env.example` to `server/.env` and fill in the required values for your environment.

- `PORT` configures the server port.
- `MONGO_URI` specifies the MongoDB connection string.
- `JWT_SECRET` is used for JWT signing and must be kept private.
- `CLIENT_ORIGIN` specifies the permitted client origin.

Never commit `.env` files containing real credentials, tokens, or secrets. Keep sensitive values out of source code and logs. If future CI checks require secrets, configure them through the repository's GitHub Actions secrets settings rather than hard-coding them in the workflow.

### Required checks and branch protection

Repository administrators should configure branch protection or a ruleset for `main` to require the **Server tests** and **Client build** status checks before merging pull requests, if supported by the repository's permissions and settings.
