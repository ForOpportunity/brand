/* Georgia Center for Opportunity brand guide: social templates, canvas renderer.
   Draws every post straight onto a <canvas>, so the preview and the download are the same pixels.
   API: S.render(post, slideIndex, opts) -> Promise<canvas>, S.layout(post, slideIndex) -> Promise<report>, S.preload() -> Promise.
   Never mutates the post. Layout is planned once (plan()) and either drawn (render) or reported (layout). */
(function () {
  "use strict";
  var S = window.GCOSocial = window.GCOSocial || {};
  var B = S.BRAND, C = B.color;

  /* Inter vertical metrics (em): hhea ascender/descender, cap height */
  var ASC = 0.96875, DESC = 0.2421875, CAP = 0.727;
  var FAMILY = '"Inter", Helvetica, Arial, sans-serif';
  /* highlight bar, below the baseline, in em */
  var UL_TOP = 0.2, UL_THICK = 0.12;

  /* ---------- assets ---------- */
  var imgs = { logoLight: null, logoDark: null, quoteMark: null, arrow: {} };
  var preloadP = null, logoRatio = 558 / 2000, quoteRatio = 76 / 110;
  var photoCache = [];          /* [{src, img}] most recent last */
  var logoScaled = {};          /* "dark|340" -> canvas */

  function absURL(p) { try { return new URL(p, document.baseURI).href; } catch (e) { return p; } }
  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var im = new Image();
      if (!/^(data:|blob:)/.test(src)) {
        try { if (new URL(src, document.baseURI).origin !== location.origin) im.crossOrigin = "anonymous"; } catch (e) { /* ignore */ }
      }
      im.decoding = "async";
      im.onload = function () {
        if (im.decode) im.decode().then(function () { resolve(im); }, function () { resolve(im); });
        else resolve(im);
      };
      im.onerror = function () { resolve(null); };
      im.src = /^(data:|blob:|https?:)/.test(src) ? src : absURL(src);
    });
  }
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var weights = [400, 500, 600];
    return Promise.all(weights.map(function (w) {
      return document.fonts.load(w + " 100px Inter").then(function (faces) {
        if (faces && faces.length) return;
        /* the page didn't declare Inter at this weight: add it ourselves */
        if (typeof FontFace === "undefined") return;
        var ff = new FontFace("Inter", "url(" + absURL("assets/fonts/inter-latin-" + w + "-normal.woff2") + ")", { weight: String(w) });
        return ff.load().then(function (f) { document.fonts.add(f); }, function () { /* fall back to Helvetica/Arial */ });
      }, function () { /* ignore */ });
    }));
  }
  S.preload = function () {
    if (preloadP) return preloadP;
    var a = B.assets, jobs = [loadFonts()];
    jobs.push(loadImage(a.logo.light).then(function (im) { imgs.logoLight = im; if (im && im.naturalWidth) logoRatio = im.naturalHeight / im.naturalWidth; }));
    jobs.push(loadImage(a.logo.dark).then(function (im) { imgs.logoDark = im; }));
    jobs.push(loadImage(a.quoteMark).then(function (im) { imgs.quoteMark = im; if (im && im.naturalWidth) quoteRatio = im.naturalHeight / im.naturalWidth; }));
    Object.keys(a.arrow).forEach(function (k) { jobs.push(loadImage(a.arrow[k]).then(function (im) { imgs.arrow[k] = im; })); });
    preloadP = Promise.all(jobs).then(function () { measureCache = {}; measureCount = 0; });
    return preloadP;
  };
  function getPhoto(src) {
    if (!src) return Promise.resolve(null);
    for (var i = 0; i < photoCache.length; i++) if (photoCache[i].src === src) return photoCache[i].p;
    var entry = { src: src, p: loadImage(src) };
    photoCache.push(entry); if (photoCache.length > 6) photoCache.shift();
    return entry.p;
  }
  /* the logo PNG is 2000px wide: step it down by halves so it stays crisp at ~300px */
  function scaledLogo(dark, px) {
    var im = dark ? imgs.logoDark : imgs.logoLight; if (!im) return null;
    px = Math.max(1, Math.round(px));
    var key = (dark ? "d" : "l") + px; if (logoScaled[key]) return logoScaled[key];
    var src = im, w = im.naturalWidth, h = im.naturalHeight;
    while (w / 2 >= px * 1.5) {
      var c = document.createElement("canvas"); c.width = Math.round(w / 2); c.height = Math.round(h / 2);
      var cx = c.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(src, 0, 0, c.width, c.height);
      src = c; w = c.width; h = c.height;
    }
    logoScaled[key] = src; return src;
  }

  /* ---------- text measuring ---------- */
  var mcanvas = null, measureCache = {}, measureCount = 0;
  var hasLS = (function () { try { return "letterSpacing" in document.createElement("canvas").getContext("2d"); } catch (e) { return false; } })();
  function mctx() { if (!mcanvas) mcanvas = document.createElement("canvas").getContext("2d"); return mcanvas; }
  function fontStr(weight, size) { return weight + " " + (Math.round(size * 100) / 100) + "px " + FAMILY; }
  function setFont(ctx, weight, size, track) {
    ctx.font = fontStr(weight, size);
    if (hasLS) ctx.letterSpacing = (Math.round((track || 0) * size * 100) / 100) + "px";
  }
  function tw(ctx, text) {
    var key = ctx.font + "|" + (hasLS ? ctx.letterSpacing : "") + "|" + text;
    var v = measureCache[key];
    if (v === undefined) {
      if (++measureCount > 20000) { measureCache = {}; measureCount = 0; }
      v = measureCache[key] = ctx.measureText(text).width;
    }
    return v;
  }

  /* text -> paragraphs of words; a word is a list of segments so "*Cliff*?" underlines only "Cliff" */
  function tokenize(str, allowHl) {
    str = String(str == null ? "" : str).replace(/\r\n?/g, "\n");
    var runs = allowHl ? S.parseHighlights(str) : [{ text: str, hl: false }];
    var paras = [[]], cur = null;
    runs.forEach(function (r) {
      var t = r.text.replace(/\*/g, ""), pieces = t.split("\n");
      pieces.forEach(function (piece, pi) {
        if (pi > 0) { paras.push([]); cur = null; }
        piece.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { cur = null; return; }
          if (!cur) { cur = { segs: [] }; paras[paras.length - 1].push(cur); }
          cur.segs.push({ text: part, hl: !!r.hl });
        });
      });
    });
    /* drop leading/trailing empty paragraphs */
    while (paras.length > 1 && !paras[0].length) paras.shift();
    while (paras.length > 1 && !paras[paras.length - 1].length) paras.pop();
    return paras;
  }
  function wrap(ctx, paras, maxW, nowrap) {
    var space = tw(ctx, " "), lines = [];
    paras.forEach(function (words) {
      var line = { words: [], w: 0 };
      words.forEach(function (word) {
        var ww = 0, segs = word.segs.map(function (s) { var w = tw(ctx, s.text); ww += w; return { text: s.text, hl: s.hl, w: w }; });
        if (!nowrap && line.words.length && line.w + space + ww > maxW) { lines.push(line); line = { words: [], w: 0 }; }
        var x = line.words.length ? line.w + space : 0;
        line.words.push({ segs: segs, x: x, w: ww }); line.w = x + ww;
      });
      lines.push(line);
    });
    return lines;
  }
  function hasHl(line) { return line && line.words.some(function (w) { return w.segs.some(function (s) { return s.hl; }); }); }
  function baseOff(lh, size) { return ((lh - (ASC + DESC)) / 2 + ASC) * size; }

  /* ---------- themes and sizes ---------- */
  function theme(dark) {
    return dark
      ? { dark: true, head: C.white, label: C.peach, body: C.bodyOnSlate, accent: C.peach, muted: C.mutedOnSlate, tile: "rgba(255,255,255,0.12)", tileInk: C.peach }
      : { dark: false, head: C.slate, label: C.tealInk, body: C.body, accent: C.tealInk, muted: C.body, tile: "rgba(47,79,104,0.08)", tileInk: C.tealInk };
  }
  function metrics(sizeId) {
    var z = S.SIZES[sizeId] || S.SIZES.square, m = { id: z.id, W: z.w, H: z.h };
    if (z.id === "link") { m.k = 0.6; m.M = 64; m.top = 56; m.logoW = 210; m.logoB = 44; m.logoGap = 40; }
    else if (z.id === "story") { m.k = 1.12; m.M = 96; m.top = 250; m.logoW = 340; m.logoB = 240; m.logoGap = 110; }
    else if (z.id === "portrait") { m.k = 1.04; m.M = 96; m.top = 140; m.logoW = 340; m.logoB = 84; m.logoGap = 100; }
    else { m.k = 1; m.M = 96; m.top = 120; m.logoW = 340; m.logoB = 84; m.logoGap = 100; }
    m.link = z.id === "link";
    m.logoH = Math.round(m.logoW * logoRatio);
    m.logoY = m.H - m.logoB - m.logoH;
    m.bottom = m.logoY - m.logoGap;
    m.textW = m.W - 2 * m.M;
    return m;
  }

  /* ---------- blocks ----------
     text:   { type, key, text, weight, max, min, lh, track, color, hl, maxW, nowrap, bar, arrow, gap }
     button: { type, key, text, max, min, gap }
     list:   { type, key, items, max, min, gap, th }
     image:  { type, img, w, h, gap }  (scales with the fit factor) */
  function txt(key, text, o) {
    var b = { type: "text", key: key, text: text, weight: 600, lh: 1.08, track: B.tracking, hl: false, nowrap: false, gap: 0 };
    for (var k in o) b[k] = o[k];
    return b;
  }
  function measureText(ctx, b, size, maxW) {
    setFont(ctx, b.weight, size, b.track);
    var avail = maxW - (b.bar ? size * 2.56 : 0) - (b.arrow ? size * 1.15 : 0);
    var paras = tokenize(b.text, b.hl), lines = wrap(ctx, paras, avail, b.nowrap);
    /* headlines: balance the lines (like CSS text-wrap: balance) so a last word isn't left alone */
    if (b.balance && !b.nowrap && lines.length > 1 && lines.length <= 6) {
      var n = lines.length, lo = avail * 0.4, hi = avail;
      for (var it = 0; it < 9; it++) {
        var mid = (lo + hi) / 2, t = wrap(ctx, paras, mid, false);
        if (t.length <= n && !t.some(function (l) { return l.w > mid + 0.5; })) { hi = mid; lines = t; } else lo = mid;
      }
    }
    var widest = 0; lines.forEach(function (l) { if (l.w > widest) widest = l.w; });
    var lh = b.lh * size, h = lines.length * lh;
    if (b.hl && hasHl(lines[lines.length - 1])) h += Math.max(0, baseOff(b.lh, size) + (UL_TOP + UL_THICK) * size - lh);
    return { size: size, lines: lines, h: h, w: widest, avail: avail, tooWide: widest > avail + 0.5 };
  }
  function measureBlock(ctx, b, s, maxW) {
    var size;
    if (b.type === "image") { var w = b.w * Math.max(0.6, s); return { w: w, h: w * b.ratio, size: 0 }; }
    size = Math.max(b.min, b.max * s);
    if (b.type === "text") {
      var r = measureText(ctx, b, size, maxW);
      if (b.nowrap && r.tooWide && size > b.min) {
        size = Math.max(b.min, Math.floor(size * r.avail / r.w * 4) / 4);
        r = measureText(ctx, b, size, maxW);
      }
      return r;
    }
    if (b.type === "button") {
      var pad = size * 1.4, padY = size * 0.85, r2;
      var bt = { weight: 500, track: 0, text: b.text, lh: 1.2, nowrap: true };
      r2 = measureText(ctx, bt, size, maxW - 2 * pad);
      if (r2.tooWide && size > b.min) { size = Math.max(b.min, Math.floor(size * r2.avail / r2.w * 4) / 4); pad = size * 1.4; padY = size * 0.85; r2 = measureText(ctx, bt, size, maxW - 2 * pad); }
      r2.pad = pad; r2.padY = padY; r2.bh = size * 1.2 + 2 * padY; r2.h = r2.bh; r2.bw = r2.w + 2 * pad;
      return r2;
    }
    if (b.type === "list") {
      var tile = size * 84 / 62, tgap = size * 32 / 62, rgap = size * 30 / 62, rows = [], h = 0, tooWide = false;
      var it = { weight: 600, lh: 1.1, track: -0.025, hl: true };
      b.items.forEach(function (item, i) {
        it.text = item;
        var r = measureText(ctx, it, size, maxW - tile - tgap);
        var rh = Math.max(tile, r.h);
        rows.push({ r: r, h: rh }); h += rh + (i ? rgap : 0); if (r.tooWide) tooWide = true;
      });
      return { size: size, rows: rows, h: h, tile: tile, tgap: tgap, rgap: rgap, tooWide: tooWide, lines: rows.reduce(function (a, x) { return a + x.r.lines.length; }, 0) };
    }
    return { h: 0, size: 0 };
  }

  /* fit a stack of blocks into box {x, w, top, bottom}: shrink every text block in steps
     (never below its min) until the stack fits. Returns placed draw ops and a field report. */
  function fitStack(ctx, blocks, box, align, ops, report) {
    blocks = blocks.filter(function (b) { return b.type === "image" ? !!b.img : String(b.type === "list" ? b.items.join("") : b.text || "").replace(/[\s*]/g, "") !== ""; });
    var boxH = box.bottom - box.top, s = 1, res, total, ok, floorS = 0;
    blocks.forEach(function (b) { if (b.max) floorS = Math.max(floorS, b.min / b.max); });
    for (;;) {
      total = 0; ok = true;
      res = blocks.map(function (b, i) {
        var r = measureBlock(ctx, b, s, b.maxW || box.w);
        total += r.h + (i ? b.gap * Math.max(0.6, s) : 0);
        if (r.tooWide) ok = false;
        return r;
      });
      if (total <= boxH + 0.5 && ok) break;
      if (s <= floorS + 1e-6) break;
      s = Math.max(floorS, s - 0.03);
    }
    var fits = total <= boxH + 0.5;
    var y = !fits || align === "top" ? box.top : align === "center" ? box.top + (boxH - total) / 2 : box.bottom - total;
    var placedTop = y;
    blocks.forEach(function (b, i) {
      var r = res[i];
      if (i) y += b.gap * Math.max(0.6, s);
      placeBlock(b, r, box, y, ops, report);
      y += r.h;
    });
    return { top: placedTop, bottom: y, fits: fits, s: s };
  }
  function rep(report, key, size, min, lines, overflow) {
    if (!key || !report) return;
    var prev = report[key];
    report[key] = { fontSize: Math.round(size * 10) / 10, minFontSize: Math.round(min * 10) / 10, lines: lines, overflow: !!overflow || !!(prev && prev.overflow) };
  }
  function placeBlock(b, r, box, y, ops, report) {
    var bottom = box.bottom + 0.5;
    if (b.type === "image") {
      if (y + r.h <= bottom) ops.push({ op: "img", img: b.img, x: box.x, y: y, w: r.w, h: r.h });
      return;
    }
    if (b.type === "text") {
      var shown = placeTextLines(b, r, box.x, y, bottom, ops, box);
      rep(report, b.key, r.size, b.min, r.lines.length, shown < r.lines.length || r.tooWide);
      return;
    }
    if (b.type === "button") {
      var fitsB = y + r.bh <= bottom;
      if (fitsB) {
        ops.push({ op: "rrect", x: box.x, y: y, w: Math.min(r.bw, box.w), h: r.bh, r: Math.min(r.size, r.bh / 2), fill: C.orange });
        ops.push({ op: "text", weight: 500, size: r.size, track: 0, color: C.ink, clip: r.tooWide ? [box.x + r.pad, box.w - 2 * r.pad] : null,
          lines: [{ x: box.x + r.pad, y: y + r.padY + baseOff(1.2, r.size), line: r.lines[0] }] });
      }
      rep(report, b.key, r.size, b.min, 1, !fitsB || r.tooWide);
      return;
    }
    if (b.type === "list") {
      var ry = y, shownRows = 0, it = { weight: 600, lh: 1.1, track: -0.025, hl: true, color: b.th.head };
      r.rows.forEach(function (row, i) {
        if (i) ry += r.rgap;
        if (ry + row.h > bottom) { ry += row.h; return; }
        shownRows++;
        var ty = ry + (row.h - row.r.h) / 2, tileY = ry + (row.h - r.tile) / 2;
        ops.push({ op: "rrect", x: box.x, y: tileY, w: r.tile, h: r.tile, r: r.tile * 24 / 84, fill: b.th.tile });
        var ns = r.tile * 36 / 84;
        ops.push({ op: "text", weight: 600, size: ns, track: 0, color: b.th.tileInk, align: "center",
          lines: [{ x: box.x + r.tile / 2, y: tileY + r.tile / 2 + CAP * ns / 2, line: { words: [{ segs: [{ text: String(i + 1), hl: false, w: 0 }], x: 0, w: 0 }], w: 0 } }] });
        placeTextLines(it, row.r, box.x + r.tile + r.tgap, ty, bottom, ops, box);
        ry += row.h;
      });
      rep(report, b.key, r.size, b.min, r.lines, shownRows < r.rows.length || r.tooWide);
    }
  }
  function placeTextLines(b, r, x, y, bottom, ops, box) {
    var size = r.size, lh = b.lh * size, bo = baseOff(b.lh, size), out = [], xoff = b.bar ? size * 2.56 : 0;
    for (var i = 0; i < r.lines.length; i++) {
      var top = y + i * lh;
      if (top + lh > bottom && i > 0 || top + Math.min(lh, size * 1.0) > bottom) break;
      out.push({ x: x + xoff, y: top + bo, line: r.lines[i] });
    }
    if (!out.length) return 0;
    if (b.bar) ops.push({ op: "rrect", x: x, y: out[0].y - CAP * size / 2 - size * 0.11, w: size * 2, h: size * 0.22, r: size * 0.11, fill: C.orange });
    ops.push({ op: "text", weight: b.weight, size: size, track: b.track, color: b.color, hl: b.hl, lines: out,
      clip: r.tooWide ? [box.x, box.w] : null });
    if (b.arrow) {
      var last = out[out.length - 1], ax = last.x + last.line.w + size * 0.35, ay = last.y - size * 0.34;
      ops.push({ op: "arrow", x: ax, y: ay, len: size * 0.8, head: size * 0.26, lw: size * 0.085, color: b.color });
    }
    return out.length;
  }

  /* ---------- per-template planning ---------- */
  function eyebBlock(text, th, k, o) {
    return txt("eyeb", text, Object.assign({ weight: 600, max: 36 * k, min: Math.max(18, 26 * k), lh: 1.2, track: 0, color: th.label, nowrap: true, bar: true }, o || {}));
  }
  function minK(v, k, floor) { return Math.max(floor || 18, v * k); }

  function planQuote(f, m, th0, mode, ctx, ops, report, extra) {
    /* mode: "card" (full white card, light), "cardBottom" (card hugging content, photo), "plain" (slate) */
    var k = m.k, card = mode !== "plain", th = card ? theme(false) : th0;
    var I = m.link ? 32 : 64, P = m.link ? 60 : 86;
    /* stories: keep the card clear of the app's top bar and reply field */
    var IY = m.id === "story" ? 180 : I;
    var X = card ? I + P : m.M, W = m.W - 2 * X;
    var logoW = card ? (m.link ? 180 : 300) : m.logoW, logoH = Math.round(logoW * logoRatio);
    var logoY = card ? m.H - IY - (m.link ? 32 : 46) - logoH : m.logoY;
    var box = { x: X, w: W, top: card ? IY + P : m.top, bottom: logoY - (card ? (m.link ? 34 : 66) : m.logoGap) };
    var blocks = [
      { type: "image", img: imgs.quoteMark, w: 150 * k, ratio: quoteRatio, gap: 0 },
      txt("q", f.q, { weight: 500, max: (m.id === "story" ? 66 : 56) * k, min: minK(30, k, 20), lh: 1.35, track: -0.015, color: card ? C.slate : C.white, hl: true, gap: 44 * k }),
      txt("who", f.who, { weight: 600, max: 32 * k, min: minK(24, k), lh: 1.25, track: 0, color: card ? C.tealInk : C.peach, gap: 44 * k }),
      txt("role", f.role, { weight: 400, max: 30 * k, min: minK(22, k), lh: 1.3, track: 0, color: th.body, gap: 6 * k })
    ];
    var cardOp = null;
    if (card) { cardOp = { op: "rrect", x: I, y: I, w: m.W - 2 * I, h: m.H - 2 * I, r: m.link ? 32 : 48, fill: C.white }; ops.push(cardOp); cardOp.y = IY; cardOp.h = m.H - 2 * IY; }
    var placed = fitStack(ctx, blocks, box, mode === "cardBottom" ? "bottom" : "center", ops, report);
    if (mode === "cardBottom") { cardOp.y = Math.max(IY, placed.top - P); cardOp.h = m.H - IY - cardOp.y; }
    return { logo: { x: X, y: logoY, w: logoW, dark: !card && th.dark }, counterX: m.W - X, theme: th };
  }

  function planTemplate(post, ctx, ops, report) {
    var t = S.template(post.template), m = metrics(post.size), f = post.fields, k = m.k;
    var bgKind = post.bg === "photo" && post.photo && post.photo.src ? "photo" : (post.bg === "light" ? "light" : "slate");
    var th = theme(bgKind !== "light"), box = { x: m.M, w: m.textW, top: m.top, bottom: m.bottom };
    var out = { m: m, bg: { kind: bgKind, photo: post.photo }, logo: { x: m.M, y: m.logoY, w: m.logoW, dark: th.dark } };
    var blocks;
    switch (t.id) {
      case "stat":
        blocks = [eyebBlock(f.eyeb, th, k),
          txt("stat", f.stat, { max: (m.link ? 250 : 240) * k, min: 110 * k, lh: 1.0, track: -0.05, color: th.head, nowrap: true, gap: 30 * k }),
          txt("head", f.head, { balance: true, max: 64 * k, min: minK(36, k, 24), lh: 1.12, color: th.head, hl: true, gap: 22 * k, maxW: m.link ? 980 : undefined }),
          txt("source", f.source, { weight: 400, max: 26 * k, min: minK(20, k), lh: 1.3, track: 0, color: th.body, gap: 32 * k })];
        fitStack(ctx, blocks, box, "bottom", ops, report);
        break;
      case "quote":
        var r = planQuote(f, m, th, post.bg === "light" ? "card" : post.bg === "photo" ? "cardBottom" : "plain", ctx, ops, report);
        out.logo = r.logo;
        break;
      case "pillars":
        var items = String(f.items || "").split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.replace(/\*/g, ""); });
        blocks = [eyebBlock(f.eyeb, th, k), { type: "list", key: "items", items: items, max: 62 * Math.min(k, 1.04), min: minK(32, k, 22), gap: 56 * k, th: th, text: items.join("") }];
        fitStack(ctx, blocks, box, "bottom", ops, report);
        break;
      case "question":
        blocks = [eyebBlock(f.eyeb, th, k),
          txt("head", f.head, { balance: true, max: 112 * k, min: minK(52, k, 32), lh: 1.06, color: th.head, hl: true, gap: 36 * k }),
          txt("sub", f.sub, { weight: 400, max: 40 * k, min: minK(28, k, 20), lh: 1.35, track: 0, color: th.body, hl: true, gap: 40 * k, maxW: Math.min(m.textW, m.link ? 900 : 860) })];
        /* on a photo the overlay is darkest at the bottom, so the text sits there */
        fitStack(ctx, blocks, box, bgKind === "photo" ? "bottom" : "center", ops, report);
        break;
      case "cta":
        blocks = [eyebBlock(f.eyeb, th, k),
          txt("head", f.head, { balance: true, max: 92 * k, min: minK(48, k, 30), lh: 1.08, color: th.head, hl: true, gap: 36 * k }),
          txt("sub", f.sub, { weight: 400, max: 40 * k, min: minK(28, k, 20), lh: 1.35, track: 0, color: th.body, hl: true, gap: 36 * k, maxW: Math.min(m.textW, m.link ? 900 : 860) }),
          { type: "button", key: "cta", text: f.cta, max: 40 * k, min: minK(30, k, 22), gap: 52 * k }];
        fitStack(ctx, blocks, box, "bottom", ops, report);
        break;
    }
    return out;
  }

  function planSlide(post, idx, ctx, ops, report) {
    var m = metrics(post.size), k = m.k, n = post.slides.length || 1;
    idx = Math.max(0, Math.min(n - 1, idx | 0));
    var slide = post.slides[idx] || S.defaultSlide("text"), f = slide.fields, type = slide.type;
    var ph = slide.photo || S.emptyPhoto();
    var usePhoto = (type === "photo" || type === "cover") && ph.src;
    var bgKind = usePhoto ? "photo" : (type === "photo" ? "slate" : (post.bg === "light" ? "light" : "slate"));
    var th = theme(bgKind !== "light"), box = { x: m.M, w: m.textW, top: m.top, bottom: m.bottom };
    var out = { m: m, bg: { kind: bgKind, photo: ph }, logo: { x: m.M, y: m.logoY, w: m.logoW, dark: th.dark }, counter: { text: (idx + 1) + " / " + n, x: m.W - m.M, color: th.muted } };
    var blocks;
    switch (type) {
      case "cover":
        blocks = [eyebBlock(post.fields.eyeb, th, k, { key: null }),
          txt("head", f.head, { balance: true, max: 112 * k, min: minK(56, k, 32), lh: 1.06, color: th.head, hl: true, gap: 36 * k }),
          txt(null, "Swipe", { weight: 500, max: 40 * k, min: 30 * k, lh: 1.2, track: 0, color: th.accent, nowrap: true, arrow: true, gap: 44 * k })];
        fitStack(ctx, blocks, box, "bottom", ops, report);
        break;
      case "text":
        var num = 0; for (var i = 0; i <= idx; i++) if (post.slides[i] && post.slides[i].type === "text") num++;
        blocks = [txt(null, ("0" + num).slice(-2), { weight: 600, max: 40 * k, min: 30 * k, lh: 1.0, track: 0.02, color: th.accent, nowrap: true }),
          txt("head", f.head, { balance: true, max: 80 * k, min: minK(46, k, 30), lh: 1.08, color: th.head, hl: true, gap: 40 * k }),
          txt("body", f.body, { weight: 400, max: 44 * k, min: minK(28, k, 20), lh: 1.4, track: 0, color: th.body, hl: true, gap: 40 * k, maxW: Math.min(m.textW, 880) })];
        fitStack(ctx, blocks, box, "center", ops, report);
        break;
      case "stat":
        blocks = [txt("stat", f.stat, { max: 240 * k, min: 110 * k, lh: 1.0, track: -0.05, color: th.head, nowrap: true }),
          txt("head", f.head, { balance: true, max: 64 * k, min: minK(36, k, 24), lh: 1.12, color: th.head, hl: true, gap: 22 * k }),
          txt("source", f.source, { weight: 400, max: 26 * k, min: minK(20, k), lh: 1.3, track: 0, color: th.body, gap: 32 * k })];
        fitStack(ctx, blocks, box, "center", ops, report);
        break;
      case "quote":
        var r = planQuote(f, m, th, bgKind === "light" ? "card" : "plain", ctx, ops, report);
        out.logo = r.logo; out.counter.x = r.counterX; out.counter.color = r.theme.muted;
        break;
      case "photo":
        blocks = [txt("head", f.head, { balance: true, max: 80 * k, min: minK(46, k, 30), lh: 1.08, color: C.white, hl: true })];
        fitStack(ctx, blocks, box, "bottom", ops, report);
        break;
      case "end":
        blocks = [txt("head", f.head, { balance: true, max: 104 * k, min: minK(52, k, 32), lh: 1.06, color: th.head, hl: true }),
          { type: "button", key: "cta", text: f.cta, max: 40 * k, min: 30 * k, gap: 56 * k },
          txt("url", f.url, { weight: 400, max: 40 * k, min: 28 * k, lh: 1.3, track: 0, color: th.body, nowrap: true, gap: 48 * k })];
        fitStack(ctx, blocks, box, "center", ops, report);
        break;
    }
    return out;
  }

  function plan(post, slideIndex, ctx) {
    var p = S.normalizePost(post), t = S.template(p.template), ops = [], report = {};
    var info = t.carousel ? planSlide(p, slideIndex, ctx, ops, report) : planTemplate(p, ctx, ops, report);
    var overflow = Object.keys(report).some(function (key) { return report[key].overflow; });
    return { post: p, info: info, ops: ops, report: { overflow: overflow, fields: report } };
  }

  /* ---------- drawing ---------- */
  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  function drawCover(ctx, img, W, H, fx, fy, zoom) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; if (!iw || !ih) return;
    var sc = Math.max(W / iw, H / ih) * (zoom || 1), dw = iw * sc, dh = ih * sc;
    var dx = W / 2 - (fx == null ? 0.5 : fx) * dw, dy = H / 2 - (fy == null ? 0.5 : fy) * dh;
    dx = Math.min(0, Math.max(W - dw, dx)); dy = Math.min(0, Math.max(H - dh, dy));
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  function drawBg(ctx, bg, m, photoImg) {
    var W = m.W, H = m.H;
    if (bg.kind === "light") {
      ctx.fillStyle = C.light; ctx.fillRect(0, 0, W, H);
      var a = imgs.arrow[m.id]; if (a) drawCover(ctx, a, W, H, 0.5, 0.5, 1);
      return;
    }
    ctx.fillStyle = C.slate; ctx.fillRect(0, 0, W, H);
    if (bg.kind === "photo" && photoImg) {
      drawCover(ctx, photoImg, W, H, bg.photo.x, bg.photo.y, bg.photo.zoom);
      var g = ctx.createLinearGradient(0, 0, 0, H);
      B.photoOverlay.forEach(function (st) { g.addColorStop(st[0], st[1]); });
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }
  function drawOp(ctx, o) {
    if (o.op === "rrect") { ctx.fillStyle = o.fill; rrect(ctx, o.x, o.y, o.w, o.h, o.r); ctx.fill(); return; }
    if (o.op === "img") { ctx.drawImage(o.img, o.x, o.y, o.w, o.h); return; }
    if (o.op === "arrow") {
      ctx.save(); ctx.strokeStyle = o.color; ctx.lineWidth = o.lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.len, o.y);
      ctx.moveTo(o.x + o.len - o.head, o.y - o.head); ctx.lineTo(o.x + o.len, o.y); ctx.lineTo(o.x + o.len - o.head, o.y + o.head);
      ctx.stroke(); ctx.restore(); return;
    }
    if (o.op === "text") {
      ctx.save();
      if (o.clip) { ctx.beginPath(); ctx.rect(o.clip[0], -10000, o.clip[1], 20000); ctx.clip(); }
      setFont(ctx, o.weight, o.size, o.track);
      ctx.textBaseline = "alphabetic"; ctx.textAlign = o.align === "center" ? "center" : "left";
      var trackPx = hasLS ? (o.track || 0) * o.size : 0;
      if (o.hl) {
        ctx.fillStyle = C.orange;
        o.lines.forEach(function (L) {
          L.line.words.forEach(function (w) {
            var x = L.x + w.x;
            w.segs.forEach(function (sg) {
              /* measured width ends with one (negative) letter-space; add it back so the bar spans the glyphs */
              if (sg.hl) ctx.fillRect(x, L.y + UL_TOP * o.size, sg.w - trackPx, UL_THICK * o.size);
              x += sg.w;
            });
          });
        });
      }
      ctx.fillStyle = o.color;
      o.lines.forEach(function (L) {
        L.line.words.forEach(function (w) {
          var x = L.x + w.x;
          w.segs.forEach(function (sg) { ctx.fillText(sg.text, x, L.y); x += sg.w; });
        });
      });
      ctx.restore();
    }
  }
  function drawLogo(ctx, lg, scale) {
    var im = scaledLogo(lg.dark, lg.w * scale); if (!im) return;
    ctx.save(); ctx.imageSmoothingQuality = "high";
    ctx.drawImage(im, lg.x, lg.y, lg.w, lg.w * logoRatio); ctx.restore();
  }

  function slideFor(post, slideIndex) {
    var t = S.template(post && post.template);
    if (!t || !t.carousel || !post.slides || !post.slides.length) return null;
    return post.slides[Math.max(0, Math.min(post.slides.length - 1, slideIndex | 0))];
  }

  S.render = function (post, slideIndex, opts) {
    opts = opts || {};
    return S.preload().then(function () {
      var p = S.normalizePost(post), t = S.template(p.template), src = null;
      if (t.carousel) { var sl = slideFor(p, slideIndex); if (sl && (sl.type === "photo" || sl.type === "cover")) src = sl.photo && sl.photo.src; }
      else if (p.bg === "photo") src = p.photo && p.photo.src;
      return getPhoto(src).then(function (photoImg) {
        var scale = +opts.scale > 0 ? +opts.scale : 1;
        var canvas = opts.canvas || document.createElement("canvas"), ctx = canvas.getContext("2d");
        var pl = plan(p, slideIndex, ctx), m = pl.info.m;
        if (pl.info.bg.kind === "photo" && !photoImg) pl.info.bg.kind = "slate";
        canvas.width = Math.round(m.W * scale); canvas.height = Math.round(m.H * scale);
        ctx = canvas.getContext("2d");
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        drawBg(ctx, pl.info.bg, m, photoImg);
        pl.ops.forEach(function (o) { drawOp(ctx, o); });
        drawLogo(ctx, pl.info.logo, scale);
        var cn = pl.info.counter;
        if (cn) {
          var cs = 30 * m.k, lg = pl.info.logo, lh = lg.w * logoRatio;
          setFont(ctx, 500, cs, 0); ctx.fillStyle = cn.color; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
          ctx.fillText(cn.text, cn.x, lg.y + lh / 2 + CAP * cs / 2);
          ctx.textAlign = "left";
        }
        canvas.__gcoLayout = pl.report;
        return canvas;
      });
    });
  };

  S.layout = function (post, slideIndex) {
    return S.preload().then(function () { return plan(post, slideIndex, mctx()).report; });
  };
})();
