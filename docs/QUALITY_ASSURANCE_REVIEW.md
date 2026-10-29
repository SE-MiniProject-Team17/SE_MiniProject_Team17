

\# Issue #30 — Availability, Modularity and Requirement Traceability Review



\*\*Review status:\*\* In progress — evidence and follow-up required  

\*\*Requirement baseline:\*\* SRS Revision 1.2 and STP Revision 1.2  

\*\*Related audit:\*\* \[Issue #29 Traceability Audit](ISSUE\_29\_TRACEABILITY\_AUDIT.md)  

\*\*Related report:\*\* \[Security Verification Report](SECURITY\_VERIFICATION\_REPORT.md)



\## 1. Purpose and scope



This review addresses:



\- \*\*NFR-QUAL-02:\*\* The system shall achieve 99% availability per month, excluding announced maintenance.

\- \*\*NFR-QUAL-05:\*\* The system shall be modular.

\- \*\*NFR-QUAL-06:\*\* Requirement IDs must be traceable to their tests.



The review examines the available project documentation, source-code organization as described by the README, CI configuration, test setup, and existing traceability audit.



This is a documentation and verification review. It does not establish production availability, prove that every module boundary is effective, or certify every requirement as verified.



\## 2. Executive summary



| Area | Finding | Status |

|---|---|---|

| Monthly availability | CI validates tests and builds, but the reviewed evidence does not include production uptime observations. | Not demonstrated |

| Modularity | The documented architecture separates frontend and backend responsibilities and describes backend layers. | Partially reviewed |

| Requirement traceability | The existing Issue #29 audit identifies missing SRS-to-STP mappings and requirements needing further review. | Incomplete |

| Automated validation | CI defines separate server-test and client-build jobs. | Configuration reviewed |

| Verification evidence | A test reference alone does not prove execution or a passing result. | Evidence must be recorded |



\## 3. Availability review — NFR-QUAL-02



\### 3.1 Requirement



The system shall achieve 99% availability per month, excluding announced maintenance.



\### 3.2 Measurement method



Availability should be measured using an agreed monitoring source that periodically checks the deployed application's externally observable health.



The measurement process should:



1\. Define the monitored production or staging endpoint and the observation interval.

2\. Record successful and failed health checks, timestamps, and relevant incidents.

3\. Define how partial outages, monitoring failures, and announced maintenance are handled.

4\. Retain timestamped monitoring records for each reporting month.

5\. Calculate availability using the agreed measurement policy.

6\. Record the reporting period, exclusions, data source, calculated result, and limitations.



A proposed calculation is:



Availability (%) = (Eligible observation time − Unavailable time) / Eligible observation time × 100



Here, eligible observation time excludes only maintenance periods permitted by the agreed requirement and measurement policy. The team must define the precise treatment of failed checks and partial outages before reporting a final figure.



For a 30-day month, a 99% target permits at most 7 hours and 12 minutes of unavailability within the eligible observation time.



\### 3.3 Evidence reviewed



The repository README and `.github/workflows/ci.yml` describe automated server tests and a client production build. The README also documents a local API health endpoint.



These checks support build and test validation. They do not demonstrate continuous production availability.



The reviewed materials do not provide sufficient timestamped production monitoring records to establish whether the 99% monthly target has been achieved.



\### 3.4 Status and actions



\*\*Status: NOT DEMONSTRATED — monitoring evidence required.\*\*



\- \[ ] Identify the deployment environment and monitored endpoint.

\- \[ ] Agree on the monitoring interval, failure criteria, and maintenance exclusions.

\- \[ ] Establish or identify an uptime-monitoring source.

\- \[ ] Collect evidence covering a complete reporting month.

\- \[ ] Calculate and record monthly availability from the collected evidence.

\- \[ ] Document incidents, exclusions, and unresolved measurement limitations.



Do not report the 99% target as achieved until sufficient observation data supports the result.



\## 4. Modularity review — NFR-QUAL-05



\### 4.1 Documented architecture



The README describes a React/Vite client and an Express/Node.js API using MongoDB and Mongoose.



| Module or layer | Documented responsibility | Main boundary |

|---|---|---|

| Client pages | Render application screens. | React Router and page components |

| Shared client components | Provide reusable UI and route protection. | Component interfaces |

| Client API layer | Make HTTP requests to the backend. | API request/response contracts |

| Authentication context | Expose authentication state and actions. | Shared client authentication interface |

| Server routes | Map URLs to middleware and controllers. | HTTP endpoints |

| Server middleware | Handle authentication, roles, validation, and error handling. | Request-processing pipeline |

| Server controllers | Read requests, call services, and send responses. | HTTP and application-service boundary |

| Server services | Implement application business rules. | Service interfaces |

| Server models | Define persistence and database interactions. | Mongoose and MongoDB |

| Server validators | Define request validation rules. | Incoming request contracts |

| Server configuration and utilities | Provide configuration, role definitions, and standardized errors. | Shared infrastructure interfaces |



This table reflects the documented architecture. It is not a complete code-level dependency audit.



\### 4.2 Integration boundaries



The documented integration points include:



\- Client-to-server HTTP API requests.

\- Authentication tokens passed with protected API requests.

\- Route-to-middleware-to-controller processing.

\- Controller-to-service calls.

\- Service-to-model database operations.

\- Shared request-validation and error-handling middleware.

\- Automated integration tests using Jest, Supertest, and an in-memory MongoDB.



The README describes the models as the only code that touches MongoDB. This is an architectural expectation that should be checked against the implementation.



\### 4.3 Review criteria



Inspect the source code to confirm that:



\- Routes do not contain substantial business logic.

\- Controllers remain focused on HTTP concerns.

\- Services own business rules and coordinate persistence through models.

\- Authorization and validation are applied consistently at the appropriate boundaries.

\- Client pages use the API layer instead of duplicating HTTP configuration.

\- Shared middleware and components have clear responsibilities.

\- Cross-module dependencies and integration contracts are documented.

\- Integration tests cover important interactions between modules.



\### 4.4 Status and actions



\*\*Status: PARTIALLY REVIEWED — deeper code-level verification required.\*\*



\- \[ ] Inspect representative route, controller, service, model, and middleware modules.

\- \[ ] Check whether actual imports and dependencies respect the documented layer boundaries.

\- \[ ] Review API contracts and error responses against the implementation.

\- \[ ] Record any excessive coupling, duplicated logic, or unclear ownership.

\- \[ ] Document defects with file paths, evidence, and follow-up actions.



Do not declare the architecture fully verified based on the README alone.



\## 5. Requirement-to-test traceability — NFR-QUAL-06



\### 5.1 Existing audit findings



The existing `ISSUE\_29\_TRACEABILITY\_AUDIT.md` reports the following structural comparison:



| Measure | Existing audit result |

|---|---:|

| Unique requirement-like IDs extracted from the SRS | 143 |

| Requirement rows found in the STP coverage matrix | 116 |

| Matrix rows containing a detected test reference | 113 |

| Matrix rows without a detected test reference | 3 |

| SRS IDs without a matching coverage-matrix row | 27 |



The 27 IDs missing from the STP coverage matrix are `COM-02` through `COM-10` and `UI-01` through `UI-18`.



The three rows without a detected test reference are `BR-07`, `DC-09`, and `DC-11`. The existing audit identifies these as not directly testable and calls for suitable review or inspection evidence.



These counts are reproduced from the existing audit; they have not been independently recalculated as part of this review.



\### 5.2 Specific quality requirements



| Requirement | Existing traceability evidence | Current conclusion |

|---|---|---|

| NFR-QUAL-02 | STP mapping and partial-coverage finding recorded in the Issue #29 audit | Monthly availability remains unproven without observation data |

| NFR-QUAL-05 | Architecture and module structure described in the README | Requires code-level boundary and dependency review |

| NFR-QUAL-06 | STP maps `TC-AN-09` to the traceability check; the audit records the test as not executed | Execution evidence and results are still required |



The STP references for Issue #30 include `TC-AN-07`, `TC-AN-08`, and `TC-AN-09`, as applicable to availability, modularity, and traceability checks. The exact scope and expected results of each test case must be confirmed against the STP.



\### 5.3 Traceability completion rules



For each in-scope requirement:



1\. Record the exact requirement ID and source wording.

2\. Identify the linked STP test case or a justified review/inspection method.

3\. Identify the implementing module or relevant configuration where applicable.

4\. Record whether the test is planned, executed, passed, failed, blocked, or not applicable.

5\. Link the execution evidence and defect or backlog issue, where relevant.

6\. Keep the requirement partially covered or blocked while required evidence or clarification remains outstanding.



A test reference in the STP is evidence of planned coverage, not proof of successful execution.



\### 5.4 Status and actions



\*\*Status: INCOMPLETE — follow-up required.\*\*



\- \[ ] Confirm that the SRS and STP revisions are the intended baseline.

\- \[ ] Review the missing `COM-02`–`COM-10` and `UI-01`–`UI-18` mappings.

\- \[ ] Document appropriate inspection or acceptance evidence for `BR-07`, `DC-09`, and `DC-11`.

\- \[ ] Review the partial and blocked requirements listed in the Issue #29 audit.

\- \[ ] Confirm the actual test cases and expected results for `TC-AN-07`, `TC-AN-08`, and `TC-AN-09`.

\- \[ ] Record execution results rather than assuming mapped tests have passed.

\- \[ ] Link unresolved findings to the appropriate project issues.



The existing Issue #29 audit remains the detailed inventory of the outstanding requirement mappings.



\## 6. Continuous integration and validation



\### 6.1 CI configuration reviewed



The reviewed `.github/workflows/ci.yml` defines two independent jobs:



\- \*\*Server tests:\*\* installs dependencies using `npm ci` and runs `npm test` in the server directory.

\- \*\*Client build:\*\* installs dependencies using `npm ci` and runs `npm run build` in the client directory.



The workflow is configured for pushes and pull requests targeting the listed main and feature branches.



\### 6.2 What CI establishes



A passing CI run establishes that the configured commands completed successfully for that revision and environment.



It does not, by itself, prove:



\- Production availability over a complete month.

\- Correctness of every SRS requirement.

\- Complete requirement-to-test traceability.

\- That every module boundary follows the intended architecture.

\- That untested production configurations behave correctly.



\### 6.3 Validation record



Complete this section after running the commands on the Issue #30 branch.



| Check | Command | Result |

|---|---|---|

| Server automated tests | `npm --prefix server test -- --runInBand` | Pending execution |

| Client production build | `npm --prefix client run build` | Pending execution |

| Whitespace and patch checks | `git diff --check` | Pending execution |

| Modularity inspection | Review representative source modules and dependencies | Pending review |

| Availability evidence | Review monitoring records for the reporting period | Pending evidence |

| Traceability review | Compare in-scope requirements against STP mappings and execution records | Pending review |



Replace each pending entry with the actual result, relevant evidence, and any limitations. Do not record a pass before executing the check.



\## 7. Findings and follow-up actions



| Finding | Priority | Follow-up |

|---|---|---|

| No sufficient monthly availability evidence in the reviewed materials | High | Define monitoring and retain a complete reporting period of evidence |

| Requirement mappings are missing for 27 SRS IDs in the existing audit | High | Review and disposition each missing communication and UI requirement |

| Three constraints lack detected test references | Medium | Record appropriate inspection or acceptance evidence |

| Module boundaries have only been reviewed at the documented architecture level | Medium | Inspect implementation dependencies and integration boundaries |

| Several requirements remain partially covered or blocked | High | Resolve clarifications, execute applicable tests, and record evidence |

| The existing traceability audit reports that mapped STP tests are not executed | High | Record test execution results and update requirement verification status |



Priorities are proposed review priorities, not existing project-board priority values. The team should confirm owners and due dates in the project backlog.



\## 8. Limitations



\- No production uptime result is asserted in this document.

\- The reviewed CI configuration does not constitute production monitoring evidence.

\- The architecture table is based on the documented project structure; full code-level dependency verification remains outstanding.

\- Requirement counts and listed traceability gaps are taken from the existing Issue #29 audit and have not been independently recalculated here.

\- No requirement is declared verified solely because a test reference exists.

\- Outstanding failures, clarifications, and coverage gaps must remain visible until supported by suitable evidence.



\## 9. Definition of done



\- \[ ] Availability monitoring and measurement rules are documented.

\- \[ ] Availability evidence is reviewed, or the absence of sufficient observation data is explicitly recorded.

\- \[ ] Module responsibilities, interfaces, dependencies, and integration boundaries are reviewed.

\- \[ ] In-scope requirement IDs are mapped to tests or justified alternative verification methods.

\- \[ ] Execution evidence and results are recorded for applicable checks.

\- \[ ] Gaps and failures have documented follow-up actions.

\- \[ ] Relevant backlog issues and acceptance criteria are linked.

\- \[ ] The team confirms the SRS/STP baseline and review findings.



\## 10. Conclusion



The reviewed project documentation describes a layered backend, a modular React client, and CI checks for server tests and client builds. These are useful foundations for modularity and automated validation.



However, the available evidence does not demonstrate the 99% monthly availability target. The existing traceability audit also records missing requirement mappings, partially covered or blocked requirements, and test cases awaiting execution evidence.



Accordingly, this review remains \*\*IN PROGRESS\*\* until the outstanding inspections, monitoring evidence, traceability updates, and applicable verification activities have been completed or formally dispositioned.

