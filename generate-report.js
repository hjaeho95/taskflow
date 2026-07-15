const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  ShadingType,
} = require('docx');

const RESULTS_PATH = path.join(__dirname, 'test-results', 'results.json');
const OUTPUT_DIR = path.join(__dirname, 'docs');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'api-test-report.docx');

const raw = fs.readFileSync(RESULTS_PATH, 'utf-8');
const report = JSON.parse(raw);

// Flatten suites -> cases: { group, title, status, duration, errorMessage }
function collectCases(suites, groupPath = []) {
  const cases = [];
  for (const suite of suites) {
    const nextPath = suite.title ? [...groupPath, suite.title] : groupPath;
    for (const spec of suite.specs || []) {
      const test = spec.tests && spec.tests[0];
      const result = test && test.results && test.results[0];
      cases.push({
        group: nextPath.join(' / ') || '(root)',
        title: spec.title,
        status: result ? result.status : 'unknown',
        duration: result ? result.duration : 0,
        errorMessage:
          result && result.errors && result.errors.length
            ? result.errors.map((e) => e.message).join('\n')
            : '',
      });
    }
    if (suite.suites && suite.suites.length) {
      cases.push(...collectCases(suite.suites, nextPath));
    }
  }
  return cases;
}

const cases = [];
for (const fileSuite of report.suites || []) {
  cases.push(...collectCases(fileSuite.suites || [], []));
}

const passed = cases.filter((c) => c.status === 'passed').length;
const failed = cases.filter((c) => c.status !== 'passed').length;
const total = cases.length;
const generatedAt = new Date().toLocaleString('ko-KR');

function statusCellShading(status) {
  return status === 'passed'
    ? { type: ShadingType.CLEAR, color: 'auto', fill: 'DFF5E1' }
    : { type: ShadingType.CLEAR, color: 'auto', fill: 'FBE1E1' };
}

function headerCell(text) {
  return new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '2F2F3A' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
      }),
    ],
  });
}

function bodyCell(text, opts = {}) {
  return new TableCell({
    shading: opts.shading,
    children: [new Paragraph({ children: [new TextRun({ text: String(text) })] })],
  });
}

const headerRow = new TableRow({
  children: [
    headerCell('그룹'),
    headerCell('테스트 케이스'),
    headerCell('결과'),
    headerCell('소요시간(ms)'),
    headerCell('비고'),
  ],
});

const bodyRows = cases.map(
  (c) =>
    new TableRow({
      children: [
        bodyCell(c.group),
        bodyCell(c.title),
        bodyCell(c.status === 'passed' ? 'PASS' : 'FAIL', { shading: statusCellShading(c.status) }),
        bodyCell(c.duration),
        bodyCell(c.errorMessage || '-'),
      ],
    }),
);

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          text: 'TaskFlow API 엔드포인트 테스트 보고서',
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({ text: `생성일시: ${generatedAt}`, spacing: { after: 200 } }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          text: '요약',
        }),
        new Paragraph({ text: `전체 케이스: ${total}건` }),
        new Paragraph({ text: `성공: ${passed}건` }),
        new Paragraph({ text: `실패: ${failed}건`, spacing: { after: 200 } }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          text: '케이스별 상세 결과',
          spacing: { after: 100 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows],
        }),
      ],
    },
  ],
});

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`Report written to ${OUTPUT_PATH} (${passed}/${total} passed)`);
});
