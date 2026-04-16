// ============================================================
// Magika Chrome Extension — Background Service Worker
// Scans completed downloads using Google's Magika AI engine.
// All analysis runs locally. No data leaves the browser.
// ============================================================

import { Magika } from 'magika';

// ---- State ----
let magikaInstance = null;
let magikaLoading = false;
const scanCache = new Map();       // filePath -> scanResult
const recentScans = [];            // last N scan results for the popup
const MAX_RECENT = 50;

// ---- Risk classification ----
// File type labels that are commonly associated with executable or
// potentially dangerous content. Magika detects *file type*, not malware,
// so we flag types that warrant user caution.
const SUSPICIOUS_LABELS = new Set([
  'appleplist', 'batch', 'dex', 'elf', 'lnk', 'mach',
  'macho', 'msi', 'mscompress', 'pebin', 'pem', 'pgp',
  'php', 'powershell', 'shell', 'vba', 'javascript',
  'java', 'javabytecode', 'wasm',
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.msi',
  '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.ps1',
  '.dll', '.sys', '.cpl', '.hta', '.inf', '.reg',
  '.lnk', '.jar', '.dex', '.elf', '.sh', '.php',
]);

// ---- Magika Loader ----
async function getMagika() {
  if (magikaInstance) return magikaInstance;
  if (magikaLoading) {
    // Wait for the in-flight load to finish
    while (magikaLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return magikaInstance;
  }
  magikaLoading = true;
  try {
    console.log('[magika] Loading model...');
    magikaInstance = await Magika.create();
    console.log('[magika] Model loaded.');
  } catch (err) {
    console.error('[magika] Failed to load model:', err);
  } finally {
    magikaLoading = false;
  }
  return magikaInstance;
}

// Pre-warm during install / startup
getMagika();

// ---- File reading via fetch (file://) ----
async function readFileAsBytes(filePath) {
  // Chrome extensions with file:// host_permissions can fetch local files.
  // Normalise Windows paths to file:// URLs.
  let url = filePath;
  if (!filePath.startsWith('file://')) {
    url = 'file:///' + filePath.replace(/\\/g, '/');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch ${url}: ${response.status}`);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

// ---- Risk assessment ----
function assessRisk(prediction, filename) {
  const label = prediction.output?.label || prediction.dl?.label || 'unknown';
  const score = prediction.score ?? 0;
  const ext = (filename.match(/\.[^.]+$/) || [''])[0].toLowerCase();

  let risk = 'safe';
  let reason = '';

  if (SUSPICIOUS_LABELS.has(label)) {
    risk = 'suspicious';
    reason = `Detected type "${label}" is commonly associated with executable content.`;
  }
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    risk = 'suspicious';
    reason = `File extension "${ext}" is commonly used by executable programs.`;
  }
  // If model says it's one type but extension claims another, that's a red flag
  const expectedExts = prediction.output?.extensions || [];
  if (expectedExts.length > 0 && ext) {
    const cleanExt = ext.replace('.', '');
    if (!expectedExts.includes(cleanExt) && DANGEROUS_EXTENSIONS.has(ext)) {
      risk = 'dangerous';
      reason = `Extension mismatch: file claims "${ext}" but Magika detected "${label}".`;
    }
  }

  return { risk, reason, label, score, ext };
}

// ---- Badge / notification ----
function setBadge(risk) {
  if (risk === 'dangerous') {
    chrome.action.setBadgeText({ text: '!!' });
    chrome.action.setBadgeBackgroundColor({ color: '#CC0000' });
  } else if (risk === 'suspicious') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#CC6600' });
  } else {
    chrome.action.setBadgeText({ text: 'OK' });
    chrome.action.setBadgeBackgroundColor({ color: '#444444' });
    // Clear after 4 seconds for safe files
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
  }
}

function notify(title, message, risk) {
  // Only show system notification for suspicious / dangerous
  if (risk === 'safe') return;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
    priority: risk === 'dangerous' ? 2 : 1,
  });
}

// ---- Core scan logic ----
async function scanFile(downloadItem) {
  const filePath = downloadItem.filename;
  const fileName = filePath.split(/[\\/]/).pop();

  // Cache check
  if (scanCache.has(filePath)) {
    console.log('[magika] Cache hit:', filePath);
    return scanCache.get(filePath);
  }

  console.log('[magika] Scanning:', filePath);
  const startTime = performance.now();

  try {
    const magika = await getMagika();
    if (!magika) throw new Error('Magika model not available');

    const fileBytes = await readFileAsBytes(filePath);
    const result = await magika.identifyBytes(fileBytes);
    const elapsed = (performance.now() - startTime).toFixed(1);

    const prediction = result.prediction;
    const assessment = assessRisk(prediction, fileName);

    const scanResult = {
      id: downloadItem.id,
      filename: fileName,
      filepath: filePath,
      filesize: downloadItem.fileSize,
      timestamp: Date.now(),
      elapsed: `${elapsed}ms`,
      label: assessment.label,
      mime: prediction.output?.mime_type || 'unknown',
      score: assessment.score,
      risk: assessment.risk,
      reason: assessment.reason,
      description: prediction.output?.description || '',
      group: prediction.output?.group || '',
    };

    // Cache + recent list
    scanCache.set(filePath, scanResult);
    recentScans.unshift(scanResult);
    if (recentScans.length > MAX_RECENT) recentScans.pop();

    // Persist to storage for popup
    chrome.storage.local.set({ recentScans });

    // Badge + notification
    setBadge(assessment.risk);
    if (assessment.risk !== 'safe') {
      notify(
        `[${assessment.risk.toUpperCase()}] ${fileName}`,
        assessment.reason,
        assessment.risk,
      );
    }

    console.log(`[magika] Done: ${fileName} → ${assessment.label} (${assessment.risk}) in ${elapsed}ms`);
    return scanResult;
  } catch (err) {
    console.error('[magika] Scan error:', err);
    const errorResult = {
      id: downloadItem.id,
      filename: fileName,
      filepath: filePath,
      timestamp: Date.now(),
      error: err.message,
      risk: 'error',
    };
    recentScans.unshift(errorResult);
    if (recentScans.length > MAX_RECENT) recentScans.pop();
    chrome.storage.local.set({ recentScans });
    return errorResult;
  }
}

// ---- Download listener ----
chrome.downloads.onChanged.addListener(async (delta) => {
  // Only react when state changes to 'complete'
  if (!delta.state || delta.state.current !== 'complete') return;

  // Look up the download item
  chrome.downloads.search({ id: delta.id }, async (results) => {
    if (!results || results.length === 0) return;
    const item = results[0];
    if (!item.filename) return;
    await scanFile(item);
  });
});

// ---- Message handler for popup ----
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'getScans') {
    chrome.storage.local.get('recentScans', (data) => {
      sendResponse({ scans: data.recentScans || [] });
    });
    return true; // async
  }
  if (msg.type === 'clearScans') {
    recentScans.length = 0;
    scanCache.clear();
    chrome.storage.local.set({ recentScans: [] });
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ ok: true });
    return true;
  }
});

console.log('[magika] Background service worker initialised.');
