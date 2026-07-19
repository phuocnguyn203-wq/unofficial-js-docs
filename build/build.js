#!/usr/bin/env node
/**
 * Static site generator for JS Docs.
 * Reads build/content/*.html fragments + build/nav.json, injects them into
 * build/template.html, and writes plain static HTML files to the site root
 * (index.html) and docs/. No server runtime is involved — the output is the
 * whole site, ready for GitHub Pages.
 *
 * Usage: node build/build.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = __dirname;
const CONTENT_DIR = path.join(BUILD_DIR, "content");
const DOCS_OUT_DIR = path.join(ROOT, "docs");

const nav = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, "nav.json"), "utf8"));
const template = fs.readFileSync(path.join(BUILD_DIR, "template.html"), "utf8");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, "");
}

function decodeEntitiesForIndex(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&middot;/g, "·")
    .replace(/&rarr;/g, "→")
    .replace(/&larr;/g, "←")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Replace [[code lang="js"]] ... [[/code]] blocks with escaped <pre><code> blocks. */
function processCodeBlocks(content) {
  const langNames = {
    js: "JavaScript",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    bash: "Shell",
    console: "Console",
    plain: "Text",
  };
  return content.replace(
    /\[\[code lang="(\w+)"\]\]\r?\n([\s\S]*?)\[\[\/code\]\]/g,
    (_match, lang, code) => {
      const trimmed = code.replace(/\r/g, "").replace(/\n+$/, "").replace(/^\n+/, "");
      const label = langNames[lang] || lang;
      return (
        `<div class="code-block" data-lang="${lang}">` +
        `<div class="code-block-header"><span class="code-lang">${label}</span>` +
        `<button class="copy-btn" type="button" data-copy-target aria-label="Copy code">Copy</button></div>` +
        `<pre><code>${escapeHtml(trimmed)}</code></pre>` +
        `</div>`
      );
    }
  );
}

/** Find h2/h3 headings, assign slug ids + anchor links, and return {html, toc[]}. */
function processHeadings(content) {
  const seen = new Map();
  const toc = [];

  const html = content.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, level, inner) => {
    const text = stripTags(inner).trim();
    let base = slugify(text) || "section";
    let slug = base;
    if (seen.has(base)) {
      const n = seen.get(base) + 1;
      seen.set(base, n);
      slug = `${base}-${n}`;
    } else {
      seen.set(base, 1);
    }
    toc.push({ level: Number(level), text, slug });
    return `<h${level} id="${slug}">${inner}<a href="#${slug}" class="heading-anchor" aria-label="Link to this section">#</a></h${level}>`;
  });

  return { html, toc };
}

function buildTocHtml(toc) {
  if (!toc.length) return "";
  let html = '<p class="toc-title">On this page</p><ul class="toc-list">';
  for (const item of toc) {
    html += `<li class="toc-level-${item.level}"><a href="#${item.slug}" data-toc-link="${item.slug}">${escapeHtml(item.text)}</a></li>`;
  }
  html += "</ul>";
  return html;
}

function buildNavHtml(currentId, rootPrefix) {
  let html = `<div class="nav-home"><a href="${rootPrefix}index.html" class="${currentId === "home" ? "active" : ""}">&#8962; Home</a></div>`;
  for (const section of nav.sections) {
    html += `<div class="nav-section"><p class="nav-section-title">${escapeHtml(section.label)}</p><ul>`;
    for (const page of section.pages) {
      const active = page.id === currentId ? " active" : "";
      html += `<li><a href="${rootPrefix}docs/${page.file}" class="${active}">${escapeHtml(page.title)}</a></li>`;
    }
    html += "</ul></div>";
  }
  return html;
}

function flattenPages() {
  const flat = [];
  for (const section of nav.sections) {
    for (const page of section.pages) {
      flat.push({ ...page, section: section.label });
    }
  }
  return flat;
}

