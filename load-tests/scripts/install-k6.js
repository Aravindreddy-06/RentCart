/**
 * scripts/install-k6.js
 * Downloads k6 standalone executable for Windows if not already installed.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.resolve(__dirname, '../bin');
const k6ExePath = path.join(binDir, 'k6.exe');

if (fs.existsSync(k6ExePath)) {
  console.log(`k6 already exists at ${k6ExePath}`);
  process.exit(0);
}

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const zipPath = path.join(binDir, 'k6.zip');
  console.log('Downloading k6 v0.54.0 for Windows...');
  const k6Url = 'https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-windows-amd64.zip';
  await download(k6Url, zipPath);
  console.log('Downloaded zip file. Extracting...');

  // Use powershell Expand-Archive
  execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binDir}' -Force"`, { stdio: 'inherit' });

  // Move k6.exe to binDir if inside subfolder
  const extractedFiles = fs.readdirSync(binDir);
  for (const item of extractedFiles) {
    const full = path.join(binDir, item);
    if (fs.statSync(full).isDirectory() && item.includes('k6')) {
      const subK6 = path.join(full, 'k6.exe');
      if (fs.existsSync(subK6)) {
        fs.copyFileSync(subK6, k6ExePath);
      }
    }
  }

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  if (fs.existsSync(k6ExePath)) {
    console.log(`✅ k6 installed successfully at: ${k6ExePath}`);
  } else {
    console.error('⚠️ Could not locate k6.exe after extraction');
  }
}

main().catch((err) => {
  console.error('Error installing k6:', err);
});

