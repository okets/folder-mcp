// Test to debug panel height issues

const terminalHeight = 24; // Standard terminal height
const HEADER_HEIGHT = 4; // 3 lines + 1 margin
const STATUS_BAR_HEIGHT = 3; // border + content + border

const availableHeight = terminalHeight - HEADER_HEIGHT - STATUS_BAR_HEIGHT;

console.log('Terminal Layout Analysis');
console.log('=======================');
console.log(`Terminal height: ${terminalHeight} rows`);
console.log(`Header height: ${HEADER_HEIGHT} rows`);
console.log(`Status bar height: ${STATUS_BAR_HEIGHT} rows`);
console.log(`Available for panels: ${availableHeight} rows`);
console.log('');

// Configuration Panel
const configBoxOverhead = 3; // top border + bottom border + subtitle
const configMaxLines = availableHeight - configBoxOverhead;

console.log('Configuration Panel:');
console.log(`- Total height: ${availableHeight} rows`);
console.log(`- Box overhead: ${configBoxOverhead} rows`);
console.log(`- Content lines: ${configMaxLines} rows`);
console.log('');

// Status Panel (from the code)
const statusBoxOverhead = 3; // Same as config
const statusMaxLines = availableHeight - statusBoxOverhead;

console.log('Status Panel:');
console.log(`- Total height: ${availableHeight} rows`); 
console.log(`- Box overhead: ${statusBoxOverhead} rows`);
console.log(`- Content lines: ${statusMaxLines} rows`);
console.log('');

// Visual representation
console.log('Visual Layout:');
console.log('Row 1-3: Header (with margin)');
console.log(`Row 4-${3 + availableHeight}: Panels (height=${availableHeight})`);
console.log(`Row ${4 + availableHeight}-${terminalHeight}: Status bar`);