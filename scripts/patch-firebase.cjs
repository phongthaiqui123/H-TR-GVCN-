const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. debugAssert on pendingPromise in resolve/reject
  const target1 = "debugAssert(this.pendingPromise, 'Pending promise was never set');";
  const target2 = 'debugAssert(this.pendingPromise, "Pending promise was never set");';
  const replacement = 'if (!this.pendingPromise) { return; }';

  if (content.includes(target1)) {
    content = content.replaceAll(target1, replacement);
    changed = true;
  }
  if (content.includes(target2)) {
    content = content.replaceAll(target2, replacement);
    changed = true;
  }

  // 2. In debugFail function, suppress "Pending promise was never set"
  const failTarget = 'const message = `INTERNAL ASSERTION FAILED: ` + failure;';
  if (content.includes(failTarget)) {
    content = content.replaceAll(
      failTarget,
      "if (failure === 'Pending promise was never set' || (typeof failure === 'string' && failure.includes('Pending promise'))) return; const message = `INTERNAL ASSERTION FAILED: ` + failure;"
    );
    changed = true;
  }

  const failTargetSimple = 'const message = "INTERNAL ASSERTION FAILED: " + failure;';
  if (content.includes(failTargetSimple)) {
    content = content.replaceAll(
      failTargetSimple,
      'if (failure === "Pending promise was never set" || (typeof failure === "string" && failure.includes("Pending promise"))) return; const message = "INTERNAL ASSERTION FAILED: " + failure;'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
      patchFile(fullPath);
    }
  }
}

console.log('Running Firebase Auth patch...');
walkDir(path.resolve(__dirname, '../node_modules/@firebase/auth'));
walkDir(path.resolve(__dirname, '../node_modules/.vite'));
console.log('Firebase Auth patch finished.');
