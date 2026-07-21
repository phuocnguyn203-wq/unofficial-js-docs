/*
 * Minimal, dependency-free syntax highlighter.
 * Tokenizes code blocks client-side so the whole site stays static
 * (no CDN, no build step). Good enough for docs, not a full parser.
 */
(function () {
  "use strict";

  var KEYWORDS = [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "do", "switch", "case", "break", "continue", "class", "extends", "super",
    "new", "this", "typeof", "instanceof", "in", "of", "try", "catch",
    "finally", "throw", "async", "await", "yield", "import", "export",
    "from", "as", "default", "static", "get", "set", "void", "delete",
    "null", "undefined", "true", "false", "NaN", "constructor"
  ];
  var KEYWORD_SET = KEYWORDS.reduce(function (acc, k) { acc[k] = true; return acc; }, {});

  var BUILTINS = [
    "console", "Math", "JSON", "Object", "Array", "String", "Number",
    "Boolean", "Promise", "Map", "Set", "WeakMap", "WeakSet", "Symbol",
    "RegExp", "Date", "Error", "TypeError", "RangeError", "window",
    "document", "globalThis", "Infinity", "Reflect", "Proxy", "fetch",
    "localStorage", "sessionStorage", "module", "exports", "require",
    "process", "Array", "self"
  ];
  var BUILTIN_SET = BUILTINS.reduce(function (acc, k) { acc[k] = true; return acc; }, {});

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Matches, in priority order: line comments, block comments, template
  // literals, single/double quoted strings, numbers, identifiers.
  var TOKEN_RE = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`)|('(?:\\.|[^'\\\n])*')|("(?:\\.|[^"\\\n])*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

  function highlightJS(code) {
    var out = "";
    var lastIndex = 0;
    var match;
    TOKEN_RE.lastIndex = 0;
    while ((match = TOKEN_RE.exec(code)) !== null) {
      out += escapeHtml(code.slice(lastIndex, match.index));
      var full = match[0];
      var lineComment = match[1], blockComment = match[2], template = match[3];
      var single = match[4], double = match[5], number = match[6], ident = match[7];

      if (lineComment || blockComment) {
        out += '<span class="tok-comment">' + escapeHtml(full) + "</span>";
      } else if (template || single || double) {
        out += '<span class="tok-string">' + escapeHtml(full) + "</span>";
      } else if (number) {
        out += '<span class="tok-number">' + escapeHtml(full) + "</span>";
      } else if (ident) {
        var after = code.slice(TOKEN_RE.lastIndex, TOKEN_RE.lastIndex + 30);
        var isCall = /^\s*\(/.test(after);
        if (KEYWORD_SET[ident]) {
          out += '<span class="tok-keyword">' + escapeHtml(full) + "</span>";
        } else if (BUILTIN_SET[ident]) {
          out += '<span class="tok-builtin">' + escapeHtml(full) + "</span>";
        } else if (isCall) {
          out += '<span class="tok-function">' + escapeHtml(full) + "</span>";
        } else {
          out += escapeHtml(full);
        }
      } else {
        out += escapeHtml(full);
      }
      lastIndex = TOKEN_RE.lastIndex;
    }
    out += escapeHtml(code.slice(lastIndex));
    return out;
  }

  // Generic fallback for non-JS languages: comments + strings + numbers only.
  function highlightGeneric(code, lang) {
    var patterns = {
      css: /(\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*')|("(?:\\.|[^"\\\n])*")|(\b\d+(?:\.\d+)?(?:px|em|rem|%|s|ms)?\b)/g,
      html: /(<!--[\s\S]*?-->)|('(?:\\.|[^'\\\n])*')|("(?:\\.|[^"\\\n])*")/g,
      json: /("(?:\\.|[^"\\\n])*")|(\b\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g,
      bash: /(#[^\n]*)|('(?:\\.|[^'\\\n])*')|("(?:\\.|[^"\\\n])*")/g
    };
    var re = patterns[lang];
    if (!re) return escapeHtml(code);

    var out = "";
    var lastIndex = 0;
    var match;
    re.lastIndex = 0;
    while ((match = re.exec(code)) !== null) {
      out += escapeHtml(code.slice(lastIndex, match.index));
      var full = match[0];
      if (/^(\/\*|<!--|#)/.test(full)) {
        out += '<span class="tok-comment">' + escapeHtml(full) + "</span>";
      } else if (/^['"]/.test(full)) {
        out += '<span class="tok-string">' + escapeHtml(full) + "</span>";
      } else if (/^(true|false|null)$/.test(full)) {
        out += '<span class="tok-keyword">' + escapeHtml(full) + "</span>";
      } else {
        out += '<span class="tok-number">' + escapeHtml(full) + "</span>";
      }
      lastIndex = re.lastIndex;
    }
    out += escapeHtml(code.slice(lastIndex));
    return out;
  }

  function highlightElement(codeEl, lang) {
    var raw = codeEl.textContent;
    var html = lang === "js" ? highlightJS(raw) : highlightGeneric(raw, lang);
    codeEl.innerHTML = html;
  }

  function highlightAll() {
    var blocks = document.querySelectorAll(".code-block[data-lang]");
    blocks.forEach(function (block) {
      var lang = block.getAttribute("data-lang");
      var codeEl = block.querySelector("code");
      if (!codeEl || lang === "console" || lang === "plain") return;
      highlightElement(codeEl, lang);
    });
  }

  window.JSDocsHighlight = { highlightAll: highlightAll, highlightLine: highlightJS };
})();
