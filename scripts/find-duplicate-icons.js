const fs = require('fs');
const path = require('path');

function walk(dir, files=[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

function findDuplicatesInImport(importBlock) {
  const m = importBlock.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"];/m);
  if (!m) return null;
  const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
  const dup = names.filter((v,i)=> names.indexOf(v)!==i);
  return dup.length ? Array.from(new Set(dup)) : null;
}

const root = path.join(__dirname, '..', 'src');
const files = walk(root);
let found = false;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // find all import blocks from lucide-react (may be multiline)
  const re = /import\s*\{[\s\S]*?\}\s*from\s*['"]lucide-react['"];?/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const block = match[0];
    const dup = findDuplicatesInImport(block);
    if (dup) {
      console.log(file + ' -> duplicates: ' + dup.join(', '));
      found = true;
    }
  }
}
if (!found) {
  console.log('No duplicate lucide-react imports found');
}
