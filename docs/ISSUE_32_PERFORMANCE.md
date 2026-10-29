# Issue #32 — Performance verification

**Verification date:** 2026-10-29 (Asia/Calcutta)  
**Issue:** Open; no open pull request was listed when GitHub was queried.  
**Branch/base:** `test/issue-32-performance-verification`, based on refreshed `origin/main` at `c0e5b22`.  
**Build:** `c0e5b22` plus the changes on this branch (record branch commit SHA when executing a deployed run).  
**Result:** No target is marked Passed. The local MongoDB test service failed before the benchmark ran, and no approved deployed performance environment was available.

## Requirements and original STP mapping

| Requirement ID and target | STP case | Method in this repository | Status / evidence |
|---|---|---|---|
| **NFR-PERF-01:** at least 95% of page loads complete within 3 seconds with 200 concurrent users | TC-AP-01 | `server/scripts/read-load-check.js` supplies repeatable 200-client parallel HTTP GET timing; it does not render a browser page | **Not Executed** against an approved 200-user deployment. HTTP runner is supplementary only; genuine page load/browser paint remains unmeasured. |
| **NFR-PERF-02:** support 200 concurrent users with fewer than 1% of requests failing | TC-AP-02 | Same runner captures 200 parallel requests per wave, status counts, failure rate, throughput, and response percentiles | **Not Executed** against an approved deployed environment. |
| **NFR-PERF-03:** sharing and revocation effective within 2 seconds of owner confirmation | TC-MP-03 | `server/tests/materials.access-download.test.js` measures from owner API confirmation response to recipient read succeeding/being denied | **Not Executed**; targeted Jest startup blocked by mongod failure. The test is local Supertest against in-memory MongoDB, not a deployment result. |
| **NFR-PERF-04:** grading/results within 2 seconds for up to 50 questions, including 100 simultaneous submissions | TC-QP-01 | Reuse Issue #21 infrastructure in `server/tests/quiz.security-performance.issue21.test.js`; output now records latency percentiles, failure rate, throughput, batch time, concurrency and data volume | **Not Executed** on rerun; mongod failed before fixture setup. The 100 Supertest calls in one process are not production-scale proof. |
| **NFR-PERF-05:** question-bank search/filter within 2 seconds for up to 1,000 questions | TC-QP-02 | `server/tests/questions.search.test.js` seeds 1,000 questions and now repeats the combined query ten times, recording min/p95/max | **Not Executed** in this environment; mongod failed before test setup. In-memory timing would be local-only even if available. |
| **NFR-PERF-06:** quiz questions display within 3 seconds after Student starts | TC-QP-03 | Issue #21 test measures the 50-question attempt-start API response for 100 local test users and asserts the 3-second limit | **Not Executed** on rerun. API response timing is only a proxy; browser rendering/display is not measured. |

The mappings above were checked against the original STP Rev 1.2 Appendix A and traceability section. NFR-PERF-04 is coordinated with the existing #21 quiz test rather than duplicating its quiz fixture/answering/grading workflow. NFR-SAFE-01/02/03 and backup/restore procedures remain with Issue #11; see [Issue #11 verification](ISSUE_11_31_32_VERIFICATION.md#issue-11--backup-restoration-and-material-integrity). Operational startup dependencies are tracked in [Issue #38 operational readiness](OPERATIONAL_READINESS.md).

## Existing implementation and instrumentation

- The latest main includes merged PR #95, which extended the Issue #21 test with TC-QP-03 attempt-start response timing and logs for question loads, grading response maximum, 100-request launch window, and slow submission count.
- This branch improves that same test to emit machine-readable JSON in Jest output with the runtime/platform, in-memory database and single-process Supertest model, 100-user concurrency, 50 questions, successful/failed response count, failure rate, requests/second, launch/batch duration, p50/p95/min/max response latency, and >2-second response count.
- TC-QP-02 now repeats the 1,000-question combined keyword/topic/difficulty search ten times and reports min, p95, and max. The 2-second assertion applies to every measured run.
- TC-MP-03 now measures share confirmation to first authorized recipient read, and revoke confirmation to first denied recipient read. The test preserves the existing access and download assertions.
- `server/scripts/read-load-check.js` is a dependency-free HTTP load runner for an approved isolated target. It creates 200 concurrent GET calls per wave, supports one distinct bearer token per virtual user via a caller-owned JSON file, separates warm-up from measured rounds, and reports timestamps, latency percentiles, 3-second response share, status counts, failure rate, throughput, concurrency, runtime, and dataset description. It only issues GETs. It refuses a remote target unless `PERF_ALLOW_REMOTE_TARGET=true` is explicitly set. Token data is never printed or written to results.
- Remote load targets must use HTTPS; only loopback HTTP is accepted. `PERF_RESULTS_FILE` is created exclusively and will not overwrite an existing artifact.

