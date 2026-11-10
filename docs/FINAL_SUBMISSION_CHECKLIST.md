# Final Submission Checklist — Team 17, Sprint 3

Status legend: Done / Needs edit / Needs evidence / Not produced. Dated 7 November 2026. No test result below is new; all come from the supplied reports.

| # | Item | Location | Status | Remaining action |
|---|---|---|---|---|
| 1 | UNIT_TEST_REPORT.md | docs/ | Needs edit | Add tested commit SHA, skipped count, per-suite table |
| 2 | SYSTEM_VALIDATION_REPORT.md | docs/ | Needs edit | Add TC-ID/status table (see traceability workbook, "Test Case Status") |
| 3 | CODE_COVERAGE_REPORT.md | docs/ | Needs edit | Add Node/npm/Jest/provider and SHA |
| 4 | BRANCH_COVERAGE_REPORT.md | docs/ | Needs edit | Same as 3 |
| 5 | STP_Team17_Rev1_3 (real .docx) | docs/ | Needs edit | Fix title block, add 1.3 revision row, s1.3/s8/s14/H.3, Annex E evidence column. The supplied ".docx" is plain text, not a Word file, so it cannot be edited as Word here |
| 6 | REQUIREMENT_TRACEABILITY_MATRIX.xlsx | docs/ | Done (this audit) | Update when TC-level evidence exists |
| 7 | SPRINT3_DELIVERABLE_COMPLIANCE_MATRIX.xlsx | docs/ | Done, Part-3 only | Add Guidelines/Part-1/Part-2 rows once supplied |
| 8 | FINAL_QA_GAP_REGISTER.xlsx | docs/ | Done | Close items as evidence arrives |
| 9 | Supporting issue reports (SECURITY, ISSUE_11, ISSUE_31, ISSUE_32, OPERATIONAL_READINESS, QUALITY_ASSURANCE_REVIEW) | docs/ | Keep as history | Add "superseded" banner to ISSUE_11_31_32; finish QA review; fix quote fidelity |
| 10 | Deviation log | docs/ | Not produced | Team17_Deviation_Log not supplied |

## Evidence to attach
| Evidence | Supports | Exists? |
|---|---|---|
| Saved Jest console output, 7-Nov run | Unit/System reports | Must be collected |
| server/coverage (lcov-report, lcov.info, coverage-final.json, clover.xml) | Coverage reports | Generated per report s7; collect |
| PR/merge screenshots for docs/sprint-3-test-reports | Part-3 s2c | Must be collected |
| ISSUE_32 local timing JSON logs | Performance (local only) | In Jest output; collect |
| Manual/browser/load/backup evidence | Remaining STP tests | Does not exist yet |
Do not attach node_modules, .jest-cache, Word lock files, or duplicate historical reports.

## Still requiring execution
TC-AN-01, 04, 06, 07; TC-AP-01..03; TC-AS-06; full TC-MP-03/QP-01..03 on deployment; TC-AN-02/05/17 real-interruption parts; acceptance AT-01..08; all UI/system (Cypress/Selenium) cases; TC-AN-08/09 inspections; blocked cases after decisions (Annex F).

## Disclosure
Reports are dated 7 Nov 2026, one day after the Part-3 testing window (2–6 Nov). Do not backdate; disclose.

## Suggested commands
```
git checkout -b docs/sprint3-final-audit
git add docs/REQUIREMENT_TRACEABILITY_MATRIX.xlsx docs/SPRINT3_DELIVERABLE_COMPLIANCE_MATRIX.xlsx docs/FINAL_QA_GAP_REGISTER.xlsx docs/FINAL_SUBMISSION_CHECKLIST.md
git commit -m "docs: Sprint 3 audit - traceability matrix, compliance matrix, gap register, checklist"
git push -u origin docs/sprint3-final-audit
```
