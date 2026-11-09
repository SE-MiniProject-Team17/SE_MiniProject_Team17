# System Validation Report

## SE Mini Project — Team 17

**Project:** Collaborative Study Material & Quiz Platform  
**Team:** 17  
**Report date:** 7 November 2026  
**Specification baseline:** SRS Revision 1.2; STP Revision 1.3  
**Test environment represented:** Local Windows development environment; Node.js v22.19.0; npm 11.10.0; Jest 29.7.0; Supertest; in-memory MongoDB.

---

## 1. Objective

This report records the available system-validation evidence for the Collaborative Study Material & Quiz Platform and evaluates it against the strategy and exit criteria in the Software Test Plan (STP), Revision 1.3.

The report distinguishes:

- Automated test execution results.
- Behaviours for which test source and execution evidence are available.
- Individual STP test cases that are partially verified or not executed.
- Non-functional, manual, operational and deployment-dependent checks that have not been established by the local automated run.
- Outstanding decisions and evidence gaps.

A test being present in the repository, or a requirement being mapped to a test case in the STP, is not sufficient to mark that requirement as passed.

The execution status of each STP test case must be supported by its specified steps, expected results and corresponding evidence. Aggregate automated test results are not a substitute for individual test-case verification.

## 2. Validation Environment and Build Identification

| Item | Recorded information |
|---|---|
| Execution date represented by the coverage run | 7 November 2026 |
| Operating environment | Windows local development environment |
| Node.js | v22.19.0 |
| npm | 11.10.0 |
| Backend test framework | Jest 29.7.0 |
| API test client | Supertest |
| Database | In-memory MongoDB test setup |
| Test data | Isolated test accounts and fixtures created by test suites |
| Production deployment | Not represented by this local test environment |
| Repository branch associated with report work | `docs/sprint-3-test-reports` |
| Documentation commit | `f1b7de0` |
| Tested application commit SHA | Not independently recorded in the available execution summary |

The local tests exercise the Express application through the test setup. They do not constitute validation of a deployed production stack, production MongoDB configuration, production file storage, Nginx/TLS configuration or real user browsers.

The documentation commit SHA identifies the documentation revision and must not be interpreted as the application commit SHA used during test execution.

## 3. Overall Automated Execution Result

| Metric | Result |
|---|---:|
| Jest suites passed | 29 |
| Jest suites failed | 0 |
| Tests passed | 349 |
| Tests failed | 0 |
| Execution time | 166.11 seconds |

**Automated backend regression result: Passed.**

Command recorded in the Code Coverage and Branch Coverage Reports:

```cmd
npm --prefix server test -- --coverage --collectCoverageFrom="src/**/*.js"
```

The execution result is limited to the tests and assertions included in that run.

It must not be interpreted as proof that all STP test cases, manual acceptance scenarios or environment-dependent tests were completed.

The 349 passing tests represent the automated test execution total. They are not 349 individually verified STP test cases.

## 4. System Feature Validation Summary

The following summary is based on the checked-in test inventory, the test files reviewed and the recorded successful automated execution.

"Automated tests passed" refers to the overall Jest run. It does not mean every possible requirement behaviour or every STP test case has been individually certified.

| Feature area | Available automated evidence | Validation disposition |
|---|---|---|
| Account registration and authentication | Registration validation, allowed roles, password hashing, generic invalid-credential responses, failed-login lockout/reset | Automated coverage present; tested assertions passed in the recorded suite |
| Profile and session management | Profile read/update, user-ID tampering protection, picture validation, session timeout and logout | Automated coverage present; tested assertions passed |
| Material upload and validation | PDF/PNG upload, metadata checks, unsupported/malformed file rejection, MIME/extension checks, size limit, checksum and failure cleanup | Automated coverage present; tested assertions passed; complete file-format verification remains outstanding |
| Material access and sharing | Owner/shared-recipient access, revoked access, missing file/material, checksum mismatch, share/revoke/reactivate, non-owner restrictions | Automated coverage present; tested assertions passed |
| Material update and removal | Metadata/file replacement, ownership checks, deletion, cleanup and rollback scenarios | Automated coverage present; tested assertions passed |
| Question bank | Create, validate, search/filter, edit, remove, ownership and role restrictions | Automated coverage present; tested assertions passed |
| Quiz authoring and publishing | Draft creation/edit, validation limits, publishing, immutable question snapshots, deletion and ownership | Automated coverage present; tested assertions passed |
| Quiz attempts and grading | Attempt initiation, answer handling, deadline enforcement, server-side grading, submission, answer-key protection | Automated coverage present; tested assertions passed |
| Performance analytics | Student history, topic aggregation, Faculty summaries and role restrictions | Automated coverage present; tested assertions passed |
| Study groups and collaboration | Group creation/joining, duplicate membership, listing, role restrictions and moderation | Automated coverage present; tested assertions passed |
| Cross-module access control | Authentication, role restrictions, ownership checks and protected/unavailable resource responses | Automated coverage present; tested assertions passed |

