# API Documentation — Team 17

## 1. Base URL

The API is served under `/api`.

## 2. Question Creation

### `POST /api/questions`

Creates a question in the question bank.

**Authorization:** Bearer token required. Only users with the `Faculty` role may create questions.

### Request body

Content type: `application/json`

| Field | Required | Validation |
|---|---|---|
| `text` | Yes | String; trimmed and non-empty; maximum 500 characters |
| `options` | Yes | Array containing exactly four different, non-empty string answers; each answer has a maximum of 200 characters |
| `correctOption` | Yes | Must be one of `A`, `B`, `C`, or `D` |
| `topic` | Yes | String; trimmed and non-empty; maximum 50 characters |
| `difficulty` | Yes | Must be `Easy`, `Medium`, or `Hard` |
| `explanation` | No | String when provided; maximum 300 characters; may be omitted or `null` |

The server determines the question owner from the authenticated user. A client-supplied `owner` field does not override the authenticated user's identity.

### Successful response

**Status:** `201 Created`

The response contains the created question's identifier, owner identifier, and creation timestamp.

### Validation error response

**Status:** `400 Bad Request`

Validation errors use the common error structure:

    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Topic must be at most 50 characters",
        "field": "topic"
      }
    }

The message and field depend on the validation rule that failed. The validation middleware runs before the controller, preventing invalid requests from being persisted.

### Authorization errors

- `401 Unauthorized` — authentication is missing or invalid.
- `403 Forbidden` — the authenticated user does not have the required Faculty role.

### Other error responses

| Status | Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Malformed JSON or invalid request data |
| `404` | `NOT_FOUND` | Unknown route or unavailable item |
| `429` | `RATE_LIMITED` | API rate limit exceeded when rate limiting is enabled |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

Error responses avoid exposing stack traces or internal implementation details to API clients.

## 3. Validation and Error Handling

- Request validation uses `express-validator`.
- NoSQL-style input sanitization is applied through `express-mongo-sanitize`.
- The central error handler formats application errors consistently.
- Mongoose validation errors and invalid database identifiers receive controlled error responses.
- Unexpected errors are logged server-side outside the test environment and return a generic client-facing message.

## 4. Test Evidence

The question-creation tests cover valid creation, missing fields, field-length boundaries, option rules, invalid values, role restrictions, and rejection without persistence. Base API tests cover health checks, unknown routes, malformed JSON, security headers, and standardized error handling.

Run the server test suite from the `server` directory:

    npm test

## 5. Material update and file replacement

### `PATCH /api/materials/:id`

Updates material metadata for its owner. The request may use `application/json` for metadata-only updates or `multipart/form-data` to replace the file using the `file` field. Replacement files follow the same PDF, DOCX, PPTX, PNG type/content validation and 25 MiB limit as material uploads. Metadata and the replacement file are validated before the record is saved. The response includes the resulting file name, type, size and SHA-256 checksum; the storage path is never returned.

A failed replacement persistence returns an error and retains the prior record and stored file. After a successful record update, removal of the superseded file is cleanup; a cleanup error does not turn the committed replacement into a failure response.
