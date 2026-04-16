<div align="center">
  <h1>🔍 Magika File Scanner</h1>
  <p><strong>A privacy-first, local-AI Chrome Extension for real-time file type detection & malware mimicry prevention.</strong></p>

  [![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
  [![Chrome Manifest](https://img.shields.io/badge/Chrome-Manifest_V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
  [![AI Engine](https://img.shields.io/badge/Inference-Google_Magika-red)](https://google.github.io/magika/)
  [![Runtime](https://img.shields.io/badge/Runtime-TensorFlow.js-orange)](https://www.tensorflow.org/js)
</div>

<hr />

## 🌟 Overview

The **Magika File Scanner** intercepts downloads the moment they complete on your machine and uses a highly optimized Deep Learning model to evaluate their atomic file type. 

Because it operates entirely offline using local Tensor processing, **no user data or files ever leave your machine.** 

The extension leverages [Google's Magika](https://github.com/google/magika)—an AI-powered file type detection tool—to identify obfuscated files and mitigate **"mimicry" attacks**, where an active threat (e.g., PE binary, shell script) attempts to disguise itself under a benign extension (e.g., `invoice.pdf`).

## 🚀 Key Features

* **Real-time AI Inference:** Uses a local ONNX model powered by TensorFlow.js to scan downloads in approximately <200ms.
* **100% Offline & Private:** File contents are buffered locally via `file://` permissions and never transmitted to external servers.
* **Mimicry Prevention Engine:** Automatically correlates the detected structural file type against the claimed extension. Highly precise flagging for `.jpg`, `.pdf`, `.mp4` payloads executing as shell or binary active code.
* **Non-blocking Architecture:** Designed gracefully with non-blocking Service Workers. Downloads proceed uninterrupted, evaluating asynchronously post-completion.
* **Retro Developer UX:** Engineered with a terminal-inspired, fast-glance dashboard highlighting scan metrics, latency, confidence thresholds, and dynamic status badges.

## 🧰 Architecture

The architecture of this project centers around a highly efficient Service Worker model (`background.js`) decoupled from the User Interface (`popup.js`).

1. **The Model Loader Singleton:** The extension pre-warms the `@tensorflow/tfjs` graph and instantiates `Magika` asynchronously upon startup.
2. **The `file://` Bridge:** Once the `chrome.downloads.onChanged` API fires for a completed transfer, `fetch()` is bridged over local system paths to pipe the binary representation into a strict `Uint8Array`.
3. **Inference Execution:** The data array passes through the Magika neural network to ascertain structural intent, bypassing arbitrary OS headers.
4. **Threat Assessment:** A declarative state tracker maps risk tolerance based on `content-vs-extension` divergence (Dangerous), confidence dropoffs <35% (Suspicious), and confirmed mappings (Safe).

## 📥 Installation

Due to its use of the `file://` local access permission paradigm, this extension must currently be loaded dynamically through developer mode.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/magika-chrome-extension.git
   cd magika-chrome-extension
   ```
2. **Build the production bundle:**
   ```bash
   npm install
   npm run build
   ```
3. **Load into Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable **"Developer mode"** in the top right.
   - Click **"Load unpacked"** and select the `/dist` directory.
4. **Enable Local File OS Access (Crucial):**
   - Click **Details** on the newly imported Magika plugin card.
   - Scroll down and **Enable** `Allow access to file URLs`.

## 🛠️ Development

Builds are handled gracefully via ESBuild for tree-shaking and module bundling.

To initiate a clean build sequence:
```bash
npm run clean
npm run build
```

The extension popup UI utilizes vanilla styling constructs isolated within `/src/popup.css` mapped perfectly against the IBM Plex Mono typeface.

## 🤝 Acknowledgements

This project would not be possible without the profound upstream engineering from the following institutions and teams:

* **[Google Magika](https://github.com/google/magika):** Massive gratitude to the Magika team at Google for democratizing AI-based file identification and open-sourcing their Keras models and JS bindings.
* **[TensorFlow.js](https://www.tensorflow.org/js):** Thanks to the TensorFlow ecosystem natively supporting high-performance ML workloads inside V8 engine browsers.
* **[Google Chrome Teams](https://developer.chrome.com/docs/extensions):** For their robust `chrome.downloads` asynchronous pipelines within Manifest V3.

## 📄 License

This project is open-sourced under the [Apache License 2.0](LICENSE). 
You may freely rebuild, fork, scale, and redistribute this platform within enterprise or personal environments. 

See the `LICENSE` file for precise legal vernacular.
