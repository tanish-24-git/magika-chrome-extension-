/**
 * @fileoverview Background service worker for Magika File Scanner.
 * Implements a local real-time inference pipeline using the Magika ML model
 * to classify downloads and detect extension mimicry.
 */

import { Magika } from 'magika';

/** @type {Magika|null} */
let magikaModel = null;
let modelLoading = false;

const scanCache = new Map();
const recentScans = [];
const MAX_RECENT_SCANS = 50;

const EXECUTABLE_LABELS = new Set([
  'pebin', 'elf', 'macho', 'dex', 'java', 'javabytecode', 'javascript', 
  'python', 'php', 'ruby', 'shell', 'batch', 'powershell', 'vba', 'wasm',
  'msi', 'cab', 'apk', 'dmg', 'sh'
]);

const BENIGN_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 
  'mp3', 'mp4', 'avi', 'mkv', 'mov', 'wav', 'flac',
  'txt', 'md', 'csv', 'json', 'xml'
]);

/**
 * Initializes and caches the Magika ML model singleton.
 * @returns {Promise<Magika>}
 */
async function getModel() {
  if (magikaModel) return magikaModel;
  if (modelLoading) {
    while (modelLoading) await new Promise(r => setTimeout(r, 100));
    return magikaModel;
  }
  
  modelLoading = true;
  try {
    magikaModel = await Magika.create();
  } catch (err) {
    console.error('Model initialization failed:', err);
  } finally {
    modelLoading = false;
  }
  return magikaModel;
}

// Pre-warm model inference engine on startup
getModel();

/**
 * Normalizes local file paths to valid URIs and fetches the byte buffer.
 * @param {string} localPath 
 * @returns {Promise<Uint8Array>}
 */
async function bufferFile(localPath) {
  const url = localPath.startsWith('file://') ? localPath : `file:///${localPath.replace(/\\/g, '/')}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`I/O fault: ${url} @ ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Evaluates risk context based on model inference metadata.
 * @param {Object} prediction 
 * @param {string} filename 
 * @returns {Object} Threat assessment payload
 */
function evaluateThreat(prediction, filename) {
  const label = prediction.output?.label || prediction.dl?.label || 'unknown';
  const score = prediction.score ?? (prediction.output?.score ?? 0);
  const ext = (filename.match(/\.[^.]+$/) || [''])[0].toLowerCase().replace('.', '');

  if (ext && BENIGN_EXTENSIONS.has(ext) && EXECUTABLE_LABELS.has(label)) {
    return {
      risk: 'dangerous',
      reason: `Dangerous file. It claims to be a safe file type, but contains hidden executable code.`,
      label, score, ext
    };
  }

  if (score < 0.35 && label !== 'unknown') {
    return {
      risk: 'suspicious',
      reason: `Suspicious file. The system could not reliably verify the exact file type.`,
      label, score, ext
    };
  }

  if (label === 'unknown' || label === 'undefined') {
    return {
      risk: 'suspicious',
      reason: `Unknown file. The contents are unrecognized or potentially corrupted.`,
      label, score, ext
    };
  }

  return {
    risk: 'safe',
    reason: `Safe file. The contents match the expected file type.`,
    label, score, ext
  };
}

/**
 * Orchestrates action badge states and system notifications.
 */
function emitStatus(filename, assessment) {
  const { risk, reason } = assessment;
  
  const uiState = {
    dangerous: { text: '!!', color: '#CC0000', prio: 2 },
    suspicious: { text: '!', color: '#CC6600', prio: 1 },
    safe: { text: 'OK', color: '#444444', prio: 0 }
  }[risk] || { text: '?', color: '#888888', prio: 0 };

  chrome.action.setBadgeText({ text: uiState.text });
  chrome.action.setBadgeBackgroundColor({ color: uiState.color });
  if (risk === 'safe') setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);

  // Enforce interaction so the popup doesn't auto-close silently
  chrome.notifications.create(`magika-alert-${Date.now()}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: `[${risk.toUpperCase()}] ${filename}`,
    message: reason,
    priority: uiState.prio,
    requireInteraction: risk !== 'safe' // Forces the notification to stay on screen for dangerous/suspicious files
  });
}

/**
 * Primary inference worker for target downloads.
 */
async function processDownload(item) {
  const { filename: filePath, id: downloadId, fileSize } = item;
  const filename = filePath.split(/[\\\/]/).pop();

  if (scanCache.has(filePath)) return scanCache.get(filePath);

  const t0 = performance.now();
  let result;

  try {
    const model = await getModel();
    if (!model) throw new Error('Inference engine offline');

    const bytes = await bufferFile(filePath);
    const { prediction } = await model.identifyBytes(bytes);
    const ms = (performance.now() - t0).toFixed(1);
    
    const assessment = evaluateThreat(prediction, filename);

    result = {
      id: downloadId,
      filename, filepath: filePath, filesize: fileSize,
      timestamp: Date.now(),
      elapsed: `${ms}ms`,
      ...assessment,
      description: prediction.output?.description || '',
    };

    emitStatus(filename, assessment);
  } catch (err) {
    console.error('Pipeline fault:', err);
    result = {
      id: downloadId, filename, filepath: filePath,
      timestamp: Date.now(), risk: 'error', error: err.message
    };
  }

  scanCache.set(filePath, result);
  recentScans.unshift(result);
  if (recentScans.length > MAX_RECENT_SCANS) recentScans.pop();
  chrome.storage.local.set({ recentScans });

  return result;
}

chrome.downloads.onChanged.addListener(async (delta) => {
  if (delta.state?.current !== 'complete') return;
  chrome.downloads.search({ id: delta.id }, results => {
    if (results?.[0]?.filename) processDownload(results[0]);
  });
});

chrome.runtime.onMessage.addListener((req, _sender, res) => {
  if (req.type === 'getScans') {
    chrome.storage.local.get('recentScans', data => res({ scans: data.recentScans || [] }));
    return true;
  }
  if (req.type === 'clearScans') {
    recentScans.length = 0;
    scanCache.clear();
    chrome.storage.local.set({ recentScans: [] });
    chrome.action.setBadgeText({ text: '' });
    res({ ok: true });
  }
});
