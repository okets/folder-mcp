#!/usr/bin/env node

/**
 * Script to fix all TextChunk creations to include mandatory semantic metadata
 * Sprint 10: Making semantic metadata mandatory throughout codebase
 */

const fs = require('fs');
const path = require('path');

// Files that need fixing based on TypeScript errors
const filesToFix = [
  'src/daemon/rest/server.ts',
  'src/infrastructure/embeddings/bridges/python-model-bridge.ts',
  'src/infrastructure/embeddings/python-embedding-service.ts',
  'src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts',
  'tests/helpers/mock-factories.ts',
  'tests/integration/onnx-model-bridge.test.ts',
  'tests/integration/services/python-embeddings.test.ts',
  'tests/unit/domain/embeddings.test.ts',
  'tests/unit/domain/search.test.ts'
];

function addSemanticMetadata(content, filePath) {
  // Add import if not present
  if (!content.includes('createDefaultSemanticMetadata')) {
    // Find existing imports from types
    const importRegex = /import\s+(?:type\s+)?{([^}]*?)}\s+from\s+['"]([^'"]+)['"]/g;
    let hasAdded = false;
    
    content = content.replace(importRegex, (match, imports, importPath) => {
      // Check if this is a types import
      if ((importPath.includes('types') || importPath.includes('index.js')) && !hasAdded) {
        hasAdded = true;
        if (!imports.includes('createDefaultSemanticMetadata')) {
          return match.replace(imports, imports.trim() + ', createDefaultSemanticMetadata');
        }
      }
      return match;
    });
    
    // If no types import was found, add one based on file location
    if (!hasAdded) {
      let importPath = '';
      if (filePath.startsWith('src/daemon/')) {
        importPath = '../../types/index.js';
      } else if (filePath.startsWith('src/infrastructure/embeddings/bridges/')) {
        importPath = '../../../../types/index.js';
      } else if (filePath.startsWith('src/infrastructure/embeddings/sqlite-vec/')) {
        importPath = '../../../../types/index.js';
      } else if (filePath.startsWith('src/infrastructure/embeddings/')) {
        importPath = '../../../types/index.js';
      } else if (filePath.startsWith('tests/helpers/')) {
        importPath = '../../src/types/index.js';
      } else if (filePath.startsWith('tests/integration/')) {
        importPath = '../../src/types/index.js';
      } else if (filePath.startsWith('tests/unit/domain/')) {
        importPath = '../../../src/types/index.js';
      }
      
      if (importPath) {
        // Find the last import statement
        const lastImportMatch = [...content.matchAll(/import\s+.*?from\s+['"].*?['"]\s*;?\s*\n/g)].pop();
        if (lastImportMatch) {
          const insertPos = lastImportMatch.index + lastImportMatch[0].length;
          content = content.substring(0, insertPos) + 
            `import { createDefaultSemanticMetadata } from '${importPath}';\n` +
            content.substring(insertPos);
        }
      }
    }
  }

  // Pattern 1: Add semanticMetadata to chunks with metadata object
  content = content.replace(
    /(\{\s*content:[^}]+chunkIndex:[^}]+metadata:\s*\{[^}]*\})\s*\}/g,
    (match, chunk) => {
      if (!match.includes('semanticMetadata')) {
        return chunk + ',\n            semanticMetadata: createDefaultSemanticMetadata()\n          }';
      }
      return match;
    }
  );

  // Pattern 2: Add semanticMetadata to chunks in arrays (test files)
  content = content.replace(
    /(\{\s*content:[^}]+chunkIndex:[^}]+metadata:\s*\{[^}]*\}\s*\})/g,
    (match) => {
      if (!match.includes('semanticMetadata')) {
        return match.replace(/\}\s*\}$/, '},\n            semanticMetadata: createDefaultSemanticMetadata()\n          }');
      }
      return match;
    }
  );

  // Pattern 3: Fix chunks that already have semanticMetadata in wrong place (inside metadata)
  content = content.replace(
    /metadata:\s*\{([^}]*?)semanticMetadata:\s*createDefaultSemanticMetadata\(\)([^}]*?)\}/g,
    (match, before, after) => {
      return `metadata: {${before}${after}}`;
    }
  );

  return content;
}

console.log('Sprint 10: Fixing semantic metadata in all files...\n');

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} (file not found)`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    content = addSemanticMetadata(content, filePath);
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n✨ Semantic metadata migration complete!');
console.log('Run `npm run build` to verify all TypeScript errors are resolved.');