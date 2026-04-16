import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy static files to dist
const staticFiles = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'alert.html',
  'alert.css',
  'alert.js',
  'icons',
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyStatics() {
  for (const file of staticFiles) {
    const src = path.join('src', file);
    const dest = path.join('dist', file);
    copyRecursive(src, dest);
  }
  console.log('[build] Static files copied to dist/');
}

copyStatics();

// Bundle the background service worker
const buildOptions = {
  entryPoints: ['src/background.js'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'esm',
  target: ['chrome120'],
  platform: 'browser',
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
  // Exclude Node.js built-in modules that magika's optional deps try to pull in
  external: [],
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[build] Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('[build] Background script bundled successfully.');
  console.log('[build] Extension ready in dist/');
}