### Load-runner procedure

Use only an isolated deployment authorized for load testing. Generate 200 test accounts and a private JSON array of their bearer tokens if the selected path requires authentication. Do not check that token file into Git. Select a GET endpoint or frontend root URL, record the target build SHA, database topology, host/network specifications, data volumes, and warm-up policy, then run:

```powershell
$env:PERF_BASE_URL = 'https://<approved-test-host>'
$env:PERF_REQUEST_PATH = '/api/quizzes/available'
$env:PERF_USER_TOKENS_FILE = '<private-path-to-200-test-token-json>'
$env:PERF_WARMUP_ROUNDS = '1'
$env:PERF_MEASURED_ROUNDS = '5'
$env:PERF_DATASET_DESCRIPTION = '200 test accounts; describe quiz/material dataset'
$env:PERF_ALLOW_REMOTE_TARGET = 'true'
$env:PERF_RESULTS_FILE = 'artifacts/issue-32-load-results.json'
node server/scripts/read-load-check.js
```

Run once per representative page/API path and retain the output JSON. Clear the environment variables from the shell after use. The runner enforces 200 callers but remains one load-generator process/host. A distributed generator and real browser automation are needed to make deployment and rendered-page claims. Do not interpret the response-share field as browser page-load compliance. Never point this script at production; it can generate 1,200 GET requests per default run (200 users × 6 rounds).

## Executions and current environment

| Command / inspection | Actual result | Interpretation |
|---|---|---|
| `git fetch origin main` | Fetched successfully; `origin/main` resolved to `c0e5b22` | Branch base is refreshed. |
| GitHub REST: issues 11, 31, 32, 38; all open issues and PRs | All four requested issues Open; no open PRs. Open issue #49 is outside this work. PR #94 (shared verification report) merged; PR #95 (Issue #21 final verification) merged. | Current state on 2026-10-29; refresh before merge. |
| `node --version`; `npm --version` | `v22.19.0`; `11.10.0` | Local toolchain record. |
| `npm test -- --cacheDirectory .jest-cache --runTestsByPath tests/quiz.security-performance.issue21.test.js --runInBand` | **Failed before benchmark setup.** `mongodb-memory-server` mongod exited with internal `fassert()`; `beforeAll(startDB)` failed; the one benchmark test did not execute. | Issue #21 evidence was explicitly rerun per request; no timing result from this run. |
| `npm test -- --cacheDirectory .jest-cache --runTestsByPath tests/questions.search.test.js tests/materials.access-download.test.js tests/quiz.security-performance.issue21.test.js` | **3 suites failed; 30 tests failed before meaningful assertions** because the same mongod `fassert()` prevented `beforeAll(startDB)` from connecting. Jest also reported follow-on cleanup errors because no DB connection was established. | The modified search, share/revoke, checksum/download, and grading tests remain unexecuted. |
| `node --check` on `server/scripts/read-load-check.js` and modified Jest files; `git diff --check` | Passed (syntax/whitespace checks only) | Does not exercise HTTP requests or performance targets. |
| 200-client deployed load | No approved deployed endpoint, distinct test-user token fixture, separate load-generator host, or target host/database specification was available | **Not Executed**; see prerequisites above. |
| Browser page-load timing | No integrated browser test environment and no measured desktop/mobile browser session available | **Not Executed**. The Node runner is not a browser. |

## Defects and dependencies

No performance target is reported as Failed because no target-level measurement completed. No target is reported as Passed. The following blockers are actionable dependencies:

1. **PERF-ENV-01 — deployed performance environment:** provide an isolated integrated target, 200 generated test accounts, 200 tokens where required, realistic data, a separate load generator, and the target build/database/host/network details. Then execute TC-AP-01 and TC-AP-02; use browser instrumentation for actual page-load timing.
2. **PERF-ENV-02 — local Jest database startup:** resolve the `mongodb-memory-server` mongod `fassert()` failure. Rerun TC-MP-03, TC-QP-01, TC-QP-02 and the related Issue #21 test to obtain local functional/timing output; classify those measurements as local-only.
3. **PERF-ENV-03 — sharing test accounts/deployment:** provide isolated owner and recipient accounts/material and repeat the owner-confirmation-to-access/revocation timing test against the integrated deployment.
4. **PERF-ENV-04 — quiz browser instrumentation:** measure the time from Student start action through rendered 50-question view in a real browser against the integrated target; retain screenshots/trace and browser/build details.

There is no measured defect threshold failure to file at this time. If any future measurement breaches its exact target, log a reproducible defect linked to Issue #32 and the relevant NFR ID, preserving the failed run evidence.
