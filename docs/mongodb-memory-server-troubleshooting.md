# Troubleshooting MongoDB Memory Server Test Failures

## Purpose

This guide explains how to recognize and recover from a local test failure caused by a MongoDB binary download/cache problem. It documents an issue encountered while running the Team 17 server tests.

This is a troubleshooting guide, not proof that every MongoDB-related test failure has the same cause. Diagnose the current error before taking action.

## Background

The server test suite uses a temporary MongoDB instance for tests. A tool such as `mongodb-memory-server` may download and cache a MongoDB executable so tests can start a local, temporary database without requiring a separately managed MongoDB server.

In the incident observed by the team, the MongoDB binary checksum verification failed. The temporary database did not start successfully, and test cleanup then raised a secondary error because the expected database object was unavailable.

## How to identify this specific issue

Look for the following clues in the test output.

### 1. MongoDB binary checksum mismatch

Example from the incident:

```text
MD5 check failed!
Binary MD5 is "e0d7f67fb04fd80db502985d1dfb1de7"
Checkfile MD5 is "b794b99d839b73b3862972d2e170018f"
```

This means the checksum calculated for the binary differs from the expected checksum. Possible causes include an incomplete or corrupted cached download, or a binary that differs from the expected file. The checksum mismatch alone does not establish the exact underlying cause.

### 2. A follow-up error accessing `collections`

Example from the incident:

```text
TypeError: Cannot read properties of undefined (reading 'collections')
at tests/helpers/db.js:20
```

This may occur because database initialization failed and cleanup or helper code subsequently tried to access a database object that was never initialized.

**Important:** the `collections` error can be secondary. Read the earlier output first; the first failure is often more useful than the last error shown.

## How to distinguish it from an application/test failure

Suspect a binary/cache startup problem when:
- The log explicitly reports an MD5/checksum mismatch for the MongoDB binary.
- The temporary MongoDB instance fails to start before test cases can use the database.
- A database helper then reports that a database object is undefined.

Do not assume this is the cause when:
- MongoDB starts successfully and individual assertions fail.
- The error concerns application logic, validation, authorization, routes, or expected response values.
- The log shows a different connection, port, configuration, or database error without a checksum mismatch.

When in doubt, preserve the full log and diagnose the earliest meaningful error.

## Recovery procedure

Use the following steps in order.

1. **Stop the failed test run.** Keep the complete terminal output, especially the first MongoDB-related error.
2. **Confirm the failure signature.** Check whether the log contains the checksum mismatch described above. Do not clear caches solely because a test failed.
3. **Remove only the affected MongoDB binary cache files.** In the incident, the team removed the cached MongoDB 8.2.6 files. Cache locations can vary by operating system, environment variables, and `mongodb-memory-server` version, so identify the actual cache path used by the failing run before deleting anything.
4. **Do not delete project files or broad dependency directories.** Do not delete the repository, `node_modules`, the lockfile, or unrelated MongoDB data as a first response to a binary checksum mismatch.
5. **Rerun the specific failing test** from the `server` directory, using the test command and options documented by the project. For example, if Jest is configured for this project:

   ```bash
   npm test -- --runInBand tests/quizzes.delete.test.js
   ```

   Run this command from `server`. If your test runner or script differs, use the project's documented equivalent.
6. **If the targeted test passes, rerun the complete server test suite** using the project's documented test command.
7. **Record the outcome.** If the checksum mismatch returns, or the test still fails, retain the full logs and investigate further rather than repeatedly deleting caches.

## If the problem continues

Check the following before changing application code:

- Whether the download is consistently incomplete or checksum verification keeps failing.
- Whether the machine has a network, proxy, antivirus, or disk-space issue affecting the download.
- Which MongoDB binary version and cache directory the current test configuration is using.
- Whether teammates see the same error on clean environments.
- Whether the earliest error is still the checksum mismatch or has changed.

Do not disable checksum verification as a workaround. The checksum check helps detect an unexpected or corrupted binary.

If MongoDB starts normally but tests fail afterward, treat that as a separate test or application failure and debug the failing assertion or stack trace.

## Test-helper hardening (optional follow-up)

The incident also exposed an opportunity to make test setup and cleanup more resilient. If database initialization fails, cleanup code should avoid dereferencing an uninitialized database object. A developer can review `server/tests/helpers/db.js` and add appropriate initialization checks and error handling.

This is a separate code-quality improvement. It was not required to resolve the observed cached-binary problem, and the team should add tests for the failure path before merging such a change.

## Incident outcome

For the incident observed by Team 17:

- The MongoDB 8.2.6 cached binary files were removed.
- The targeted quiz-deletion test then passed: **1 suite, 11 tests passed**.
- The full server suite on the recovery branch passed: **16 suites, 221 tests passed**.
- The current `main` branch was later validated with **17 suites, 224 tests passed**.
- The client build also completed successfully.

These results support that the reported failure was resolved after cache cleanup in that environment. They do not prove that all future MongoDB test failures are cache-related.

## Quick checklist

- [ ] Read the earliest MongoDB error, not only the final stack trace.
- [ ] Confirm an explicit binary checksum mismatch before clearing the cache.
- [ ] Identify and remove only the affected MongoDB binary cache files.
- [ ] Rerun the targeted test.
- [ ] Rerun the full server test suite.
- [ ] If the issue persists, keep logs and investigate the changed or repeated failure.
- [ ] Do not disable checksum verification or delete unrelated project data.

## Team reminder

A checksum mismatch during temporary MongoDB startup is usually an environment/tooling issue to investigate first, not immediate evidence of a bug in the application. Always verify the first error and rerun the relevant tests before concluding that the issue is resolved.
