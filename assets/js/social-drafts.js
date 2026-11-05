/* Georgia Center for Opportunity brand guide: social templates, drafts and sharing.
   Share links (#post=...), drafts in localStorage, program presets, captions and alt text.
   Everything read back from a link or from storage is untrusted: it is rebuilt field by field,
   capped in length and passed through S.normalizePost. Decoded strings are only ever text. */
(function () {
  "use strict";
  var S = window.GCOSocial = window.GCOSocial || {};

  var MAX_FIELD = 2000;            /* characters per decoded/stored text field */
  var MAX_CODE = 400000;           /* characters of share code we will even look at */
  var MAX_JSON = 512 * 1024;       /* bytes after inflating a share code */
  var DRAFT_KEY = "gco-social-drafts-v1";
  var DRAFT_MAX = 12;
  var DRAFT_BUDGET = 4000000;      /* characters of JSON in localStorage (~4MB) */
  var PHOTO_MAX_SIDE = 1600, PHOTO_QUALITY = 0.85;

  function own(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isObj(o) { return o !== null && typeof o === "object" && !Array.isArray(o); }

  /* text only: strip control and bidi-override characters, normalize newlines, cap length */
  function cleanText(s, max) {
    if (typeof s !== "string") return null;
    s = s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g, "");
    return s.length > (max || MAX_FIELD) ? s.slice(0, max || MAX_FIELD) : s;
  }
  function cleanNum(v, lo, hi, dflt) { var n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN; return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; }
  function cleanPhoto(ph, keepSrc) {
    var out = S.emptyPhoto();
    if (!isObj(ph)) return out;
    out.x = cleanNum(ph.x, 0, 1, 0.5); out.y = cleanNum(ph.y, 0, 1, 0.5); out.zoom = cleanNum(ph.zoom, 1, 3, 1);
    /* only inline images survive (blob: URLs die with the page; remote URLs are never loaded from data) */
    if (keepSrc && typeof ph.src === "string" && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(ph.src)) out.src = ph.src;
    return out;
  }
  function cleanFields(src, defs) {
    var out = {};
    if (!isObj(src)) return out;
    defs.forEach(function (fd) { if (own(src, fd.key)) { var t = cleanText(src[fd.key]); if (t !== null) out[fd.key] = t; } });
    return out;
  }
  /* rebuild an untrusted object as a post; null when it isn't recognisably one */
  function sanitize(p, keepSrc) {
    if (!isObj(p) || typeof p.template !== "string") return null;
    var t = S.template(p.template);
    if (!t) return null;
    var raw = { v: 1, template: t.id,
      size: typeof p.size === "string" ? p.size : null, bg: typeof p.bg === "string" ? p.bg : null,
      photo: cleanPhoto(p.photo, keepSrc), fields: cleanFields(p.fields, t.fields),
      preset: typeof p.preset === "string" && S.PRESETS && own(S.PRESETS, p.preset) ? p.preset : null };
    if (t.carousel && Array.isArray(p.slides)) {
      raw.slides = p.slides.filter(isObj).slice(0, S.MAX_SLIDES).map(function (s) {
        var type = typeof s.type === "string" && own(S.SLIDE_TYPES, s.type) ? s.type : "text";
        return { type: type, fields: cleanFields(s.fields, S.SLIDE_TYPES[type].fields), photo: cleanPhoto(s.photo, keepSrc) };
      });
    }
    var out = S.normalizePost(raw);
    if (!keepSrc) { out.photo.src = null; out.slides.forEach(function (s) { s.photo.src = null; }); }
    return out;
  }
  S.sanitizePost = function (p, keepPhotos) { try { return sanitize(p, !!keepPhotos); } catch (e) { return null; } };

  /* ---------- bytes <-> base64url ---------- */
  function toB64url(u8) {
    var bin = "", CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) bin += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64url(s) {
    if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
    var b = s.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "=";
    var bin = atob(b), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  var canDeflate = typeof CompressionStream === "function" && typeof DecompressionStream === "function" && typeof Response === "function" && typeof Blob === "function";
  function deflate(u8) {
    return new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  /* inflate with an output cap; rejects on corrupt or truncated data */
  function inflate(u8) {
    var ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(), r = ds.readable.getReader(), parts = [], total = 0;
    w.write(u8).catch(function () {}); w.close().catch(function () {});
    function pump() {
      return r.read().then(function (res) {
        if (res.done) { var out = new Uint8Array(total), o = 0; parts.forEach(function (p) { out.set(p, o); o += p.length; }); return out; }
        total += res.value.length;
        if (total > MAX_JSON) { r.cancel().catch(function () {}); throw new Error("too large"); }
        parts.push(res.value); return pump();
      });
    }
    return pump();
  }

  /* compact form for links: no photo sources, default photo objects and null preset left out */
  function compact(post) {
    var p = sanitize(post, false); if (!p) return null;
    var def = function (ph) { return ph.x === 0.5 && ph.y === 0.5 && ph.zoom === 1; };
    var o = { v: 1, template: p.template, size: p.size, bg: p.bg, fields: p.fields };
    if (!def(p.photo)) o.photo = { x: p.photo.x, y: p.photo.y, zoom: p.photo.zoom };
    if (p.preset) o.preset = p.preset;
    if (p.slides.length) o.slides = p.slides.map(function (s) {
      var so = { type: s.type, fields: s.fields };
      if (!def(s.photo)) so.photo = { x: s.photo.x, y: s.photo.y, zoom: s.photo.zoom };
      return so;
    });
    return o;
  }

  /* ---------- share links ----------
     code = prefix + base64url(payload). "z": deflate-raw(JSON). "j": plain UTF-8 JSON. */
  S.encodePost = function (post) {
    return Promise.resolve().then(function () {
      var o = compact(post); if (!o) throw new Error("Not a post");
      var bytes = new TextEncoder().encode(JSON.stringify(o));
      if (!canDeflate) return "j" + toB64url(bytes);
      return deflate(bytes).then(function (z) { return "z" + toB64url(z); }, function () { return "j" + toB64url(bytes); });
    });
  };
  S.decodePost = function (str) {
    return Promise.resolve().then(function () {
      if (typeof str !== "string") return null;
      str = str.trim(); try { if (/%[0-9A-Fa-f]{2}/.test(str)) str = decodeURIComponent(str); } catch (e) { return null; }
      if (str.length < 2 || str.length > MAX_CODE) return null;
      var kind = str.charAt(0), bytes = fromB64url(str.slice(1));
      if (!bytes || !bytes.length) return null;
      var raw;
      if (kind === "z") { if (!canDeflate) return null; raw = inflate(bytes); }
      else if (kind === "j") { if (bytes.length > MAX_JSON) return null; raw = bytes; }
      else return null;
      return Promise.resolve(raw).then(function (u8) {
        var json = new TextDecoder("utf-8", { fatal: true }).decode(u8);
        return sanitize(JSON.parse(json), false);
      });
    }).catch(function () { return null; });
  };
  S.shareURL = function (post) {
    return S.encodePost(post).then(function (code) {
      var base = location.origin && location.origin !== "null" ? location.origin + location.pathname : location.href.split("#")[0];
      return base + "#post=" + code;
    });
  };
  S.readShareFromHash = function () {
    var m;
    try { m = /(?:^#|&)post=([^&]*)/.exec(String(location.hash || "")); } catch (e) { m = null; }
    return m ? S.decodePost(m[1]) : Promise.resolve(null);
  };

  /* ---------- drafts (localStorage, with an in-memory fallback for this page view) ---------- */
  var memory = null, storageOK = true;
  function readAll() {
    var items = null;
    try {
      var s = window.localStorage.getItem(DRAFT_KEY);
      items = s ? JSON.parse(s) : [];
      storageOK = true;
    } catch (e) { storageOK = false; items = null; }
    if (!Array.isArray(items)) items = memory ? memory.slice() : [];
    items = items.filter(function (d) { return isObj(d) && typeof d.id === "string" && isObj(d.post); });
    items.sort(function (a, b) { return (+b.savedAt || 0) - (+a.savedAt || 0); });
    return items.slice(0, DRAFT_MAX);
  }
  function writeAll(items) {
    memory = items.slice();
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(items)); storageOK = true; return true; }
    catch (e) { storageOK = false; return false; }
  }
  function hasPhoto(p) { return !!(p.photo && p.photo.src) || (p.slides || []).some(function (s) { return s.photo && s.photo.src; }); }
  function stripPhotos(p) { p.photo.src = null; (p.slides || []).forEach(function (s) { s.photo.src = null; }); return p; }
  function newId() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* "local" when drafts persist in localStorage, "memory" when they only last for this page view */
  S.draftStorage = function () { readAll(); return storageOK ? "local" : "memory"; };

  /* returns the draft id, or { id, photoDropped: true } when the photo didn't fit; null if the post is invalid.
     Saving again with the same name and template replaces that draft. */
  S.saveDraft = function (post, name) {
    try {
      var p = sanitize(post, true); if (!p) return null;
      var t = S.template(p.template);
      name = (cleanText(typeof name === "string" ? name : "", 80) || "").replace(/\s+/g, " ").trim();
      if (!name) name = t.label + " draft";
      var items = readAll(), prev = null;
      items = items.filter(function (d) { if (d.name === name && d.template === p.template) { prev = d; return false; } return true; });
      var entry = { id: prev ? prev.id : newId(), name: name, template: p.template, savedAt: Date.now(), post: p };
      items.unshift(entry); items = items.slice(0, DRAFT_MAX);
      var dropped = false;
      if (hasPhoto(p) && JSON.stringify(items).length > DRAFT_BUDGET) { stripPhotos(p); dropped = true; }
      if (!writeAll(items) && !dropped && hasPhoto(p)) { stripPhotos(p); dropped = true; writeAll(items); }
      return dropped ? { id: entry.id, photoDropped: true } : entry.id;
    } catch (e) { return null; }
  };
  S.listDrafts = function () {
    try {
      return readAll().map(function (d) {
        return { id: d.id, name: cleanText(d.name, 80) || "Draft", template: S.template(d.template) ? d.template : "stat", savedAt: +d.savedAt || 0, hasPhoto: hasPhoto(d.post) };
      });
    } catch (e) { return []; }
  };
  S.loadDraft = function (id) {
    try {
      var d = readAll().filter(function (x) { return x.id === id; })[0];
      return d ? sanitize(d.post, true) : null;
    } catch (e) { return null; }
  };
  S.deleteDraft = function (id) {
    try {
      var items = readAll(), n = items.length;
      items = items.filter(function (x) { return x.id !== id; });
      if (items.length === n) return false;
      writeAll(items); return true;
    } catch (e) { return false; }
  };

  /* downscale to 1600px on the longest side as JPEG 0.85; accepts a data URL (or a Blob/File) */
  S.shrinkPhoto = function (src) {
    return new Promise(function (resolve, reject) {
      var url = src, revoke = false;
      if (typeof Blob !== "undefined" && src instanceof Blob) { url = URL.createObjectURL(src); revoke = true; }
      if (typeof url !== "string" || !/^(data:image\/|blob:)/.test(url)) { reject(new Error("Not an image")); return; }
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error("Empty image");
          var k = Math.min(1, PHOTO_MAX_SIDE / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
          var c = document.createElement("canvas"); c.width = cw; c.height = ch;
          var ctx = c.getContext("2d");
          ctx.fillStyle = S.BRAND.color.white; ctx.fillRect(0, 0, cw, ch);
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, cw, ch);
          var out = c.toDataURL("image/jpeg", PHOTO_QUALITY);
          /* an already small JPEG that would only grow is kept as is */
          if (k === 1 && typeof src === "string" && /^data:image\/jpeg;/.test(src) && src.length <= out.length) out = src;
          c.width = c.height = 0;
          resolve(out);
        } catch (e) { reject(e); }
        finally { if (revoke) URL.revokeObjectURL(url); }
      };
      img.onerror = function () { if (revoke) URL.revokeObjectURL(url); reject(new Error("Couldn't read that image")); };
      img.src = url;
    });
  };

  /* ---------- program presets ----------
     Only approved copy from brand-guide.md: names (section 3) and verbatim phrases from the program
     descriptions (section 7). Labels are always set; other fields are only replaced while they still
     hold a template default or another preset's text, so nothing a person typed is overwritten. */
  var RHCK_QUOTE = "This workshop doesn't just teach parenting tips. It *transforms* the way you connect with your kids.";
  var PRESET_COPY = {
    betterwork: { label: "BETTER WORK", role: "BETTER WORK",
      cta: { head: "A Job Can Provide *Purpose*, Stability and a Path Forward", sub: "We connect job-seekers with training, support services and career pathways through local partners.", cta: "Learn More" },
      pillars: "Build Confidence\nDiscover Purpose\nDevelop Skills\nSteady, Meaningful Work" },
    rhck: { label: "Raising Highly Capable Kids", role: "Raising Highly Capable Kids",
      cta: { head: "A Free, 10-Session Program for *Parents*", sub: "Gives parents a supportive community and the tools to strengthen relationships and help their children grow into confident, caring, and capable adults.", cta: "Learn More" },
      pillars: "A Free, 10-Session Program\nA Supportive Community\nTools to Strengthen Relationships\nIn Partnership With Local Organizations" },
    a4o: { label: "Alliance for Opportunity", role: "Alliance for Opportunity",
      cta: { head: "Refocus the Safety Net on *Work*", sub: "A multi-state, nonprofit coalition that works with state and federal leaders.", cta: "Learn More" },
      pillars: "Work\nFamily Stability\nDignity\nUpward Mobility" }
  };
  function stock(tid, key) {
    var t = S.template(tid), vals = [""];
    if (t && t.defaults && typeof t.defaults[key] === "string") vals.push(t.defaults[key]);
    Object.keys(PRESET_COPY).forEach(function (id) {
      var c = PRESET_COPY[id];
      if (key === "eyeb") vals.push(c.label);
      if (key === "role") vals.push(c.role);
      if (tid === "cta" && c.cta[key]) vals.push(c.cta[key]);
      if (tid === "pillars" && key === "items") vals.push(c.pillars);
    });
    return vals;
  }
  function replaceable(post, key) { var v = post.fields[key]; return typeof v !== "string" || stock(post.template, key).indexOf(v.trim()) >= 0; }

  function makePreset(id, label) {
    var c = PRESET_COPY[id];
    return { id: id, label: label, apply: function (post) {
      var p = S.normalizePost(S.clone(post || {})), tid = p.template, F = p.fields;
      if (own(F, "eyeb")) F.eyeb = c.label;
      if (tid === "cta") ["head", "sub", "cta"].forEach(function (k) { if (replaceable(p, k)) F[k] = c.cta[k]; });
      if (tid === "pillars" && replaceable(p, "items")) F.items = c.pillars;
      if (tid === "quote") {
        if (replaceable(p, "role")) F.role = c.role;
        if (id === "rhck") { if (!F.q.trim()) { F.q = RHCK_QUOTE; if (!F.who.trim()) F.who = "RHCK Graduate"; } }
        /* the stock quote is from an RHCK graduate: never leave it under another program */
        else if (F.q === RHCK_QUOTE) { F.q = ""; if (F.who === "RHCK Graduate") F.who = ""; }
      }
      if (tid === "carousel") p.slides.forEach(function (s) { if (s.type === "quote" && own(s.fields, "role") && replaceable({ template: "quote", fields: s.fields }, "role")) s.fields.role = c.role; });
      p.preset = id;
      return S.normalizePost(p);
    } };
  }
  S.PRESETS = {
    betterwork: makePreset("betterwork", "BETTER WORK"),
    rhck: makePreset("rhck", "Raising Highly Capable Kids (RHCK)"),
    a4o: makePreset("a4o", "Alliance for Opportunity (A4O)")
  };
  S.applyPreset = function (post, id) {
    try { return own(S.PRESETS, id) ? S.PRESETS[id].apply(post) : S.normalizePost(S.clone(post || {})); }
    catch (e) { return S.normalizePost(post); }
  };

  /* ---------- captions and alt text ---------- */
  var SITE = "foropportunity.org";
  function P(s) { return S.plain(s); }
  function lines(s) { return String(s || "").split("\n").map(P).filter(Boolean); }
  function endPunct(s) { s = String(s || "").trim(); return !s || /[.!?:…"”)]$/.test(s) ? s : s + "."; }
  /* join pieces into sentences without doubling punctuation */
  function sentences(parts) { return parts.map(P).filter(Boolean).map(endPunct).join(" "); }
  function listJoin(a) { return a.length < 3 ? a.join(" and ") : a.slice(0, -1).join(", ") + ", and " + a[a.length - 1]; }
  /* "Learn More" -> "Learn more", keeping names and all-caps words */
  var PROPER = /^(Georgia|Georgians?|GCO|BETTER|WORK|RHCK|A4O|Alliance|Opportunity|Raising|Highly|Capable|Kids|Congress|I)$/;
  function sentenceCase(s) { return P(s).split(" ").map(function (w, i) { return i === 0 || PROPER.test(w.replace(/[^\w]/g, "")) || (w.length > 1 && w === w.toUpperCase()) ? w : w.toLowerCase(); }).join(" "); }
  function siteIn(text) { var m = /\b(?:https?:\/\/)?(?:www\.)?foropportunity\.org(?:\/[^\s]*)?/i.exec(text || ""); return m ? m[0].replace(/[.,]$/, "").toLowerCase() : null; }
  function allText(post) {
    var out = [];
    Object.keys(post.fields || {}).forEach(function (k) { out.push(post.fields[k]); });
    (post.slides || []).forEach(function (s) { Object.keys(s.fields || {}).forEach(function (k) { out.push(s.fields[k]); }); });
    return P(out.join(" "));
  }
  function hashtags(post) {
    var t = allText(post), tags = [], add = function (h) { if (tags.length < 2 && tags.indexOf(h) < 0) tags.push(h); };
    if (post.preset === "betterwork" || /\bBETTER WORK\b/i.test(t)) add("#BETTERWORK");
    if (post.preset === "rhck" || /\b(RHCK|Raising Highly Capable Kids)\b/i.test(t)) add("#RaisingHighlyCapableKids");
    if (post.preset === "a4o" || /\b(A4O|Alliance for Opportunity)\b/i.test(t)) add("#AllianceForOpportunity");
    if (/\bbenefits? cliffs?\b/i.test(t)) add("#BenefitCliffs");
    if (/\blicens/i.test(t)) add("#OccupationalLicensing");
    if (!tags.length) add("#Georgia");
    return tags.join(" ");
  }
  function slideCaption(s) {
    var F = s.fields;
    switch (s.type) {
      case "cover": case "photo": return sentences([F.head]);
      case "text": return sentences([F.head ? P(F.head) + ":" + (P(F.body) ? " " + P(F.body) : "") : F.body]);
      case "stat": return sentences([P(F.stat) && P(F.head) ? P(F.stat) + ": " + P(F.head) : F.stat || F.head]) + (P(F.stat) ? " (" + (P(F.source) || "[SOURCE NEEDED]") + ")" : "");
      case "quote": return P(F.q) ? "“" + P(F.q) + "”" + (P(F.who) || P(F.role) ? " (" + [P(F.who), P(F.role)].filter(Boolean).join(", ") + ")" : "") : "";
      default: return "";
    }
  }

  S.caption = function (post) {
    try {
      var p = S.normalizePost(post), F = p.fields, body = [], next = "", link = null;
      switch (p.template) {
        case "stat":
          body.push(sentences([P(F.eyeb) && P(F.stat) ? P(F.eyeb) + ": " + P(F.stat) : F.eyeb || F.stat, F.head]));
          if (P(F.stat)) body.push("Source: " + (P(F.source) || "[SOURCE NEEDED]"));
          next = "Read our analysis at"; break;
        case "quote":
          if (P(F.q)) body.push("“" + P(F.q) + "”" + (P(F.who) || P(F.role) ? "\n— " + [P(F.who), P(F.role)].filter(Boolean).join(", ") : ""));
          next = "Learn more at"; break;
        case "pillars":
          var items = lines(F.items);
          body.push(P(F.eyeb) ? P(F.eyeb) + (items.length ? ": " + listJoin(items) + "." : "") : endPunct(listJoin(items)));
          next = "Learn more at"; break;
        case "question":
          body.push(sentences([F.head, F.sub]));
          next = "Learn more about our work at"; break;
        case "cta":
          body.push(sentences([F.head, F.sub]));
          next = (P(F.cta) ? sentenceCase(F.cta) : "Learn more") + " at"; break;
        case "carousel":
          var end = null, parts = [];
          p.slides.forEach(function (s) { if (s.type === "end") end = s; else { var c = slideCaption(s); if (c) parts.push(c); } });
          if (parts.length) body.push(parts.shift());
          if (parts.length) body.push(parts.join("\n"));
          if (end) { if (P(end.fields.head)) body.push(endPunct(P(end.fields.head))); link = siteIn(end.fields.url); }
          next = (end && P(end.fields.cta) ? sentenceCase(end.fields.cta) : "Learn more") + " at"; break;
      }
      body = body.filter(Boolean);
      /* one link only: reuse an address already in the copy, otherwise add the website */
      var inCopy = siteIn(body.join(" "));
      var tail = inCopy ? "" : next + " " + (link || SITE) + ".";
      return body.concat(tail ? [tail] : [], [hashtags(p)]).join("\n\n");
    } catch (e) { return "Learn more at " + SITE + "."; }
  };

  function bgText(p, t) {
    if (p.bg === "light") return "Off-white background with pale slate and peach arrow shapes.";
    if (p.bg === "photo") return "Photo [describe the photo] under a slate gradient.";
    return "Solid slate blue background.";
  }
  function slideAlt(s, i, n, series) {
    var F = s.fields, words = [];
    switch (s.type) {
      case "cover": words = [series, F.head, "Swipe"]; break;
      case "text": words = [F.head, F.body]; break;
      case "stat": words = [F.stat, F.head, F.source]; break;
      case "quote": words = [F.q, F.who, F.role]; break;
      case "photo": words = [F.head]; break;
      case "end": words = [F.head, F.cta, F.url]; break;
    }
    var txt = sentences(words);
    var extra = s.type === "photo" || (s.type === "cover" && s.photo && s.photo.src) ? " Photo [describe the photo] under a slate gradient." : s.type === "quote" ? " Teal quote mark." : "";
    return "Slide " + (i + 1) + " of " + n + ": " + (txt || "(no text)") + extra;
  }

  S.altText = function (post) {
    try {
      var p = S.normalizePost(post), t = S.template(p.template), F = p.fields, words;
      if (t.carousel) {
        var n = p.slides.length;
        return n + "-slide carousel. " + p.slides.map(function (s, i) { return slideAlt(s, i, n, F.eyeb); }).join(" ") +
          " " + bgText(p, t) + " Georgia Center for Opportunity logo on every slide.";
      }
      switch (p.template) {
        case "stat": words = [F.eyeb, F.stat, F.head, F.source]; break;
        case "quote": words = [F.q, [P(F.who), P(F.role)].filter(Boolean).join(", ")]; break;
        case "pillars": words = [F.eyeb].concat(lines(F.items).map(function (x, i) { return (i + 1) + " " + x; })); break;
        case "question": words = [F.eyeb, F.head, F.sub]; break;
        case "cta": words = [F.eyeb, F.head, F.sub, F.cta]; break;
        default: words = t.fields.map(function (fd) { return F[fd.key]; });
      }
      var bg = bgText(p, t);
      if (p.template === "quote") bg = (p.bg === "light" ? "White card with a teal quote mark on an off-white background with pale slate and peach arrow shapes." : p.bg === "photo" ? "White card with a teal quote mark over a photo [describe the photo] under a slate gradient." : "Teal quote mark on a solid slate blue background.");
      return "Graphic that reads: " + (sentences(words) || "(no text)") + " " + bg + " Georgia Center for Opportunity logo.";
    } catch (e) { return "Graphic. Georgia Center for Opportunity logo."; }
  };
})();