The table is a feature-level summary. The authoritative requirement-level mapping remains the STP Revision 1.3 traceability matrix and its related open-decision records.

Do not infer that every requirement in a feature area is fully covered merely because that area has passing tests.

## 5. Coverage Results

The companion reports record the following backend source coverage:

| Metric | Result |
|---|---:|
| Statement coverage | 88.41% |
| Line coverage | 89.11% |
| Function coverage | 91.36% |
| Branch coverage | 76.86% |

Coverage scope: `server/src/**/*.js`.

The coverage results indicate that the automated suite exercised a substantial portion of the backend source, but uncovered statements and branches remain.

In particular, the coverage reports identify lower branch coverage in selected controllers and services, and identify the following as unexecuted source files:

- `src/server.js`
- `src/config/db.js`
- `src/validators/groupValidators.js`

Coverage is a code-execution metric. It is not a substitute for requirement-level pass/fail evidence or system acceptance.

## 6. Non-Functional and Operational Validation

The STP requires measurable non-functional targets to be reported against their thresholds with evidence.

The existing issue-specific reports identify the following distinctions.

| Area | Evidence available | System-validation disposition |
|---|---|---|
| Performance targets NFR-PERF-01 to NFR-PERF-06 | Local instrumentation and performance test reports exist for selected API/search/quiz/share scenarios; some local timings are reported as partial verification | Not established as deployed-system acceptance. The reports distinguish local single-process/in-memory measurements from the specified deployed workload and browser targets. |
| NFR-SAFE-01 backup and restoration | Repository/configuration inspection recorded; no scheduled backup artifact and isolated restore evidence identified | Not Executed / Not Demonstrated |
| NFR-SAFE-02 failure preservation | Jest fault-injection tests cover selected database/storage failure and rollback cases | Partially Verified for tested in-process failures; not proof of real process crash or network interruption recovery |
| NFR-SAFE-03 file integrity | Upload/download byte and SHA-256 comparisons are present in material tests | Partially Verified; PDF and PNG evidence is available, while DOCX and PPTX verification remains outstanding |
| NFR-QUAL-01 usability | No evidence of the STP-required three first-time participants completing the workflow unaided within five minutes | Not Executed |
| NFR-QUAL-03 robustness | Automated malformed-input and failure-handling tests exist; the exact manual/system scenarios in the STP are not all established by these tests | Partially Verified; manual integrated checks remain |
| NFR-QUAL-04 compatibility | No complete executed desktop/mobile browser and device matrix with retained evidence identified | Not Executed |
| NFR-QUAL-02 availability | No complete monthly production availability observation record identified | Not Demonstrated |
| NFR-QUAL-05 modularity | Architecture/source organization can be inspected; this is not a runtime acceptance test | Inspection evidence only; confirm the STP's required review record |
| NFR-QUAL-06 traceability | `ISSUE_29_TRACEABILITY_AUDIT.md` records structural traceability findings, including unresolved mappings and partial/blocked rows | Partially complete; the audit itself does not establish all requirements as verified |

For exact performance measurements, local-run conditions and limitations, refer to `ISSUE_32_PERFORMANCE.md`.

For backup/integrity evidence, refer to `ISSUE_11_BACKUP_INTEGRITY.md`.

For usability/compatibility and robustness findings, refer to `ISSUE_31_QUALITY_COMPATIBILITY.md`.

These issue reports retain their own run dates, branches and scopes. Their results must not be combined as if they came from one execution.

## 7. Security Validation

Automated tests exercise important security controls, including:

- Authentication requirements for protected endpoints.
- Role-based restrictions for Student, Faculty and Admin.
- Ownership checks for quizzes, questions and materials.
- Generic invalid-credential responses and account lockout behaviour.
- Session expiry and logout invalidation.
- Protection of quiz answer keys before submission.
- Restriction of a Student's access to another Student's attempt/results.
- Material-sharing authorization and revocation.
- Protection against selected user-ID and ownership fields supplied by clients.
- Controlled error responses that avoid exposing protected details.

The existing `SECURITY_VERIFICATION_REPORT.md` records automated results and explicitly leaves production TLS verification pending.

