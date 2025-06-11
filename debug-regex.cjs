const fs = require('fs');
const path = require('path');

const files = [
  'src/di/services.ts',
  'src/parsers/index.ts', 
  'src/utils/errorRecovery.ts',
  'src/watch/index.ts'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  console.log(`\n=== Checking ${filePath} ===`);
  
  if (!fs.existsSync(fullPath)) {
    console.log('File does not exist');
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]*}/g);
  
  if (catchBlocks) {
    console.log('Found', catchBlocks.length, 'catch blocks:');
    catchBlocks.forEach((block, i) => {
      console.log(`\nBlock ${i + 1}:`);
      console.log(block);
      const hasErrorHandling = 
        block.includes('logger') || 
        block.includes('loggingService') ||
        block.includes('console.') ||
        block.includes('throw') ||
        block.includes('handleError') ||
        block.includes('errors.push') ||
        block.includes('return false') ||
        block.includes('return null') ||
        block.includes('return undefined') ||
        block.includes('return {') ||
        block.includes('continue') ||
        block.includes('break');
      console.log('--- Has error handling?', hasErrorHandling);
    });
  } else {
    console.log('No catch blocks found');
  }
});
