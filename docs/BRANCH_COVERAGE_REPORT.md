# Branch Coverage Report
## SE Mini Project — Team 17

**Execution date:** 7 November 2026  
**Test framework:** Jest 29.7.0  
**Coverage scope:** Backend JavaScript source (`server/src/**/*.js`)  
**SRS baseline:** Revision 1.2  
**STP baseline:** Revision 1.3, dated 07-11-2026

### 1. Objective

To assess whether the conditional decision paths in the backend application have been exercised by the automated test suite.

Branch coverage measures the proportion of instrumented conditional branches executed during testing. It helps identify decision paths that may require additional testing.

### 2. Test Execution

The following command was executed from the project root:

```cmd
npm --prefix server test -- --coverage --collectCoverageFrom="src/**/*.js"
```

The coverage collection was restricted to backend JavaScript source files.

### 3. Test Execution Summary

| Metric | Result |
|---|---:|
| Test suites passed | 29 |
| Test suites failed | 0 |
| Tests passed | 349 |
| Tests failed | 0 |
| Execution time | 166.11 seconds |

**Overall result:** All 29 test suites and all 349 tests passed during this execution.

### 4. Overall Branch Coverage

| Metric | Result |
|---|---:|
| Branch coverage | 76.86% |
| Statement coverage | 88.41% |
| Line coverage | 89.11% |
| Function coverage | 91.36% |

The overall branch coverage achieved was 76.86%.

### 5. Branch Coverage by Application Layer

| Application layer | Branch coverage |
|---|---:|
| Controllers | 75.57% |
| Middleware | 81.48% |
| Models | 83.33% |
| Routes | 100.00% |
| Services | 75.56% |
| Validators | 85.29% |

### 6. Areas Requiring Further Testing

The following files contain notable uncovered branches or execution paths:

| File | Branch coverage |
|---|---:|
| `src/controllers/groupController.js` | 50.00% |
| `src/controllers/materialController.js` | 50.00% |
| `src/controllers/studentQuizController.js` | 33.33% |
| `src/middleware/profilePictureUpload.js` | 60.00% |
| `src/services/materialService.js` | 68.08% |
| `src/services/materialSharingService.js` | 71.87% |
| `src/services/performanceService.js` | 72.72% |
| `src/services/studentQuizService.js` | 73.80% |

These files should be considered for additional branch-focused tests, prioritizing paths associated with important application behaviour, error handling, and permission checks.

### 7. Unexecuted Source Files

The following files were included in the coverage collection but had no executed statements:

- `src/server.js`
- `src/config/db.js`
- `src/validators/groupValidators.js`

The startup and database configuration files were not exercised by the current in-memory integration-test setup. The tests import the Express application directly rather than executing the production startup and database connection path.

The group validator file is not connected to the group creation route. Group creation validation currently occurs in `groupService.createGroup()`.

These are documented coverage gaps, not successful test results.

### 8. Coverage Interpretation and Limitations

The achieved branch coverage of 76.86% indicates that a substantial proportion of instrumented conditional paths were exercised, but some branches remain uncovered.

Although all 349 automated tests passed, the remaining uncovered branches may include:

- Error-handling paths.
- Invalid-input conditions.
- Alternative permission paths.
- Optional values.
- Boundary conditions.

Additional tests should be prioritized according to functional risk and the requirements in the Software Test Plan.

Other limitations include:

- Branch coverage measures execution of instrumented decision paths, not correctness of every possible behaviour.
- The results apply only to backend JavaScript source files, not the React frontend.
- The current test setup does not exercise the production server startup and database connection paths.
- Passing automated tests and aggregate branch coverage do not independently demonstrate that all STP test cases or requirements have been verified.
- The tested application commit SHA was not independently recorded in the available execution evidence.

### 9. Conclusion

The backend achieved 76.86% branch coverage, with all 29 test suites and 349 automated tests passing during the execution on 7 November 2026.

The results demonstrate that the existing automated suite exercises a substantial portion of the backend decision logic. However, uncovered branches remain, particularly in selected controllers and services, and the production startup and database connection paths were not exercised.

Further branch-focused testing is recommended before claiming complete validation of all backend decision paths or full verification of the STP Revision 1.3 requirements.