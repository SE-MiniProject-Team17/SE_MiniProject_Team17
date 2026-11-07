# Unit Test Report
## SE Mini Project — Team 17
**Project:** Collaborative Study Material & Quiz Platform  
**Report date:** 7 November 2026  
**Test framework:** Jest 29.7.0  
**Backend runtime:** Node.js v22.19.0  
**Package manager:** npm 11.10.0  
**Test scope:** Backend automated test suite (`server/tests`)  
**Execution environment:** Windows local development environment using the test helper's in-memory MongoDB and Supertest

---

## 1. Objective

This report records the automated backend test execution for the Team 17 Collaborative Study Material & Quiz Platform. It summarizes the execution result, test scope, principal areas exercised, and limitations against the Software Test Plan (STP), Revision 1.2.

The Deliverables Part-3 specification requests a Unit Test Report. The repository's automated backend suite uses Jest and includes substantial API-level tests implemented with Supertest and an in-memory MongoDB. Accordingly, this report preserves the requested deliverable title while accurately describing the executed tests as a mixture of service/logic checks and API integration tests. It does not relabel API tests as isolated unit tests.

## 2. Test environment and execution

| Item | Recorded value |
|---|---|
| Operating environment | Windows local development environment |
| Node.js | v22.19.0 |
| npm | 11.10.0 |
| Test framework | Jest 29.7.0 |
| HTTP/API test client | Supertest |
| Database used by tests | In-memory MongoDB through the test helper |
| Test data | Test fixtures/accounts created by the test suites |
| Production database | Not used |
| Test execution date | 7 November 2026 |
| Command | `npm --prefix server test -- --coverage --collectCoverageFrom="src/**/*.js"` |
| Repository branch recorded with the reports | `docs/sprint-3-test-reports` |
| Tested application commit SHA | Not independently recorded in the available execution summary; the documentation commit `f1b7de0` must not be treated as the tested application SHA without verification |

The command above ran the backend Jest suite with coverage collection enabled.

## 3. Execution summary

**Execution result: Passed**

| Metric | Result |
|---|---:|
| Test suites passed | 29 |
| Test suites failed | 0 |
| Tests passed | 349 |
| Tests failed | 0 |
| Snapshots | 0 |
| Execution time | 166.11 seconds |

**Overall automated execution result:** 29 of 29 suites passed; 349 of 349 tests passed; no failed tests were reported.

This result applies to the recorded local automated execution. It is not evidence that every test case in the STP, every manual acceptance scenario, or every deployment-dependent test was executed.

## 4. Test scope and coverage areas

The checked-in test inventory and the test files reviewed for this report show automated tests in the following areas:

| Test area | Examples of behaviours exercised |
|---|---|
| Account registration and authentication | Registration validation, email normalization, role restrictions, password hashing, generic login errors, failed-login lockout and reset |
| Account profile and sessions | Profile viewing/updating, protection against client-selected user IDs, profile-picture validation, session expiry and logout |
| Material upload and validation | PDF/PNG upload, metadata validation, unsupported or malformed files, extension/MIME mismatch, 25 MiB limit, checksum calculation |
| Material access and integrity | Owner and shared-recipient access, unauthorized access, missing files, checksum mismatch, revoked sharing access |
| Material sharing and management | Share/revoke/reactivate flows, owner restrictions, metadata/file replacement, deletion and failure recovery |
| Question bank | Question creation, field and option validation, search/filter/pagination, ownership, editing and removal |
| Quiz authoring | Draft creation/editing, validation boundaries, publishing, question snapshots, deletion and ownership |
| Quiz execution and grading | Attempt creation, answer saving, deadline handling, submission, server-side grading, answer-key protection and result access |
| Performance analytics | Student history, topic-level aggregation, Faculty summaries and role restrictions |
| Study groups and collaboration | Group creation, joining, duplicate membership, membership listing and moderation |
| Cross-module/security behaviour | Authentication requirements, role-based access, unavailable-resource responses and protected data |

Representative test files include `auth.test.js`, `login.test.js`, `account.profile.test.js`, `session.test.js`, `materials.upload.test.js`, `materials.access-download.test.js`, `materials.edit-removal.test.js`, `materials.sharing.test.js`, `questions.create.test.js`, `questions.search.test.js`, `quizzes.test.js`, `quizzes.access.test.js`, `studentQuizAttempts.test.js`, `performance.test.js`, `groups.create.test.js`, `groups.join.test.js`, and `moderation.test.js`.

The repository inventory is a list of test declarations and test-file locations. It is useful for identifying test scope, but the inventory by itself is not execution evidence; the execution totals in Section 3 are taken from the recorded Jest run.

## 5. Relationship to the STP unit-test candidates

STP Revision 1.2 identifies 28 unit-test candidates across Account, Collaboration, Material, Performance Analytics, and Quiz areas. The current implementation tests exercise many of the corresponding behaviours through API and service integration paths.

However, the provisional helper/function names in the STP are not all implemented as standalone pure functions. In several areas, validation and business rules are embedded in controllers, middleware, services, or database-backed operations. Therefore:

- A matching API test is evidence that the exercised behaviour was tested at the API/integration level.
- It must not automatically be described as an isolated unit test of the provisional function named in the STP.
- The presence of a test ID or test file does not prove that every input boundary and branch in the candidate has been exercised.
- The detailed requirement-to-test disposition remains governed by the STP traceability matrix and the separate System Validation Report.

## 6. Test result interpretation

The automated suite provides positive evidence for the behaviours asserted by its 349 passing tests. In particular, it exercises authentication and authorization, material storage and integrity, question/quiz workflows, attempt handling, and collaboration endpoints.

A passing assertion establishes only the expected behaviour checked by that test under its test conditions. It does not establish:

- correctness for untested inputs or branches;
- operation against the production database, production file store, or deployed infrastructure;
- real browser rendering or cross-browser/mobile compatibility;
- the usability outcome of tests requiring first-time human participants;
- production TLS configuration, scheduled backup execution, or a completed restore;
- production-scale performance or availability.

## 7. Known limitations and follow-up

1. **Coverage is not complete.** The companion Code Coverage and Branch Coverage Reports record 88.41% statement coverage, 89.11% line coverage, 91.36% function coverage, and 76.86% branch coverage.
2. **Startup/database configuration is outside this test setup.** The coverage report identifies `src/server.js` and `src/config/db.js` as unexecuted because tests import the Express app directly and use an in-memory database.
3. **Unused group validator file.** `src/validators/groupValidators.js` is not connected to the group creation route; validation is performed in `groupService.createGroup()`.
4. **Not all STP unit candidates are isolated unit tests.** Some corresponding behaviours are covered through API-level integration tests; the test-level distinction should be retained in traceability records.
5. **Manual and deployment-dependent tests remain separate.** Refer to the System Validation Report for tests that require a deployed environment, browser/device matrix, participants, or operational infrastructure.
6. **Build identity.** The application commit SHA used for the 7 November execution was not independently recorded in the available run summary. The report commit `f1b7de0` is a documentation commit and must not be substituted for the tested application SHA.

## 8. Conclusion

The recorded backend automated test execution completed successfully: all 29 Jest suites and all 349 tests passed in 166.11 seconds. The suite provides broad automated coverage of the platform's principal backend workflows and access controls.

This result is an automated backend test result, primarily based on Jest/Supertest tests using an in-memory database. It is not, by itself, proof that all 28 STP unit-test candidates were independently executed as isolated unit tests or that all system-validation, acceptance, non-functional, and deployment-dependent requirements have passed. Those statuses are reported separately in `SYSTEM_VALIDATION_REPORT.md`.
