import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Building Vue application...');
execSync('npm run build-only', { stdio: 'inherit' });

console.log('Copying files to root for NeutralinoJS...');

// Copy dist contents to root if needed
const distFiles = ['index.html', 'assets', 'favicon.ico'];
for (const file of distFiles) {
  const srcPath = join('dist', file);
  if (existsSync(srcPath)) {
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, file);
    } else {
      copyFileSync(srcPath, file);
    }
    console.log(`Copied ${file}`);
  }
}

console.log('Building NeutralinoJS package...');
execSync('npx @neutralinojs/neu build --release', { stdio: 'inherit' });

console.log('Build complete!');
