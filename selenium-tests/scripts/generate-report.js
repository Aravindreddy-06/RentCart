/**
 * scripts/generate-report.js
 * Builds reports/selenium-test-report.xlsx from results/results.json using ExcelJS.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const ExcelJS = require('exceljs');

async function generateReport() {
  const resultsPath = path.resolve(__dirname, '../results/results.json');
  const reportDir = path.resolve(__dirname, '../reports');
  const outputPath = path.join(reportDir, 'selenium-test-report.xlsx');

  if (!fs.existsSync(resultsPath)) {
    console.error(`❌ Error: Results file not found at: ${resultsPath}`);
    process.exit(1);
  }

  let data;
  try {
    const rawData = fs.readFileSync(resultsPath, 'utf8');
    data = JSON.parse(rawData);
  } catch (err) {
    console.error(`❌ Error: Failed to parse ${resultsPath}: ${err.message}`);
    process.exit(1);
  }

  // Fail loudly if results.json contains 0 tests or is missing test records
  if (!data || !Array.isArray(data.tests) || data.tests.length === 0 || !data.total || data.total === 0) {
    const testCount = data && Array.isArray(data.tests) ? data.tests.length : 0;
    const totalField = data ? data.total : 0;
    console.error(`❌ Error: ${resultsPath} contains 0 tests (total: ${totalField}, tests array: ${testCount}). Refusing to generate empty Excel workbook.`);
    process.exit(1);
  }

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RentCart Selenium WebDriver Test Automation';
  workbook.created = new Date();

  // Dynamic environment resolution
  const osType = os.type();
  const osRelease = os.release();
  const osArch = os.arch();
  let platformDesc = osType === 'Windows_NT' ? `Windows ${osRelease}` : osType === 'Linux' ? `Linux ${osRelease}` : `${osType} ${osRelease}`;
  const browserPlatform = `Google Chrome (Headless) / ${platformDesc} (${osArch})`;
  const webBaseUrl = process.env.WEB_BASE_URL || data.webBaseUrl || 'http://localhost:5173';
  const apiBaseUrl = process.env.API_BASE_URL || data.apiBaseUrl || 'http://localhost:4000';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SHEET: Summary
  // ─────────────────────────────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  summarySheet.mergeCells('B2:G2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = `${data.suite || 'RentCart Web Selenium Automated Test Suite'} - Execution Summary`;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F9D8A' }, // RentCart Teal
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 38;

  // Metadata Table (Dynamic Platform & URLs)
  const metaRows = [
    ['Suite Name', data.suite || 'Selenium WebDriver Web E2E Suite'],
    ['Run Date', data.runDate || new Date().toISOString()],
    ['Web Base URL', webBaseUrl],
    ['API Base URL', apiBaseUrl],
    ['Browser / Platform', browserPlatform],
    ['Total Tests', data.total || 0],
    ['Passed', data.passed || 0],
    ['Failed', data.failed || 0],
    ['Skipped', data.skipped || 0],
    ['Pass Rate', `${data.passRate || (data.total ? ((data.passed / data.total) * 100).toFixed(1) + '%' : '0%')}`],
    ['Total Duration', typeof data.totalDurationMs === 'number' ? `${(data.totalDurationMs / 1000).toFixed(2)} s` : data.totalDuration || '0 s'],
  ];

  let currentMetaRow = 4;
  for (const [label, val] of metaRows) {
    const lblCell = summarySheet.getCell(`B${currentMetaRow}`);
    const valCell = summarySheet.getCell(`C${currentMetaRow}`);

    lblCell.value = label;
    lblCell.font = { bold: true, size: 11, color: { argb: 'FF334155' } };
    lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    lblCell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    valCell.value = val;
    valCell.font = { size: 11, bold: label === 'Pass Rate' || label === 'Total Tests' };
    if (label === 'Pass Rate') {
      const rateNum = parseFloat(String(val).replace('%', ''));
      valCell.font = {
        bold: true,
        size: 11,
        color: { argb: rateNum >= 95 ? 'FF16A34A' : rateNum >= 80 ? 'FFEAB308' : 'FFE11D48' },
      };
    }
    valCell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    summarySheet.getRow(currentMetaRow).height = 20;
    currentMetaRow++;
  }

  // Module Breakdown Table
  const moduleStartRow = currentMetaRow + 2;
  summarySheet.mergeCells(`B${moduleStartRow}:G${moduleStartRow}`);
  const modHeader = summarySheet.getCell(`B${moduleStartRow}`);
  modHeader.value = 'Module Breakdown & Results Distribution';
  modHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  modHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  modHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(moduleStartRow).height = 28;

  const tableHeaders = ['Module', 'Total', 'Passed', 'Failed', 'Skipped', 'Pass Rate'];
  const colLetters = ['B', 'C', 'D', 'E', 'F', 'G'];
  const headerRowIdx = moduleStartRow + 1;

  for (let i = 0; i < tableHeaders.length; i++) {
    const c = summarySheet.getCell(`${colLetters[i]}${headerRowIdx}`);
    c.value = tableHeaders[i];
    c.font = { bold: true, size: 10, color: { argb: 'FF475569' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  summarySheet.getRow(headerRowIdx).height = 22;

  let rowIdx = headerRowIdx + 1;
  const modules = data.moduleSummary || [];
  for (const m of modules) {
    const rowValues = [
      m.module,
      m.total,
      m.passed,
      m.failed,
      m.skipped,
      m.passRate || `${m.total ? ((m.passed / m.total) * 100).toFixed(1) + '%' : '0%'}`,
    ];

    for (let i = 0; i < rowValues.length; i++) {
      const cell = summarySheet.getCell(`${colLetters[i]}${rowIdx}`);
      cell.value = rowValues[i];
      cell.font = { size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (i === 0) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      if (i === 5) {
        const rateNum = parseFloat(String(rowValues[i]).replace('%', ''));
        cell.font = {
          bold: true,
          size: 10,
          color: { argb: rateNum === 100 ? 'FF16A34A' : rateNum >= 80 ? 'FFEAB308' : 'FFE11D48' },
        };
      }
    }
    summarySheet.getRow(rowIdx).height = 20;
    rowIdx++;
  }

  summarySheet.getColumn('A').width = 4;
  summarySheet.getColumn('B').width = 36;
  summarySheet.getColumn('C').width = 16;
  summarySheet.getColumn('D').width = 14;
  summarySheet.getColumn('E').width = 14;
  summarySheet.getColumn('F').width = 14;
  summarySheet.getColumn('G').width = 16;

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SHEET: Test Details
  // ─────────────────────────────────────────────────────────────────────────────
  const detailsSheet = workbook.addWorksheet('Test Details', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  const detailHeaders = [
    'TC ID',
    'Module',
    'Test Title',
    'Preconditions',
    'Steps',
    'Expected Result',
    'Actual Result',
    'Status',
    'Duration (ms)',
    'Error',
    'Timestamp',
  ];

  const headerRow = detailsSheet.addRow(detailHeaders);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F9D8A' }, // RentCart Teal
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0D8C7A' } },
      bottom: { style: 'medium', color: { argb: 'FF0D8C7A' } },
      left: { style: 'thin', color: { argb: 'FF5EEAD4' } },
      right: { style: 'thin', color: { argb: 'FF5EEAD4' } },
    };
  });

  const tests = data.tests || [];
  for (const t of tests) {
    const row = detailsSheet.addRow([
      t.id,
      t.module,
      t.title,
      t.preconditions || 'N/A',
      t.steps || 'N/A',
      t.expectedResult || 'N/A',
      t.actualResult || (t.status === 'PASS' ? 'Executed successfully matching expected UI result' : 'UI assertion failed'),
      t.status,
      t.duration || 0,
      t.error || '',
      t.timestamp || new Date().toISOString(),
    ]);

    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Status column (col 8) styling
      if (colNumber === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (t.status === 'PASS') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
          cell.font = { bold: true, color: { argb: 'FF155724' } };
        } else if (t.status === 'FAIL') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
          cell.font = { bold: true, color: { argb: 'FF721C24' } };
        } else {
          // SKIPPED
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } };
          cell.font = { bold: true, color: { argb: 'FF383D41' } };
        }
      } else if (colNumber === 1 || colNumber === 9 || colNumber === 11) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      }
    });
  }

  // Column widths
  detailsSheet.getColumn(1).width = 16;  // TC ID
  detailsSheet.getColumn(2).width = 24;  // Module
  detailsSheet.getColumn(3).width = 46;  // Test Title
  detailsSheet.getColumn(4).width = 30;  // Preconditions
  detailsSheet.getColumn(5).width = 42;  // Steps
  detailsSheet.getColumn(6).width = 36;  // Expected Result
  detailsSheet.getColumn(7).width = 42;  // Actual Result
  detailsSheet.getColumn(8).width = 14;  // Status
  detailsSheet.getColumn(9).width = 14;  // Duration (ms)
  detailsSheet.getColumn(10).width = 40; // Error
  detailsSheet.getColumn(11).width = 24; // Timestamp

  // Auto-filter across all columns
  detailsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: tests.length + 1, column: detailHeaders.length },
  };

  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Selenium Excel report successfully generated: ${outputPath}`);
}

if (require.main === module) {
  generateReport().catch((err) => {
    console.error('Failed to generate selenium report:', err);
    process.exit(1);
  });
}

module.exports = { generateReport };

