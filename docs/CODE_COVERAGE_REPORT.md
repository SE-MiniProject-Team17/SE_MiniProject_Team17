# Code Coverage Report
## SE Mini Project — Team 17

**Execution date:** 7 November 2026  
**Test framework:** Jest 29.7.0  
**Test environment:** Node.js  
**Coverage scope:** Backend JavaScript source (`server/src/**/*.js`)

### 1. Objective

To measure the extent to which the backend application source code is exercised by the automated test suite.

### 2. Test Execution

The following command was executed from the project root:

```cmd
npm --prefix server test -- --coverage --collectCoverageFrom="src/**/*.js"
```

### 3. Test Execution Summary

| Metric | Result |
|---|---:|
| Test suites passed | 29 |
| Test suites failed | 0 |
| Total tests passed | 349 |
| Total tests failed | 0 |
| Snapshots | 0 |
| Execution time | 166.11 seconds |

**Overall result:** All 29 test suites and all 349 tests passed.

### 4. Code Coverage Results

| Coverage metric | Achieved |
|---|---:|
| Statement coverage | 88.41% |
| Line coverage | 89.11% |
| Function coverage | 91.36% |
| Branch coverage | 76.86% |

### 5. Coverage by Application Layer

| Application layer | Statement coverage | Branch coverage |
|---|---:|---:|
| Controllers | 86.12% | 75.57% |
| Middleware | 90.32% | 81.48% |
| Models | 100.00% | 83.33% |
| Routes | 100.00% | 100.00% |
| Services | 87.70% | 75.56% |
| Validators | 91.07% | 85.29% |

### 6. Significant Coverage Findings

- All route files achieved 100% statement and branch coverage.
- All model files achieved 100% statement coverage.
- Middleware achieved 90.32% statement coverage.
- Service-layer statement coverage was 87.70%.
- The material-sharing service had relatively low statement coverage of 72.54%.
- The material service had statement coverage of 81.09%.
- The group creation validator file had 0% statement coverage because it is not connected to the group creation route. Actual group creation validation is implemented in `groupService.createGroup()` and is exercised by API integration tests.
- `server.js` and `config/db.js` were not exercised by the test suite. The tests import the Express application directly and use an in-memory database setup rather than the production startup and database connection path.

### 7. Coverage Artifacts

Jest generated the following files:

- `server/coverage/lcov-report/index.html`
- `server/coverage/coverage-final.json`
- `server/coverage/lcov.info`
- `server/coverage/clover.xml`

The HTML report provides a file-by-file view of covered and uncovered source lines.

### 8. Limitations

- Coverage percentages measure code execution, not correctness of every possible behaviour.
- The coverage results apply to backend JavaScript source files, not the React frontend.
- Uncovered code paths remain and should be evaluated for additional tests.
- 100% coverage in an individual layer does not prove that every possible input or production scenario has been validated.
- The automated test suite does not by itself establish completion of every system-validation test case in the STP.

### 9. Conclusion

The backend automated test suite passed all 349 tests across 29 test suites. The measured statement coverage was 88.41%, line coverage was 89.11%, and function coverage was 91.36%.

The results demonstrate substantial automated execution of backend application code. Further testing should focus on uncovered service and controller paths, unused validation code, and application startup and database connection scenarios.