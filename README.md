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