function buildPrevNextHtml(currentId, rootPrefix) {
  const flat = flattenPages();
  const idx = flat.findIndex((p) => p.id === currentId);
  if (idx === -1) return "";
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  let html = '<nav class="prev-next" aria-label="Page navigation">';
  if (prev) {
    html += `<a class="prev-next-link prev" href="${rootPrefix}docs/${prev.file}"><span class="prev-next-label">&larr; Previous</span><span class="prev-next-title">${escapeHtml(prev.title)}</span></a>`;
  } else {
    html += '<span class="prev-next-spacer"></span>';
  }
  if (next) {
    html += `<a class="prev-next-link next" href="${rootPrefix}docs/${next.file}"><span class="prev-next-label">Next &rarr;</span><span class="prev-next-title">${escapeHtml(next.title)}</span></a>`;
  }
  html += "</nav>";
  return html;
}

function render(vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

if (!fs.existsSync(DOCS_OUT_DIR)) fs.mkdirSync(DOCS_OUT_DIR, { recursive: true });

const searchIndex = [];
let pagesBuilt = 0;

function buildPage({ id, title, file, sectionLabel, isHome }) {
  const contentPath = path.join(CONTENT_DIR, `${id}.html`);
  if (!fs.existsSync(contentPath)) {
    console.warn(`  ! missing content fragment: ${contentPath}`);
    return;
  }
  const raw = fs.readFileSync(contentPath, "utf8");
  const withCode = processCodeBlocks(raw);
  const { html: withHeadings, toc } = processHeadings(withCode);

  const rootPrefix = isHome ? "" : "../";
  const navHtml = buildNavHtml(id, rootPrefix);
  const tocHtml = buildTocHtml(toc);
  const prevNextHtml = isHome ? "" : buildPrevNextHtml(id, rootPrefix);

  const description = nav.site.tagline;

  const outHtml = render({
    TITLE: isHome ? `${nav.site.title} — ${nav.site.tagline}` : `${title} — ${nav.site.title}`,
    DESCRIPTION: escapeHtml(description),
    ASSET_PREFIX: rootPrefix,
    ROOT_PREFIX: rootPrefix,
    BODY_CLASS: isHome ? "page-home" : "page-doc",
    NAV_HTML: navHtml,
    TOC_HTML: tocHtml,
    CONTENT: withHeadings,
    PREV_NEXT_HTML: prevNextHtml,
    GITHUB_URL: nav.site.githubUrl,
    YEAR: nav.site.year,
  });

  const outPath = isHome ? path.join(ROOT, file) : path.join(DOCS_OUT_DIR, file);
  fs.writeFileSync(outPath, outHtml, "utf8");
  pagesBuilt++;

  // Search index entry
  const plainText = decodeEntitiesForIndex(stripTags(withCode.replace(/<pre>[\s\S]*?<\/pre>/g, " ")))
    .replace(/\s+/g, " ")
    .trim();
  searchIndex.push({
    title,
    section: sectionLabel || "",
    url: isHome ? file : `docs/${file}`,
    headings: toc.map((t) => t.text),
    excerpt: plainText.slice(0, 240),
  });
}

console.log("Building JS Docs...");

buildPage({ id: nav.home.id, title: nav.home.title, file: nav.home.file, sectionLabel: "", isHome: true });

for (const section of nav.sections) {
  for (const page of section.pages) {
    buildPage({ id: page.id, title: page.title, file: page.file, sectionLabel: section.label, isHome: false });
  }
}

const searchIndexJs = `// Auto-generated by build/build.js — do not edit by hand.\nwindow.SEARCH_INDEX = ${JSON.stringify(searchIndex, null, 0)};\n`;
fs.writeFileSync(path.join(ROOT, "assets", "js", "search-index.js"), searchIndexJs, "utf8");

console.log(`Done. Built ${pagesBuilt} pages. Search index: ${searchIndex.length} entries.`);
