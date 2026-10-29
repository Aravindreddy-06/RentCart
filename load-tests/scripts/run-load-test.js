/**
 * scripts/run-load-test.js
 * Runner for k6 load test: finds k6 binary, runs test, exports summary JSON, generates Excel.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { generateReport } = require('./generate-report');

function findK6Binary() {
  const localWin = path.resolve(__dirname, '../bin/k6.exe');
  if (fs.existsSync(localWin)) return localWin;

  const localUnix = path.resolve(__dirname, '../bin/k6');
  if (fs.existsSync(localUnix)) return localUnix;

  // Check system PATH
  try {
    const test = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['k6'], { encoding: 'utf8' });
    if (test.status === 0 && test.stdout.trim()) {
      return 'k6';
    }
  } catch {}

  return null;
}

async function main() {
  const k6Bin = findK6Binary();
  if (!k6Bin) {
    console.error('❌ k6 binary not found. Please run: node scripts/install-k6.js');
    process.exit(1);
  }

  const reportDir = path.resolve(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const scriptPath = path.resolve(__dirname, '../k6-read-traffic.js');
  const summaryJsonPath = path.join(reportDir, 'summary.json');

  console.log('================================================================');
  console.log('🚀 Launching RentCart k6 Read-Traffic Load Test');
  console.log(`Binary:  ${k6Bin}`);
  console.log(`Script:  ${scriptPath}`);
  console.log(`Target:  ${process.env.API_BASE_URL || 'http://localhost:4000'}`);
  console.log('Profile: 100 VUs, 10s ramp-up + 60s steady + 5s ramp-down');
  console.log('================================================================\n');

  const args = [
    'run',
    `--summary-export=${summaryJsonPath}`,
    scriptPath,
  ];

  const result = spawnSync(k6Bin, args, {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: path.resolve(__dirname, '..'),
  });

  if (result.status !== 0) {
    console.warn(`⚠️ k6 exited with non-zero status code: ${result.status}`);
  }

  if (fs.existsSync(summaryJsonPath)) {
    console.log('\n📊 Generating Excel report from k6 execution summary...');
    await generateReport();
  } else {
    console.error(`❌ Summary JSON not found at ${summaryJsonPath}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal load test runner error:', err);
  process.exit(1);
});

