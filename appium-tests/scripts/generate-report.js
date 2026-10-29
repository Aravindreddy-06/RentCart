/**
 * scripts/generate-report.js
 * Generates reports/appium-test-report.xlsx from results/results.json using ExcelJS.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function generateReport() {
  const resultsPath = path.resolve(__dirname, '../results/results.json');
  const reportDir = path.resolve(__dirname, '../reports');
  const outputPath = path.join(reportDir, 'appium-test-report.xlsx');

  if (!fs.existsSync(resultsPath)) {
    console.error(`Results file not found at: ${resultsPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(resultsPath, 'utf8');
  const data = JSON.parse(rawData);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RentCart Appium Mobile Test Automation';
  workbook.created = new Date();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SHEET: Summary
  // ─────────────────────────────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  summarySheet.mergeCells('B2:G2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = `${data.suite || 'RentCart Mobile Appium 2 Automated Test Suite'} - Execution Summary`;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F9D8A' }, // RentCart Teal
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 38;

  // Metadata Table
  const metaRows = [
    ['Suite Name', data.suite || 'RentCart Mobile Appium Suite'],
    ['Run Date', data.runDate || new Date().toISOString()],
    ['Package Name', 'com.rentcart.app'],
    ['Platform & Driver', 'Android / UiAutomator2 (Appium 2)'],
    ['API Base URL', process.env.API_BASE_URL || 'http://10.0.2.2:4000'],
    ['Total Tests', data.total || 0],
    ['Passed', data.passed || 0],
    ['Failed', data.failed || 0],
    ['Skipped', data.skipped || 0],
    ['Pass Rate', data.passRate || '0%'],
    ['Total Duration', `${((data.totalDurationMs || 0) / 1000).toFixed(2)} s`],
  ];

  let curRow = 4;
  for (const [k, v] of metaRows) {
    const r = summarySheet.getRow(curRow);
    r.getCell(2).value = k;
    r.getCell(2).font = { bold: true, name: 'Calibri', size: 11 };
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    r.getCell(3).value = v;
    r.getCell(3).font = { name: 'Calibri', size: 11 };
    r.getCell(2).border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    r.getCell(3).border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    curRow++;
  }

  // Module Breakdown Header
  curRow += 2;
  const modHeaderRow = summarySheet.getRow(curRow);
  const modHeaders = ['Module', 'Total Tests', 'Passed', 'Failed', 'Skipped', 'Pass Rate'];
  modHeaders.forEach((h, i) => {
    const c = modHeaderRow.getCell(i + 2);
    c.value = h;
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
  });
  modHeaderRow.height = 24;

  const modules = data.moduleSummary || [];
  for (const m of modules) {
    curRow++;
    const row = summarySheet.getRow(curRow);
    row.getCell(2).value = m.module;
    row.getCell(3).value = m.total;
    row.getCell(4).value = m.passed;
    row.getCell(5).value = m.failed;
    row.getCell(6).value = m.skipped;
    row.getCell(7).value = m.passRate;

    row.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
    for (let col = 3; col <= 7; col++) {
      row.getCell(col).alignment = { horizontal: 'center' };
      row.getCell(col).font = { name: 'Calibri', size: 10 };
    }
  }

  summarySheet.getColumn(2).width = 30;
  summarySheet.getColumn(3).width = 16;
  summarySheet.getColumn(4).width = 14;
  summarySheet.getColumn(5).width = 14;
  summarySheet.getColumn(6).width = 14;
  summarySheet.getColumn(7).width = 16;

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

  const headerRow = detailsSheet.getRow(1);
  detailHeaders.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F9D8A' },
    };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF0B7A6B' } },
      bottom: { style: 'medium', color: { argb: 'FF09665A' } },
      left: { style: 'thin', color: { argb: 'FF0B7A6B' } },
      right: { style: 'thin', color: { argb: 'FF0B7A6B' } },
    };
  });
  headerRow.height = 28;

  const tests = data.tests || [];
  let rIndex = 2;

  for (const t of tests) {
    const row = detailsSheet.getRow(rIndex);

    row.getCell(1).value = t.id;
    row.getCell(2).value = t.module;
    row.getCell(3).value = t.title;
    row.getCell(4).value = t.preconditions || 'N/A';
    row.getCell(5).value = t.steps || 'N/A';
    row.getCell(6).value = t.expectedResult || 'N/A';
    row.getCell(7).value = t.actualResult || 'N/A';
    row.getCell(8).value = t.status;
    row.getCell(9).value = t.duration || 0;
    row.getCell(10).value = t.error || '';
    row.getCell(11).value = t.timestamp || new Date().toISOString();

    const isEven = rIndex % 2 === 0;
    const zebraBg = isEven ? 'FFF9FAFB' : 'FFFFFFFF';

    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
    }

    // Status styling
    const statusCell = row.getCell(8);
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
    statusCell.font = { name: 'Calibri', size: 10, bold: true };

    if (t.status === 'PASS') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF155724' } };
    } else if (t.status === 'FAIL') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF721C24' } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } };
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF383D41' } };
    }

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };

    row.height = 22;
    rIndex++;
  }

  detailsSheet.getColumn(1).width = 16;  // TC ID
  detailsSheet.getColumn(2).width = 24;  // Module
  detailsSheet.getColumn(3).width = 36;  // Test Title
  detailsSheet.getColumn(4).width = 28;  // Preconditions
  detailsSheet.getColumn(5).width = 34;  // Steps
  detailsSheet.getColumn(6).width = 32;  // Expected Result
  detailsSheet.getColumn(7).width = 32;  // Actual Result
  detailsSheet.getColumn(8).width = 14;  // Status
  detailsSheet.getColumn(9).width = 14;  // Duration (ms)
  detailsSheet.getColumn(10).width = 40; // Error
  detailsSheet.getColumn(11).width = 24; // Timestamp

  detailsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: tests.length + 1, column: detailHeaders.length },
  };

  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Appium Excel report successfully generated: ${outputPath}`);
}

if (require.main === module) {
  generateReport().catch((err) => {
    console.error('Failed to generate appium report:', err);
    process.exit(1);
  });
}

module.exports = { generateReport };

