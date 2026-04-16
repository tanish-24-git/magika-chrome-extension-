# Magika AI: Architecture & Pipeline

This document details the underlying mechanics of Google Magika, the deep-learning engine powering the local inference capabilities of the Magika Chrome Extension. 

By replacing classical heuristic-based signature scanning with a machine-learning approach, Magika fundamentally upgrades how file types are identified on the modern web.

---

## Why Magika? (Size & Efficiency)

Historically, file identification relied on tools like `libmagic`, which use handcrafted regex-like rules to look for specific magic bytes at exact hardware offsets. Threat actors easily defeat this by adding null-bytes or shifting data headers.

**The Magika Advantage:**
* **Ultra-Lightweight (~1MB Model):** The entire trained Keras Neural Network is roughly 1MB. This micro-footprint means it can be loaded entirely into browser memory without bloat.
* **Rapid Processing:** Because the model is heavily optimized, inference executes in under 10 milliseconds per file on average hardware.
* **Resilient to Evasion:** It does not rely on strict byte offsets. Because the neural network analyzes the complex entropy and structural patterns of the byte arrays, it easily detects obfuscated scripts or payloads disguised inside other file properties.

---

## The Inference Pipeline

The process executed by Magika is specifically optimized for memory safety. It prevents vast files from locking up system processing capabilities by intelligently sampling only structural boundaries.

### Inference Workflow Diagram

```mermaid
flowchart LR
    File[Downloaded File] --> Extractor[Feature Extractor]
    Extractor -->|Head & Tail Bytes| Model[Magika ML Model]
    Model -->|File Type Prediction| Logic[Extension Logic]
    Logic -->|Safe / Dangerous| Alert[User Notification]
```

### Pipeline Breakdown

1. **Targeting:** A file is passed to the Magika binding immediately upon browser download completion.
2. **Feature Extraction:** Rather than reading a large file byte-by-byte into memory, Magika intelligently extracts only the leading bytes (the head) and trailing bytes (the tail). These segments statistically contain the vast majority of mathematical identity data.
3. **Neural Execution:** The raw byte arrays are passed into the loaded TensorFlow/Keras model as multi-dimensional tensors. The architectural layers calculate structural entropy and syntactic tokens.
4. **Probability Output:** The model outputs an array of probabilities across over 100 native file classes (e.g., `jpeg`, `elf`, `python`, `pebin`).
5. **Verdict:** The highest probability prediction and its associated confidence score are returned to the JavaScript logic wrapper for threat evaluation.

---

## Open Source Synergy

Incorporating the [google/magika](https://github.com/google/magika) repository directly via `@google/magika` node bindings allows our extension to run locally offline. It represents a paradigm shift where enterprise-grade machine learning threat detection can be decentralized and run privately within the browser environment with zero telemetry.
