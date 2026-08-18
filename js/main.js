/* ============================================================
   FloraeStudio — main.js
   負責：
   1. 從 data/projects.json 讀取作品資料，動態產生分類篩選 chips 與作品卡片
      （沒有作品的分類會自動顯示「尚在栽培中」的標本空位卡）
   2. 標本卡 / 作品卡 的捲動進場動畫（IntersectionObserver）
   3. 導覽列依目前捲動所在區塊自動反白
   ============================================================ */

(function () {
  "use strict";

  var lenisInstance = null;

  var PLACEHOLDER_ICON =
    '<svg viewBox="0 0 100 100" fill="none">' +
    '<rect x="20" y="18" width="60" height="44" rx="1" stroke="#2b3627" stroke-width="1.2"/>' +
    '<path d="M20 30 H80" stroke="#2b3627" stroke-width="1"/>' +
    '<circle cx="26" cy="24" r="1.4" fill="#a3667a"/>' +
    '<circle cx="31" cy="24" r="1.4" fill="#ab8a52"/>' +
    '<path d="M50 70 C 50 62, 50 58, 50 50" stroke="#7f9271" stroke-width="1.1"/>' +
    "</svg>";

  var SEED_ICON =
    '<svg class="seed" viewBox="0 0 100 100" fill="none">' +
    '<ellipse cx="50" cy="55" rx="14" ry="20" stroke="#7f9271" stroke-width="1.4"/>' +
    '<path d="M50 35 L50 20" stroke="#7f9271" stroke-width="1.2" stroke-linecap="round"/>' +
    "</svg>";

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function buildProjectCard(project, category) {
    var article = document.createElement("article");
    article.className = "project reveal";
    article.setAttribute("data-cat", category.id);

    var shotInner = project.image
      ? '<img src="' + escapeHtml(project.image) + '" alt="' + escapeHtml(project.title) + '">'
      : PLACEHOLDER_ICON +
      '<span class="placeholder-label">screenshot placeholder</span>';

    article.innerHTML =
      '<div class="shot">' +
      '<span class="corner tl"></span><span class="corner tr"></span>' +
      '<span class="corner bl"></span><span class="corner br"></span>' +
      shotInner +
      "</div>" +
      '<div class="body">' +
      '<span class="cat-label">' + escapeHtml(category.label) + " · " + escapeHtml(category.labelEn) + "</span>" +
      "<h4>" + escapeHtml(project.title) + "</h4>" +
      "<p>" + escapeHtml(project.description || "") + "</p>" +
      "</div>";

    if (project.url) {
      article.style.cursor = "pointer";
      article.addEventListener("click", function () {
        window.open(project.url, "_blank", "noopener");
      });
    }
    return article;
  }

  function buildEmptyCard(category) {
    var article = document.createElement("article");
    article.className = "project reveal empty";
    article.setAttribute("data-cat", category.id);
    article.innerHTML =
      SEED_ICON +
      '<span class="cat-label">' + escapeHtml(category.label) + " · " + escapeHtml(category.labelEn) + "</span>" +
      "<h4>尚在栽培中</h4>" +
      "<p>此分類作品準備中，敬請期待。</p>";
    return article;
  }

  function renderPortfolio(data) {
    var chipsEl = document.getElementById("filterChips");
    var gridEl = document.getElementById("projectGrid");
    if (!chipsEl || !gridEl) return;

    var categories = data.categories || [];
    var projects = data.projects || [];

    // --- chips: 全部 + 每個分類 ---
    chipsEl.innerHTML = "";
    var allChip = document.createElement("button");
    allChip.className = "chip active";
    allChip.setAttribute("data-filter", "all");
    allChip.textContent = "全部";
    chipsEl.appendChild(allChip);

    categories.forEach(function (cat) {
      var chip = document.createElement("button");
      chip.className = "chip";
      chip.setAttribute("data-filter", cat.id);
      chip.textContent = cat.label;
      chipsEl.appendChild(chip);
    });

    // --- grid: 依分類分組，沒有作品的分類自動補「尚在栽培中」---
    gridEl.innerHTML = "";
    categories.forEach(function (cat) {
      var itemsInCat = projects.filter(function (p) {
        return p.category === cat.id;
      });
      if (itemsInCat.length === 0) {
        gridEl.appendChild(buildEmptyCard(cat));
      } else {
        itemsInCat.forEach(function (p) {
          gridEl.appendChild(buildProjectCard(p, cat));
        });
      }
    });

    attachChipFilter(chipsEl, gridEl);
    attachScrollReveal(gridEl.querySelectorAll(".reveal"));
    if (lenisInstance) lenisInstance.resize(); // 新增：卡片插入後重新量測捲動高度
  }

  function attachChipFilter(chipsEl, gridEl) {
    var chips = chipsEl.querySelectorAll(".chip");
    var cards = gridEl.querySelectorAll(".project");
    var FADE_MS = 220;

    // 篩選用的卡片改用統一、較快的淡出/淡入時間，
    // 並清掉進場動畫留下的 stagger delay，避免切換時卡片各自延遲、忽快忽慢
    cards.forEach(function (card) {
      card.classList.add("filtering");
      card.style.transitionDelay = "0ms";
    });

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (chip.classList.contains("active")) return;
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var f = chip.getAttribute("data-filter");

        cards.forEach(function (card) {
          var show = f === "all" || card.getAttribute("data-cat") === f;
          if (show) {
            card.classList.remove("hidden");
            card.classList.add("in-view"); // 直接標記已顯示，不受限於是否曾被捲動觀察到
            requestAnimationFrame(function () {
              card.classList.remove("filter-hide");
            });
          } else if (!card.classList.contains("hidden")) {
            card.classList.add("filter-hide");
            window.setTimeout(function () {
              card.classList.add("hidden");
            }, FADE_MS);
          }
        });
      });
    });
  }

  function loadPortfolio() {
    var gridEl = document.getElementById("projectGrid");
    fetch("data/projects.json")
      .then(function (res) {
        if (!res.ok) throw new Error("projects.json 讀取失敗：" + res.status);
        return res.json();
      })
      .then(renderPortfolio)
      .then(function () {
        window.addEventListener("load", function () {
          if (lenisInstance) lenisInstance.resize();
        });
      })
      .catch(function (err) {
        console.error(err);
        if (gridEl) {
          gridEl.innerHTML =
            '<p style="grid-column:1/-1; text-align:center; color:var(--ink-soft); font-size:13px;">' +
            "作品資料載入失敗（本機開啟 index.html 需透過本地伺服器，例如 VS Code Live Server，" +
            "直接雙擊開啟檔案會因瀏覽器安全限制無法讀取 JSON）。</p>";
        }
      });
  }

  // ---------- 捲動進場動畫（標本卡 / 作品卡 共用） ----------
  function attachScrollReveal(nodeList) {
    var targets = Array.prototype.slice.call(nodeList);
    if (!targets.length) return;

    targets.forEach(function (el, i) {
      el.style.transitionDelay = i * 90 + "ms";
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      targets.forEach(function (el) { observer.observe(el); });
    } else {
      targets.forEach(function (el) { el.classList.add("in-view"); });
    }
  }

  // ---------- 導覽列依捲動位置自動反白 ----------
  function initNavActiveOnScroll() {
    var sections = document.querySelectorAll("#home, #portfolio, #commission, #misc");
    var navLinks = document.querySelectorAll("nav a");
    if (!("IntersectionObserver" in window) || !sections.length) return;

    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute("id");
            navLinks.forEach(function (link) {
              link.classList.toggle("active", link.getAttribute("href") === "#" + id);
            });
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (sec) { navObserver.observe(sec); });
  }

  // ---------- 桌面版慣性平滑捲動 ----------
  // 只在「非觸控裝置」且「使用者未設定減少動態」時啟用，
  // 手機/平板本身滾動已經很順，不需要（也不該）疊加額外的慣性層。
  function initSmoothScroll() {
    if (typeof Lenis === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
    lenisInstance = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // ---------- 手機版漢堡選單開闔 ----------
  function initMobileNav() {
    var toggle = document.getElementById("menuToggle");
    var nav = document.getElementById("primaryNav");
    var header = toggle ? toggle.closest("header") : null;
    if (!toggle || !nav || !header) return;

    function closeNav() {
      header.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    function openNav() {
      header.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      if (header.classList.contains("nav-open")) {
        closeNav();
      } else {
        openNav();
      }
    });

    // 點選單內任一連結後自動收合（含頁內錨點捲動的情況）
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    // 視窗放大回桌機寬度時，確保選單狀態重置，避免殘留展開樣式
    window.addEventListener("resize", function () {
      if (window.innerWidth > 640) closeNav();
    });
  }

  // ---------- 初始化 ----------
  document.addEventListener("DOMContentLoaded", function () {
    attachScrollReveal(document.querySelectorAll(".specimen"));
    initNavActiveOnScroll();
    initMobileNav();
    initSmoothScroll();
    loadPortfolio();
  });
})();