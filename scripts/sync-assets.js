/**
 * Bidirectional Asset Synchronizer
 * Keeps root source files and public/ distribution files perfectly in sync.
 * Whenever a file in data/ or src/ is modified, it updates public/, and vice versa.
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const PAIRS = [
  { src: 'index.html', dest: 'public/index.html' },
  { src: 'data/exams-catalog.json', dest: 'public/data/exams-catalog.json' },
  { srcDir: 'data/exams', destDir: 'public/data/exams', ext: '.json' },
  { srcDir: 'src', destDir: 'public/js', ext: '.js' },
  { srcDir: 'src', destDir: 'public/css', ext: '.css' }
];

function syncFilePair(pathA, pathB) {
  const existsA = fs.existsSync(pathA);
  const existsB = fs.existsSync(pathB);

  if (!existsA && !existsB) return;

  if (existsA && !existsB) {
    fs.mkdirSync(path.dirname(pathB), { recursive: true });
    fs.copyFileSync(pathA, pathB);
    console.log(`[sync] Copied ${pathA} -> ${pathB}`);
    return;
  }

  if (!existsA && existsB) {
    fs.mkdirSync(path.dirname(pathA), { recursive: true });
    fs.copyFileSync(pathB, pathA);
    console.log(`[sync] Copied ${pathB} -> ${pathA}`);
    return;
  }

  const statA = fs.statSync(pathA);
  const statB = fs.statSync(pathB);

  // If one file is newer by more than 1 second, sync newer to older
  const diff = statA.mtimeMs - statB.mtimeMs;
  if (diff > 1000) {
    fs.copyFileSync(pathA, pathB);
    fs.utimesSync(pathB, statA.atime, statA.mtime);
    console.log(`[sync] Updated ${pathB} from newer ${pathA}`);
  } else if (diff < -1000) {
    fs.copyFileSync(pathB, pathA);
    fs.utimesSync(pathA, statB.atime, statB.mtime);
    console.log(`[sync] Updated ${pathA} from newer ${pathB}`);
  }
}

function syncDirectoryPair(dirA, dirB, ext) {
  const fullA = path.join(ROOT_DIR, dirA);
  const fullB = path.join(ROOT_DIR, dirB);

  if (!fs.existsSync(fullA)) fs.mkdirSync(fullA, { recursive: true });
  if (!fs.existsSync(fullB)) fs.mkdirSync(fullB, { recursive: true });

  const filesA = fs.readdirSync(fullA).filter(f => !ext || f.endsWith(ext));
  const filesB = fs.readdirSync(fullB).filter(f => !ext || f.endsWith(ext));
  const allFiles = Array.from(new Set([...filesA, ...filesB]));

  for (const file of allFiles) {
    syncFilePair(path.join(fullA, file), path.join(fullB, file));
  }
}

console.log('[sync] Synchronizing workspace assets...');
for (const pair of PAIRS) {
  if (pair.src && pair.dest) {
    syncFilePair(path.join(ROOT_DIR, pair.src), path.join(ROOT_DIR, pair.dest));
  } else if (pair.srcDir && pair.destDir) {
    syncDirectoryPair(pair.srcDir, pair.destDir, pair.ext);
  }
}
console.log('[sync] Assets synchronization complete.');
