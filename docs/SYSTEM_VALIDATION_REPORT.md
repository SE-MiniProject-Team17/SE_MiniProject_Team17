# System Validation Report
## SE Mini Project — Team 17
**Project:** Collaborative Study Material & Quiz Platform  
**Report date:** 7 November 2026  
**Specification baseline:** SRS Revision 1.2; STP Revision 1.2  
**Test environment represented:** Local Windows development environment; Node.js v22.19.0; npm 11.10.0; Jest 29.7.0; Supertest; in-memory MongoDB

---

## 1. Objective

This report records the available system-validation evidence for the Collaborative Study Material & Quiz Platform and evaluates it against the strategy and exit criteria in the Software Test Plan (STP), Revision 1.2.

The report distinguishes:
- automated test execution results;
- behaviours for which test source and execution evidence are available;
- non-functional, manual, operational, and deployment-dependent checks that have not been established by the local automated run;
- outstanding decisions and evidence gaps.

A test being present in the repository, or a requirement being mapped to a test case in the STP, is not sufficient to mark that requirement as passed.

## 2. Validation environment and build identification

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
| Repository branch associated with current report work | `docs/sprint-3-test-reports` |
| Documentation commit | `f1b7de0` |
| Tested application commit SHA | Not independently recorded in the available execution summary |

The local tests exercise the Express application through the test setup. They do not constitute validation of a deployed production stack, production MongoDB configuration, production file storage, Nginx/TLS configuration, or real user browsers.

## 3. Overall automated execution result

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

The execution result is limited to the tests and assertions included in that run. It must not be interpreted as proof that all STP test cases, manual acceptance scenarios, or environment-dependent tests were completed.

## 4. System feature validation summary

The following summary is based on the checked-in test inventory, the test files reviewed, and the recorded successful automated execution. “Automated tests passed” refers to the overall Jest run; it does not mean every possible requirement behaviour or every STP test case has been individually certified.

| Feature area | Available automated evidence | Validation disposition |
|---|---|---|
| Account registration and authentication | Registration validation, allowed roles, password hashing, generic invalid-credential responses, failed-login lockout/reset | Automated coverage present; tested assertions passed in the recorded suite |
| Profile and session management | Profile read/update, user-ID tampering protection, picture validation, session timeout and logout | Automated coverage present; tested assertions passed |
| Material upload and validation | PDF/PNG upload, metadata checks, unsupported/malformed file rejection, MIME/extension checks, size limit, checksum and failure cleanup | Automated coverage present; tested assertions passed |
| Material access and sharing | Owner/shared-recipient access, revoked access, missing file/material, checksum mismatch, share/revoke/reactivate, non-owner restrictions | Automated coverage present; tested assertions passed |
| Material update and removal | Metadata/file replacement, ownership checks, deletion, cleanup and rollback scenarios | Automated coverage present; tested assertions passed |
| Question bank | Create, validate, search/filter, edit, remove, ownership and role restrictions | Automated coverage present; tested assertions passed |
| Quiz authoring and publishing | Draft creation/edit, validation limits, publishing, immutable question snapshots, deletion and ownership | Automated coverage present; tested assertions passed |
| Quiz attempts and grading | Attempt initiation, answer handling, deadline enforcement, server-side grading, submission, answer-key protection | Automated coverage present; tested assertions passed |
| Performance analytics | Student history, topic aggregation, Faculty summaries and role restrictions | Automated coverage present; tested assertions passed |
| Study groups and collaboration | Group creation/joining, duplicate membership, listing, role restrictions and moderation | Automated coverage present; tested assertions passed |
| Cross-module access control | Authentication, role restrictions, ownership checks and protected/unavailable resource responses | Automated coverage present; tested assertions passed |

The table is a feature-level summary. The authoritative requirement-level mapping remains the STP Annex C and its related open-decision/traceability records. Do not infer that every requirement in a feature area is fully covered merely because that area has passing tests.

## 5. Coverage results

