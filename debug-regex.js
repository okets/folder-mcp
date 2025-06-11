const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'config', 'system.ts');
console.log('Reading file:', filePath);
console.log('File exists:', fs.existsSync(filePath));

const content = fs.readFileSync(filePath, 'utf-8');
console.log('Content length:', content.length);
console.log('Contains catch:', content.includes('catch'));

const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]*}/g);

if (catchBlocks) {
  console.log('Found', catchBlocks.length, 'catch blocks:');
  catchBlocks.forEach((block, i) => {
    console.log(`\nBlock ${i + 1}:`);
    console.log(block);
    console.log('--- Has error handling?', 
      block.includes('logger') || 
      block.includes('console.') ||
      block.includes('loggingService') ||
      block.includes('continue') ||
      block.includes('return false') ||
      block.includes('return null') ||
      block.includes('return {')
    );
  });
} else {
  console.log('No catch blocks found');
}
