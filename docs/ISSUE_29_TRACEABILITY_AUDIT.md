# Issue #29 — Requirement-to-Test Traceability Audit

**Audit status:** In progress
**Baseline reviewed:** SRS Revision 1.2 and STP Revision 1.2
**Purpose:** Identify requirement IDs without an STP coverage row, distinguish planned coverage from verified test evidence, and record outstanding traceability work.

## 1. Scope and method

A script extracted unique requirement-like IDs from the SRS paragraphs and tables, then compared them with the requirement IDs in STP Table 188, the requirement coverage matrix.

The script also detected test-case references matching `TC-*` and `UT-*` patterns in each matrix row.

This is a structural document audit. It does not establish that a test is correct, has been executed, or has passed. GitHub backlog links and issue metadata have not yet been independently verified.

## 2. Summary

| Measure | Result |
|---|---:|
| Unique requirement-like IDs extracted from the SRS | 143 |
| Requirement rows found in the STP coverage matrix | 116 |
| Matrix rows containing a detected test reference | 113 |
| Matrix rows without a detected test reference | 3 |
| SRS IDs with no matching coverage-matrix row | 27 |
| Matrix IDs not found in the SRS inventory | 0 |

The 27 IDs without coverage rows are `COM-02` through `COM-10` and `UI-01` through `UI-18`.

The three rows without a detected test reference are `BR-07`, `DC-09`, and `DC-11`. The STP labels these constraints "Not directly testable." They require an appropriate policy, scope, or project-constraint review rather than automatically being treated as missing functional test cases.

## 3. Requirement IDs missing from the coverage matrix

### Communication requirements

- `COM-02`
- `COM-03`
- `COM-04`
- `COM-05`
- `COM-06`
- `COM-07`
- `COM-08`
- `COM-09`
- `COM-10`

`COM-01` is present and mapped to `TC-AS-06`. The remaining communication IDs need explicit disposition and traceability. Determine whether each is a testable system requirement, a constraint verified by inspection, or a requirement needing clarification. Do not invent test mappings without reviewing the SRS wording.

### User-interface requirements

- `UI-01` through `UI-18`

No individual UI requirement IDs were found as rows in the coverage matrix. The STP's existing notes indicate item-level UI traceability remains open. Each UI ID needs a traceable disposition, such as a specific test case or an explicitly justified review/inspection method.

## 4. Rows without detected test references

| Requirement | Existing STP disposition | Audit action |
|---|---|---|
| `BR-07` | Not directly testable | Record the policy/inspection rationale and verify it is acceptable for the requirement's wording. |
| `DC-09` | Not directly testable | Retain the stated scope-review approach and identify the review evidence required. |
| `DC-11` | Not directly testable | Record how the project-team/schedule constraint is reviewed or accepted. |

These rows are not automatically defects just because they lack conventional test-case IDs. The audit must retain the rationale and identify suitable evidence.

## 5. Existing partial or blocked coverage

The STP identifies the following requirements/objectives as partially covered or blocked. Their listed test references are planned mappings, not proof of successful execution.

| Requirement/objective | STP status | Outstanding concern recorded in STP |
|---|---|---|
| `BR-01` | Partially covered | Re-review mapped authentication tests against the exact business rule. |
| `BR-03` | Partially covered | Verify owner-only material update, removal, sharing, and revocation operations. |
| `BR-04` | Partially covered | Verify owner/grantee access and denial for unrelated users or revoked access. |
| `BR-06` | Partially covered | Review self-only profile changes and protection of email and role. |
| `NFR-QUAL-02` | Partially covered | A sprint observation does not demonstrate monthly 99% availability. |
| `REQ-ACC-09` | Partially covered | Verify picture-format and size boundaries, ownership, invalid files, and profile retrieval/display. |
| `REQ-COL-01` | Partially covered | Confirm required fields and limits before boundary tests are finalized. |
| `REQ-COL-05` | Partially covered | Clarify moderation actions and response contract. |
| `REQ-MAT-01` | Partially covered | Resolve the role discrepancy between SRS and SAD. |
| `REQ-MAT-04` | Partially covered | Verify owner/shared-user access and list/detail response fields. |
| `REQ-MAT-09` | Partially covered | Verify revocation effect and the owner-only grantee-list contract. |
| `REQ-PA-03` | Blocked pending clarification | Resolve the topic-source decision before finalizing expected results. |
| `REQ-PA-04` | Partially covered | Clarify the contract for selecting/listing Faculty-owned quizzes and attempts. |
| `REQ-QZ-05` | Partially covered | Resolve the published-quiz edit/delete behavior decision. |
| `REQ-QZ-10` | Partially covered | Resolve deadline, equality-boundary, and auto-finalization behavior. |
| `REQ-QZ-11` | Partially covered | Validate grading rules and pending/retry behavior. |
| `SEC-QZ-04` | Partially covered | Resolve server-side deadline behavior and boundary cases. |
| `SO-01`–`SO-06` | Partially covered | Review evidence for linked security requirements against each objective's wording. |

Keep these statuses until the recorded concerns are resolved and suitable evidence is reviewed. A test ID in the matrix alone is not grounds to mark a requirement verified.

## 6. Execution evidence and verification rule

The reviewed STP coverage matrix marks its test cases "Not executed." Therefore:

- A mapped test case demonstrates planned traceability, not successful verification.
- A requirement must not be reported as verified without execution evidence and a recorded result.
- Partial and blocked statuses must remain visible until their concerns are resolved.
- Policy, scope, and project constraints need a documented review or acceptance method where conventional functional testing is not appropriate.

For `NFR-QUAL-06`, the STP maps `TC-AN-09` to the requirement-traceability check and also maps `DC-10` to that test. The matrix records the test as "Not executed." This mapping is not yet evidence that the traceability audit passed.

## 7. GitHub backlog traceability

**Status: Not yet audited.**

The document comparison does not prove that every SRS requirement or unresolved traceability gap links to the correct GitHub issue. Before closing Issue #29:

1. Review the issue's acceptance criteria.
2. Link this audit and the relevant outstanding gaps to the appropriate backlog issue(s).
3. Confirm the issue descriptions and links point to the correct requirement IDs and test cases.
4. Avoid marking acceptance criteria complete until the required document and backlog evidence is available.

## 8. Recommended completion criteria

- [ ] Every SRS requirement ID has an STP matrix row or an explicitly documented, justified alternative disposition.
- [ ] `COM-02`–`COM-10` have individual traceability dispositions.
- [ ] `UI-01`–`UI-18` have individual traceability dispositions.
- [ ] `BR-07`, `DC-09`, and `DC-11` have documented review/inspection or acceptance evidence appropriate to their nature.
- [ ] Partial and blocked coverage remains clearly identified until resolved.
- [ ] Verified status is supported by execution evidence and recorded results.
- [ ] Relevant GitHub backlog issues and acceptance criteria are linked and checked.
- [ ] The team confirms the reviewed SRS/STP revisions are the intended baseline.

## 9. Conclusion

The structural comparison found 143 unique SRS requirement-like IDs. Of these, 116 appear in the STP coverage matrix and 27 do not. Of the 116 matrix rows, 113 contain detected test references, while three are explicitly classified as not directly testable and have no detected test ID.

The audit is not complete: the missing communication/UI mappings, partial or blocked coverage, test execution evidence, and GitHub backlog links still require follow-up. These findings should not be interpreted as a claim that all requirements have been tested or verified.
