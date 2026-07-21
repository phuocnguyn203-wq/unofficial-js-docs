/*
 * Shared engine for the step-through "sim" widgets used across the
 * Asynchronous JavaScript pages (call stack / event loop / promise flow
 * visualizers). Each page provides its own code + step data and calls
 * JSDocsSim.init({...}) — this file only knows how to render a step.
 */
(function () {
  "use strict";

  function renderCode(root, code) {
    var codeEl = root.querySelector(".sim-code code");
    if (!codeEl) return;
    var lines = code.replace(/\n+$/, "").split("\n");
    var highlighter = window.JSDocsHighlight;

    codeEl.innerHTML = "";
    lines.forEach(function (line, i) {
      var span = document.createElement("span");
      span.className = "sim-line";
      span.dataset.line = String(i + 1);
      if (line.length === 0) {
        span.innerHTML = "&nbsp;";
      } else if (highlighter) {
        span.innerHTML = highlighter.highlightLine(line);
      } else {
        span.textContent = line;
      }
      codeEl.appendChild(span);
    });
  }

  function renderLane(el, items, emptyText) {
    if (!el) return;
    el.innerHTML = "";
    if (!items || !items.length) {
      var p = document.createElement("p");
      p.className = "sim-empty";
      p.textContent = emptyText;
      el.appendChild(p);
      return;
    }
    items.forEach(function (item, i) {
      var div = document.createElement("div");
      div.className = "sim-frame" + (i === items.length - 1 ? " sim-frame-top" : "");
      div.textContent = item;
      el.appendChild(div);
    });
  }

  function init(config) {
    var root = document.getElementById(config.id);
    if (!root) return;

    if (config.code) renderCode(root, config.code);

    var steps = config.steps;
    var lineEls = root.querySelectorAll(".sim-line[data-line]");
    var stackEl = root.querySelector('[data-lane-body="stack"]');
    var webapiEl = root.querySelector('[data-lane-body="webapi"]');
    var microEl = root.querySelector('[data-lane-body="micro"]');
    var macroEl = root.querySelector('[data-lane-body="macro"]');
    var consoleEl = root.querySelector('[data-lane-body="console"]');
    var explainEl = root.querySelector(".sim-explain");
    var indicatorEl = root.querySelector(".sim-step-indicator");
    var prevBtn = root.querySelector('[data-sim-action="prev"]');
    var nextBtn = root.querySelector('[data-sim-action="next"]');
    var resetBtn = root.querySelector('[data-sim-action="reset"]');
    var idx = 0;

    function render() {
      var step = steps[idx];
      var activeLines = step.lines || [];
      lineEls.forEach(function (el) {
        el.classList.toggle("is-active", activeLines.indexOf(Number(el.dataset.line)) !== -1);
      });
      renderLane(stackEl, step.stack, "empty");
      renderLane(webapiEl, step.webapi, "idle");
      renderLane(microEl, step.micro, "empty");
      renderLane(macroEl, step.macro, "empty");
      if (consoleEl) {
        consoleEl.innerHTML = "";
        var log = step.consoleLog || [];
        if (!log.length) {
          var p = document.createElement("p");
          p.className = "sim-empty";
          p.textContent = "nothing logged yet";
          consoleEl.appendChild(p);
        } else {
          log.forEach(function (text) {
            var line = document.createElement("p");
            line.className = "sim-console-line";
            line.textContent = "→ " + text;
            consoleEl.appendChild(line);
          });
        }
      }
      if (explainEl) explainEl.textContent = step.note;
      if (indicatorEl) indicatorEl.textContent = "Step " + idx + " / " + (steps.length - 1);
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === steps.length - 1;
    }

    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (idx < steps.length - 1) { idx++; render(); }
    });
    if (prevBtn) prevBtn.addEventListener("click", function () {
      if (idx > 0) { idx--; render(); }
    });
    if (resetBtn) resetBtn.addEventListener("click", function () {
      idx = 0; render();
    });

    render();
  }

  window.JSDocsSim = { init: init };
})();
