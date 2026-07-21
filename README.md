# JS Docs

A complete, dark-themed, FastAPI/MkDocs-style documentation site for learning JavaScript from beginner to advanced. 30 pages across 11 sections, a sidebar, an on-page table of contents, client-side search, and syntax-highlighted code — all **plain static HTML/CSS/JS**. No backend, no build tooling required to host it.

[Docs](https://phuocnguyn203-wq.github.io/unofficial-js-docs/)

## Project structure

```
js-documentation/
├── index.html              ← generated landing page (site root)
├── docs/                   ← generated content pages (one .html per topic)
├── assets/
│   ├── css/style.css       ← the entire design system (dark theme)
│   └── js/
│       ├── highlight.js    ← tiny dependency-free syntax highlighter
│       ├── search.js       ← client-side search (no server, no fetch)
│       ├── search-index.js ← generated search index (do not edit by hand)
│       └── main.js         ← sidebar, scrollspy TOC, copy buttons
└── build/                   ← the site generator (source of truth for content)
    ├── nav.json             ← site title, GitHub link, section/page structure
    ├── template.html        ← shared page shell (header, sidebar, TOC, footer)
    ├── content/*.html       ← the actual prose/code for every page
    └── build.js             ← Node script: content + template → static HTML
```

Everything under `index.html`, `docs/`, and `assets/` is **generated output**. If you just want to host the site, that's all you need — `build/` is only needed if you want to edit or add pages.

## Previewing locally

Because the site uses ES module-free `<script>` tags and relative links, you can open `index.html` directly in a browser. For the smoothest experience (and to match how GitHub Pages actually serves it), run a tiny local server from this folder instead:

```bash
# any one of these works
npx serve .
python -m http.server 8080
```

Then visit `http://localhost:8080` (or whatever port it prints).

## Editing content or adding a page

1. Edit (or add) an HTML fragment in `build/content/<page-id>.html`. Fragments use plain HTML, plus a small convention for code blocks so you never have to hand-escape `<`/`>`/`&`:

   ```html
   [[code lang="js"]]
   const arr = [1, 2, 3];
   console.log(arr.length > 0 && arr[0] < 10);
   [[/code]]
   ```

   Supported `lang` values: `js`, `html`, `css`, `json`, `bash`, `console` (plain, unhighlighted output).

2. If you added a new page, register it in `build/nav.json` under the right section (`id`, `title`, `file`).

3. Regenerate the static site:

   ```bash
   node build/build.js
   ```

   This rewrites `index.html`, everything in `docs/`, and `assets/js/search-index.js` — sidebar, "On this page" TOC, prev/next links, and search are all derived automatically from `nav.json` and your `<h2>`/`<h3>` headings, so you never edit those by hand.

4. Before publishing, set your real repository URL in `build/nav.json` (`site.githubUrl`), then rebuild.

## Deploying to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then in the GitHub repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pick `main` and `/ (root)` (since this folder *is* the site root), and save. Your site will be live at `https://<your-username>.github.io/<your-repo>/` within a minute or two.

## License

Free to use, modify, and host as your own — no attribution required.
