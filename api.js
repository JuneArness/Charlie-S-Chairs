/* ==========================================================================
   Charlie's Chairs | api.js : the only file that talks to Supabase,
   plus small shared helpers. You shouldn't need to edit this file.
   ========================================================================== */
window.CCAPI = (function () {
  "use strict";
  var C = window.CC || {};
  var ready = !!(C.supabaseUrl && C.supabaseKey && window.supabase);
  var sb = ready ? window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  var FRIENDLY = [
    [/invalid login credentials/i, "That email and password don’t match."],
    [/failed to fetch|networkerror|load failed/i, "Can’t reach the server right now. Check your connection and try again."],
    [/payload too large|exceeded the maximum allowed size|too large/i, "That photo is too large. Please use photos under 10 MB."],
    [/mime type|invalid_mime|not supported/i, "That file type isn’t supported. Please use JPG, PNG or WebP photos."],
    [/rate limit|too many/i, "Too many attempts. Please wait a minute and try again."]
  ];
  function wrap(e) {
    var m = (e && (e.message || e.msg || e.error)) || String(e);
    var bar = m.indexOf("|"), out = new Error(bar > 0 ? m.slice(bar + 1) : m);
    out.code = bar > 0 ? m.slice(0, bar) : "";
    if (!out.code) for (var i = 0; i < FRIENDLY.length; i++) if (FRIENDLY[i][0].test(m)) { out.message = FRIENDLY[i][1]; break; }
    return out;
  }
  function rpc(fn, args) {
    if (!sb) return Promise.reject(wrap("NOT_CONNECTED|The website isn’t connected to its database yet."));
    return sb.rpc(fn, args || {}).then(function (r) { if (r.error) throw wrap(r.error); return r.data; });
  }
  var cache = {};
  function once(fn) { if (!cache[fn]) cache[fn] = rpc(fn).catch(function (e) { delete cache[fn]; throw e; }); return cache[fn]; }

  // Resize a photo in the browser (max 2000px, JPEG) so phone uploads are fast and under the size limit.
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return resolve(file);
      createImageBitmap(file).then(function (bmp) {
        var max = 2000, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
        if (s === 1 && file.size < 2.5e6) return resolve(file);
        var c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolve(b && b.size < file.size ? b : file); }, "image/jpeg", 0.86);
      }).catch(function () { resolve(file); });
    });
  }
  function upload(bucket, path, file) {
    if (!sb) return Promise.reject(wrap("NOT_CONNECTED|Not connected."));
    return shrink(file).then(function (blob) {
      var type = blob.type || file.type;
      if (blob !== file) path = path.replace(/\.(png|webp|jpeg)$/i, ".jpg"), type = "image/jpeg";
      return sb.storage.from(bucket).upload(path, blob, { contentType: type, upsert: false, cacheControl: "3600" })
        .then(function (r) { if (r.error) throw wrap(r.error); return path; });
    });
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  return {
    ready: ready,
    rpc: rpc,
    site: function () { return ready ? once("get_site").catch(function () { return C.fallback; }) : Promise.resolve(C.fallback); },
    list: function (what) { return ready ? once("list_" + what) : Promise.resolve([]); },
    submitInquiry: function (data, folder) { return rpc("submit_inquiry", { p: data, p_upload_folder: folder || null }); },
    upload: upload,
    uuid: uuid,
    media: function (path) { return ready && /^[a-z]+\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path || "") ? C.supabaseUrl + "/storage/v1/object/public/site-media/" + path : ""; },
    signedUrls: function (paths) {
      return sb.storage.from("inquiry-photos").createSignedUrls(paths, 3600).then(function (r) { if (r.error) throw wrap(r.error); return r.data; });
    },
    auth: {
      user: function () { return sb ? sb.auth.getSession().then(function (r) { return (r.data.session && r.data.session.user) || null; }) : Promise.resolve(null); },
      signIn: function (email, pw) { return sb.auth.signInWithPassword({ email: email, password: pw }).then(function (r) { if (r.error) throw wrap(r.error); }); },
      signOut: function () { return sb.auth.signOut(); },
      reset: function (email) { return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (r) { if (r.error) throw wrap(r.error); }); },
      setPassword: function (pw) { return sb.auth.updateUser({ password: pw }).then(function (r) { if (r.error) throw wrap(r.error); }); },
      onChange: function (cb) { if (sb) sb.auth.onAuthStateChange(function (ev) { cb(ev); }); }
    },
    esc: esc,
    multiline: function (s) { return esc(s).replace(/\n/g, "<br>"); },
    money: function (c) { return c == null ? "" : (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: c % 100 ? 2 : 0 }); },
    date: function (iso) { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); },
    tel: function (p) { return "tel:" + String(p || "").replace(/[^\d+]/g, ""); },
    ytId: function (s) { return /^[A-Za-z0-9_-]{11}$/.test(s || "") ? s : ""; }
  };
})();