The companion reports record the following backend source coverage:

| Metric | Result |
|---|---:|
| Statement coverage | 88.41% |
| Line coverage | 89.11% |
| Function coverage | 91.36% |
| Branch coverage | 76.86% |

Coverage scope: `server/src/**/*.js`.

The coverage results indicate that the automated suite exercised a substantial portion of the backend source, but uncovered statements and branches remain. In particular, the coverage reports identify lower branch coverage in selected controllers and services, and identify `src/server.js`, `src/config/db.js`, and `src/validators/groupValidators.js` as unexecuted source files.

Coverage is a code-execution metric. It is not a substitute for requirement-level pass/fail evidence or system acceptance.

## 6. Non-functional and operational validation

The STP requires measurable non-functional targets to be reported against their thresholds with evidence. The existing issue-specific reports identify the following distinctions.

| Area | Evidence available | System-validation disposition |
|---|---|---|
| Performance targets NFR-PERF-01 to NFR-PERF-06 | Local instrumentation and performance test reports exist for selected API/search/quiz/share scenarios; some local timings are reported as partial verification | Not established as deployed-system acceptance. The reports explicitly distinguish local single-process/in-memory measurements from the specified deployed workload and browser targets. |
| NFR-SAFE-01 backup and restoration | Repository/configuration inspection recorded; no scheduled backup artifact and isolated restore evidence identified | Not executed / not demonstrated |
| NFR-SAFE-02 failure preservation | Jest fault-injection tests cover selected database/storage failure and rollback cases | Partially verified for tested in-process failures; not proof of real process crash or network interruption recovery |
| NFR-SAFE-03 file integrity | Upload/download byte and SHA-256 comparisons are present in material tests | Passed for the tested local storage cases; not a production storage/backup claim |
| NFR-QUAL-01 usability | No evidence of the STP-required three first-time participants completing the workflow unaided within five minutes | Not executed |
| NFR-QUAL-03 robustness | Automated malformed-input and failure-handling tests exist; the exact manual/system scenarios in the STP are not all established by these tests | Partially verified; manual integrated checks remain |
| NFR-QUAL-04 compatibility | No complete executed desktop/mobile browser and device matrix with retained evidence identified | Not executed |
| NFR-QUAL-02 availability | No complete monthly production availability observation record identified | Not demonstrated |
| NFR-QUAL-05 modularity | Architecture/source organization can be inspected; this is not a runtime acceptance test | Inspection evidence only; confirm the STP's required review record |
| NFR-QUAL-06 traceability | `ISSUE_29_TRACEABILITY_AUDIT.md` records structural traceability findings, including unresolved mappings and partial/blocked rows | Partially complete; the audit itself does not establish all requirements as verified |

For exact performance measurements, local-run conditions, and limitations, refer to `ISSUE_32_PERFORMANCE.md`. For backup/integrity evidence, refer to `ISSUE_11_BACKUP_INTEGRITY.md`. For usability/compatibility and robustness findings, refer to `ISSUE_31_QUALITY_COMPATIBILITY.md`. These issue reports retain their own run dates, branches, and scopes; their results must not be combined as if they came from one execution.

## 7. Security validation

Automated tests exercise important security controls, including:
- authentication requirements for protected endpoints;
- role-based restrictions for Student, Faculty, and Admin;
- ownership checks for quizzes, questions, and materials;
- generic invalid-credential responses and account lockout behaviour;
- session expiry and logout invalidation;
- protection of quiz answer keys before submission;
- restriction of a Student's access to another Student's attempt/results;
- material-sharing authorization and revocation;
- protection against selected user-ID and ownership fields supplied by clients;
- controlled error responses that avoid exposing protected details.

The existing `SECURITY_VERIFICATION_REPORT.md` records automated results and explicitly leaves production TLS verification pending. Local Jest tests do not prove that the deployed service enforces TLS 1.2 or later.

