'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const CONCURRENCY = 200;
const REQUIRED_TOKEN_COUNT = CONCURRENCY;
const MAX_REQUEST_MS = 30000;

function configurationError(message) {
  console.error(`Load-check configuration error: ${message}`);
  process.exitCode = 2;
}

function percentile(sorted, fraction) {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function isLoopback(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

async function sendRequest(target, token) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_REQUEST_MS);

  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
      redirect: 'manual',
    });

    // Drain response bodies so connections can be reused for later rounds.
    await response.arrayBuffer();
    return {
      status: response.status,
      ok: response.ok,
      latencyMs: performance.now() - started,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      latencyMs: performance.now() - started,
      error: error.name || 'RequestError',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runWave(target, tokens) {
  const waveStarted = performance.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, index) =>
      sendRequest(target, tokens ? tokens[index] : null)
    )
  );
  return { results, elapsedMs: performance.now() - waveStarted };
}

async function main() {
  const { PERF_BASE_URL, PERF_REQUEST_PATH, PERF_USER_TOKENS_FILE } = process.env;
  const warmupRounds = Number(process.env.PERF_WARMUP_ROUNDS || 1);
  const measuredRounds = Number(process.env.PERF_MEASURED_ROUNDS || 5);

  if (!PERF_BASE_URL || !PERF_REQUEST_PATH) {
    return configurationError('set PERF_BASE_URL and PERF_REQUEST_PATH');
  }
  if (!PERF_REQUEST_PATH.startsWith('/') || PERF_REQUEST_PATH.startsWith('//')) {
    return configurationError('PERF_REQUEST_PATH must be a same-origin absolute path beginning with one slash');
  }
  if (!Number.isInteger(warmupRounds) || warmupRounds < 0) {
    return configurationError('PERF_WARMUP_ROUNDS must be a non-negative integer');
  }
  if (!Number.isInteger(measuredRounds) || measuredRounds < 1) {
    return configurationError('PERF_MEASURED_ROUNDS must be a positive integer');
  }

  let base;
  try {
    base = new URL(PERF_BASE_URL);
  } catch {
    return configurationError('PERF_BASE_URL must be a valid absolute URL');
  }
  if (!['http:', 'https:'].includes(base.protocol)) {
    return configurationError('PERF_BASE_URL must use HTTP or HTTPS');
  }
  if (base.username || base.password || base.search || base.hash) {
    return configurationError('PERF_BASE_URL must not contain credentials, query parameters, or a fragment');
  }
  if (!isLoopback(base.hostname) && process.env.PERF_ALLOW_REMOTE_TARGET !== 'true') {
    return configurationError('remote targets require PERF_ALLOW_REMOTE_TARGET=true and an approved isolated target');
  }
  if (!isLoopback(base.hostname) && base.protocol !== 'https:') {
    return configurationError('remote targets must use HTTPS to protect test-user bearer tokens');
  }

  const target = new URL(PERF_REQUEST_PATH, base);
  if (target.origin !== base.origin) {
    return configurationError('PERF_REQUEST_PATH must stay on PERF_BASE_URL origin');
  }

  let tokens = null;
  if (PERF_USER_TOKENS_FILE) {
    try {
      tokens = JSON.parse(fs.readFileSync(PERF_USER_TOKENS_FILE, 'utf8'));
    } catch {
      return configurationError('PERF_USER_TOKENS_FILE must point to a readable JSON array');
    }
    if (
      !Array.isArray(tokens) ||
      tokens.length !== REQUIRED_TOKEN_COUNT ||
      tokens.some((token) => typeof token !== 'string' || token.trim() === '')
    ) {
      return configurationError(`PERF_USER_TOKENS_FILE must contain exactly ${REQUIRED_TOKEN_COUNT} non-empty token strings`);
    }
  }

  const startedAt = new Date().toISOString();
  for (let round = 0; round < warmupRounds; round += 1) {
    await runWave(target, tokens);
  }

  const latencies = [];
  const statuses = {};
  let failures = 0;
  let measuredElapsedMs = 0;
  const measuredStartedAt = performance.now();

  for (let round = 0; round < measuredRounds; round += 1) {
    const wave = await runWave(target, tokens);
    measuredElapsedMs += wave.elapsedMs;
    for (const result of wave.results) {
      latencies.push(result.latencyMs);
      statuses[result.status] = (statuses[result.status] || 0) + 1;
      if (!result.ok) failures += 1;
    }
  }

  const elapsedMs = performance.now() - measuredStartedAt;
  const sorted = [...latencies].sort((a, b) => a - b);
  const underThreeSeconds = latencies.filter((value) => value <= 3000).length;
  const requestCount = latencies.length;
  const report = {
    testCase: 'TC-AP-02 (HTTP request workload); supplementary to TC-AP-01 (not browser page rendering)',
    requirements: ['NFR-PERF-01 (HTTP timing only)', 'NFR-PERF-02'],
    startedAt,
    completedAt: new Date().toISOString(),
    targetOrigin: target.origin,
    path: target.pathname,
    method: 'GET',
    concurrency: CONCURRENCY,
    concurrencyModel: '200 asynchronous HTTP requests launched together per wave from one Node.js load-generator process',
    rampUpModel: 'one synchronized request wave; no gradual ramp-up',
    distinctBearerTokens: tokens ? tokens.length : 0,
    warmupRounds,
    measuredRounds,
    requestsPerRound: CONCURRENCY,
    requestCount,
    statusCounts: statuses,
    failedRequests: failures,
    failureRatePercent: Number((failures / requestCount * 100).toFixed(3)),
    responsesAtOrUnder3000Ms: underThreeSeconds,
    responseShareAtOrUnder3000MsPercent: Number((underThreeSeconds / requestCount * 100).toFixed(2)),
    runAssessment: {
      nfrPerf02FailureRateTargetMetByThisRun: failures / requestCount < 0.01,
      nfrPerf01HttpResponseProxyAtLeast95PercentUnder3s: underThreeSeconds / requestCount >= 0.95,
      nfrPerf01BrowserRenderedPageLoadVerified: false,
    },
    latencyMs: {
      min: Number(sorted[0].toFixed(2)),
      p50: Number(percentile(sorted, 0.5).toFixed(2)),
      p95: Number(percentile(sorted, 0.95).toFixed(2)),
      p99: Number(percentile(sorted, 0.99).toFixed(2)),
      max: Number(sorted[sorted.length - 1].toFixed(2)),
    },
    measuredWallTimeMs: Number(elapsedMs.toFixed(2)),
    summedWaveTimeMs: Number(measuredElapsedMs.toFixed(2)),
    throughputRequestsPerSecond: Number((requestCount / (elapsedMs / 1000)).toFixed(2)),
    datasetDescription: process.env.PERF_DATASET_DESCRIPTION || 'Not supplied; record the target dataset before interpreting results',
    loadGenerator: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      processes: 1,
    },
    limits: [
      'This measures HTTP GET response time, not browser-rendered page-load time or frontend paint.',
      'One load-generator host is not evidence for production-scale capacity; record server, database, network, build, and dataset details separately.',
      'Only run against an approved isolated test target. The script issues GET requests only.',
    ],
  };

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  console.log(serialized);
  if (process.env.PERF_RESULTS_FILE) {
    fs.mkdirSync(path.dirname(path.resolve(process.env.PERF_RESULTS_FILE)), { recursive: true });
    fs.writeFileSync(process.env.PERF_RESULTS_FILE, serialized, { encoding: 'utf8', flag: 'wx' });
  }
}

main().catch((error) => {
  console.error(`Load-check failed: ${error.name || 'Error'}`);
  process.exitCode = 1;
});