Local Jest tests do not prove that the deployed service enforces TLS 1.2 or later.

**Security disposition:** Important application-level controls have automated test evidence. Do not mark all security requirements passed until the requirement-to-test mapping is reviewed and deployment-dependent controls, including TLS, have evidence.

## 8. STP Test-Case Execution Status

The following execution classifications are based on the available test reports and supporting evidence reviewed against STP Revision 1.3.

The STP inventory contains 160 test cases and 28 unit-test candidates, giving 188 tracked test items.

The current item-level audit identifies:

| Execution classification | Number of items |
|---|---:|
| Partially Verified | 7 |
| Not Executed | 181 |
| Total | 188 |

These figures represent the current evidence classification. They do not mean that the 181 items failed. They indicate that sufficient individual execution evidence has not been established for those items.

### 8.1 Partially Verified Test Cases

| STP Test Case ID | Requirement / Area | Execution status | Available evidence and remaining limitation |
|---|---|---|---|
| TC-AN-02 | NFR-SAFE-02 — Interrupted material operations | Partially Verified | Automated robustness and fault-injection evidence exists. Complete real interruption and recovery scenarios remain unverified. |
| TC-AN-03 | NFR-SAFE-03 — File integrity | Partially Verified | PDF and PNG checksum evidence exists. DOCX and PPTX verification remains outstanding. |
| TC-AN-05 | NFR-QUAL-03 — Robustness | Partially Verified | Automated malformed-input and robustness checks exist. Complete system-stability and concurrent-user impact verification remains outstanding. |
| TC-MP-03 | NFR-PERF-03 — Material sharing and revocation | Partially Verified | Local timing evidence exists. Deployed-environment verification remains outstanding. |
| TC-QP-01 | NFR-PERF-04 — Grading performance | Partially Verified | Local timing evidence exists. The specified deployed concurrent-submission scenario remains unverified. |
| TC-QP-02 | NFR-PERF-05 — Question-bank search | Partially Verified | Local search timing evidence exists. Deployed-environment verification remains outstanding. |
| TC-QP-03 | NFR-PERF-06 — Quiz question availability | Partially Verified | Local API timing evidence exists. Browser-rendered question availability remains unverified. |

### 8.2 Not Executed Test Cases

The following cases are specifically identified as not executed in the available evidence:

| STP Test Case ID | Requirement / Area | Status | Reason |
|---|---|---|---|
| TC-AN-01 | NFR-SAFE-01 — Backup and recovery | Not Executed | No verified backup-and-restore execution evidence is available. |
| TC-AN-04 | NFR-QUAL-01 — Usability | Not Executed | No documented first-time-user usability session with three participants. |
| TC-AN-06 | NFR-QUAL-04 — Compatibility | Not Executed | No complete browser and device compatibility execution evidence. |
| TC-AP-01 | NFR-PERF-01 — Page-load performance | Not Executed | Deployed 200-user performance scenario not established. |
| TC-AP-02 | NFR-PERF-02 — Concurrent-user request reliability | Not Executed | Deployed 200-user failed-request scenario not established. |
| TC-AS-06 | SEC-COM-01 — TLS transport security | Not Executed | Deployed TLS 1.2 or higher verification remains pending. |

Other test cases and unit-test candidates remain Not Executed unless their individual execution and expected-result evidence can be established.

### 8.3 Acceptance Scenarios

Acceptance scenarios AT-01 to AT-08 require their own execution records and acceptance evidence.

The available automated backend test summary does not establish that the acceptance walkthroughs were completed or signed off.

They must therefore remain Not Executed until the required walkthrough and evidence are recorded.

### 8.4 Interpretation of Test Status

- **Passed:** The specified test steps and expected results have been verified, with supporting evidence.
- **Partially Verified:** Some relevant evidence exists, but one or more specified behaviours, conditions or acceptance criteria remain unverified.
- **Not Executed:** No sufficient execution evidence is available.
- **Blocked:** Execution or a reliable expected result depends on an unresolved decision or dependency.
- **Not Directly Testable:** The item requires inspection, documentation review or another non-execution verification method.

A successful aggregate Jest run does not automatically change an individual STP test-case status to Passed.

## 9. Open Validation Gaps and Decisions

The following items remain outside the proof supplied by the 29-suite/349-test local run or are explicitly identified as outstanding in the existing reports:

1. **Production/deployed performance:** Execute the relevant STP performance cases against an approved isolated deployment with the specified workload, separate load generation where required, and recorded build/environment details.

