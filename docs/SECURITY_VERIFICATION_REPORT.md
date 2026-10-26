# Issue #10 — Account and Material Security Verification Report

## 1. Purpose

Record automated test results and outstanding verification work for account and material security controls.

## 2. Automated Test Results

**Execution date:** 2026-10-26
**Command:** `npm.cmd --prefix server test`
**Result:** PASS

- Test suites passed: 21
- Test suites failed: 0
- Tests passed: 262
- Tests failed: 0
- Duration: 53.977 seconds

These results apply to the code and branch tested at the time of execution.

## 3. Security Verification Matrix

| Security requirement | Evidence | Status |
|---|---|---|
| Unauthenticated protected access is denied | Existing tests assert HTTP 401 for protected resources | Automated coverage present |
| Invalid credentials do not reveal which credential was incorrect | `server/tests/login.test.js` compares unknown-email and wrong-password responses | Automated coverage present |
| Passwords are stored as bcrypt hashes and excluded from responses | `server/tests/auth.test.js` checks hash verification and excludes password fields from registration responses | Automated coverage present; distinct hashes for the same password and successful bcrypt verification are tested |
| Logout and session expiry invalidate access | `server/tests/session.test.js` checks expired sessions and reuse of a logged-out token | Automated coverage present |
| Users cannot modify another user's account | `server/tests/account.profile.test.js` checks rejection of client-supplied user IDs and verifies the other account remains unchanged | Automated coverage present |
| Non-owners cannot access, share, update or remove materials | Material access, sharing and edit/removal tests include unauthorized-user cases | Automated coverage present |
| Revoked recipients lose material access on subsequent requests | `server/tests/materials.access-download.test.js` checks view and download denial after revocation | Automated coverage present |
| Production communication uses TLS 1.2 or later | No deployment-level TLS verification was performed during this test run | PENDING |

## 4. Relevant Test Files

- `server/tests/auth.test.js` ? includes a unique-salt test for identical passwords
- `server/tests/login.test.js`
- `server/tests/session.test.js`
- `server/tests/account.profile.test.js`
- `server/tests/materials.access-download.test.js`
- `server/tests/materials.sharing.test.js`
- `server/tests/materials.edit-removal.test.js`
- `server/tests/materials.upload.test.js`

## 5. Outstanding Work

2. Unexpected-error logging now records the error type rather than the complete error object. Other logging paths and production logs still require review.
3. Complete any missing assertions for account and material security requirements.
4. Verify the deployed HTTPS endpoint negotiates TLS 1.2 or later.
5. Record the environment, commands, results and any defects discovered during verification.

## 6. Limitations

A passing automated test suite demonstrates the behavior exercised by those tests; it does not prove that every security requirement is satisfied.

TLS has not been marked as passed because local Jest tests do not establish the TLS configuration of a production deployment.

## 7. Overall Status

**PARTIALLY VERIFIED — further checks are required.**

The server test suite passed, but the outstanding work above must be completed before all Issue #10 security requirements can be declared verified.