**Security disposition:** Important application-level controls have automated test evidence. Do not mark all security requirements passed until the requirement-to-test mapping is reviewed and deployment-dependent controls, including TLS, have evidence.

## 8. Open validation gaps and decisions

The following items remain outside the proof supplied by the 29-suite/349-test local run or are explicitly identified as outstanding in the existing reports:

1. **Production/deployed performance:** execute the relevant STP performance cases against an approved isolated deployment with the specified workload, separate load generation where required, and recorded build/environment details.
2. **Browser display timing:** measure actual browser rendering/display for quiz start; API response time alone is not the full UI requirement.
3. **Usability:** conduct the STP session with three first-time participants, without instructions, and retain anonymized timings and observations.
4. **Compatibility:** execute and record the required desktop and mobile browser/device combinations, including browser/OS versions and screenshots.
5. **Backup and restore:** demonstrate a dated backup and successful restore in an isolated environment, including coordinated MongoDB records and material files.
6. **TLS:** verify the deployed endpoint's TLS configuration; local tests are not evidence of transport configuration.
7. **Application startup/readiness:** validate startup, database connectivity, health/readiness and shutdown against an available isolated database/deployment.
8. **Requirement traceability:** resolve or explicitly retain the open/partial/blocked requirement mappings identified in `ISSUE_29_TRACEABILITY_AUDIT.md` and the STP open-decision register.
9. **Build identity:** attach the exact application commit SHA used for the 7 November automated run. Do not substitute the documentation commit SHA.

These are validation gaps or environment dependencies, not automatically confirmed product defects.

## 9. STP entry and exit criteria assessment

The STP Revision 1.2 defines entry and exit criteria, including an identified build, test fixtures, reviewed test cases, execution of Ready tests, disposition of blocked tests, no open Critical/High defects, requirement-level evidence, and explicit reporting of NFR-PERF-01 to NFR-PERF-06.

| STP criterion | Assessment from currently available evidence |
|---|---|
| Automated backend regression execution | Satisfied for the recorded 29-suite/349-test run |
| Coverage reports generated | Satisfied; code and branch coverage reports exist |
| Exact tested application build SHA recorded | Not established in available run summary |
| All Ready STP tests executed | Not established by the aggregate Jest total alone |
| Blocked tests resolved or listed with decisions | Open-decision/traceability records exist; final disposition must be confirmed against the STP register |
| No Critical/High defects open | Not established by the supplied execution summary; verify GitHub issue status before sign-off |
| Every non-blocked requirement has a Passed test with evidence | Not established for all requirements; requirement-level traceability remains necessary |
| NFR-PERF-01 to NFR-PERF-06 reported against target | Reports exist, but deployed-system targets remain not executed or partially verified as described above |
| Deviations documented | Existing issue-specific reports document several limitations; consolidate any remaining deviations in the final test summary |

**Overall STP exit assessment: Not fully demonstrated by the available evidence.** The automated backend regression and coverage-report activities are complete, but the evidence does not establish that every STP exit criterion has been met. Any final academic submission should state the remaining limitations honestly rather than declare complete system acceptance.

## 10. Evidence references

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
- `docs/STP_Team17_Rev1_2.docx` — test strategy, test inventory, traceability, entry/exit criteria and open decisions.
- `server/tests/` — automated test source files.

## 11. Conclusion

The recorded local automated backend regression completed successfully with 29 test suites and 349 tests passed, and the backend achieved 88.41% statement, 89.11% line, 91.36% function, and 76.86% branch coverage.

The available evidence supports successful execution of a broad set of automated backend functional and security checks. It does not establish full system acceptance across all STP requirements. Production performance, usability, browser/device compatibility, backup/restore, deployed TLS, startup/readiness, exact build identity, and final requirement-level exit criteria remain to be evidenced or explicitly carried as limitations.

**Final disposition:** Automated backend regression — Passed. Overall system validation against the complete STP Rev 1.2 — Partially verified; full exit criteria not yet demonstrated.
