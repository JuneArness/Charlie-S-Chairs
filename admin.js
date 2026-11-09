/* ==========================================================================
   Charlie's Chairs | admin.js : the admin dashboard (admin.html).
   Security is enforced by the database: every admin action checks that the
   signed-in account is listed as an admin. Hiding this page is not the lock.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.getElementById("admin-app");
  if (!root) return;
  var A = window.CCAPI, esc = A.esc;
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var tab = "inquiries", data = null, filter = "open", search = "";
  var ISTATUS = [["new", "New"], ["in_review", "In review"], ["needs_info", "Needs more info"], ["quote_sent", "Quote sent"], ["approved", "Approved"], ["in_progress", "In progress"], ["complete", "Complete"], ["closed", "Closed"]];
  var label = function (v) { for (var i = 0; i < ISTATUS.length; i++) if (ISTATUS[i][0] === v) return ISTATUS[i][1]; return v; };
  var KIND = { project: "Project", piece: "Piece", fabric: "Fabric", contact: "Message" };

  function msg(el, kind, text) { el.className = "status show " + kind; el.innerHTML = text; }
  function busy(btn, on, t) { if (on) { btn.dataset.l = btn.textContent; btn.disabled = true; btn.textContent = t || "Saving…"; } else { btn.disabled = false; btn.textContent = btn.dataset.l || btn.textContent; } }

  if (!A.ready) { root.innerHTML = '<div class="card"><h2>Not connected yet</h2><p class="muted">Add the Supabase Project URL and publishable key to data.js, upload it, then reload this page.</p></div>'; return; }

  var recovering = /type=recovery/.test(location.hash);
  A.auth.onChange(function (ev) { if (ev === "PASSWORD_RECOVERY") { recovering = true; newPassword(); } });

  /* ---------- sign in ---------- */
  function signIn(mode) {
    mode = mode || "in";
    root.innerHTML = '<div class="card dark-form" style="max-width:520px;margin:0 auto"><h2>' + (mode === "reset" ? "Reset password" : "Admin sign in") + '</h2>' +
      '<form class="form" id="si" novalidate><div class="field"><label for="si-email">Email</label><input type="email" id="si-email" autocomplete="email" required></div>' +
      (mode === "reset" ? "" : '<div class="field"><label for="si-pw">Password</label><input type="password" id="si-pw" autocomplete="current-password" required></div>') +
      '<div class="btn-row"><button class="btn btn-gold" type="submit">' + (mode === "reset" ? "Send reset link" : "Sign in") + '</button><button class="btn btn-line" type="button" id="si-sw">' + (mode === "reset" ? "Back to sign in" : "Forgot password?") + '</button></div>' +
      '<div class="status" id="si-st" role="status"></div></form></div>';
    $("#si-sw").onclick = function () { signIn(mode === "reset" ? "in" : "reset"); };
    $("#si").onsubmit = function (e) {
      e.preventDefault();
      var st = $("#si-st"), em = $("#si-email").value.trim(), btn = $('#si button[type="submit"]');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return msg(st, "error", "Enter your email address.");
      busy(btn, true, "Please wait…");
      (mode === "reset" ? A.auth.reset(em).then(function () { msg(st, "ok", "If that email has an account, a reset link is on its way."); })
        : A.auth.signIn(em, $("#si-pw").value).then(start))
        .catch(function (err) { msg(st, "error", esc(err.message)); }).then(function () { busy(btn, false); });
    };
  }
  function newPassword() {
    root.innerHTML = '<div class="card dark-form" style="max-width:520px;margin:0 auto"><h2>Set a new password</h2><form class="form" id="np" novalidate><div class="field"><label for="np-pw">New password <span class="opt">(at least 10 characters)</span></label><input type="password" id="np-pw" autocomplete="new-password" required minlength="10"></div><button class="btn btn-gold" type="submit">Save password</button><div class="status" id="np-st" role="status"></div></form></div>';
    $("#np").onsubmit = function (e) {
      e.preventDefault(); var pw = $("#np-pw").value, st = $("#np-st");
      if (pw.length < 10) return msg(st, "error", "Use at least 10 characters.");
      A.auth.setPassword(pw).then(function () { recovering = false; history.replaceState(null, "", location.pathname); msg(st, "ok", "Saved."); setTimeout(start, 800); }).catch(function (err) { msg(st, "error", esc(err.message)); });
    };
  }

  function start() {
    if (recovering) return newPassword();
    root.innerHTML = '<p class="muted">Loading…</p>';
    A.auth.user().then(function (u) {
      if (!u) return signIn();
      return A.rpc("admin_me").then(function (me) {
        if (!me.is_admin) {
          root.innerHTML = '<div class="card" style="max-width:560px;margin:0 auto"><h2>Admin access only</h2><p class="muted">This account isn’t an admin. Ask the site owner to add it.</p><button class="btn btn-line" type="button" id="so">Sign out</button></div>';
          $("#so").onclick = function () { A.auth.signOut().then(start); };
          return;
        }
        load();
      });
    }).catch(function (e) { root.innerHTML = '<div class="card"><h2>Something went wrong</h2><p class="muted">' + esc(e.message) + '</p><button class="btn btn-gold" type="button" id="rt">Try again</button></div>'; $("#rt").onclick = start; });
  }
  function load(keep) { return A.rpc("admin_overview").then(function (d) { data = d; if (!keep) draw(); }).catch(function (e) { alert(e.message); }); }

  function draw() {
    var open = data.inquiries.filter(function (i) { return i.status === "new"; }).length;
    var tabs = [["inquiries", "Requests" + (open ? ' <span class="count" aria-label="' + open + ' new">' + open + "</span>" : "")], ["projects", "Our Work"], ["products", "Shop"], ["fabrics", "Fabrics"], ["videos", "Videos"], ["faqs", "FAQ"], ["settings", "Settings"]];
    root.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center"><h2 style="margin:0">Dashboard</h2><button class="btn btn-line btn-sm" type="button" id="so">Sign out</button></div>' +
      '<div class="admin-tabs" role="group" aria-label="Sections">' + tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + "</button>"; }).join("") + '</div><div id="body"></div>';
    $("#so").onclick = function () { A.auth.signOut().then(start); };
    $$("[data-tab]").forEach(function (b) { b.onclick = function () { tab = b.getAttribute("data-tab"); load(); }; });
    var body = $("#body");
    ({ inquiries: inquiries, projects: projects, products: products, fabrics: fabrics, videos: videos, faqs: faqs, settings: settings })[tab](body);
  }

  /* ---------- REQUESTS ---------- */
  function inquiries(body) {
    var rows = data.inquiries.filter(function (i) {
      var f = filter === "open" ? ["complete", "closed"].indexOf(i.status) < 0 : filter === "all" ? true : i.status === filter;
      var q = search.toLowerCase();
      return f && (!q || (i.ref + " " + i.name + " " + i.email + " " + i.item_ref + " " + i.furniture_type).toLowerCase().indexOf(q) >= 0);
    });
    body.innerHTML = '<div class="toolbar dark-form"><div class="field"><label for="f-st">Show</label><select id="f-st"><option value="open">Open requests</option><option value="all">All requests</option>' +
      ISTATUS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + "</option>"; }).join("") + '</select></div><div class="field"><label for="f-q">Search</label><input type="search" id="f-q" value="' + esc(search) + '" placeholder="Name, email, reference…"></div>' +
      '<button class="btn btn-line btn-sm" type="button" id="csv">Download CSV</button></div>' +
      (rows.length ? '<div class="table-wrap"><table class="data-table"><caption class="sr-only">Requests</caption><thead><tr><th scope="col">Received</th><th scope="col">Reference</th><th scope="col">From</th><th scope="col">About</th><th scope="col">Photos</th><th scope="col">Status</th></tr></thead><tbody>' +
        rows.map(function (i) {
          return "<tr><td>" + esc(A.date(i.created_at)) + '</td><th scope="row"><button class="link-btn" type="button" data-open="' + esc(i.id) + '">' + esc(i.ref) + "</button></th><td>" + esc(i.name) + '<br><span class="small muted">' + esc(i.email) + "</span></td><td>" +
            esc(KIND[i.kind]) + (i.item_ref ? ": " + esc(i.item_ref) : i.furniture_type ? ": " + esc(i.furniture_type) : "") + "</td><td>" + i.photos + "</td><td>" + (i.status === "new" ? "<strong>New</strong>" : esc(label(i.status))) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="empty"><h3>No requests here</h3><p>New quote requests from the website will show up in this list.</p></div>') + '<div id="detail"></div>';
    $("#f-st").value = filter;
    $("#f-st").onchange = function () { filter = this.value; inquiries(body); };
    $("#f-q").oninput = function () { search = this.value; var pos = this.selectionStart; inquiries(body); var q = $("#f-q"); q.focus(); q.setSelectionRange(pos, pos); };
    $("#csv").onclick = exportCsv;
    $$("[data-open]").forEach(function (b) { b.onclick = function () { openInquiry(b.getAttribute("data-open")); }; });
  }
  function exportCsv() {
    A.rpc("admin_export_inquiries").then(function (rows) {
      if (!rows.length) return alert("No requests to export yet.");
      var cols = Object.keys(rows[0]);
      var cell = function (v) { v = v == null ? "" : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
      var csv = [cols.join(",")].concat(rows.map(function (r) { return cols.map(function (c) { return cell(r[c]); }).join(","); })).join("\r\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
      a.download = "charlies-chairs-requests-" + new Date().toISOString().slice(0, 10) + ".csv"; document.body.appendChild(a); a.click(); a.remove();
    }).catch(function (e) { alert(e.message); });
  }
  function openInquiry(id) {
    var box = $("#detail");
    box.innerHTML = '<p class="muted">Loading request…</p>';
    A.rpc("admin_get_inquiry", { p_id: id }).then(function (r) {
      var rows = [["Reference", r.ref], ["Received", new Date(r.created_at).toLocaleString()], ["Type", KIND[r.kind]], ["About", r.item_ref], ["Name", (r.first_name + " " + r.last_name).trim()],
        ["Email", r.email], ["Phone", r.phone], ["Prefers", { email: "Email", phone: "Phone call", text: "Text" }[r.contact_method]], ["Project type", r.project_type], ["Furniture", r.furniture_type],
        ["Pieces", r.pieces], ["Description", r.description], ["Condition", r.condition], ["Fabric / style", r.style], ["Dimensions", r.dimensions], ["Budget", r.budget], ["Timing", r.timing], ["Quantity", r.quantity]]
        .filter(function (x) { return x[1] !== null && x[1] !== undefined && x[1] !== ""; });
      box.innerHTML = '<section class="card edit-panel" aria-labelledby="dh"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><h3 id="dh">Request ' + esc(r.ref) + '</h3><button class="link-btn" type="button" id="dclose">Close</button></div>' +
        '<div class="btn-row" style="margin:6px 0 18px"><a class="btn btn-gold btn-sm" href="mailto:' + esc(r.email) + "?subject=" + encodeURIComponent("Your Charlie’s Chairs request " + r.ref) + '">Email ' + esc(r.first_name) + "</a>" +
        (r.phone ? '<a class="btn btn-line btn-sm" href="' + esc(A.tel(r.phone)) + '">Call</a><a class="btn btn-line btn-sm" href="sms:' + esc(r.phone.replace(/[^\d+]/g, "")) + '">Text</a>' : "") + "</div>" +
        '<dl class="dl">' + rows.map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("") + "</dl>" +
        '<h4 style="margin-top:24px">Photos (' + r.photo_paths.length + ')</h4><div class="photo-grid" id="pg">' + (r.photo_paths.length ? r.photo_paths.map(function () { return "<div></div>"; }).join("") : '<p class="muted">No photos sent.</p>') + "</div>" +
        '<div class="row dark-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:18px;margin-top:24px"><div class="field"><label for="d-st">Status</label><select id="d-st">' +
        ISTATUS.map(function (s) { return '<option value="' + s[0] + '"' + (r.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + '</select></div></div><div class="status" id="d-msg" role="status"></div>' +
        '<h4 style="margin-top:24px">Private notes</h4>' + (r.notes.length ? r.notes.map(function (n) { return '<div class="note"><span class="small muted">' + esc(new Date(n.created_at).toLocaleString()) + "</span><br>" + A.multiline(n.note) + "</div>"; }).join("") : '<p class="muted small">No notes yet.</p>') +
        '<form id="nf" class="form dark-form" style="margin-top:12px"><div class="field"><label for="d-note">Add a note <span class="opt">(only admins see notes)</span></label><textarea id="d-note" maxlength="3000"></textarea></div><button class="btn btn-line btn-sm" type="submit">Add note</button></form></section>';
      $("#dclose").onclick = function () { box.innerHTML = ""; };
      $("#d-st").onchange = function () {
        var v = this.value;
        A.rpc("admin_set_inquiry_status", { p_id: r.id, p_status: v }).then(function () { msg($("#d-msg"), "ok", "Status saved: " + esc(label(v)) + "."); return load(true); }).catch(function (e) { msg($("#d-msg"), "error", esc(e.message)); });
      };
      $("#nf").onsubmit = function (e) { e.preventDefault(); A.rpc("admin_add_note", { p_id: r.id, p_note: $("#d-note").value }).then(function () { openInquiry(r.id); }).catch(function (er) { alert(er.message); }); };
      if (r.photo_paths.length) A.signedUrls(r.photo_paths).then(function (urls) {
        $("#pg").innerHTML = urls.map(function (u, i) { return u.signedUrl ? '<a href="' + esc(u.signedUrl) + '" target="_blank" rel="noopener" aria-label="Open photo ' + (i + 1) + ' full size"><img src="' + esc(u.signedUrl) + '" alt="Customer photo ' + (i + 1) + '"></a>' : "<div></div>"; }).join("");
      }).catch(function (e) { $("#pg").innerHTML = '<p class="muted">Couldn’t load photos: ' + esc(e.message) + "</p>"; });
      box.scrollIntoView({ block: "start" });
    }).catch(function (e) { box.innerHTML = '<p class="muted">' + esc(e.message) + "</p>"; });
  }

  /* ---------- generic content editor ---------- */
  // field: [key, label, type, opts]  types: text, textarea, select, check, money, number, images
  function editor(body, cfg) {
    var items = data[cfg.key];
    body.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px"><p class="muted" style="margin:0;max-width:720px">' + cfg.help + '</p><button class="btn btn-gold" type="button" id="new">+ Add ' + cfg.noun + "</button></div>" +
      (items.length ? '<div class="table-wrap"><table class="data-table"><caption class="sr-only">' + cfg.title + '</caption><thead><tr>' + cfg.cols.map(function (c) { return '<th scope="col">' + c[0] + "</th>"; }).join("") + '<th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        items.map(function (it) { return "<tr>" + cfg.cols.map(function (c, i) { var v = c[1](it); return i === 0 ? '<th scope="row">' + v + "</th>" : "<td>" + v + "</td>"; }).join("") + '<td><button class="link-btn" type="button" data-edit="' + esc(it.id) + '">Edit</button></td></tr>'; }).join("") + "</tbody></table></div>"
        : '<div class="empty"><h3>Nothing here yet</h3><p>Use “Add ' + cfg.noun + '” to create the first one.</p></div>') + '<div id="ed"></div>';
    $("#new").onclick = function () { form(null); };
    $$("[data-edit]").forEach(function (b) { b.onclick = function () { form(items.filter(function (x) { return x.id === b.getAttribute("data-edit"); })[0]); }; });
    function form(it) {
      it = it || {};
      var box = $("#ed"), media = {};
      box.innerHTML = '<section class="card edit-panel dark-form" aria-labelledby="eh"><h3 id="eh">' + (it.id ? "Edit " : "New ") + cfg.noun + '</h3><form class="form" id="ef" novalidate>' + cfg.fields.map(function (f) {
        var k = f[0], lab = f[1], t = f[2], v = it[k], id = "e-" + k;
        if (t === "images") { media[k] = (v || []).slice(); return '<div class="field"><span class="label" id="' + id + '-l">' + lab + '</span><ul class="media-list" data-media="' + k + '" aria-labelledby="' + id + '-l"></ul><label class="btn btn-line btn-sm" style="margin-top:10px" for="' + id + '">Add photos</label><input class="sr-only" type="file" id="' + id + '" accept="image/jpeg,image/png,image/webp" multiple data-up="' + k + '"><p class="small muted" data-upst="' + k + '"></p></div>'; }
        if (t === "textarea") return '<div class="field"><label for="' + id + '">' + lab + '</label><textarea id="' + id + '" data-k="' + k + '" rows="' + (f[3] || 4) + '">' + esc(v || "") + "</textarea></div>";
        if (t === "select") return '<div class="field"><label for="' + id + '">' + lab + '</label><select id="' + id + '" data-k="' + k + '">' + f[3].map(function (o) { return '<option value="' + esc(o[0]) + '"' + ((v || f[3][0][0]) === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>";
        if (t === "check") return '<div class="field"><label class="check"><input type="checkbox" id="' + id + '" data-k="' + k + '"' + ((v === undefined ? f[3] : v) ? " checked" : "") + "> " + lab + "</label></div>";
        if (t === "money") return '<div class="field"><label for="' + id + '">' + lab + ' <span class="opt">($, leave blank if not shown)</span></label><input type="text" inputmode="decimal" id="' + id + '" data-k="' + k + '" data-money value="' + (v == null ? "" : (v / 100).toFixed(2)) + '"></div>';
        return '<div class="field"><label for="' + id + '">' + lab + (f[3] ? ' <span class="opt">' + f[3] + "</span>" : "") + '</label><input type="text" id="' + id + '" data-k="' + k + '" value="' + esc(v == null ? "" : v) + '"' + (t === "number" ? ' inputmode="numeric"' : "") + "></div>";
      }).join("") + '<div class="btn-row"><button class="btn btn-gold" type="submit">Save</button><button class="btn btn-line" type="button" id="ecx">Cancel</button>' + (it.id ? '<button class="link-btn danger" type="button" id="edel">Delete</button>' : "") + '</div><div class="status" id="est" role="status"></div></form></section>';
      function drawMedia(k) {
        var ul = $('[data-media="' + k + '"]', box);
        ul.innerHTML = media[k].map(function (p, i) { return '<li><img src="' + esc(A.media(p)) + '" alt="Photo ' + (i + 1) + '"><div class="ctl"><button type="button" data-mv="' + i + '" data-d="-1" aria-label="Move photo ' + (i + 1) + ' earlier">←</button><button type="button" data-rmv="' + i + '" aria-label="Remove photo ' + (i + 1) + '">✕</button><button type="button" data-mv="' + i + '" data-d="1" aria-label="Move photo ' + (i + 1) + ' later">→</button></div></li>'; }).join("") || '<li style="width:auto;border:0;background:none" class="muted small">No photos yet.</li>';
        $$("[data-rmv]", ul).forEach(function (b) { b.onclick = function () { media[k].splice(+b.getAttribute("data-rmv"), 1); drawMedia(k); }; });
        $$("[data-mv]", ul).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute("data-mv"), j = i + +b.getAttribute("data-d"); if (j < 0 || j >= media[k].length) return; var t = media[k][i]; media[k][i] = media[k][j]; media[k][j] = t; drawMedia(k); }; });
      }
      Object.keys(media).forEach(drawMedia);
      $$("[data-up]", box).forEach(function (inp) {
        inp.onchange = function () {
          var k = inp.getAttribute("data-up"), files = Array.prototype.slice.call(inp.files), st = $('[data-upst="' + k + '"]', box);
          inp.value = "";
          files.reduce(function (ch, f, n) {
            return ch.then(function () {
              if (media[k].length >= 20) throw new Error("Up to 20 photos.");
              st.textContent = "Uploading " + (n + 1) + " of " + files.length + "…";
              var ext = (f.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
              return A.upload("site-media", cfg.folder + "/" + A.uuid().replace(/-/g, "").slice(0, 20) + "." + ext, f).then(function (p) { media[k].push(p); drawMedia(k); });
            });
          }, Promise.resolve()).then(function () { st.textContent = files.length ? "Uploaded. Remember to Save." : ""; }).catch(function (e) { st.textContent = e.message; });
        };
      });
      $("#ecx", box).onclick = function () { box.innerHTML = ""; };
      if (it.id) $("#edel", box).onclick = function () {
        if (!confirm("Delete this " + cfg.noun + "? This can’t be undone.")) return;
        A.rpc("admin_delete", { p_kind: cfg.kind, p_id: it.id }).then(function () { load(); }).catch(function (e) { msg($("#est", box), "error", esc(e.message)); });
      };
      $("#ef", box).onsubmit = function (e) {
        e.preventDefault();
        var p = { id: it.id || "" }, st = $("#est", box), btn = $('#ef button[type="submit"]', box), bad = "";
        $$("[data-k]", box).forEach(function (el) {
          var k = el.getAttribute("data-k");
          if (el.type === "checkbox") p[k] = el.checked;
          else if (el.hasAttribute("data-money")) { var s = el.value.replace(/[$,\s]/g, ""); if (s && !/^\d+(\.\d{1,2})?$/.test(s)) bad = "Enter prices like 450 or 450.00."; p[k] = s ? String(Math.round(parseFloat(s) * 100)) : ""; }
          else p[k] = el.value;
        });
        Object.keys(media).forEach(function (k) { p[k] = media[k]; });
        if (bad) return msg(st, "error", bad);
        busy(btn, true);
        A.rpc(cfg.save, { p: p }).then(function () { load(); }).catch(function (er) { busy(btn, false); msg(st, "error", esc(er.message)); });
      };
      box.scrollIntoView({ block: "start" });
    }
  }
  var yesno = function (b) { return b ? "Yes" : '<span class="muted">No</span>'; };
  function projects(body) {
    editor(body, { key: "projects", kind: "project", save: "admin_save_project", folder: "projects", noun: "project", title: "Projects",
      help: "Finished work shown on the Our Work page. Use only photos of Charles’s own work. Add before and after photos for the best effect.",
      cols: [["Title", function (x) { return esc(x.title); }], ["Category", function (x) { return esc(x.category); }], ["Photos", function (x) { return x.before_images.length + x.after_images.length; }], ["Published", function (x) { return yesno(x.published); }]],
      fields: [["title", "Title", "text"], ["category", "Category", "text", "(e.g. Chairs, Sofas, Restoration, Custom builds)"], ["description", "Description", "textarea", 5], ["materials", "Materials / fabric", "text"],
        ["before_images", "Before photos", "images"], ["after_images", "After photos", "images"], ["sort", "Order", "number", "(lower shows first)"], ["published", "Show on the website", "check", false]] });
  }
  function products(body) {
    editor(body, { key: "products", kind: "product", save: "admin_save_product", folder: "products", noun: "piece", title: "Pieces for sale",
      help: "Restored or custom pieces for sale. Drafts are hidden. A piece needs a price before it can be marked Available. Mark it Sold when it sells.",
      cols: [["Title", function (x) { return esc(x.title); }], ["Price", function (x) { return esc(A.money(x.price_cents)); }], ["Status", function (x) { return esc({ draft: "Draft (hidden)", available: "Available", reserved: "Reserved", sold: "Sold" }[x.status]); }]],
      fields: [["title", "Title", "text"], ["status", "Status", "select", [["draft", "Draft (hidden)"], ["available", "Available"], ["reserved", "Reserved"], ["sold", "Sold"]]], ["price_cents", "Price", "money"],
        ["category", "Category", "text", "(e.g. Chairs, Benches)"], ["sku", "Reference / SKU", "text"], ["description", "Description", "textarea", 5], ["images", "Photos", "images"],
        ["dimensions", "Dimensions", "text"], ["condition", "Condition", "text"], ["materials", "Materials", "text"], ["finish", "Finish", "text"], ["quantity", "Quantity", "number"], ["sort", "Order", "number", "(lower shows first)"]] });
  }
  function fabrics(body) {
    editor(body, { key: "fabrics", kind: "fabric", save: "admin_save_fabric", folder: "fabrics", noun: "fabric", title: "Fabrics",
      help: "Fabrics you sell. Only fill in details you know for sure (don’t guess brands, ratings or care). Customers request fabric or swatches through the website; there’s no online checkout yet.",
      cols: [["Name", function (x) { return esc(x.name); }], ["Price", function (x) { return x.price_cents == null ? "" : esc(A.money(x.price_cents) + " " + x.price_unit); }], ["Stock", function (x) { return esc({ in_stock: "In stock", low_stock: "Low stock", special_order: "Special order", unavailable: "Unavailable" }[x.stock_state]); }], ["Published", function (x) { return yesno(x.published); }]],
      fields: [["name", "Fabric name", "text"], ["code", "Code / SKU", "text"], ["images", "Photos", "images"], ["price_cents", "Price", "money"],
        ["price_unit", "Price unit", "select", [["per yard", "per yard"], ["per sample", "per sample"], ["per roll", "per roll"], ["per piece", "per piece"]]],
        ["stock_state", "Stock", "select", [["in_stock", "In stock"], ["low_stock", "Low stock"], ["special_order", "Special order"], ["unavailable", "Unavailable"]]],
        ["available_qty", "Amount available", "text", "(e.g. 14 yards)"], ["min_qty", "Minimum order", "text"], ["color_family", "Color family", "text"], ["pattern", "Pattern", "text", "(e.g. Solid, Stripe, Floral)"],
        ["composition", "Material / composition", "text"], ["use_type", "Best for", "text"], ["brand", "Brand", "text", "(only if confirmed)"], ["care", "Care", "textarea", 3],
        ["swatch_available", "Swatches available", "check", false], ["sort", "Order", "number"], ["published", "Show on the website", "check", false]] });
  }
  function videos(body) {
    editor(body, { key: "videos", kind: "video", save: "admin_save_video", folder: "videos", noun: "video", title: "Videos",
      help: "Paste a YouTube video link. The featured video shows on the home page. Set the channel link in Settings.",
      cols: [["Title", function (x) { return esc(x.title); }], ["Featured", function (x) { return yesno(x.featured); }], ["Published", function (x) { return yesno(x.published); }]],
      fields: [["youtube", "YouTube link", "text", "(https://www.youtube.com/watch?v=…)"], ["title", "Title", "text"], ["description", "Description", "textarea", 3], ["featured", "Feature on the home page", "check", false], ["sort", "Order", "number"], ["published", "Show on the website", "check", true]] });
    // fill the youtube field with the full link when editing
    $$("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { var v = data.videos.filter(function (x) { return x.id === b.getAttribute("data-edit"); })[0]; setTimeout(function () { var f = $("#e-youtube"); if (f && v) f.value = "https://www.youtube.com/watch?v=" + v.youtube_id; }, 0); }); });
  }
  function faqs(body) {
    editor(body, { key: "faqs", kind: "faq", save: "admin_save_faq", folder: "faq", noun: "question", title: "FAQ",
      help: "Questions and answers on the FAQ page. Only promise what you actually offer (no timing, delivery or warranty promises unless they’re true).",
      cols: [["Question", function (x) { return esc(x.question); }], ["Published", function (x) { return yesno(x.published); }]],
      fields: [["question", "Question", "text"], ["answer", "Answer", "textarea", 5], ["sort", "Order", "number"], ["published", "Show on the website", "check", true]] });
  }

  /* ---------- SETTINGS ---------- */
  function settings(body) {
    var s = data.settings;
    var f = function (k, lab, t, help) { var id = "s-" + k; return t === "textarea" ? '<div class="field"><label for="' + id + '">' + lab + (help ? ' <span class="opt">' + help + "</span>" : "") + '</label><textarea id="' + id + '" data-s="' + k + '" rows="5">' + esc(s[k]) + "</textarea></div>" : t === "check" ? '<div class="field"><label class="check"><input type="checkbox" id="' + id + '" data-s="' + k + '"' + (s[k] ? " checked" : "") + "> " + lab + "</label></div>" : '<div class="field"><label for="' + id + '">' + lab + (help ? ' <span class="opt">' + help + "</span>" : "") + '</label><input type="text" id="' + id + '" data-s="' + k + '" value="' + esc(s[k]) + '"></div>'; };
    body.innerHTML = '<section class="card dark-form"><form class="form" id="sf" novalidate><h3>Contact details</h3><div class="row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:18px">' +
      f("business_name", "Business name") + f("owner_name", "Owner") + f("phone", "Phone") + f("email", "Email") + f("address_line", "Street address") + f("city_state_zip", "City, state, ZIP") + "</div>" +
      f("address_confirmed", "Address confirmed (shows a map link and invites visits)", "check") + f("hours", "Hours", "textarea", "(e.g. By appointment)") + f("service_area", "Service area", "text", "(e.g. Grand Rapids and West Michigan)") +
      f("youtube_channel_url", "YouTube channel link", "text", "(https://www.youtube.com/@…)") + f("pickup_delivery_note", "Pickup and delivery", "textarea") + f("payment_note", "Payment methods", "textarea") +
      "<h3>Policies</h3><p class=\"muted small\">Shown on the Policies page. Leave blank to show the default text. Have these reviewed before relying on them.</p>" +
      f("policy_privacy", "Privacy notice", "textarea") + f("policy_terms", "Terms", "textarea") + f("policy_returns", "Returns", "textarea") + f("policy_shipping", "Shipping and pickup", "textarea") +
      '<button class="btn btn-gold" type="submit">Save settings</button><div class="status" id="sst" role="status"></div></form></section>';
    $("#sf").onsubmit = function (e) {
      e.preventDefault();
      var p = {}, btn = $('#sf button[type="submit"]'); $$("[data-s]").forEach(function (el) { p[el.getAttribute("data-s")] = el.type === "checkbox" ? el.checked : el.value; });
      busy(btn, true);
      A.rpc("admin_save_settings", { p: p }).then(function () { busy(btn, false); msg($("#sst"), "ok", "Settings saved."); return load(true); }).catch(function (er) { busy(btn, false); msg($("#sst"), "error", esc(er.message)); });
    };
  }

  start();
})();
