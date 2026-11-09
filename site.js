/* ==========================================================================
   Charlie's Chairs | site.js : fills the public pages from the database
   (shop, fabrics, portfolio, videos, FAQ, contact details) and runs the
   menu, photo viewer and the contact form. You shouldn't need to edit this.
   ========================================================================== */
(function () {
  "use strict";
  var A = window.CCAPI, C = window.CC || {}, esc = A.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var MARK = "favicon.svg";
  var TBC = '<span class="tbc">To be confirmed</span>';
  var STOCK = { in_stock: "In stock", low_stock: "Low stock", special_order: "Special order", unavailable: "Unavailable" };
  var STATUS = { available: "Available", reserved: "Reserved", sold: "Sold" };
  var DEFAULT_FAQ = [
    { question: "How do I get started?", answer: "Send a quote request with a few photos of your piece and a short description of what you would like done. Charles reviews every request and follows up with you directly." },
    { question: "What photos should I send?", answer: "One photo of the whole piece from the front, one from the side, and close-ups of any worn, torn or damaged areas. If you have a fabric or style you love, add a picture of that too." },
    { question: "Is the quote automatic?", answer: "No. Every request is reviewed by Charles personally. Your photos help him understand the piece before he contacts you to talk through options." },
    { question: "Will my photos be posted online?", answer: "No. Photos sent with a quote request are private and only used to review your project." },
    { question: "Can every piece be restored?", answer: "Not always. It depends on the frame, the springs and the condition of the piece. Charles will give you an honest assessment." }
  ];

  /* ---------- menu, year, credit ---------- */
  var mb = $(".menu-btn"), nav = $("#site-nav");
  if (mb && nav) {
    mb.addEventListener("click", function () { var o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o ? "true" : "false"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); mb.focus(); } });
  }
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$("[data-credit]").forEach(function (el) { if (C.developerCredit) el.textContent = C.developerCredit; else el.remove(); });

  /* ---------- contact details everywhere ---------- */
  A.site().then(function (s) {
    s = s || C.fallback;
    $$("[data-phone-link]").forEach(function (a) { a.href = A.tel(s.phone); if (a.hasAttribute("data-show")) a.textContent = s.phone; });
    $$("[data-email-link]").forEach(function (a) { a.href = "mailto:" + s.email; if (a.hasAttribute("data-show")) a.textContent = s.email; });
    $$("[data-site]").forEach(function (el) {
      var k = el.getAttribute("data-site");
      if (k === "address") {
        var addr = esc(s.address_line) + "<br>" + esc(s.city_state_zip);
        if (s.address_confirmed) addr += '<br><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.address_line + ", " + s.city_state_zip) + '" target="_blank" rel="noopener">Open in Google Maps</a>';
        else addr += '<br><span class="small muted">Please call or email before visiting.</span>';
        el.innerHTML = addr;
      } else if (k === "address-line") {
        el.textContent = [s.address_line, s.city_state_zip].filter(Boolean).join(", ");
      } else if (k === "youtube") {
        el.innerHTML = s.youtube_channel_url ? '<a href="' + esc(s.youtube_channel_url) + '" target="_blank" rel="noopener">YouTube channel</a>' : TBC;
      } else el.innerHTML = s[k] ? A.multiline(s[k]) : TBC;
    });
    $$("[data-sms-link]").forEach(function (a) { a.href = "sms:" + String(s.phone || "").replace(/[^\d+]/g, ""); });
    $$("[data-visit-note]").forEach(function (el) { el.hidden = !!s.address_confirmed; });
    cardActions(s);
    $$("[data-channel-btn]").forEach(function (a) { if (/^https:\/\/(www\.)?youtube\.com\//.test(s.youtube_channel_url || "")) { a.href = s.youtube_channel_url; a.hidden = false; } });
    $$("[data-policy]").forEach(function (el) {
      var t = s["policy_" + el.getAttribute("data-policy")];
      if (t) { el.textContent = t; el.classList.add("policy"); }
    });
  });

  /* ---------- photo viewer (lightbox) ---------- */
  function lightbox(urls, start) {
    var i = start || 0, prev = document.activeElement;
    var box = document.createElement("div");
    box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Photo viewer");
    box.innerHTML = '<img alt=""><div class="bar"><button type="button" data-p aria-label="Previous photo">‹</button><span aria-live="polite"></span><button type="button" data-n aria-label="Next photo">›</button><button type="button" data-x aria-label="Close photo viewer">✕</button></div>';
    var img = $("img", box), lab = $("span", box);
    function show() { img.src = urls[i]; img.alt = "Photo " + (i + 1) + " of " + urls.length; lab.textContent = (i + 1) + " / " + urls.length; $("[data-p]", box).hidden = $("[data-n]", box).hidden = urls.length < 2; }
    function close() { document.removeEventListener("keydown", key, true); box.remove(); if (prev) prev.focus(); }
    function key(e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } if (e.key === "ArrowRight") { i = (i + 1) % urls.length; show(); } if (e.key === "ArrowLeft") { i = (i - 1 + urls.length) % urls.length; show(); } }
    $("[data-p]", box).onclick = function () { i = (i - 1 + urls.length) % urls.length; show(); };
    $("[data-n]", box).onclick = function () { i = (i + 1) % urls.length; show(); };
    $("[data-x]", box).onclick = close;
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { i = (i + (dx < 0 ? 1 : -1) + urls.length) % urls.length; show(); } x0 = null; });
    document.addEventListener("keydown", key, true);
    (document.querySelector("dialog[open]") || document.body).appendChild(box); show(); $("[data-x]", box).focus();
  }

  /* ---------- detail sheet (dialog) ---------- */
  var sheet;
  function openSheet(urls, infoHtml, title) {
    if (!sheet) {
      sheet = document.createElement("dialog"); sheet.className = "sheet";
      document.body.appendChild(sheet);
      sheet.addEventListener("click", function (e) { if (e.target === sheet) sheet.close(); });
    }
    var main = urls.length ? '<div class="main"><img src="' + esc(urls[0]) + '" alt="' + esc(title) + ', photo 1"></div>' : '<div class="main"><img class="noimg" src="' + MARK + '" alt="" style="width:30%;opacity:.4;cursor:default"></div>';
    var th = urls.length > 1 ? '<div class="thumbs" role="group" aria-label="Photos">' + urls.map(function (u, i) { return '<button type="button" data-i="' + i + '" aria-label="Show photo ' + (i + 1) + '"' + (i ? "" : ' aria-current="true"') + '><img src="' + esc(u) + '" alt=""></button>'; }).join("") + "</div>" : "";
    sheet.setAttribute("aria-label", title);
    sheet.innerHTML = '<button class="sheet-close" type="button" aria-label="Close">✕</button><div class="sheet-inner"><div class="sheet-gallery">' + main + th + '</div><div class="sheet-info">' + infoHtml + "</div></div>";
    var cur = 0, mi = $(".main img", sheet);
    $(".sheet-close", sheet).onclick = function () { sheet.close(); };
    $$(".thumbs button", sheet).forEach(function (b) { b.onclick = function () { cur = +b.getAttribute("data-i"); mi.src = urls[cur]; mi.alt = title + ", photo " + (cur + 1); $$(".thumbs button", sheet).forEach(function (x) { x.setAttribute("aria-current", x === b ? "true" : "false"); }); }; });
    if (urls.length) mi.onclick = function () { lightbox(urls, cur); };
    sheet.showModal();
    $(".sheet-close", sheet).focus();
  }
  function noImg() { return '<div class="ph"><img class="noimg" src="' + MARK + '" alt=""></div>'; }
  function ph(path, alt) { var u = A.media(path); return u ? '<div class="ph"><img src="' + esc(u) + '" alt="' + esc(alt) + '" loading="lazy"></div>' : noImg(); }
  function emptyState(box, title, text, extra) {
    box.innerHTML = '<div class="empty"><img src="' + MARK + '" alt=""><h3>' + esc(title) + "</h3><p>" + text + "</p>" + (extra || "") + "</div>";
  }
  function quoteLink(kind, item) { return "quote.html?kind=" + kind + "&item=" + encodeURIComponent(item); }
  function failBox(box) { emptyState(box, "Couldn’t load right now", "Please refresh the page in a moment."); }

  /* ---------- SHOP ---------- */
  function productInfo(p) {
    var status = '<span class="badge badge-' + esc(p.status) + '">' + esc(STATUS[p.status] || p.status) + "</span>";
    var specs = [["Price", p.price_cents != null ? A.money(p.price_cents) : ""], ["Category", p.category], ["Reference", p.sku], ["Dimensions", p.dimensions], ["Condition", p.condition], ["Materials", p.materials], ["Finish", p.finish]]
      .filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    var label = p.title + (p.sku ? " (" + p.sku + ")" : "");
    var cta = p.status === "sold" ? '<p class="muted">This piece has sold. Ask Charles about similar pieces or a custom build.</p><a class="btn btn-line" href="' + quoteLink("piece", "Similar to: " + label) + '">Ask about similar pieces</a>'
      : p.status === "reserved" ? '<p class="muted">This piece is reserved. You can ask to be told if it becomes available.</p><a class="btn btn-line" href="' + quoteLink("piece", label) + '">Ask about this piece</a>'
      : '<div class="btn-row"><a class="btn btn-gold" href="' + quoteLink("piece", label) + '">Ask about this piece</a><a class="btn btn-line" data-phone-link href="#">Call Charles</a></div><p class="small muted" style="margin-top:12px">Purchase, pickup and delivery are arranged directly with Charles.</p>';
    return status + "<h2>" + esc(p.title) + "</h2>" + (p.description ? "<p>" + A.multiline(p.description) + "</p>" : "") + '<dl class="specs">' + specs + "</dl>" + cta;
  }
  var shop = $("[data-shop]");
  if (shop) {
    var sq = $("#shop-q"), sc = $("#shop-cat"), ss = $("#shop-sort"), all = [];
    function draw() {
      var q = (sq.value || "").toLowerCase(), cat = sc.value, list = all.filter(function (p) {
        return (!cat || p.category === cat) && (!q || (p.title + " " + p.description + " " + p.materials + " " + p.sku).toLowerCase().indexOf(q) >= 0);
      });
      if (ss.value === "low") list.sort(function (a, b) { return (a.price_cents == null) - (b.price_cents == null) || a.price_cents - b.price_cents; });
      if (ss.value === "high") list.sort(function (a, b) { return (b.price_cents || 0) - (a.price_cents || 0); });
      $("#shop-count").textContent = list.length + (list.length === 1 ? " piece" : " pieces");
      if (!all.length) return emptyState(shop, "New pieces coming soon", "Restored and custom pieces that Charles has ready for sale will appear here.", '<a class="btn btn-gold" href="quote.html">Ask about a custom build</a>');
      if (!list.length) return emptyState(shop, "No matches", "Try a different search or category.");
      shop.innerHTML = '<div class="items">' + list.map(function (p) {
        return '<button type="button" class="item" data-id="' + esc(p.id) + '">' + ph(p.images[0], p.title) + '<div class="body"><span class="badge badge-' + esc(p.status) + '">' + esc(STATUS[p.status]) + '</span><span class="title">' + esc(p.title) + '</span><span class="meta">' + esc([p.category, p.dimensions].filter(Boolean).join(" · ")) + '</span><span class="price">' + (p.status === "sold" ? "Sold" : esc(A.money(p.price_cents))) + "</span></div></button>";
      }).join("") + "</div>";
      $$(".item", shop).forEach(function (b) { b.onclick = function () { var p = all.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]; openSheet(p.images.map(A.media).filter(Boolean), productInfo(p), p.title); wirePhones(); }; });
    }
    A.list("products").then(function (l) {
      all = l;
      var cats = l.map(function (p) { return p.category; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
      sc.innerHTML = '<option value="">All categories</option>' + cats.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
      draw();
    }).catch(function () { failBox(shop); });
    [sq, sc, ss].forEach(function (el) { el.addEventListener("input", draw); });
  }

  /* ---------- FABRICS ---------- */
  function fabricInfo(f) {
    var specs = [["Code", f.code], ["Price", f.price_cents != null ? A.money(f.price_cents) + " " + f.price_unit : ""], ["Brand", f.brand], ["Color", f.color_family], ["Pattern", f.pattern], ["Composition", f.composition], ["Best for", f.use_type], ["Minimum order", f.min_qty], ["Available", f.available_qty], ["Care", f.care]]
      .filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + A.multiline(r[1]) + "</dd>"; }).join("");
    var label = f.name + (f.code ? " (" + f.code + ")" : "");
    var ctas = f.stock_state === "unavailable" ? '<p class="muted">This fabric isn’t available right now.</p><a class="btn btn-line" href="' + quoteLink("fabric", "Similar to: " + label) + '">Ask about similar fabrics</a>'
      : '<div class="btn-row"><a class="btn btn-gold" href="' + quoteLink("fabric", label) + '">Request this fabric</a>' + (f.swatch_available ? '<a class="btn btn-line" href="' + quoteLink("fabric", "Swatch: " + label) + '">Request a swatch</a>' : "") + "</div>";
    return '<span class="badge badge-' + esc(f.stock_state) + '">' + esc(STOCK[f.stock_state]) + "</span><h2>" + esc(f.name) + '</h2><dl class="specs">' + specs + "</dl>" + ctas;
  }
  var fab = $("[data-fabrics]");
  if (fab) {
    var fq = $("#fab-q"), fc = $("#fab-color"), fp = $("#fab-pattern"), fs = $("#fab-stock"), fall = [];
    function opts(sel, key, label) { var v = fall.map(function (f) { return f[key]; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort(); sel.innerHTML = '<option value="">' + label + "</option>" + v.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join(""); sel.closest(".field").hidden = !v.length; }
    function fdraw() {
      var q = (fq.value || "").toLowerCase(), list = fall.filter(function (f) {
        return (!fc.value || f.color_family === fc.value) && (!fp.value || f.pattern === fp.value) && (!fs.value || f.stock_state === fs.value) &&
          (!q || (f.name + " " + f.code + " " + f.composition + " " + f.brand + " " + f.color_family + " " + f.pattern).toLowerCase().indexOf(q) >= 0);
      });
      $("#fab-count").textContent = list.length + (list.length === 1 ? " fabric" : " fabrics");
      if (!fall.length) return emptyState(fab, "Fabric catalog coming soon", "Charles sells upholstery fabric. Ask about what’s available, or for help choosing fabric for your project.", '<a class="btn btn-gold" href="quote.html?kind=fabric&item=General%20fabric%20question">Ask about fabric</a>');
      if (!list.length) return emptyState(fab, "No matches", "Try a different search or filter.");
      fab.innerHTML = '<div class="items">' + list.map(function (f) {
        return '<button type="button" class="item" data-id="' + esc(f.id) + '">' + ph(f.images[0], f.name) + '<div class="body"><span class="badge badge-' + esc(f.stock_state) + '">' + esc(STOCK[f.stock_state]) + '</span><span class="title">' + esc(f.name) + '</span><span class="meta">' + esc([f.color_family, f.pattern, f.composition].filter(Boolean).join(" · ")) + '</span><span class="price">' + (f.price_cents != null ? esc(A.money(f.price_cents)) + ' <span class="small muted">' + esc(f.price_unit) + "</span>" : "Ask for price") + "</span></div></button>";
      }).join("") + "</div>";
      $$(".item", fab).forEach(function (b) { b.onclick = function () { var f = fall.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]; openSheet(f.images.map(A.media).filter(Boolean), fabricInfo(f), f.name); }; });
    }
    A.list("fabrics").then(function (l) { fall = l; opts(fc, "color_family", "All colors"); opts(fp, "pattern", "All patterns"); fdraw(); }).catch(function () { failBox(fab); });
    [fq, fc, fp, fs].forEach(function (el) { el.addEventListener("input", fdraw); });
  }

  /* ---------- PORTFOLIO ---------- */
  function projectInfo(p) {
    var b = p.before_images.map(A.media).filter(Boolean), a = p.after_images.map(A.media).filter(Boolean);
    var pair = b.length && a.length ? '<div class="ba" style="margin:14px 0 18px"><figure><img src="' + esc(b[0]) + '" alt="' + esc(p.title) + ' before"><figcaption>Before</figcaption></figure><figure><img src="' + esc(a[0]) + '" alt="' + esc(p.title) + ' after"><figcaption>After</figcaption></figure></div>' : "";
    return (p.category ? '<span class="badge">' + esc(p.category) + "</span>" : "") + "<h2>" + esc(p.title) + "</h2>" + pair + (p.description ? "<p>" + A.multiline(p.description) + "</p>" : "") +
      (p.materials ? '<dl class="specs"><dt>Materials</dt><dd>' + esc(p.materials) + "</dd></dl>" : "") + '<a class="btn btn-gold" href="quote.html">Start your project</a>';
  }
  var work = $("[data-projects]");
  if (work) {
    var chips = $("[data-project-chips]"), pall = [], pcat = "";
    function pdraw() {
      var list = pall.filter(function (p) { return !pcat || p.category === pcat; });
      if (!pall.length) return emptyState(work, "Portfolio coming soon", "Charles is gathering photos of finished work. In the meantime, send photos of your piece and he’ll talk you through what’s possible.", '<a class="btn btn-gold" href="quote.html">Send photos for a quote</a>');
      work.innerHTML = '<div class="items">' + list.map(function (p) {
        var cover = p.after_images[0] || p.before_images[0];
        return '<button type="button" class="item" data-id="' + esc(p.id) + '">' + ph(cover, p.title) + '<div class="body">' + (p.category ? '<span class="badge">' + esc(p.category) + "</span>" : "") + '<span class="title">' + esc(p.title) + '</span><span class="meta">' + (p.before_images.length && p.after_images.length ? "Before &amp; after" : esc((p.before_images.length + p.after_images.length) + " photos")) + "</span></div></button>";
      }).join("") + "</div>";
      $$(".item", work).forEach(function (b) { b.onclick = function () { var p = pall.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]; openSheet(p.after_images.concat(p.before_images).map(A.media).filter(Boolean), projectInfo(p), p.title); }; });
    }
    A.list("projects").then(function (l) {
      pall = l;
      var cats = l.map(function (p) { return p.category; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
      if (chips && cats.length > 1) {
        chips.innerHTML = '<button type="button" aria-pressed="true" data-c="">All</button>' + cats.map(function (c) { return '<button type="button" aria-pressed="false" data-c="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
        $$("button", chips).forEach(function (b) { b.onclick = function () { pcat = b.getAttribute("data-c"); $$("button", chips).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); pdraw(); }; });
      }
      pdraw();
    }).catch(function () { failBox(work); });
  }

  /* ---------- HOME previews ---------- */
  function preview(sel, what, filter, render, emptyHtml) {
    var box = $(sel); if (!box) return;
    A.list(what).then(function (l) {
      l = l.filter(filter).slice(0, 3);
      if (!l.length) { box.innerHTML = emptyHtml; return; }
      box.innerHTML = '<div class="items">' + l.map(render).join("") + "</div>";
    }).catch(function () { box.innerHTML = emptyHtml; });
  }
  preview("[data-home-projects]", "projects", function () { return true; }, function (p) {
    return '<a class="item" href="work.html" style="text-decoration:none">' + ph(p.after_images[0] || p.before_images[0], p.title) + '<div class="body"><h3>' + esc(p.title) + '</h3><span class="meta">' + esc(p.category) + "</span></div></a>";
  }, '<div class="empty"><img src="' + MARK + '" alt=""><h3>Project photos coming soon</h3><p>Finished work from Charles’s shop will be featured here.</p></div>');
  preview("[data-home-shop]", "products", function (p) { return p.status === "available"; }, function (p) {
    return '<a class="item" href="shop.html" style="text-decoration:none">' + ph(p.images[0], p.title) + '<div class="body"><h3>' + esc(p.title) + '</h3><span class="price">' + esc(A.money(p.price_cents)) + "</span></div></a>";
  }, '<div class="empty"><h3>Pieces for sale coming soon</h3><p>Ask Charles about restored and custom pieces.</p></div>');
  preview("[data-home-fabrics]", "fabrics", function (f) { return f.stock_state !== "unavailable"; }, function (f) {
    return '<a class="item" href="fabrics.html" style="text-decoration:none">' + ph(f.images[0], f.name) + '<div class="body"><h3>' + esc(f.name) + '</h3><span class="meta">' + esc([f.color_family, f.pattern].filter(Boolean).join(" · ")) + "</span></div></a>";
  }, '<div class="empty"><h3>Fabric catalog coming soon</h3><p>Ask Charles about fabric for your project.</p></div>');

  /* ---------- VIDEOS ---------- */
  function videoCard(v, big) {
    var id = A.ytId(v.youtube_id); if (!id) return "";
    return '<div class="video-card"><div class="video"><button type="button" data-yt="' + id + '" aria-label="Play video: ' + esc(v.title) + '"><img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy"><span class="play"></span></button></div>' +
      '<div class="video-meta"><h3>' + esc(v.title) + "</h3>" + (big && v.description ? '<p class="muted">' + A.multiline(v.description) + "</p>" : "") + "</div></div>";
  }
  function wireVideos(box) {
    $$("[data-yt]", box).forEach(function (b) {
      b.onclick = function () {
        var f = document.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + b.getAttribute("data-yt") + "?autoplay=1&rel=0";
        f.title = b.getAttribute("aria-label").replace("Play video: ", "");
        f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"; f.allowFullscreen = true;
        b.replaceWith(f);
      };
    });
  }
  var vids = $("[data-videos]");
  if (vids) A.list("videos").then(function (l) {
    if (!l.length) return emptyState(vids, "Videos coming soon", "Charles shares the craft on YouTube. Videos will appear here once the channel is linked.");
    vids.innerHTML = '<div class="grid g2">' + l.map(function (v) { return videoCard(v, true); }).join("") + "</div>"; wireVideos(vids);
  }).catch(function () { failBox(vids); });
  var hv = $("[data-home-video]");
  if (hv) A.list("videos").then(function (l) {
    if (!l.length) { hv.innerHTML = '<div class="empty"><img src="' + MARK + '" alt=""><h3>Videos coming soon</h3><p>Watch the craft: Charles’s YouTube videos will be featured here.</p></div>'; return; }
    hv.innerHTML = videoCard(l[0], true); wireVideos(hv);
  }).catch(function () {});

  /* ---------- FAQ ---------- */
  var faq = $("[data-faq]");
  if (faq) (A.ready ? A.list("faqs") : Promise.resolve(DEFAULT_FAQ)).catch(function () { return DEFAULT_FAQ; }).then(function (l) {
    faq.innerHTML = l.map(function (f) { return "<details><summary>" + esc(f.question) + '</summary><div class="answer">' + esc(f.answer) + "</div></details>"; }).join("");
  });

  function wirePhones() { A.site().then(function (s) { $$("[data-phone-link]").forEach(function (a) { a.href = A.tel(s.phone); }); }); }

  /* ---------- contact form ---------- */
  var cf = $("#contact-form");
  if (cf) {
    var st = $("#contact-status");
    var show = function (k, m) { st.className = "status show " + k; st.innerHTML = m; };
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = [];
      $$("[required]", cf).forEach(function (f) {
        var ok = f.type === "checkbox" ? f.checked : f.checkValidity() && f.value.trim() !== "";
        f.closest(".field").classList.toggle("invalid", !ok); f.setAttribute("aria-invalid", ok ? "false" : "true"); if (!ok) bad.push(f);
      });
      if (bad.length) { show("error", "Please fix the highlighted fields."); bad[0].focus(); return; }
      if (!A.ready) { show("info", "The contact form isn’t connected yet, so this message was <strong>not sent</strong>. Please call or email Charles directly."); return; }
      var btn = $('button[type="submit"]', cf); btn.disabled = true; btn.textContent = "Sending…";
      A.submitInquiry({ kind: "contact", first_name: $("#c-name").value, email: $("#c-email").value, phone: $("#c-phone").value, description: $("#c-msg").value, consent: $("#c-consent").checked, website: $("#c-web").value })
        .then(function (ref) { cf.reset(); show("ok", "<strong>Message sent.</strong> Your reference is " + esc(ref) + ". Charles will get back to you."); })
        .catch(function (err) { show("error", esc(err.message)); })
        .then(function () { btn.disabled = false; btn.textContent = "Send message"; });
    });
  }


  /* ---------- featured award-winning chair: label + front/back turn ---------- */
  (function () {
    var F = C.featured || {};
    if (F.label) $$("[data-award-label]").forEach(function (el) { el.textContent = F.label; });
    $$("[data-award-detail]").forEach(function (el) { if (F.award) { el.textContent = F.award; el.hidden = false; } });
    var sp = $("[data-showpiece]"); if (!sp) return;
    var flip = $("[data-flip]", sp), btns = $$("[data-view]", sp);
    function set(view) {
      sp.classList.toggle("is-back", view === "back");
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === view ? "true" : "false"); });
      flip.setAttribute("aria-label", view === "back" ? "Turn the chair to see the front" : "Turn the chair to see the back");
    }
    flip.addEventListener("click", function () { set(sp.classList.contains("is-back") ? "front" : "back"); });
    btns.forEach(function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-view")); }); });
    set("front");
  })();
  /* ---------- digital business card: save contact + share ---------- */
  function cardActions(s) {
    var save = $("[data-save-contact]"), share = $("[data-share-card]"), st = $("[data-card-status]");
    var say = function (m) { if (st) { st.textContent = m; setTimeout(function () { if (st.textContent === m) st.textContent = ""; }, 5000); } };
    var v = function (x) { return String(x || "").replace(/\\/g, "\\\\").replace(/[,;]/g, function (c) { return "\\" + c; }).replace(/\r?\n/g, "\\n"); };
    if (save && !save._wired) {
      save._wired = true;
      save.addEventListener("click", function () {
        var csz = String(s.city_state_zip || ""), m = csz.match(/^(.*?),?\s+([A-Z]{2}),?\s+(\d{5})/) || [];
        var lines = ["BEGIN:VCARD", "VERSION:3.0", "N:Parks;Charles;;;", "FN:Charles Parks", "ORG:" + v(s.business_name || "Charlie’s Chairs"),
          "TITLE:Upholstery / Fabric Sales", "TEL;TYPE=WORK,VOICE:" + v(s.phone), "EMAIL;TYPE=WORK:" + v(s.email)];
        if (s.address_line) lines.push("ADR;TYPE=WORK:;;" + v(s.address_line) + ";" + v(m[1] || csz) + ";" + v(m[2] || "") + ";" + v(m[3] || "") + ";USA");
        lines.push("URL:" + location.href.split(/[?#]/)[0].replace(/index\.html$/, ""), "END:VCARD");
        var blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/vcard" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "Charlies-Chairs.vcf";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        say("Contact card downloaded. Open it to add Charles to your contacts.");
      });
    }
    if (share && !share._wired) {
      share._wired = true;
      share.addEventListener("click", function () {
        var url = location.href.split(/[?#]/)[0];
        var data = { title: "Charlie’s Chairs", text: "Charlie’s Chairs: upholstery and fabric sales by Charles Parks. " + (s.phone || ""), url: url };
        if (navigator.share) { navigator.share(data).catch(function () {}); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { say("Link copied. Paste it in a text or email."); }, function () { say("Copy this link: " + url); });
        else say("Copy this link: " + url);
      });
    }
  }
})();
