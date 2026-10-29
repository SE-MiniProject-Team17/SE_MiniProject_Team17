# Issues #11, #31, and #32 verification record

**As of:** 2026-10-29 (Asia/Calcutta)  
**Source baseline:** SRS Rev 1.2 draft and STP Rev 1.2 in `docs/`  
**Checkout:** `test/issue-21-quiz-security-performance`, HEAD `10b2ad2` (merge PR #92); checkout contains six commits ahead of `origin/test/issue-21-quiz-security-performance`.  
**Overall result:** No SRS target in this record is marked Passed. GitHub issue state, PR state, and the complete live backlog could not be queried from this environment; see repository status below.

## Source mappings confirmed in the original STP

| Workstream | Exact SRS IDs | Exact STP cases |
|---|---|---|
| #32 performance | NFR-PERF-01, NFR-PERF-02 | TC-AP-01, TC-AP-02 |
| #32 material sharing/revocation | NFR-PERF-03 | TC-MP-03 |
| #32 grading | NFR-PERF-04 | TC-QP-01 |
| #32 question-bank search | NFR-PERF-05 | TC-QP-02 |
| #32 quiz question display | NFR-PERF-06 | TC-QP-03 |
| #31 usability | NFR-QUAL-01 | TC-AN-04 |
| #31 robustness | NFR-QUAL-03 | TC-AN-05 |
| #31 browser/device compatibility | NFR-QUAL-04, DC-05 | TC-AN-06 |
| #11 backup/restore | NFR-SAFE-01 | TC-AN-01 |
| #11 interrupted material operations | NFR-SAFE-02 | TC-AN-02 |
| #11 checksum integrity | NFR-SAFE-03 | TC-AN-03 |

TC-AN-02 additionally shares TC-AN-17 in the STP traceability section. TC-AN-17 is not substituted for the three requested Issue #11 cases.

## Execution environment and evidence

- Targeted command: `npm test -- --cacheDirectory .jest-cache --runTestsByPath tests/questions.search.test.js tests/quiz.security-performance.issue21.test.js tests/materials.upload.test.js tests/materials.edit-removal.test.js tests/materials.access-download.test.js` (run from `server/`).
- Result: **Not Executed** for the underlying checks. Five suites failed during `beforeAll` because the `mongodb-memory-server` mongod process exited with an internal `fassert()` error. Consequently, 51 tests did not reach meaningful assertions. The initial retry without a workspace cache also encountered an `EPERM` while Jest wrote its temp transform cache; using `.jest-cache` avoided that first obstacle but not the mongod failure.
- The selected tests use Supertest and an in-memory MongoDB. Even if they pass, they are functional/local checks and cannot establish deployed workload targets of 200 concurrent users or 100 simultaneous submissions.
- No deployed integration environment, separate load-generator host, JMeter plan, monitored backup service, isolated restore environment, or device/browser test matrix was found in the repository. `server/.env` exists; its contents were not read. No credential values are included here.

## Issue #32 — performance results

The source suite contains a 1,000-question search timing assertion (`server/tests/questions.search.test.js`) and an Issue #21 quiz submission benchmark (`server/tests/quiz.security-performance.issue21.test.js`). The latter creates a 50-question quiz and launches 100 Supertest requests via `Promise.all`; it measures request latency and launch window but runs inside one test process against the local app and in-memory database. Neither suite has produced measurements in this run because mongod could not start. The test code also does not persist a full environment/throughput/failure-rate report artifact.

| Requirement / STP case | Test present | Target | Result | Evidence / blocker |
|---|---|---|---|---|
| NFR-PERF-01 / TC-AP-01 | No 200-user page-load load plan found | ≥95% page loads ≤3 s at 200 concurrent users | **Not Executed** | No JMeter plan, separate load generator, deployment endpoint, or generated-user fixture. |
| NFR-PERF-02 / TC-AP-02 | No 200-user failure-rate load plan found | <1% failed requests at 200 concurrent users | **Not Executed** | Same missing dependencies as TC-AP-01. |
| NFR-PERF-03 / TC-MP-03 | Functional share/revoke tests exist | Both effective ≤2 s after owner confirmation | **Not Executed** | Existing tests assert access behavior, not measured confirmation-to-effect latency; targeted suite blocked before execution. Requires deployed shared test environment and timestamped repeated runs. |
| NFR-PERF-04 / TC-QP-01 | Issue #21 100-submission test exists | Result available ≤2 s for 50 questions and 100 simultaneous submissions | **Not Executed** | Existing in-process Supertest benchmark is not representative of independent deployed clients/load generators. It did not execute. Requires isolated deployed performance environment, 100 concurrent clients, synchronized workload, and per-request result capture. |
| NFR-PERF-05 / TC-QP-02 | 1,000 seeded questions and search timing assertion exist | Search/filter ≤2 s for up to 1,000 questions | **Not Executed** | Uses in-memory MongoDB; run failed before assertions. Requires real target-like MongoDB and repeated captured timings to support deployment claim. |
| NFR-PERF-06 / TC-QP-03 | No quiz-start display timing test found | Questions displayed ≤3 s after Student starts | **Not Executed** | No browser measurement or deployed endpoint test; needs instrumented browser run against deployed environment. |

**Test gap:** Current repeatable test coverage can be extended after the performance environment is available, but its local/in-memory timing must remain explicitly labelled local and cannot be used as proof of NFR-PERF-01/02/04. The benchmark should emit machine-readable per-request latency, throughput, failures, concurrency, dataset size, app/build SHA, database topology, host specs, and run timestamps. Do not compare an unexecuted or mock result to the SRS threshold as a pass.

## Issue #31 — usability, robustness, and compatibility

| Requirement / STP case | Existing supporting tests | Result | Evidence / blocker |
|---|---|---|---|
| NFR-QUAL-01 / TC-AN-04 | Registration/login/upload functional tests exist | **Not Executed** | No first-time participants or timed manual usability session were available. Need three first-time users without instructions as specified by STP; record elapsed time, completion, errors, and observations. Automated tests/build cannot replace this. |
| NFR-QUAL-03 / TC-AN-05 | Upload tests include unsupported type, malformed file signature, invalid metadata and a simulated DB-write failure; authorization tests exist | **Not Executed** | Targeted suite was blocked by mongod startup. No running integrated server was available to verify process survival, active second-user session, failed operation behavior, and prior-state preservation. |
| NFR-QUAL-04 / DC-05 / TC-AN-06 | Responsive layout styles/components exist; no browser/device evidence found | **Not Executed** | Current browser versions and devices were not available as a verified test matrix. Need Chrome, Firefox, Edge, Safari on desktop and mobile, with versions/platforms, result and screenshot for register/login/upload/download. A frontend build alone is not compatibility evidence. |

**Robustness observations:** Existing unit/integration test source covers a subset of invalid uploads and metadata; it does not establish all TC-AN-05 steps (malformed JSON on registration/login/material endpoints, service remains up, another user's session remains usable, and safe prior-state behavior for actual interrupted network operations). Existing material edit/removal tests cover invalid metadata and successful removal; no controlled mid-operation network interruption test was found. No defects were confirmed because the relevant tests did not execute. These are unverified requirements, not passed checks.

## Issue #11 — backup, restoration, and material integrity

| Requirement / STP case | Existing supporting tests/configuration | Result | Evidence / blocker |
|---|---|---|---|
| NFR-SAFE-01 / TC-AN-01 | No backup schedule, backup artifact manifest, retention policy, or restore procedure found in repository files | **Not Executed** | No isolated approved restore environment or timestamped ≤24-hour backup was available. Need an owner-operated daily backup that includes MongoDB user/material records and file storage, timestamp/retention evidence, plus isolated restore credentials/environment and source-state comparison. Config file presence alone would not verify this. |
| NFR-SAFE-02 / TC-AN-02 | Unit tests simulate a material DB write failure and check cleanup; no true interrupted upload/update/removal test found | **Not Executed** | Test suites did not start. Need controllable network/proxy interruption in isolated test deployment, and verification of no success response, no partial state, and preservation of prior metadata/file after upload, replacement, and removal failures. |
| NFR-SAFE-03 / TC-AN-03 | Upload test checks persisted bytes and SHA-256; download test source compares download checksum with upload checksum | **Not Executed** | Targeted suite did not start. Need executed upload/share/download cycles and recorded original/downloaded SHA-256 for PDF, DOCX, PPTX, PNG in isolated storage. |

**Storage architecture inspected:** `Material` documents retain metadata, storage path, and SHA-256 checksum in MongoDB. `materialService` defaults file content to `server/uploads/materials` (or `MATERIAL_STORAGE_DIR` when set). The repository contains no scheduled backup configuration or evidence that MongoDB and the filesystem are backed up and restored as one consistent set. This is a repository inspection finding, not a claim about external hosting configuration.

## GitHub, branch, pull-request, and backlog status

Local Git refs show the Issue #21 test branch and its remote tracking branch. The current checkout has six commits ahead of `origin/test/issue-21-quiz-security-performance`; the ancestry includes merge commits for PR #93 and PR #92, and `origin/main` points to `10b2ad2`. This proves only local Git ancestry, not current GitHub issue/PR state. No dedicated local or remote-tracking branch named for Issues #11, #31, #32, or #38 was present in the refs inspected. The repository has other feature branches (including #14, #15, #16, #19, #25, #26, #28, #35, #36, #39, #40, #42, #43, #44, #46, and #49), so the five named issues are not the complete backlog.

Live GitHub issue state, acceptance criteria/comments, open/closed PRs, current CI state, and the full outstanding issue list remain **Not Verified**: no authenticated GitHub connector/CLI was available, and direct GitHub issue page retrieval was unavailable. Before changing issue states, opening/closing PRs, or declaring work complete, refresh these facts using an authorized GitHub connection. This is also required to establish whether #11/#38 and #21/#32 already have linked work that should be reused.

## Defect and follow-up tracking

No product defect is reported as confirmed from this run because the integration suites did not execute. The verified blockers are environment/evidence gaps:

1. Performance verification blocked: provide a deployed, production-like isolated target; JMeter plan and separate load generator; generated users and 1,000-question dataset; and captured run artifacts.
2. Backup/restore verification blocked: provide an isolated restore environment, daily backup job and timestamped backup ≤24 hours old covering MongoDB plus material files, retention documentation, and restore operator access.
3. Manual quality verification blocked: provide the integrated app, three first-time participants, desktop/mobile device matrix with current four browsers, and evidence capture.
4. Local integration test execution blocked: resolve the `mongodb-memory-server` mongod `fassert()` startup failure in this sandbox/test runtime, then rerun targeted suites. Do not treat the resulting local tests as load-test evidence.
5. GitHub traceability blocked: refresh issue/PR/backlog state through an authenticated GitHub integration and link any resulting defect/PR to its exact SRS requirement and issue.

Until these dependencies are met, affected checks remain **Not Executed**, not Pass or Fail. No target-level defect is declared from absent measurements.
