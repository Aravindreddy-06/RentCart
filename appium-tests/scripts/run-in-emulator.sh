#!/usr/bin/env bash
set -euo pipefail

# Navigate to appium-tests root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

echo "======================================================================"
echo "📱 RentCart Appium 2 Android Emulator Test Execution"
echo "======================================================================"

# Verify APK exists
TARGET_APK="${APP_PATH:-apk/app-release.apk}"
if [ ! -f "$TARGET_APK" ]; then
  echo "❌ ERROR: Android APK not found at '${TARGET_APK}'." >&2
  echo "Please ensure the APK is downloaded or set APP_PATH to a valid APK file path." >&2
  exit 1
fi

export APP_PATH="$(cd "$(dirname "$TARGET_APK")" && pwd)/$(basename "$TARGET_APK")"
echo "✅ Verified APK at: $APP_PATH"

# Start Appium server in background
echo "🚀 Starting Appium 2 server in background on port 4723..."
appium --port 4723 --log-level warn > appium.log 2>&1 &
APPIUM_PID=$!

cleanup() {
  echo "🛑 Stopping Appium server (PID: ${APPIUM_PID})..."
  if kill -0 "${APPIUM_PID}" 2>/dev/null; then
    kill "${APPIUM_PID}" 2>/dev/null || true
    wait "${APPIUM_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Wait until Appium responds on port 4723
echo "⏳ Waiting for Appium server to respond on http://127.0.0.1:4723/status..."
APPIUM_READY=false
for i in {1..30}; do
  if curl -s http://127.0.0.1:4723/status 2>/dev/null | grep -q '"ready":true'; then
    echo "✅ Appium server is ready!"
    APPIUM_READY=true
    break
  elif curl -s http://127.0.0.1:4723/status 2>/dev/null | grep -q "status"; then
    echo "✅ Appium server is responding!"
    APPIUM_READY=true
    break
  fi
  sleep 1
done

if [ "$APPIUM_READY" != "true" ]; then
  echo "❌ Appium server failed to respond within 30 seconds. Dumping appium.log:" >&2
  cat appium.log >&2 || true
  exit 1
fi

# Run tests and preserve exit code
echo "⚡ Executing Appium test suite..."
TEST_EXIT_CODE=0
npm test || TEST_EXIT_CODE=$?

# Always generate report
echo "📊 Generating Appium Excel test report..."
npm run report || true

echo "🏁 Appium execution completed with exit code: ${TEST_EXIT_CODE}"
exit ${TEST_EXIT_CODE}

