# Issue #31 — Usability, robustness, and browser compatibility

**Verification date:** 2026-10-29 (Asia/Calcutta)  
**Issue:** Open; no open pull request was listed when GitHub was queried.  
**Branch/base:** `test/issue-31-quality-compatibility`, based on refreshed `origin/main` at `c0e5b22`.  
**Result:** The local automated robustness checks passed. The manual usability test and integrated browser/device checks were not executed.

## Requirements and exact STP mappings

| SRS requirement | Exact STP case | Verification method | Status |
|---|---|---|---|
| **NFR-QUAL-01:** “A first-time user shall be able to register, log in and upload material within 5 minutes without instructions.” | TC-AN-04 | Three first-time users perform the full workflow unaided; record elapsed time, completion, errors and observations per user | **Not Executed** |
| **NFR-QUAL-03:** “The application must handle invalid inputs and failures robustly.” | TC-AN-05 | Invalid fields, malformed JSON, unsupported files, failed operations, unauthorized requests; verify safe errors, process/session continuity, and unchanged prior data | **Partially Verified (local automated checks passed; deployed interruption/session checks remain)** |
| **NFR-QUAL-04:** “The application must support current Chrome, Firefox, Edge and Safari on desktop and mobile.” | TC-AN-06; DC-05 | Register, log in, upload, and download on desktop and mobile in all four browsers; record versions and evidence | **Not Executed** |

The TC-AN mappings were confirmed in STP Rev 1.2 Appendix A and the traceability section. No new STP case IDs were introduced.

## Implementation and existing test coverage

- Registration validation is covered in `server/tests/auth.test.js` (missing fields, invalid/duplicate email, disallowed Admin registration, and safe response data).
- Login failure behavior is covered in `server/tests/login.test.js` (invalid credentials, lockout, reset, and generic errors).
- Upload validation is covered in `server/tests/materials.upload.test.js` (unsupported types, bad signatures, extension mismatch, zero/oversized data and invalid metadata). It also simulates a database write failure and checks that no record/file is left and no success is returned.
- `server/tests/materials.edit-removal.test.js` checks invalid update metadata leaves the prior title unchanged and unauthorized edit/removal preserves prior state.
- `server/tests/materials.access-download.test.js` covers unauthorized and unavailable access; checksum comparisons are in the upload/download tests.
- This branch extends `server/tests/base.test.js` to send malformed JSON to registration, login and materials endpoints, assert a generic 400 validation response without echoing the request body, and then check the health route still responds in the same process.

The successful local run is evidence for the exercised automated paths, not all of TC-AN-05. It does not emulate a real interrupted client connection or prove that a deployed process remains healthy with another active user's session. It also does not replace TC-AN-04 or TC-AN-06. Backup/restore and prior-state behavior for interrupted material operations remain under [Issue #11](ISSUE_11_31_32_VERIFICATION.md#issue-11--backup-restoration-and-material-integrity); deployment startup dependencies are in [Issue #38](OPERATIONAL_READINESS.md).

## Environment and browser availability

- Verification host: Windows desktop; Node.js `v22.19.0`; npm `11.10.0`.
- Browser executable inspection found installed desktop binaries: Chrome `156.0.8078.48`, Edge `156.0.4314.50`, and Firefox `147.0.4`. These are installed versions; their “current” status was not independently verified.
- Safari was not installed on this Windows host. No mobile device or mobile browser/emulator was available. No Playwright, Puppeteer, Selenium, Cypress, or WebDriver harness is present in the client/server package manifests.
- The frontend production build passed on this baseline in the Issue #38 check. A temporary in-memory MongoDB became available for Jest when the run was granted loopback permission; this is not a deployed integrated browser environment. The client dev server reached Vite's “ready” message, but the sandbox blocked the loopback HTTP check. Thus, an integrated browser workflow was not available for compatibility testing.
- No real first-time participants were available. No elapsed times or screenshots are fabricated or inferred from automated tests.

## Execution record

