(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    if (window.JSDocsHighlight) window.JSDocsHighlight.highlightAll();
    initSidebar();
    initCopyButtons();
    initScrollspy();
    initActiveNavScroll();
  });

  function initSidebar() {
    var toggle = document.getElementById("nav-toggle");
    var sidebar = document.getElementById("sidebar");
    var backdrop = document.getElementById("sidebar-backdrop");
    if (!toggle || !sidebar || !backdrop) return;

    function open() {
      sidebar.classList.add("open");
      backdrop.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
    }
    function close() {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {
      sidebar.classList.contains("open") ? close() : open();
    });
    backdrop.addEventListener("click", close);
    sidebar.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function initCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var block = btn.closest(".code-block");
        var codeEl = block && block.querySelector("code");
        if (!codeEl) return;
        var text = codeEl.textContent;

        var done = function () {
          var original = btn.textContent;
          btn.textContent = "Copied!";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove("copied");
          }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
        } else {
          fallbackCopy(text, done);
        }
      });
    });
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
    done();
  }

  function initScrollspy() {
    var tocLinks = document.querySelectorAll(".toc-list a");
    if (!tocLinks.length) return;

    var headings = Array.prototype.slice
      .call(tocLinks)
      .map(function (link) {
        var slug = link.getAttribute("data-toc-link");
        return document.getElementById(slug);
      })
      .filter(Boolean);

    if (!headings.length) return;

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var scrollPos = window.scrollY + 96;
        var current = headings[0];
        for (var i = 0; i < headings.length; i++) {
          if (headings[i].offsetTop <= scrollPos) current = headings[i];
        }
        tocLinks.forEach(function (link) {
          link.classList.toggle("active", link.getAttribute("data-toc-link") === current.id);
        });
        ticking = false;
      });
    }

    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initActiveNavScroll() {
    var active = document.querySelector(".sidebar-nav a.active");
    if (active) active.scrollIntoView({ block: "center" });
  }
})();
