/**
 * Forgotten Clipboard - Content Classifier
 * Detects common content types: link, email, code, text.
 * Heuristics are conservative: if uncertain, defaults to 'text'.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Classifier = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Common URL pattern
  const URL_PROTOCOL_REGEX = /^(https?|ftp|file):\/\/[^\s/$.?#].[^\s]*$/i;
  const DOMAIN_PATH_REGEX = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d+)?(\/[^\s]*)?$/i;
  const LOCALHOST_REGEX = /^localhost(:\d+)?(\/[^\s]*)?$/i;

  // Strict single-address email pattern
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  // Shell & CLI commands
  const SHELL_PREFIXES = [
    'npm ', 'pnpm ', 'yarn ', 'bun ', 'git ', 'docker ', 'kubectl ',
    'curl ', 'wget ', 'sudo ', 'ssh ', 'pip ', 'python ', 'node ',
    'cargo ', 'go run', 'go get', 'brew ', 'apt ', 'apt-get ',
    'npx ', 'cat ', 'grep ', 'export ', 'chmod ', 'chown ', 'tar ',
    'systemctl ', 'find ', 'kill ', 'netstat ', 'ping ', '$ ', '# '
  ];

  // Code indicators
  const CODE_PATTERNS = [
    /\b(function|const|let|var|class|interface|import|export|from|return|async|await)\b/,
    /\b(def|class|import|from|elif|lambda|print\s*\()\b/, // Python
    /\b(public|private|protected|static|void|final|int|boolean|String)\b/, // Java/C#
    /\b(func|package|type\s+\w+\s+struct)\b/, // Go
    /\b(fn\s+\w+|impl|pub\s+fn|let\s+mut)\b/, // Rust
    /\b(SELECT\s+.+\s+FROM\s+|INSERT\s+INTO\s+|UPDATE\s+.+\s+SET\s+|DELETE\s+FROM\s+)/i, // SQL
    /(?:=>|===|!==|;\s*$|{\s*$|<\/?[a-z0-9]+>)/m, // Syntax artifacts
  ];

  /**
   * Test whether a string is a valid URL
   * @param {string} trimmed
   * @returns {boolean}
   */
  function isLink(trimmed) {
    if (!trimmed || trimmed.includes('\n') || trimmed.includes(' ')) {
      return false;
    }

    if (URL_PROTOCOL_REGEX.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'ftp:';
      } catch {
        return false;
      }
    }

    if (LOCALHOST_REGEX.test(trimmed)) {
      return true;
    }

    if (DOMAIN_PATH_REGEX.test(trimmed)) {
      try {
        const parsed = new URL(`https://${trimmed}`);
        return Boolean(parsed.hostname && parsed.hostname.includes('.'));
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Test whether a string is a single valid email address
   * @param {string} trimmed
   * @returns {boolean}
   */
  function isEmail(trimmed) {
    if (!trimmed || trimmed.includes('\n') || trimmed.includes(' ')) {
      return false;
    }
    return EMAIL_REGEX.test(trimmed);
  }

  /**
   * Test whether a string is likely JSON
   * @param {string} trimmed
   * @returns {boolean}
   */
  function isJson(trimmed) {
    if (trimmed.length < 2) return false;
    const startsWithBrace = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                            (trimmed.startsWith('[') && trimmed.endsWith(']'));
    if (!startsWithBrace) return false;

    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }

  /**
   * Test whether a string is a shell or terminal command
   * @param {string} trimmed
   * @returns {boolean}
   */
  function isShellCommand(trimmed) {
    const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 5) return false; // long multi-line text is usually not a shell command

    for (const line of lines) {
      const l = line.trim();
      for (const prefix of SHELL_PREFIXES) {
        if (l.startsWith(prefix)) return true;
      }
    }
    return false;
  }

  /**
   * Test whether a string looks like source code or markup
   * @param {string} trimmed
   * @returns {boolean}
   */
  function isCodeSnippet(trimmed) {
    // 1. JSON
    if (isJson(trimmed)) return true;

    // 2. Shell commands
    if (isShellCommand(trimmed)) return true;

    // 3. Multi-line code patterns or strong syntactic signals
    const lines = trimmed.split('\n');
    let matchedPatterns = 0;

    for (const pat of CODE_PATTERNS) {
      if (pat.test(trimmed)) {
        matchedPatterns++;
      }
    }

    // Indentation check: lines starting with 2+ spaces or tabs
    let indentedLines = 0;
    for (const line of lines) {
      if (/^( {2,}|\t)/.test(line)) {
        indentedLines++;
      }
    }

    const hasSignificantIndentation = lines.length >= 3 && (indentedLines / lines.length) >= 0.4;
    const hasCurlysOrBrackets = /[{}[\]();]/.test(trimmed);

    if (matchedPatterns >= 2) return true;
    if (matchedPatterns >= 1 && (hasCurlysOrBrackets || hasSignificantIndentation)) return true;
    if (hasSignificantIndentation && hasCurlysOrBrackets) return true;

    // XML/HTML tag check (e.g., <button class="btn">Click</button>)
    if (/^<([a-z0-9-]+)(\s+[^>]+)?>.*<\/\1>$/is.test(trimmed) || /^<([a-z0-9-]+)(\s+[^>]+)?\s*\/>$/is.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Main classifier entry point
   * @param {string} rawText
   * @returns {{ type: 'link' | 'email' | 'code' | 'text', subtype?: string, confidence: number }}
   */
  function classifySnippet(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { type: 'text', confidence: 1 };
    }

    const trimmed = rawText.trim();
    if (trimmed.length === 0) {
      return { type: 'text', confidence: 1 };
    }

    // 1. Check Email first (strict regex, no spaces)
    if (isEmail(trimmed)) {
      return { type: 'email', confidence: 0.95 };
    }

    // 2. Check Link (single line, no spaces, valid URL structure)
    if (isLink(trimmed)) {
      return { type: 'link', confidence: 0.95 };
    }

    // 3. Check Code / Terminal command
    if (isCodeSnippet(trimmed)) {
      return { type: 'code', confidence: 0.85 };
    }

    // 4. Default to Plain Text (conservative approach)
    return { type: 'text', confidence: 1 };
  }

  return {
    classifySnippet,
    isLink,
    isEmail,
    isCodeSnippet,
    isJson,
    isShellCommand
  };
});
