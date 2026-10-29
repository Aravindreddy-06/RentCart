/**
 * tests/test-client.js
 * Universal test client and results collector for RentCart API test suite.
 */

const fs = require('fs');
const path = require('path');

// Ensure environment variables from backend/.env are loaded if not in CI / already provided
const backendEnvPath = path.resolve(__dirname, '../../backend/.env');
if (fs.existsSync(backendEnvPath) && !process.env.DATABASE_URL) {
  try {
    const envContent = fs.readFileSync(backendEnvPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const BASE_URL = `${API_BASE_URL.replace(/\/+$/, '')}/api`;

class TestCollector {
  constructor(suiteName = 'RentCart API Automated Test Suite') {
    this.suiteName = suiteName;
    this.tests = [];
    this.startTime = Date.now();
  }

  record({
    id,
    module,
    title,
    preconditions = 'Seeded database ready',
    steps,
    expectedResult,
    actualResult,
    status = 'PASS',
    duration = 0,
    error = null,
  }) {
    this.tests.push({
      id,
      module,
      title,
      preconditions,
      steps,
      expectedResult,
      actualResult: actualResult || (status === 'PASS' ? 'Matches expected result' : 'Failed assertion'),
      status,
      duration: Math.round(duration),
      error: error ? (error.message || String(error)) : null,
      timestamp: new Date().toISOString(),
    });
  }

  saveResults() {
    const resultsDir = path.resolve(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const total = this.tests.length;
    const passed = this.tests.filter((t) => t.status === 'PASS').length;
    const failed = this.tests.filter((t) => t.status === 'FAIL').length;
    const skipped = this.tests.filter((t) => t.status === 'SKIPPED').length;
    const totalDurationMs = Date.now() - this.startTime;

    // Group counts per module
    const moduleMap = new Map();
    for (const t of this.tests) {
      if (!moduleMap.has(t.module)) {
        moduleMap.set(t.module, { total: 0, passed: 0, failed: 0, skipped: 0 });
      }
      const m = moduleMap.get(t.module);
      m.total++;
      if (t.status === 'PASS') m.passed++;
      else if (t.status === 'FAIL') m.failed++;
      else m.skipped++;
    }

    const moduleSummary = [];
    for (const [modName, counts] of moduleMap.entries()) {
      const rate = counts.total ? `${((counts.passed / counts.total) * 100).toFixed(1)}%` : '0%';
      moduleSummary.push({
        module: modName,
        total: counts.total,
        passed: counts.passed,
        failed: counts.failed,
        skipped: counts.skipped,
        passRate: rate,
      });
    }

    const resultPayload = {
      suite: this.suiteName,
      runDate: new Date().toISOString(),
      environment: `API Target: ${API_BASE_URL}`,
      total,
      passed,
      failed,
      skipped,
      passRate: total ? `${((passed / total) * 100).toFixed(1)}%` : '0%',
      totalDurationMs,
      moduleSummary,
      tests: this.tests,
    };

    const outPath = path.join(resultsDir, 'results.json');
    fs.writeFileSync(outPath, JSON.stringify(resultPayload, null, 2), 'utf8');
    console.log(`\n📄 Results saved to: ${outPath} (${total} tests, ${passed} passed, ${failed} failed, ${skipped} skipped)`);
    return resultPayload;
  }
}

const collector = new TestCollector();

// HTTP Helper using native fetch (Node 18+)
async function request(endpoint, method = 'GET', body = undefined, token = undefined, headers = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const reqHeaders = { ...headers };

  if (body !== undefined && !(body instanceof FormData) && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers: reqHeaders,
  };

  if (body !== undefined) {
    options.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, options);
  let json = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch {}
  } else {
    try {
      json = await res.text();
    } catch {}
  }

  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data: json,
  };
}

module.exports = {
  collector,
  request,
  BASE_URL,
  API_BASE_URL,
};
