# Chrome Web Store Listing — Forgotten Clipboard

**Extension Name:** Forgotten Clipboard  
**Tagline:** Copy it once. Find it anytime.  
**Version:** 1.0.0  
**Manifest Version:** 3  
**Category:** Productivity / Workflow  
**Primary Language:** English  

---

## Store Summary (Up to 132 characters)
A privacy-first clipboard history manager that lets you search, organize, tag, and restore previous clipboard snippets instantly.

---

## Detailed Description (Up to 16,000 characters)

People frequently copy links, code snippets, email addresses, commands, notes, and other critical text, only to lose them when they copy something else. 

**Forgotten Clipboard** solves this by maintaining a private, searchable local history of your copied items. It automatically detects snippet types (URLs, emails, shell commands, code, plain text), enables rapid filtering and keyword search, and gives you instant access whenever you need to paste something again.

### Key Benefits & Features:

- **Instant Search:** Find any previously copied snippet by keyword, domain, email prefix, code fragment, or tag in real-time.
- **Automatic Content Classification:** Automatically recognizes URLs, email addresses, terminal commands, code snippets, and plain text without sending data to external servers.
- **Zero-Cloud, 100% Local Privacy:** All clipboard entries are stored exclusively on your device using `chrome.storage.local`. No external tracking, no backend servers, no analytics.
- **Convenient Capture Workflows:**
  - One-click **Capture Clipboard** button in the popup.
  - Right-click any selected text on any webpage and choose **"Save to Forgotten Clipboard"**.
  - Manual paste input for entering sensitive notes directly.
- **Starred Favorites & Tags:** Organize your most important snippets with custom tags (e.g. `#work`, `#dev`, `#links`) and star your favorites so they are never lost.
- **Smart Pruning & History Limit:** Set custom history limits (from 50 to 2,000+ items). Oldest non-starred entries are pruned gracefully when the limit is reached, preserving your favorites.
- **Full History Dashboard:** A dedicated full-page manager featuring multi-column inspection, sorting, statistics, and theme customization.
- **Backup & Portability:** Export your entire clipboard history to a JSON backup file or restore from a previous backup with one click.
- **Dark & Light Themes:** Crisp, distraction-free aesthetic with automatic system match and manual toggles.
- **Full Keyboard Accessibility:** Navigate and copy snippets using quick keyboard shortcuts (`/` to search, Arrow keys to select, `Enter` to copy).

---

## Permissions Justification

| Permission | Technical Reason | User Benefit |
|------------|------------------|--------------|
| `storage` | Stores snippet history, tags, and user preferences locally via `chrome.storage.local`. | Persists your clipboard history across browser restarts without sending any data to remote servers. |
| `clipboardRead` | Reads text from the clipboard when you explicitly click "Capture Clipboard". | Allows you to save your current clipboard contents into history on command without manual typing. |
| `clipboardWrite` | Writes text back to the clipboard when you click the "Copy" action on a snippet. | Allows you to retrieve and reuse any saved snippet with a single click. |
| `contextMenus` | Registers the "Save to Forgotten Clipboard" option in the right-click menu for selected text. | Lets you save snippets directly while browsing web pages without having to open the popup. |

*Host permissions:* **None**. Forgotten Clipboard does not request or require access to web page content, browsing history, or remote domains.

---

## Privacy & Data Use Disclosure

- **Does this extension collect user data?** No.
- **Does this extension transmit user data off the device?** No.
- **Does this extension contain third-party analytics or ads?** No.
- **How is data stored?** 100% locally in Chromium's sandboxed `chrome.storage.local`.
- **Can users delete their data?** Yes. Users can delete individual snippets or clear their entire history at any time through the popup or settings panel.

---

## Screenshots & Assets Checklist

- [x] Extension Icons: 16×16, 32×32, 48×48, 128×128 (PNG format)
- [ ] Promotional Tile (Small): 440×280 px
- [ ] Promotional Tile (Marquee): 1400×560 px
- [ ] Screenshot 1: Popup interface showing search, filters, and snippet cards (1280×800)
- [ ] Screenshot 2: Full History dashboard with sidebar categories and stats (1280×800)
- [ ] Screenshot 3: Settings and JSON backup / restore workflow (1280×800)
