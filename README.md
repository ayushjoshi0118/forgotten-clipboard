# Forgotten Clipboard

> **"Copy it once. Find it anytime."**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success.svg)](manifest.json)
[![Tests](https://img.shields.io/badge/Tests-31%20passing-brightgreen.svg)](tests/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-orange.svg)](#technology-stack)

A privacy-first, lightweight clipboard history manager for modern Chromium browsers. It keeps a searchable, categorized record of everything you copy, allows instant retrieval, and never sends a single byte of your data to an external server.

---

## 📌 Problem Statement

Knowledge workers, software developers, researchers, and students copy tens or hundreds of items daily: API keys, links, code commands, bug reports, email addresses, and notes. 

The default operating system clipboard has a critical limitation: **it only holds one item at a time**. The moment you copy a new snippet, your previous item is gone forever. Many existing clipboard managers either require paid subscriptions, run heavy background daemons, or compromise security by uploading data to cloud servers.

**Forgotten Clipboard** solves this directly inside your browser with zero bloat, zero tracking, and a developer-grade user experience.

---

## ✨ Features

- 🔍 **Real-Time Smart Search:** Fast, case-insensitive instant search across exact words, URLs, domains, email addresses, code tokens, and tags.
- 🏷️ **Automatic Content Classification:** Intelligently tags snippets as **Link**, **Email**, **Code**, or **Plain Text** using lightweight local heuristics.
- 🔒 **Zero-Cloud Privacy Guarantee:** 100% of your clipboard data is persisted locally in `chrome.storage.local`. No analytics, no tracking, no server calls.
- ⚡ **Streamlined Capture Workflows:**
  - **One-Click Capture:** Reads the current clipboard on demand in the popup.
  - **Context Menu Integration:** Select text on any web page and right-click `"Save to Forgotten Clipboard"`.
  - **Manual Paste:** An integrated drawer for explicitly pasting sensitive text.
- ⭐ **Favorites & Custom Tags:** Bookmark critical snippets and tag them (e.g. `#work`, `#git`, `#docker`) for organized retrieval.
- 🗃️ **Configurable Retention & Smart Pruning:** Define a snippet storage limit (default 500, configurable up to 5,000). Oldest non-starred items are pruned automatically to keep performance fast.
- 🖥️ **Full History Dashboard:** A dedicated full-page manager with category sidebars, detailed inspection view, and sorting controls.
- 📦 **Safe JSON Backup & Restore:** Export your complete history to an unencrypted JSON backup file, or import backups with validation.
- 🌗 **Light & Dark Theme Support:** Thoughtfully crafted design system with smooth transitions, adhering to system preferences or manual toggles.
- ⌨️ **Keyboard Productivity:** Built for keyboard power users (`/` to focus search, arrow keys to navigate, `Enter` to copy, `Esc` to dismiss).

---

## 🖼️ Screenshots

> _Placeholder: Replace with actual screenshots when submitting to Chrome Web Store or publishing on portfolio._

```
+-------------------------------------------------------+
|  [Popup Interface]                                    |
|  [Screenshot Placeholder: popup-search-dark.png]      |
|  Shows: Search input, filter chips, snippet cards     |
+-------------------------------------------------------+
|  [Full History & Settings]                            |
|  [Screenshot Placeholder: history-dashboard.png]      |
|  Shows: Multi-column view, sidebar filters, backup    |
+-------------------------------------------------------+
```

---

## 🏗️ Architecture Overview

The extension is structured into modular, decoupled JavaScript components without unnecessary build steps:

```
forgotten-clipboard/
├── manifest.json              # Chrome Manifest V3 configuration
├── README.md                  # Comprehensive documentation
├── LICENSE                    # MIT open-source license
├── CHROMEWEBSTORE.md          # Store listing & permission disclosures
├── package.json               # Test script and metadata
├── generate-icons.js          # Pure Node.js PNG icon generator
├── src/
│   ├── popup/                 # Compact browser action popup
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── history/               # Full-page manager and dashboard
│   │   ├── history.html
│   │   ├── history.css
│   │   └── history.js
│   ├── background/            # Manifest V3 service worker
│   │   └── service-worker.js
│   ├── styles/                # Design system & theme tokens
│   │   └── shared.css
│   ├── scripts/               # Pure business logic modules
│   │   ├── classifier.js      # Heuristic snippet classifier
│   │   ├── storage.js         # Chrome storage wrapper & validators
│   │   ├── search.js          # Extensible search & ranking engine
│   │   ├── clipboard.js       # Clipboard read/write APIs
│   │   └── utils.js           # Formatters, debounce, sanitizer
│   └── assets/
│       └── icons/             # Multi-resolution extension icons
└── tests/                     # Automated unit test suite
    ├── classifier.test.js
    ├── search.test.js
    ├── storage.test.js
    └── manifest.test.js
```

### Module Responsibilities

1. **`classifier.js`**: Analyzes snippet text using conservative pattern matching (strict URL check, RFC-compliant email matching, CLI command prefixes, programming language tokens, and JSON syntax). Falls back to Plain Text if uncertain.
2. **`storage.js`**: Abstracts `chrome.storage.local`. Implements consecutive deduplication, history bounds checking, favorite protection during pruning, and strict schema validation for imports.
3. **`search.js`**: Case-insensitive multi-term search engine. Designed with a provider facade (`SearchManager`) so semantic embedding search can be introduced in the future without rewriting UI logic.
4. **`clipboard.js`**: Wraps `navigator.clipboard.readText()` and `navigator.clipboard.writeText()` with graceful fallback and error handling.
5. **`service-worker.js`**: Handles background events, browser installation hooks, context menus (`Save to Forgotten Clipboard`), and temporary badge feedback.

---

## 🛠️ Technology Stack

- **Platform:** Chrome Extension Manifest V3
- **Language:** JavaScript (Modern ES6+)
- **Styling:** Vanilla CSS3 (Custom Properties / Design Tokens, Flexbox, CSS Grid)
- **Markup:** Semantic HTML5
- **Storage:** `chrome.storage.local`
- **Testing:** Node.js native test runner (`node:test` and `node:assert`)
- **Dependencies:** **0 external runtime dependencies**. Simple to install, audit, and debug.

---

## 📥 Installation & Running in Chrome

### Prerequisites
- Any modern Chromium-based browser: Google Chrome, Brave, Microsoft Edge, Arc, or Opera.
- (Optional for development/tests) [Node.js](https://nodejs.org/) v18+.

### Loading the Unpacked Extension

1. Clone or download this repository:
   ```bash
   git clone https://github.com/ayush/forgotten-clipboard.git
   cd forgotten-clipboard
   ```
2. Open your browser and navigate to the Extensions management page:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
3. In the top-right corner, enable **Developer mode** toggle.
4. Click the **Load unpacked** button in the top-left toolbar.
5. Select the `forgotten-clipboard` root directory (the folder containing `manifest.json`).
6. **Forgotten Clipboard** is now active! Pin it to your toolbar for quick access.

---

## 🔐 Permissions Explanation

Forgotten Clipboard follows the principle of **least privilege**:

| Permission | Justification |
|------------|---------------|
| `storage` | Stores history items, tags, and user preferences locally on your machine. |
| `clipboardRead` | Allows the extension to read clipboard text when you click **"Capture Clipboard"**. |
| `clipboardWrite` | Allows the extension to write text back to your clipboard when you click **"Copy"**. |
| `contextMenus` | Adds the right-click option **"Save to Forgotten Clipboard"** for highlighted text. |

*Note: Forgotten Clipboard requests **zero host permissions** (`<all_urls>` is NOT requested). The extension cannot read your browsing history, cookies, or web page content.*

---

## 📋 How Clipboard Capture Works & Browser Limitations

A common question is: *Why doesn't the extension automatically record every single Ctrl+C press across your entire operating system?*

### The Web & Browser Security Model

1. **System-Level Boundaries:** Web browsers run in a secure OS sandbox. Browser extensions are prohibited by Chromium architecture from silently intercepting clipboard operations that occur outside the browser (e.g. in Terminal, Slack, or Word).
2. **Permission Guardrails:** In Manifest V3, `navigator.clipboard.readText()` requires an active user gesture (such as clicking the popup button) to prevent malicious extensions from silently reading sensitive clipboard contents (e.g., passwords from password managers).
3. **Forgotten Clipboard's Supported Capture Methods:**
   - **Capture Clipboard Button:** Open the popup (`Ctrl+Shift+V` / `Cmd+Shift+V`) and click **Capture Clipboard** to ingest the current system clipboard with one click.
   - **Context Menu:** Highlight text on any web page, right-click, and choose **Save to Forgotten Clipboard**.
   - **Manual Paste Drawer:** Paste or type text directly into the extension.

---

## 🧪 Testing and Verification

The project includes automated tests for all business logic, deduplication, search ranking, limit enforcement, import validation, and manifest integrity:

```bash
# Run full automated test suite using Node's built-in test runner
npm test
```

### Verified Test Cases (31 passing tests):
- ✅ Saving plain-text snippet
- ✅ Detecting URLs with protocols and naked domains
- ✅ Detecting email addresses
- ✅ Classifying shell commands and code snippets
- ✅ Conservative fallback to plain text for ambiguous phrases
- ✅ Case-insensitive partial search & multi-word queries
- ✅ Category and tag filtering
- ✅ Preventing consecutive duplicate entries and refreshing timestamps
- ✅ Enforcing configurable history limits with favorite protection
- ✅ Updating favorite status and tags
- ✅ Deleting single items and clearing all items
- ✅ Full JSON export and schema validation on import
- ✅ Rejection of malformed or unsafe import data
- ✅ Manifest V3 specification & file asset existence check

---

## 🛡️ Privacy & Security Guidelines

- **No Data Collection:** We do not collect, store, or transmit personal data or clipboard contents.
- **Strict DOM Insertion:** All user text is rendered using `textContent` and programmatic DOM nodes to prevent Cross-Site Scripting (XSS).
- **No Console Logging:** The extension explicitly avoids logging clipboard text contents to `console.log`.
- **User Control:** You retain full ownership of your data with one-click clear and selective JSON backups.

---

## 🗺️ Roadmap

- [ ] Optional local semantic vector search via WebAssembly / Transformers.js.
- [ ] Export directly to CSV and Markdown.
- [ ] Pinned item support to float critical items to the top of the list.
- [ ] Customizable keyboard shortcut triggers in `chrome://extensions/shortcuts`.
- [ ] Configurable auto-delete timer (e.g. automatically purge non-favorites after 30 days).

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve Forgotten Clipboard:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Ensure all tests pass (`npm test`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more details.
