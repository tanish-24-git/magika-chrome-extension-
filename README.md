# Magika File Scanner — Chrome Extension

A lightweight, privacy-focused Chrome extension that scans every downloaded file **locally** using [Google's Magika](https://github.com/google/magika) AI engine. No data ever leaves your browser.

```
+----------------------------------------------+
|  [M] MAGIKA SCANNER                          |
|  LOCAL AI FILE TYPE DETECTION                |
|                                              |
|  SCANNED: 5    SAFE: 4    FLAGGED: 1         |
|----------------------------------------------|
|  [OK] readme.txt           txt  87.6%   2s   |
|  [OK] photo.jpg            jpeg 99.9%   1s   |
|  [!!] payload.php          php  99.8%   1s   |
|       ^ Executable content type detected     |
|  [OK] report.pdf           pdf  99.5%   1s   |
|  [OK] data.csv             csv  95.2%   2s   |
+----------------------------------------------+
|  Powered by Google Magika | All analysis local|
+----------------------------------------------+
```

---

## Features

- **AI-powered file type detection** using Google's Magika deep learning model
- **Fully local** — all processing happens in the browser, zero network requests for analysis
- **Near real-time** — Magika inference runs in ~5ms per file after model load
- **Automatic scanning** — hooks into Chrome's download API, scans every completed download
- **Risk assessment** — flags executables, shell scripts, and extension mismatches
- **Retro UI** — clean beige/black terminal-inspired popup with ASCII indicators
- **In-memory cache** — never re-scans the same file path twice per session
- **Non-blocking** — downloads are never interrupted or delayed

---

## Tech Stack

| Component         | Technology                          |
|-------------------|-------------------------------------|
| Extension format  | Chrome Manifest V3                  |
| Language          | Vanilla JavaScript (ES Modules)     |
| AI Engine         | Google Magika (npm `magika` package)|
| ML Runtime        | TensorFlow.js (bundled via Magika)  |
| Bundler           | ESBuild                            |
| Fonts             | IBM Plex Mono, Space Mono           |

---

## Project Structure

```
magika-chrome-extension-/
├── src/
│   ├── background.js      # Service worker: download listener + Magika scanning
│   ├── popup.html          # Extension popup UI
│   ├── popup.css           # Retro theme styles
│   ├── popup.js            # Popup logic: renders scan history
│   ├── manifest.json       # Chrome Extension Manifest V3
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── dist/                   # Built extension (loadable in Chrome)
│   ├── background.js       # Bundled service worker (~2MB with TF.js)
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── manifest.json
│   └── icons/
├── build.js                # ESBuild bundler script
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## Local Development Setup

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Google Chrome** (or any Chromium-based browser)

### 1. Clone the Repository

```bash
git clone https://github.com/tanish-24-git/magika-chrome-extension-.git
cd magika-chrome-extension-
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Extension

```bash
npm run build
```

This will:
- Clean the `dist/` folder
- Bundle `background.js` with Magika + TensorFlow.js via ESBuild
- Copy static files (`manifest.json`, `popup.html`, `popup.css`, `popup.js`, `icons/`) to `dist/`

### 4. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder:
   ```
   E:\magika chrome extension\magika-chrome-extension-\dist
   ```
5. The extension icon should appear in the Chrome toolbar

### 5. Enable File Access (Important)

For the extension to read downloaded files:

1. On `chrome://extensions/`, find **Magika File Scanner**
2. Click **Details**
3. Scroll down and enable **Allow access to file URLs**

### 6. Test It

1. Download any file in Chrome (e.g. a `.txt`, `.pdf`, `.exe`, `.php`)
2. Watch the extension badge:
   - **OK** (grey) = Safe file type detected
   - **!** (orange) = Suspicious file type
   - **!!** (red) = Dangerous / extension mismatch
3. Click the extension icon to see the full scan history

---

## Development Workflow

For active development with auto-rebuilds:

```bash
npm run dev
```

This starts ESBuild in watch mode. After each save:
1. The `dist/background.js` is rebuilt automatically
2. Go to `chrome://extensions/` and click the **reload** button on the extension

---

## How It Works

```
Download completes
       |
       v
chrome.downloads.onChanged (state = 'complete')
       |
       v
Fetch file via file:// protocol
       |
       v
Convert to Uint8Array
       |
       v
Magika.identifyBytes(bytes)
       |
       v
Risk assessment:
  - Check detected label against SUSPICIOUS_LABELS set
  - Check file extension against DANGEROUS_EXTENSIONS set
  - Check for extension mismatch (e.g. .exe detected as PHP)
       |
       v
Update badge + notification + scan history
       |
       v
Popup reads from chrome.storage.local
```

### Risk Classification

| Risk Level   | Badge  | Trigger                                              |
|-------------|--------|------------------------------------------------------|
| Safe        | `OK`   | Normal file type, no red flags                       |
| Suspicious  | `!`    | Executable label or dangerous extension              |
| Dangerous   | `!!`   | Extension mismatch (file claims X but Magika says Y) |

### Flagged File Types

Executable / shell types automatically flagged:
`batch`, `shell`, `powershell`, `php`, `javascript`, `vba`, `pebin`, `elf`, `mach`, `dex`, `msi`, `lnk`, `wasm`, `java`, `javabytecode`

Dangerous extensions automatically flagged:
`.exe`, `.bat`, `.cmd`, `.scr`, `.pif`, `.com`, `.msi`, `.vbs`, `.ps1`, `.dll`, `.sys`, `.hta`, `.lnk`, `.jar`, `.sh`, `.php`

---

## Deployment

### Option A: Chrome Web Store (Public)

1. **Build production bundle:**
   ```bash
   npm run build
   ```

2. **Create a ZIP of the dist folder:**
   ```bash
   cd dist
   # On Windows:
   powershell Compress-Archive -Path * -DestinationPath ../magika-scanner.zip
   
   # On macOS/Linux:
   zip -r ../magika-scanner.zip .
   ```

3. **Submit to Chrome Web Store:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Sign in with a Google account
   - One-time $5 developer registration fee
   - Click **New Item** and upload `magika-scanner.zip`
   - Fill in listing details:
     - Name: `Magika File Scanner`
     - Description: Copy from above
     - Category: `Developer Tools` or `Productivity`
     - Screenshots: Take screenshots of the popup UI
   - Submit for review (typically 1-3 business days)

### Option B: Enterprise / Self-Hosted (Private)

1. **Build the ZIP** (same as above)

2. **Host the CRX file:**
   - Package the extension as `.crx` from `chrome://extensions/` (Pack extension)
   - Host the `.crx` and an `updates.xml` file on any HTTPS server

3. **Deploy via Group Policy (Windows):**
   ```
   HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist
   ```
   Add the extension ID and update URL.

### Option C: Manual Distribution

Simply share the `dist/` folder (or a ZIP of it). Recipients load it via **Load unpacked** following the steps above.

---

## Configuration

The extension can be customized by editing `src/background.js`:

| Constant             | Default | Description                            |
|---------------------|---------|----------------------------------------|
| `MAX_RECENT`        | 50      | Number of recent scans to keep         |
| `SUSPICIOUS_LABELS` | Set     | Magika labels flagged as suspicious    |
| `DANGEROUS_EXTENSIONS` | Set  | File extensions flagged as dangerous   |

After changes, rebuild with `npm run build`.

---

## Permissions Explained

| Permission        | Reason                                           |
|-------------------|--------------------------------------------------|
| `downloads`       | Listen for completed downloads                   |
| `downloads.open`  | Access download metadata and file paths          |
| `storage`         | Persist scan history for the popup               |
| `notifications`   | Show system alerts for suspicious files          |
| `file:///*`       | Read downloaded file contents for analysis       |
| `google.github.io`| Load Magika's ML model and config at first run   |

---

## Troubleshooting

| Issue                           | Solution                                                |
|---------------------------------|---------------------------------------------------------|
| Extension won't load            | Ensure you selected the `dist/` folder, not `src/`      |
| Files not being scanned         | Enable "Allow access to file URLs" in extension details |
| Model loading error             | Check internet connection (model loads from GitHub CDN) |
| Badge doesn't update            | Open DevTools on `chrome://extensions/` service worker  |
| Large file takes time           | First scan is slow (~2-5s) for model loading; subsequent scans are ~5ms |

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

## Credits

- [Google Magika](https://github.com/google/magika) — AI file type detection
- [TensorFlow.js](https://www.tensorflow.org/js) — browser ML runtime
- [ESBuild](https://esbuild.github.io/) — fast JavaScript bundler
