/**
 * scripts/generate-report.js
 * Builds reports/api-test-report.xlsx from results/results.json using ExcelJS
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const ExcelJS = require('exceljs');

async function generateReport() {
  const resultsPath = path.resolve(__dirname, '../results/results.json');
  const reportDir = path.resolve(__dirname, '../reports');
  const outputPath = path.join(reportDir, 'api-test-report.xlsx');

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
  workbook.creator = 'RentCart Automation Test Runner';
  workbook.created = new Date();

  // Dynamic environment resolution
  const osType = os.type();
  const osRelease = os.release();
  const osArch = os.arch();
  let platformDesc = osType === 'Windows_NT' ? `Windows ${osRelease}` : osType === 'Linux' ? `Linux ${osRelease}` : `${osType} ${osRelease}`;
  const runtimePlatform = `Node.js ${process.version} / ${platformDesc} (${osArch})`;
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
  titleCell.value = `${data.suite || 'RentCart API Automated Test Suite'} - Execution Summary`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F9D8A' }, // RentCart Teal
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 40;

  // Metadata Table (Dynamic Environment & Platform)
  const metaRows = [
    ['Suite Name', data.suite || 'API Test Suite'],
    ['Run Date', data.runDate || new Date().toISOString()],
    ['API Base URL', apiBaseUrl],
    ['Environment / Platform', runtimePlatform],
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
    currentMetaRow++;
  }

  // Module Breakdown Table
  const moduleStartRow = currentMetaRow + 2;
  summarySheet.mergeCells(`B${moduleStartRow}:G${moduleStartRow}`);
  const moduleTitleCell = summarySheet.getCell(`B${moduleStartRow}`);
  moduleTitleCell.value = 'Module Execution Breakdown';
  moduleTitleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  moduleTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  moduleTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(moduleStartRow).height = 28;

  const moduleHeaderRow = moduleStartRow + 1;
  const modHeaders = ['Module', 'Total', 'Passed', 'Failed', 'Skipped', 'Pass Rate'];
  const modColLetters = ['B', 'C', 'D', 'E', 'F', 'G'];

  for (let i = 0; i < modHeaders.length; i++) {
    const cell = summarySheet.getCell(`${modColLetters[i]}${moduleHeaderRow}`);
    cell.value = modHeaders[i];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
  }
  summarySheet.getRow(moduleHeaderRow).height = 22;

  let rowIdx = moduleHeaderRow + 1;
  const moduleList = data.moduleSummary || [];

  for (const m of moduleList) {
    const vals = [
      m.module,
      m.total,
      m.passed,
      m.failed,
      m.skipped,
      m.passRate || (m.total ? ((m.passed / m.total) * 100).toFixed(1) + '%' : '0%'),
    ];

    for (let c = 0; c < vals.length; c++) {
      const cell = summarySheet.getCell(`${modColLetters[c]}${rowIdx}`);
      cell.value = vals[c];
      cell.font = { size: 10 };
      cell.alignment = { horizontal: c === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (c === 5) {
        const rateNum = parseFloat(String(vals[c]).replace('%', ''));
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
      t.actualResult || (t.status === 'PASS' ? 'Executed successfully matching expected result' : 'Failed to match expected result'),
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

  // Enable AutoFilter on header row
  detailsSheet.autoFilter = {
    from: 'A1',
    to: 'K1',
  };

  // Column Widths
  detailsSheet.getColumn(1).width = 18; // TC ID
  detailsSheet.getColumn(2).width = 24; // Module
  detailsSheet.getColumn(3).width = 36; // Title
  detailsSheet.getColumn(4).width = 28; // Preconditions
  detailsSheet.getColumn(5).width = 42; // Steps
  detailsSheet.getColumn(6).width = 32; // Expected Result
  detailsSheet.getColumn(7).width = 32; // Actual Result
  detailsSheet.getColumn(8).width = 14; // Status
  detailsSheet.getColumn(9).width = 14; // Duration
  detailsSheet.getColumn(10).width = 30; // Error
  detailsSheet.getColumn(11).width = 24; // Timestamp

  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Excel report successfully generated: ${outputPath}`);
}

generateReport().catch((err) => {
  console.error('Failed to generate Excel report:', err);
  process.exit(1);
});

