# Branch Coverage Report
## SE Mini Project — Team 17

**Execution date:** 7 November 2026  
**Test framework:** Jest 29.7.0  
**Coverage scope:** Backend JavaScript source (`server/src/**/*.js`)

### 1. Objective

To assess whether the conditional decision paths in the backend application have been exercised by the automated test suite.

Branch coverage measures the proportion of instrumented conditional branches executed during testing.

### 2. Test Execution

The following command was executed:

```cmd
npm --prefix server test -- --coverage --collectCoverageFrom="src/**/*.js"
```

### 3. Test Execution Summary

| Metric | Result |
|---|---:|
| Test suites passed | 29 |
| Test suites failed | 0 |
| Tests passed | 349 |
| Tests failed | 0 |
| Execution time | 166.11 seconds |

### 4. Overall Branch Coverage

| Metric | Result |
|---|---:|
| Branch coverage | 76.86% |
| Statement coverage | 88.41% |
| Line coverage | 89.11% |
| Function coverage | 91.36% |

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

### 7. Unexecuted Source Files

The following files were included in the coverage collection but had no executed statements:

- `src/server.js`
- `src/config/db.js`
- `src/validators/groupValidators.js`

The startup and database configuration files are not exercised by the current in-memory integration-test setup.

The group validator file is not connected to the group creation route. Group creation validation currently occurs in `groupService.createGroup()`.

These are documented coverage gaps, not successful test results.

### 8. Coverage Interpretation

The achieved branch coverage of 76.86% indicates that most, but not all, instrumented conditional paths were exercised.

Although all 349 automated tests passed, the remaining uncovered branches may include error handling, invalid inputs, alternative permission paths, optional values, and boundary conditions.

Additional tests should be prioritized according to functional risk and the requirements in the Software Test Plan.

### 9. Conclusion

The backend achieved 76.86% branch coverage with all 29 test suites and 349 automated tests passing.

The results confirm that the existing suite exercises a substantial portion of the backend decision logic. However, uncovered branches remain, particularly in selected controllers and services.

Further branch-focused testing is recommended before claiming complete validation of all backend decision paths.