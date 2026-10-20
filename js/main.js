/* ============================================================
   FloraeStudio — main.js
   1. 平滑捲動（Lenis，本機載入，桌面版才啟用）
   2. 從 data/projects.json 渲染作品：
      - 首頁 #featuredGrid：精選幾件
      - works.html #filterChips / #projectGrid：分類篩選＋全部作品
   3. 捲動進場動畫（IntersectionObserver）
   4. 導覽列反白、手機選單、hero 動畫在離開畫面時暫停
   ============================================================ */

(function () {
  "use strict";

  var lenis = null;
  var HEADER_OFFSET = 68; // 對應 css 的 --header-h，錨點捲動時預留標頭高度

  var PLACEHOLDER_ICON =
    '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true">' +
    '<rect x="20" y="18" width="60" height="44" rx="1" stroke="#2b3627" stroke-width="1.2"/>' +
    '<path d="M20 30 H80" stroke="#2b3627" stroke-width="1"/>' +
    '<circle cx="26" cy="24" r="1.4" fill="#a3667a"/>' +
    '<circle cx="31" cy="24" r="1.4" fill="#ab8a52"/>' +
    '<path d="M50 70 C 50 62, 50 58, 50 50" stroke="#7f9271" stroke-width="1.1"/>' +
    "</svg>";

  var SEED_ICON =
    '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="55" rx="14" ry="20" stroke="#7f9271" stroke-width="1.4"/>' +
    '<path d="M50 35 L50 20" stroke="#7f9271" stroke-width="1.2" stroke-linecap="round"/>' +
    "</svg>";

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- 1. 平滑捲動 ---------- */
  // 只在「精準指標（滑鼠／觸控板）」且「未開啟減少動態」時啟用。
  // 觸控裝置原生捲動本來就順，再疊一層慣性反而會變怪。
  function initSmoothScroll() {
    if (typeof Lenis === "undefined") return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    lenis = new Lenis({
      lerp: 0.1,            // 數值越小越滑、越黏；0.1 是順而不拖的折衷
      wheelMultiplier: 1,
      smoothWheel: true,
      anchors: { offset: -HEADER_OFFSET }, // 頁內錨點交給 Lenis 捲動，並避開固定標頭
      autoRaf: true         // Lenis 自己管理 requestAnimationFrame，不再手動 raf
    });
  }

  function refreshScrollHeight() {
    if (lenis) lenis.resize();
  }

  /* ---------- 2. 作品卡 ---------- */
  function buildProjectCard(project, category) {
    var article = document.createElement("article");
    article.className = "project reveal";
    article.setAttribute("data-cat", category.id);

    var shotInner = project.image
      ? '<img src="' + escapeHtml(project.image) + '" alt="' + escapeHtml(project.title) +
        '" width="1400" height="982" loading="lazy" decoding="async">'
      : PLACEHOLDER_ICON + '<span class="placeholder-label">screenshot placeholder</span>';

    article.innerHTML =
      '<div class="shot">' + shotInner + "</div>" +
      '<div class="body">' +
      '<span class="cat-label">' + escapeHtml(category.label) + " · " + escapeHtml(category.labelEn) + "</span>" +
      "<h4>" + escapeHtml(project.title) + "</h4>" +
      "<p>" + escapeHtml(project.description || "") + "</p>" +
      (project.url ? '<span class="more">前往網站 <span aria-hidden="true">→</span></span>' : "") +
      "</div>";

    if (project.url) {
      article.setAttribute("data-href", project.url);
      article.setAttribute("tabindex", "0");
      article.setAttribute("role", "link");
      article.setAttribute("aria-label", project.title + "（另開新分頁）");
      var open = function () { window.open(project.url, "_blank", "noopener"); };
      article.addEventListener("click", open);
      article.addEventListener("keydown", function (e) {
        if (e.key === "Enter") open();
      });
    }
    return article;
  }

  // 「更多作品栽培中」提示卡（整頁只放一張）
  function buildComingCard() {
    var article = document.createElement("article");
    article.className = "project reveal coming";
    article.setAttribute("data-cat", "__coming");
    article.innerHTML =
      '<div class="shot">' + SEED_ICON + "</div>" +
      '<div class="body">' +
      '<span class="cat-label">Coming Soon</span>' +
      "<h4>更多作品栽培中</h4>" +
      "<p>新的案例完成後會陸續放上來。</p>" +
      "</div>";
    return article;
  }

  var PORTFOLIO_PAGE_SIZE = 9;

  function renderFullPortfolio(data) {
    var chipsEl = document.getElementById("filterChips");
    var gridEl = document.getElementById("projectGrid");
    if (!chipsEl || !gridEl) return;

    var categories = data.categories || [];
    var projects = data.projects || [];
    var catById = {};
    categories.forEach(function (c) { catById[c.id] = c; });

    // chips
    chipsEl.innerHTML = "";
    var allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "chip active";
    allChip.setAttribute("data-filter", "all");
    allChip.textContent = "全部";
    chipsEl.appendChild(allChip);
    categories.forEach(function (cat) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.setAttribute("data-filter", cat.id);
      chip.textContent = cat.label;
      chipsEl.appendChild(chip);
    });

    // cards：只渲染真實作品，最後補一張提示卡
    gridEl.innerHTML = "";
    projects.forEach(function (p) {
      var cat = catById[p.category] || { id: p.category || "misc", label: "", labelEn: "" };
      gridEl.appendChild(buildProjectCard(p, cat));
    });
    gridEl.appendChild(buildComingCard());

    // 某分類沒有作品時顯示的說明
    var note = document.createElement("p");
    note.className = "empty-note";
    note.hidden = true;
    note.innerHTML = "這個分類的作品還在準備中。" + '<span class="latin">Still growing.</span>';
    gridEl.appendChild(note);

    attachChipFilter(chipsEl, gridEl, note);
    initShowMore(gridEl, PORTFOLIO_PAGE_SIZE);
    observeReveal(gridEl.querySelectorAll(".reveal"));
    refreshScrollHeight();
  }

  function renderFeaturedPortfolio(data, count) {
    var gridEl = document.getElementById("featuredGrid");
    if (!gridEl) return;

    var catById = {};
    (data.categories || []).forEach(function (c) { catById[c.id] = c; });
    var featured = (data.projects || []).slice(0, count || 3);

    gridEl.innerHTML = "";
    if (!featured.length) {
      gridEl.innerHTML = '<p class="featured-empty">作品尚在栽培中，敬請期待。</p>';
      return;
    }

    // 只有一件時改用橫式大卡（見 home.css .is-single）
    gridEl.classList.toggle("is-single", featured.length === 1);

    featured.forEach(function (p) {
      var cat = catById[p.category] || { id: p.category || "misc", label: "", labelEn: "" };
      gridEl.appendChild(buildProjectCard(p, cat));
    });

    observeReveal(gridEl.querySelectorAll(".reveal"));
    refreshScrollHeight();
  }

  // 「顯示更多」擴充點——作品超過上限才啟用
  function initShowMore(gridEl, cap) {
    var cards = Array.prototype.slice.call(gridEl.querySelectorAll(".project:not(.coming)"));
    if (cards.length <= cap) return;

    var hiddenCards = cards.slice(cap);
    hiddenCards.forEach(function (card) { card.classList.add("capped"); });

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn load-more";
    btn.textContent = "顯示更多 →";
    gridEl.insertAdjacentElement("afterend", btn);

    function reveal() {
      hiddenCards.forEach(function (card) {
        card.classList.remove("capped");
        card.classList.add("in-view");
      });
      if (btn.parentNode) btn.parentNode.removeChild(btn);
      refreshScrollHeight();
    }

    btn.addEventListener("click", reveal);
    gridEl.parentElement.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (btn.parentNode) reveal();
      });
    });
  }

  function attachChipFilter(chipsEl, gridEl, note) {
    var chips = chipsEl.querySelectorAll(".chip");
    var cards = gridEl.querySelectorAll(".project");
    var FADE_MS = 220;

    cards.forEach(function (card) { card.classList.add("filtering"); });

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (chip.classList.contains("active")) return;
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var f = chip.getAttribute("data-filter");
        var visible = 0;

        cards.forEach(function (card) {
          var isReal = !card.classList.contains("coming");
          var show = f === "all" ? true : (isReal && card.getAttribute("data-cat") === f);
          if (show && isReal) visible++;

          if (show) {
            card.classList.remove("hidden");
            card.classList.add("in-view");
            requestAnimationFrame(function () { card.classList.remove("filter-hide"); });
          } else if (!card.classList.contains("hidden")) {
            card.classList.add("filter-hide");
            window.setTimeout(function () {
              if (card.classList.contains("filter-hide")) card.classList.add("hidden");
            }, FADE_MS);
          }
        });

        note.hidden = !(f !== "all" && visible === 0);
        window.setTimeout(refreshScrollHeight, FADE_MS + 20);
      });
    });
  }

  function loadPortfolio() {
    var fullGridEl = document.getElementById("projectGrid");
    var featuredGridEl = document.getElementById("featuredGrid");
    if (!fullGridEl && !featuredGridEl) return;

    fetch("data/projects.json")
      .then(function (res) {
        if (!res.ok) throw new Error("projects.json 讀取失敗：" + res.status);
        return res.json();
      })
      .then(function (data) {
        if (fullGridEl) renderFullPortfolio(data);
        if (featuredGridEl) renderFeaturedPortfolio(data, 3);
      })
      .catch(function (err) {
        console.error(err);
        var failMsg =
          '<p class="featured-empty">作品資料載入失敗。本機預覽請使用本地伺服器' +
          "（例如 VS Code Live Server），直接雙擊開啟檔案會因瀏覽器安全限制無法讀取 JSON。</p>";
        if (fullGridEl) fullGridEl.innerHTML = failMsg;
        if (featuredGridEl) featuredGridEl.innerHTML = failMsg;
      });
  }

  /* ---------- 3. 捲動進場動畫 ---------- */
  // 延遲只算「同一批同時進入畫面的元素」，不會再讓頁面後段的卡片等上好幾百毫秒；
  // 動畫播完就清掉 delay，避免它殘留後拖慢 hover 反應。
  var revealObserver = null;

  function getRevealObserver() {
    if (revealObserver || !("IntersectionObserver" in window)) return revealObserver;
    revealObserver = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = batch * 90 + "ms";
        batch++;
        el.classList.add("in-view");
        revealObserver.unobserve(el);

        var clear = function (e) {
          if (e && e.target !== el) return;
          el.style.transitionDelay = "";
          el.removeEventListener("transitionend", clear);
        };
        el.addEventListener("transitionend", clear);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    return revealObserver;
  }

  function observeReveal(nodeList) {
    var targets = Array.prototype.slice.call(nodeList);
    var obs = getRevealObserver();
    targets.forEach(function (el) {
      if (obs) obs.observe(el);
      else el.classList.add("in-view");
    });
  }

  /* ---------- 4. 導覽、手機選單、hero 動畫暫停 ---------- */
  function initNavActiveOnScroll() {
    var sections = document.querySelectorAll("#home, #portfolio");
    var navLinks = document.querySelectorAll("nav a");
    if (!("IntersectionObserver" in window) || !sections.length) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.getAttribute("id");
        navLinks.forEach(function (link) {
          var href = link.getAttribute("href");
          // 只動「頁內錨點」的連結；「作品」「委託」是別頁，維持原狀
          if (href && href.charAt(0) === "#") {
            link.classList.toggle("active", href === "#" + id);
          }
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (sec) { obs.observe(sec); });
  }

  function initEmblemPause() {
    var emblem = document.querySelector(".emblem");
    if (!emblem || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      emblem.classList.toggle("paused", !entries[0].isIntersecting);
    }).observe(emblem);
  }

  function initMobileNav() {
    var toggle = document.getElementById("menuToggle");
    var nav = document.getElementById("primaryNav");
    var header = toggle ? toggle.closest("header") : null;
    if (!toggle || !nav || !header) return;

    function setOpen(open) {
      header.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("nav-open"));
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 640) setOpen(false);
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    initSmoothScroll();
    initNavActiveOnScroll();
    initEmblemPause();
    initMobileNav();
    loadPortfolio();

    // 圖片、字型載入後版面高度會變，通知 Lenis 重新量測
    window.addEventListener("load", refreshScrollHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshScrollHeight);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
