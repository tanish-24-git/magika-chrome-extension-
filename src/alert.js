document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const risk = urlParams.get('risk') || 'safe';
  const filename = urlParams.get('filename') || 'Unknown File';
  const reason = urlParams.get('reason') || 'File scanned successfully.';

  const overlay = document.getElementById('themeOverlay');
  const riskTitle = document.getElementById('riskTitle');
  const filenameBox = document.getElementById('filenameBox');
  const reasonBox = document.getElementById('reasonBox');

  overlay.className = `overlay ${risk}`;
  
  if (risk === 'dangerous') {
    riskTitle.textContent = '[ !! DANGEROUS FILE !! ]';
  } else if (risk === 'suspicious') {
    riskTitle.textContent = '[ ! SUSPICIOUS DETECTED ]';
  } else {
    riskTitle.textContent = '[ OK ] FILE SAFE';
  }

  filenameBox.textContent = `FILE: ${filename}`;
  reasonBox.textContent = reason;

  // Auto close after 7 seconds
  setTimeout(() => window.close(), 7000);
});
