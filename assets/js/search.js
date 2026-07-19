/*
 * Client-side search over window.SEARCH_INDEX (generated at build time).
 * No server, no fetch — the index is inlined as a plain JS array so it
 * works even when the site is opened straight from disk.
 */
(function () {
  "use strict";

  var overlay = document.getElementById("search-overlay");
  var trigger = document.getElementById("search-trigger");
  var input = document.getElementById("search-input");
  var resultsEl = document.getElementById("search-results");
  var index = window.SEARCH_INDEX || [];
  var rootPrefix = window.ROOT_PREFIX || "";

  var activeIndex = -1;
  var currentResults = [];

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      "<mark>" + escapeHtml(text.slice(idx, idx + query.length)) + "</mark>" +
      escapeHtml(text.slice(idx + query.length))
    );
  }

  function score(entry, q) {
    var s = 0;
    var title = entry.title.toLowerCase();
    if (title === q) s += 100;
    else if (title.indexOf(q) === 0) s += 60;
    else if (title.indexOf(q) !== -1) s += 35;

    for (var i = 0; i < entry.headings.length; i++) {
      if (entry.headings[i].toLowerCase().indexOf(q) !== -1) { s += 18; break; }
    }
    if (entry.section && entry.section.toLowerCase().indexOf(q) !== -1) s += 8;
    if (entry.excerpt.toLowerCase().indexOf(q) !== -1) s += 5;
    return s;
  }

  function runSearch(query) {
    var q = query.trim().toLowerCase();
    if (!q) {
      currentResults = [];
      resultsEl.innerHTML = '<p class="search-hint">Type to search across the whole guide &mdash; try &ldquo;closures&rdquo;, &ldquo;promise&rdquo; or &ldquo;array&rdquo;.</p>';
      return;
    }

    var scored = index
      .map(function (entry) { return { entry: entry, score: score(entry, q) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 8);

    currentResults = scored.map(function (r) { return r.entry; });
    activeIndex = -1;

    if (!scored.length) {
      resultsEl.innerHTML = '<p class="search-empty">No results for &ldquo;' + escapeHtml(query) + '&rdquo;.</p>';
      return;
    }

    resultsEl.innerHTML = scored
      .map(function (r, i) {
        var e = r.entry;
        return (
          '<a class="search-result" data-index="' + i + '" href="' + rootPrefix + e.url + '">' +
          '<div class="sr-section">' + escapeHtml(e.section || "JS Docs") + "</div>" +
          '<div class="sr-title">' + highlightMatch(e.title, query) + "</div>" +
          '<div class="sr-excerpt">' + highlightMatch(e.excerpt, query) + "&hellip;</div>" +
          "</a>"
        );
      })
      .join("");
  }

  function setActive(i) {
    var items = resultsEl.querySelectorAll(".search-result");
    items.forEach(function (el) { el.classList.remove("is-active"); });
    if (i >= 0 && items[i]) {
      items[i].classList.add("is-active");
      items[i].scrollIntoView({ block: "nearest" });
    }
    activeIndex = i;
  }

  function openSearch() {
    overlay.classList.add("open");
    input.value = "";
    runSearch("");
    setTimeout(function () { input.focus(); }, 10);
  }

  function closeSearch() {
    overlay.classList.remove("open");
  }

  if (trigger) trigger.addEventListener("click", openSearch);

  if (overlay) {
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) closeSearch();
    });
  }

  if (input) {
    input.addEventListener("input", function () { runSearch(input.value); });
    input.addEventListener("keydown", function (e) {
      var count = resultsEl.querySelectorAll(".search-result").length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, count - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        var target = activeIndex >= 0 ? currentResults[activeIndex] : currentResults[0];
        if (target) window.location.href = rootPrefix + target.url;
      } else if (e.key === "Escape") {
        closeSearch();
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable;

    if (e.key === "/" && !typing) {
      e.preventDefault();
      openSearch();
    } else if (e.key === "Escape" && overlay.classList.contains("open")) {
      closeSearch();
    } else if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openSearch();
    }
  });
})();
