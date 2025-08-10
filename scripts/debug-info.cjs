#!/usr/bin/env node
/**
 * Debug Environment Information Script
 * Run this when reporting bugs or debugging issues
 */

console.log('='.repeat(60));
console.log('🔍 DEBUGGING ENVIRONMENT INFO');
console.log('='.repeat(60));

// Node.js Version Info
console.log('📦 Node.js Info:');
console.log(`   Version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Architecture: ${process.arch}`);
console.log(`   Node Path: ${process.execPath}`);

// NPM Version
try {
  const { execSync } = require('child_process');
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`   NPM Version: ${npmVersion}`);
} catch (error) {
  console.log(`   NPM Version: Unable to detect`);
}

// Environment Variables
console.log('\n🌍 Environment:');
const relevantEnvVars = [
  'NODE_ENV',
  'PATH',
  'NVM_DIR',
  'NVM_BIN',
  'NODE_PATH',
  'FOLDER_MCP_DEVELOPMENT_ENABLED'
];

relevantEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    // Truncate PATH for readability
    const displayValue = envVar === 'PATH' 
      ? value.split(':').slice(0, 5).join(':') + '...' 
      : value;
    console.log(`   ${envVar}: ${displayValue}`);
  }
});

// Package.json engines check
console.log('\n⚙️  Project Requirements:');
try {
  const fs = require('fs');
  const path = require('path');
  // Find package.json by walking up from script location
  let pkgPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    pkgPath = path.join(__dirname, '..', 'package.json');
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.engines) {
    Object.entries(pkg.engines).forEach(([engine, version]) => {
      console.log(`   ${engine}: ${version}`);
    });
  }
  
  // Check if current Node version satisfies requirements
  const currentMajor = parseInt(process.version.slice(1));
  const requiredMajor = parseInt(pkg.engines?.node?.replace('>=', '') || '0');
  
  if (currentMajor >= requiredMajor) {
    console.log(`   ✅ Node version requirement satisfied`);
  } else {
    console.log(`   ❌ Node version requirement NOT satisfied`);
    console.log(`      Current: ${process.version}, Required: ${pkg.engines.node}`);
  }
} catch (error) {
  console.log('   Unable to read package.json:', error.message);
  console.log('   CWD:', process.cwd());
  console.log('   Script dir:', __dirname);
}

// Operating System Specific Info
console.log('\n💻 OS Specific:');
if (process.platform === 'win32') {
  console.log('   Windows detected - potential Node version manager: nvm-windows');
  try {
    const { execSync } = require('child_process');
    const whereNode = execSync('where node', { encoding: 'utf8' }).trim();
    console.log(`   Node executable path: ${whereNode.split('\n')[0]}`);
  } catch (error) {
    console.log('   Could not determine node executable path');
  }
} else {
  console.log('   Unix-like OS detected - potential Node version manager: nvm');
}

// Quick dependency check
console.log('\n📚 Key Dependencies Status:');
try {
  const fs = require('fs');
  const path = require('path');
  // Find package.json by walking up from script location
  let pkgPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    pkgPath = path.join(__dirname, '..', 'package.json');
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const keyDeps = ['typescript', 'vitest', '@types/node'];
  
  keyDeps.forEach(dep => {
    const version = pkg.devDependencies?.[dep] || pkg.dependencies?.[dep];
    if (version) {
      console.log(`   ${dep}: ${version}`);
    } else {
      console.log(`   ${dep}: Not found in package.json`);
    }
  });
} catch (error) {
  console.log('   Could not read package.json dependencies:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('💡 DEBUGGING TIPS:');
console.log('• Include this output when reporting bugs');
console.log('• Contributors: run `npm run debug:info` before debugging');
console.log('• Windows users: Use `nvm use` to switch Node versions');
console.log('• macOS/Linux users: Use `nvm use` in project directory');
console.log('='.repeat(60));