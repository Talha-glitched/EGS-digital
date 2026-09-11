import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const clientSrcAssets = path.join(projectRoot, 'client', 'src', 'assets');
const uploadsMediaDir = path.join(projectRoot, 'uploads', 'media');
const portfolioDataDir = path.join(projectRoot, 'client', 'src', 'portfolio', 'data');

// Ensure destination directories exist
fs.mkdirSync(path.join(uploadsMediaDir, 'site'), { recursive: true });
fs.mkdirSync(path.join(uploadsMediaDir, 'graduation'), { recursive: true });
fs.mkdirSync(path.join(uploadsMediaDir, 'shortlist'), { recursive: true });
fs.mkdirSync(portfolioDataDir, { recursive: true });

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('1. Copying site videos to uploads/media/site...');
const siteFiles = [
  'hctgraduation.mp4',
  'Rak-Edited.mp4',
  'HCT.jpeg',
  'roast-retail.jpeg',
  'hct-fitout.jpeg'
];

for (const file of siteFiles) {
  const src = path.join(clientSrcAssets, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(uploadsMediaDir, 'site', file));
    console.log(`  Copied ${file}`);
  }
}

console.log('\n2. Copying Graduation assets to uploads/media/graduation...');
const graduationSrc = path.join(clientSrcAssets, 'Graduation');
copyRecursive(graduationSrc, path.join(uploadsMediaDir, 'graduation'));
console.log('  Graduation assets copied.');

console.log('\n3. Copying Shortlist assets to uploads/media/shortlist...');
const shortlistSrc = path.join(clientSrcAssets, 'Existing Website Shortlist');
copyRecursive(shortlistSrc, path.join(uploadsMediaDir, 'shortlist'));
console.log('  Shortlist assets copied.');

// Generate Manifest for Graduation
console.log('\n4. Generating graduationManifest.json...');
function walkDir(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    if (item === '.DS_Store') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(walkDir(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push(relPath);
    }
  }
  return files;
}

const gradGalleryDir = path.join(uploadsMediaDir, 'graduation', 'Websites Gallery Graduations');
const gradFiles = walkDir(gradGalleryDir);
const graduationManifest = gradFiles.map((rel) => ({
  relativePath: rel,
  url: `/media/graduation/Websites Gallery Graduations/${rel}`,
  filename: path.basename(rel)
}));

fs.writeFileSync(
  path.join(portfolioDataDir, 'graduationManifest.json'),
  JSON.stringify(graduationManifest, null, 2),
  'utf-8'
);
console.log(`  graduationManifest.json generated with ${graduationManifest.length} items.`);

// Generate Manifest for Shortlist
console.log('\n5. Generating shortlistManifest.json...');
const shortlistDir = path.join(uploadsMediaDir, 'shortlist');
const shortlistFiles = walkDir(shortlistDir);
const shortlistManifest = shortlistFiles.map((rel) => ({
  relativePath: rel,
  url: `/media/shortlist/${rel}`,
  filename: path.basename(rel)
}));

fs.writeFileSync(
  path.join(portfolioDataDir, 'shortlistManifest.json'),
  JSON.stringify(shortlistManifest, null, 2),
  'utf-8'
);
console.log(`  shortlistManifest.json generated with ${shortlistManifest.length} items.`);

console.log('\nMedia preparation complete.');