| Check | Command / procedure | Actual result | Status | Evidence / next action |
|---|---|---|---|---|
| Local automated robustness and regression checks | From `server/`: `npm test -- --cacheDirectory .jest-cache --runTestsByPath tests/base.test.js tests/auth.test.js tests/login.test.js tests/materials.upload.test.js tests/materials.edit-removal.test.js tests/materials.access-download.test.js tests/questions.search.test.js tests/quiz.security-performance.issue21.test.js` (with loopback permission for temporary mongod) | **8 suites passed; 84 tests passed; 70.38 s.** Covered malformed JSON, auth/login validation, unsupported and malformed uploads, simulated persistence failure, update/authorization state preservation, downloads/checksums, search, and quiz regression. | **Passed (local functional checks)** | In-memory MongoDB and Supertest. Does not prove real network interruption, second-user session continuity in a deployment, or production performance. Initial sandbox-restricted run failed with `EACCES` binding mongod's loopback port; authorized retry succeeded. |
| First-time-user usability | Three participants, no instructions, timed registration → login → upload with a test file | No suitable integrated deployment or first-time participants available | **Not Executed** | Schedule TC-AN-04 in an approved test environment; record each participant as U1/U2/U3 without personal details. |
| Desktop browser compatibility | TC-AN-06 workflow in current Chrome, Firefox, Edge and Safari | Browser binaries were inventoried, but integrated app workflow could not run; Safari is absent | **Not Executed** | Provide a running integrated test target; test Chrome/Firefox/Edge and arrange Safari on macOS. Capture version, platform, result, errors and screenshot for each. |
| Mobile browser compatibility | TC-AN-06 workflow on mobile devices | No mobile devices/emulators available | **Not Executed** | Provide real supported mobile devices or approved device lab and test account/data. |
| Production frontend build | `npm run build` from `client/` | Vite build succeeded (114 modules; output `client/dist/`) in the Issue #38 run | **Passed (build only)** | Build is not browser/device compatibility or usability evidence. |

## Reproducible manual procedures

### TC-AN-04 first-time usability

Use three people who have never used the application. Give each a clean browser profile and a test file, but no walkthrough, written instructions, or hints. Start timing when the person begins registration and stop only when the upload success is visible. Record elapsed time, completion within five minutes, validation/errors, hesitation or abandonment, and observer notes. Do not record names, email addresses, passwords, or other personal data. A participant counts as meeting the case only if the complete workflow succeeds unaided within five minutes.

| Participant | Browser/version and device | Start/end time | Elapsed | Register/login/upload completed? | Errors/usability observations | Result |
|---|---|---|---:|---|---|---|
| U1 | Not executed | — | — | — | — | Not Executed |
| U2 | Not executed | — | — | — | — | Not Executed |
| U3 | Not executed | — | — | — | — | Not Executed |

### TC-AN-06 browser/device compatibility

For each supported browser/device combination, start with a clean test account, register, log in, upload a valid supported file, then download it. Retain browser version, OS/device or emulator details, build SHA, step results, console/network errors, and screenshots with user data removed. Do not mark a browser combination passed based on a build or a different browser.

| Browser | Version observed | Desktop result | Mobile result | Evidence |
|---|---|---|---|---|
| Chrome | `156.0.8078.48` installed; currentness unverified | Not Executed — no integrated app | Not Executed — no mobile device | None |
| Firefox | `147.0.4` installed; currentness unverified | Not Executed — no integrated app | Not Executed — no mobile device | None |
| Edge | `156.0.4314.50` installed; currentness unverified | Not Executed — no integrated app | Not Executed — no mobile device | None |
| Safari | Not installed on this host | Not Executed | Not Executed | None; needs macOS/iOS device |

## Defects and follow-up

No product behavior defect is declared from an unexecuted test. Verified environment gaps are:

1. **QUAL-ENV-01:** Provide an integrated test deployment with working MongoDB and test accounts. Automated suites now pass when the sandbox grants loopback access to temporary mongod; the unprivileged `EACCES` run is an execution-environment restriction.
2. **QUAL-ENV-02:** Provide three first-time participants and a test material for TC-AN-04; retain anonymized timing and observation data.
3. **QUAL-ENV-03:** Provide current desktop Chrome/Firefox/Edge/Safari environments and mobile devices or an approved device lab for TC-AN-06. Safari requires macOS/iOS; this host has no Safari binary.
4. **QUAL-ENV-04:** Add an approved browser automation environment if repeatable cross-browser regression is desired; no browser automation dependency is present today.

If future test runs reveal reproducible failures, record the browser/step, expected and actual behavior, evidence, and link the defect to Issue #31 and NFR-QUAL-03 or NFR-QUAL-04 as applicable. Automated tests supplement, but do not close, the manual usability or real browser checks.