2. **Browser display timing:** Measure actual browser rendering/display for quiz start; API response time alone is not the full UI requirement.

3. **Usability:** Conduct the STP session with three first-time participants, without instructions, and retain anonymized timings and observations.

4. **Compatibility:** Execute and record the required desktop and mobile browser/device combinations, including browser/OS versions and screenshots.

5. **Backup and restore:** Demonstrate a dated backup and successful restore in an isolated environment, including coordinated MongoDB records and material files.

6. **TLS:** Verify the deployed endpoint's TLS configuration; local tests are not evidence of transport configuration.

7. **Application startup/readiness:** Validate startup, database connectivity, health/readiness and shutdown against an available isolated database/deployment.

8. **Requirement traceability:** Resolve or explicitly retain the open/partial/blocked requirement mappings identified in `ISSUE_29_TRACEABILITY_AUDIT.md` and the STP open-decision register.

9. **Build identity:** Attach the exact application commit SHA used for the 7 November automated run. Do not substitute the documentation commit SHA.

These are validation gaps or environment dependencies, not automatically confirmed product defects.

## 10. STP Entry and Exit Criteria Assessment

STP Revision 1.3 defines the entry and exit criteria for test execution and validation.

The available evidence is assessed below.

| STP criterion | Assessment from currently available evidence |
|---|---|
| Automated backend regression execution | Satisfied for the recorded 29-suite/349-test run |
| Coverage reports generated | Satisfied; code and branch coverage reports exist |
| Exact tested application build SHA recorded | Not established in available run summary |
| All Ready STP tests executed | Not established by the aggregate Jest total alone |
| Blocked tests resolved or listed with decisions | Open-decision/traceability records exist; final disposition must be confirmed against the STP register |
| No Critical/High defects open | Not established by the supplied execution summary; verify GitHub issue status before sign-off |
| Every non-blocked requirement has a Passed test with evidence | Not established for all requirements; requirement-level traceability remains necessary |
| NFR-PERF-01 to NFR-PERF-06 reported against target | Reports exist, but deployed-system targets remain Not Executed or Partially Verified as described above |
| Deviations documented | Existing issue-specific reports document several limitations; consolidate any remaining deviations in the final test summary |

**Overall STP exit assessment: Not fully demonstrated by the available evidence.**

The automated backend regression and coverage-report activities are complete, but the evidence does not establish that every STP exit criterion has been met.

Any final academic submission should state the remaining limitations honestly rather than declare complete system acceptance.

## 11. Evidence References

The following repository artifacts support this report:

- `docs/UNIT_TEST_REPORT.md` — automated backend test execution summary.
- `docs/CODE_COVERAGE_REPORT.md` — statement, line and function coverage.
- `docs/BRANCH_COVERAGE_REPORT.md` — branch coverage and uncovered paths.
- `docs/SECURITY_VERIFICATION_REPORT.md` — account/material security checks and TLS limitation.
- `docs/ISSUE_11_BACKUP_INTEGRITY.md` — backup, failure preservation and file integrity evidence.
- `docs/ISSUE_31_QUALITY_COMPATIBILITY.md` — robustness, usability and browser/device compatibility evidence.
- `docs/ISSUE_32_PERFORMANCE.md` — local performance measurements and deployment limitations.
- `docs/ISSUE_29_TRACEABILITY_AUDIT.md` — requirement-to-test structural audit and outstanding traceability work.
- `docs/OPERATIONAL_READINESS.md` — startup, database, health and operational readiness findings.
- `docs/STP_Team17_Rev1_3.docx` — test strategy, test inventory, traceability, entry/exit criteria and open decisions.
- `server/tests/` — automated test source files.

## 12. Conclusion

The recorded local automated backend regression completed successfully with 29 test suites and 349 tests passed.

The backend achieved:

- 88.41% statement coverage.
- 89.11% line coverage.
- 91.36% function coverage.
- 76.86% branch coverage.

The available evidence supports successful execution of a broad set of automated backend functional and security checks.

It does not establish full system acceptance across all STP Revision 1.3 requirements.

Production performance, usability, browser/device compatibility, backup/restore, deployed TLS, startup/readiness, exact build identity and final requirement-level exit criteria remain to be evidenced or explicitly carried as limitations.

**Final disposition:**

- **Automated backend regression:** Passed.
- **Backend code coverage reports:** Generated.
- **Individual STP test-case verification:** Partially verified; substantial execution evidence remains outstanding.
- **Overall system validation against STP Revision 1.3:** Partially Verified.
- **Full STP exit criteria:** Not yet demonstrated.

