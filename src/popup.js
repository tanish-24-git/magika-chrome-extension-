// ============================================================
// Magika Chrome Extension — Popup Script
// Fetches scan history from the background worker and renders
// a retro-style list of recent downloads with risk indicators.
// ============================================================

const scanList  = document.getElementById('scan-list');
const emptyEl   = document.getElementById('empty-state');
const btnClear  = document.getElementById('btn-clear');
const statTotal = document.getElementById('stat-total');
const statSafe  = document.getElementById('stat-safe');
const statFlag  = document.getElementById('stat-flagged');

// ---- Risk indicator labels ----
const RISK_ICON = {
  safe:       'OK',
  suspicious: ' ! ',
  dangerous:  '!!',
  error:      '??',
};

// ---- Helpers ----
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Render ----
function renderScans(scans) {
  // Stats
  const total   = scans.length;
  const safe    = scans.filter(s => s.risk === 'safe').length;
  const flagged = scans.filter(s => s.risk === 'suspicious' || s.risk === 'dangerous').length;

  statTotal.textContent = total;
  statSafe.textContent  = safe;
  statFlag.textContent  = flagged;

  if (total === 0) {
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';

  // Remove old entries (keep emptyEl)
  scanList.querySelectorAll('.scan-entry').forEach(el => el.remove());

  for (const scan of scans) {
    const entry = document.createElement('div');
    entry.className = 'scan-entry';

    const risk = scan.risk || 'error';
    const icon = RISK_ICON[risk] || '??';

    let metaHtml = '';
    if (scan.label) {
      metaHtml += `<span class="scan-tag ${risk}">${escapeHtml(scan.label)}</span>`;
    }
    if (scan.mime && scan.mime !== 'unknown') {
      metaHtml += `<span>${escapeHtml(scan.mime)}</span>`;
    }
    if (scan.score != null) {
      metaHtml += `<span>${(scan.score * 100).toFixed(1)}%</span>`;
    }
    if (scan.filesize) {
      metaHtml += `<span>${formatSize(scan.filesize)}</span>`;
    }
    if (scan.elapsed) {
      metaHtml += `<span>${escapeHtml(scan.elapsed)}</span>`;
    }

    let reasonHtml = '';
    if (scan.reason) {
      reasonHtml = `<div class="scan-reason">${escapeHtml(scan.reason)}</div>`;
    }
    if (scan.error) {
      reasonHtml = `<div class="scan-reason">Error: ${escapeHtml(scan.error)}</div>`;
    }

    entry.innerHTML = `
      <div class="risk-indicator ${risk}">${icon}</div>
      <div class="scan-body">
        <div class="scan-filename">${escapeHtml(scan.filename || 'unknown')}</div>
        <div class="scan-meta">${metaHtml}</div>
        ${reasonHtml}
      </div>
      <div class="scan-time">${scan.timestamp ? timeAgo(scan.timestamp) : ''}</div>
    `;

    scanList.appendChild(entry);
  }
}

// ---- Load scans ----
function loadScans() {
  chrome.runtime.sendMessage({ type: 'getScans' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    renderScans(response?.scans || []);
  });
}

// ---- Clear button ----
btnClear.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'clearScans' }, () => {
    loadScans();
  });
});

// ---- Init ----
loadScans();
