/* ==========================================================================
   Charlie's Chairs | quote.js : the photo-first quote / inquiry form.
   Photos upload into a private folder; then the request is saved and a
   reference number is shown. Nothing is shown as "sent" unless it was saved.
   ========================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("quote-form");
  if (!form) return;
  var A = window.CCAPI, C = window.CC || {}, esc = A.esc;
  var $ = function (s) { return form.querySelector(s); };
  var MAX = 10, MAXMB = 15;
  var photos = []; // {file, url, name, state: 'ready'|'uploading'|'done'|'fail', path}
  var folder = A.uuid();
  var status = document.getElementById("quote-status");
  var show = function (k, m) { status.className = "status show " + k; status.innerHTML = m; status.focus(); };

  // options
  var fill = function (sel, list, first) { sel.innerHTML = (first ? '<option value="">' + first + "</option>" : "") + list.map(function (v) { return "<option>" + esc(v) + "</option>"; }).join(""); };
  fill($("#q-project"), C.projectTypes || [], "Choose one");
  fill($("#q-furniture"), C.furnitureTypes || [], "Choose one");
  fill($("#q-budget"), C.budgetRanges || [], "Prefer not to say");

  // ?kind=piece|fabric&item=...  (from the Shop and Fabrics pages)
  var qs = new URLSearchParams(location.search), kind = qs.get("kind"), item = (qs.get("item") || "").slice(0, 200);
  if (kind !== "piece" && kind !== "fabric") kind = "project";
  if (kind !== "project") {
    document.querySelectorAll("[data-project-only]").forEach(function (el) { el.hidden = true; el.querySelectorAll("[required]").forEach(function (f) { f.required = false; }); });
    var ask = document.getElementById("asking");
    ask.hidden = false;
    ask.innerHTML = "<strong>" + (kind === "fabric" ? "Fabric request" : "Asking about a piece") + ":</strong> " + esc(item || "General question");
    document.getElementById("quote-title").textContent = kind === "fabric" ? "Request fabric" : "Ask about a piece";
    $("#q-desc-label").firstChild.textContent = "Your question ";
    $("#q-desc").required = false;
    $("#q-desc-label").insertAdjacentHTML("beforeend", ' <span class="opt">(optional)</span>');
    if (kind === "fabric") document.getElementById("qty-field").hidden = false;
  }

  /* ---------- photos ---------- */
  var input = $("#q-photos"), list = $("#photo-list"), drop = $("#drop"), bar = $("#upload-progress");
  function drawPhotos() {
    list.innerHTML = photos.map(function (p, i) {
      var st = { ready: "Ready", uploading: "Uploading…", done: "Uploaded ✓", fail: "Failed. Will retry" }[p.state];
      return '<li class="thumb"><img src="' + p.url + '" alt="Selected photo ' + (i + 1) + '"><div class="cap"><span class="state ' + (p.state === "done" ? "done" : p.state === "fail" ? "fail" : "") + '">' + st + "</span><br>" + esc(p.name) + "</div>" +
        (p.state === "uploading" || p.state === "done" ? "" : '<button type="button" class="rm" data-rm="' + i + '" aria-label="Remove photo ' + (i + 1) + ", " + esc(p.name) + '">✕</button>') + "</li>";
    }).join("");
    $("#photo-count").textContent = photos.length ? photos.length + " of " + MAX + " photos selected" : "No photos selected yet";
    list.querySelectorAll("[data-rm]").forEach(function (b) {
      b.onclick = function () { var i = +b.getAttribute("data-rm"); URL.revokeObjectURL(photos[i].url); photos.splice(i, 1); drawPhotos(); input.focus(); };
    });
  }
  function addFiles(files) {
    var msgs = [];
    Array.prototype.forEach.call(files, function (f) {
      if (photos.length >= MAX) { msgs.push("Up to " + MAX + " photos."); return; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { msgs.push(esc(f.name) + " isn’t a JPG, PNG or WebP photo."); return; }
      if (f.size > MAXMB * 1048576) { msgs.push(esc(f.name) + " is over " + MAXMB + " MB."); return; }
      photos.push({ file: f, url: URL.createObjectURL(f), name: f.name, state: "ready" });
    });
    drawPhotos();
    var pm = $("#photo-msg"); pm.innerHTML = msgs.join("<br>"); pm.hidden = !msgs.length;
  }
  input.addEventListener("change", function () { addFiles(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  drawPhotos();

  function uploadAll() {
    var todo = photos.filter(function (p) { return p.state !== "done"; }), n = 0, total = photos.length;
    var tick = function () { bar.hidden = false; bar.firstElementChild.style.width = Math.round(100 * photos.filter(function (p) { return p.state === "done"; }).length / Math.max(1, total)) + "%"; };
    tick();
    // one at a time keeps phones on weak signal reliable
    return todo.reduce(function (chain, p) {
      return chain.then(function () {
        p.state = "uploading"; drawPhotos();
        var ext = (p.file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        var name = "photo-" + (photos.indexOf(p) + 1) + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
        return A.upload("inquiry-photos", folder + "/" + name, p.file)
          .then(function (path) { p.state = "done"; p.path = path; n++; drawPhotos(); tick(); })
          .catch(function (err) { p.state = "fail"; drawPhotos(); throw err; });
      });
    }, Promise.resolve());
  }

  /* ---------- validation + submit ---------- */
  function check(f) {
    var box = f.closest(".field"); if (!box) return true;
    var ok = f.type === "checkbox" ? (!f.required || f.checked) : f.checkValidity() && (!f.required || f.value.trim() !== "");
    if (ok && f.id === "q-phone") {
      var m = form.querySelector('input[name="contact_method"]:checked');
      if (m && m.value !== "email") ok = f.value.replace(/\D/g, "").length >= 10;
    }
    box.classList.toggle("invalid", !ok); f.setAttribute("aria-invalid", ok ? "false" : "true");
    return ok;
  }
  form.querySelectorAll("input, select, textarea").forEach(function (f) { f.addEventListener("change", function () { if (f.closest(".field.invalid")) check(f); }); });

  var busy = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var fields = Array.prototype.filter.call(form.querySelectorAll("input, select, textarea"), function (f) { return f.id && f.id !== "q-photos" && !f.closest("[hidden]"); });
    var bad = fields.filter(function (f) { return !check(f); });
    if (bad.length) { show("error", "Please fix the highlighted fields."); bad[0].focus(); return; }
    if (!A.ready) { show("info", "Online requests aren’t connected yet, so this was <strong>not sent</strong>. Please call or email Charles directly, and text him your photos."); return; }
    var btn = form.querySelector('button[type="submit"]');
    busy = true; btn.disabled = true; btn.textContent = photos.length ? "Uploading photos…" : "Sending…";
    var v = function (id) { var el = document.getElementById(id); return el && !el.closest("[hidden]") ? el.value : ""; };
    var data = {
      kind: kind, item_ref: kind === "project" ? "" : item,
      first_name: v("q-first"), last_name: v("q-last"), email: v("q-email"), phone: v("q-phone"),
      contact_method: (form.querySelector('input[name="contact_method"]:checked') || {}).value || "email",
      project_type: v("q-project"), furniture_type: v("q-furniture"), pieces: v("q-pieces"), description: v("q-desc"),
      condition: v("q-condition"), style: v("q-style"), dimensions: v("q-dims"), budget: v("q-budget"), timing: v("q-timing"),
      quantity: v("q-qty"), consent: document.getElementById("q-consent").checked, website: document.getElementById("q-web").value
    };
    uploadAll()
      .then(function () { btn.textContent = "Saving your request…"; return A.submitInquiry(data, photos.length ? folder : null); })
      .then(function (ref) {
        photos.forEach(function (p) { URL.revokeObjectURL(p.url); });
        var done = document.getElementById("quote-done");
        done.querySelector("[data-ref]").textContent = ref;
        done.querySelector("[data-photos]").textContent = photos.length ? photos.length + " photo" + (photos.length === 1 ? "" : "s") + " received. " : "";
        form.hidden = true; done.hidden = false; done.focus();
        window.scrollTo(0, done.getBoundingClientRect().top + window.scrollY - 120);
      })
      .catch(function (err) {
        var failed = photos.some(function (p) { return p.state === "fail"; });
        var ph = (C.fallback || {}).phone || "";
        show("error", (failed ? "A photo didn’t upload. " : "") + esc(err.message) + " Your request was <strong>not sent</strong> yet. Press the button to try again; photos already uploaded won’t upload twice." +
          (ph ? ' If it keeps failing, call or text Charles at <a href="' + esc(A.tel(ph)) + '">' + esc(ph) + "</a>." : ""));
      })
      .then(function () { busy = false; btn.disabled = false; btn.textContent = "Send my request"; });
  });
})();
