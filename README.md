<div align="center">
  <h1>Magika File Scanner</h1>
  <p><strong>A privacy-first Chrome Extension for real-time file type detection and malware mimicry prevention.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
  [![AI Engine](https://img.shields.io/badge/Inference-Google_Magika-red)](https://github.com/google/magika)
</div>

<br />

---

## Interface

![Magika Scanner UI](screenshot.png)

*A seamless, retro terminal-styled notification and history panel provides high-visibility insights into your system's download pipeline.*

<br />

## Overview

The Magika File Scanner is a browser extension that intercepts downloads the moment they complete on your machine. It evaluates their atomic file type offline, ensuring that no user data or files ever leave your machine. 

This project leverages Google's Magika, an advanced file type detection tool, to identify obfuscated files and mitigate mimicry attacks. A mimicry attack occurs when an active threat (such as an executable `.exe` or `.shell` script) attempts to disguise itself under a benign extension (such as a standard image `.jpg` or document `.pdf`).

<br />

## Key Features

* **Offline Processing:** All processing occurs locally within your browser. The contents of your downloaded files are never uploaded or transmitted to external servers.
* **Instant Native Notifications:** The extension triggers beautifully styled, unobtrusive DOM popups inserted directly into your active viewing tab to alert you of threats seamlessly without OS intervention.
* **Mimicry Prevention:** Automatically correlates the underlying structure of the file against its declared file extension.
* **Clear Interfaces:** User-facing notifications have been streamlined. Instead of raw AI confidence scores, highly readable summaries clearly identify if a file is safe or compromised.
* **Non-blocking Architecture:** System downloads proceed completely uninterrupted. The files are evaluated asynchronously strictly after completion to prevent transfer bottlenecks.

<br />

## Installation

Because this extension requires local file access definitions, it must be loaded using Developer Mode.

### 1. Build the Extension
Ensure you have Node installed on your system.

```bash
git clone https://github.com/your-username/magika-chrome-extension.git
cd magika-chrome-extension
npm install
npm run build
```

### 2. Import into Chrome
1. Navigate to `chrome://extensions/` in your browser.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `/dist` directory from your cloned project.

### 3. Grant File Access 
This step is mandatory for the extension to evaluate local files.
1. Locate the imported extension on your extensions page.
2. Click **Details**.
3. Scroll down and enable **Allow access to file URLs**.

<br />

## Acknowledgements

Developing this project locally would not be possible without the profound foundational work from the following entities:

* **Google Magika (Repository ID: `google/magika`):** https://github.com/google/magika — Massive gratitude to the Magika Formats Team for innovating AI-based file identification and open-sourcing the models and bindings that power this extension.
* **TensorFlow.js Community:** For optimizing the TensorFlow ecosystem to accommodate high-performance workloads internally within browser environments.
* **Google Chrome Platform:** For their robust documentation covering asynchronous processing pipelines under Manifest V3.

<br />

## License

This project is open-sourced under the **MIT License**. 

You are free to rebuild, modify, fork, and scale this software within commercial or personal constraints. See the `LICENSE` file for the formal conditions.
