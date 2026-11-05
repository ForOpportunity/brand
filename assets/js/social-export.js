/* Georgia Center for Opportunity brand guide: social templates, export.
   Turns rendered posts into files: PNG, ZIP (stored), multi-page PDF (JPEG pages).
   Renders through S.render (social-render.js), one canvas at a time, released after encoding. */
(function () {
  "use strict";
  var S = window.GCOSocial = window.GCOSocial || {};

  /* ---------- canvas -> Blob ---------- */
  S.toBlob = function (canvas, type, quality) {
    type = type || "image/png";
    return new Promise(function (resolve, reject) {
      function fromDataURL() {
        try {
          var url = canvas.toDataURL(type, quality), bin = atob(url.split(",")[1]), u8 = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          resolve(new Blob([u8], { type: type }));
        } catch (e) { reject(e); }
      }
      if (canvas && canvas.toBlob) {
        try { canvas.toBlob(function (b) { if (b) resolve(b); else fromDataURL(); }, type, quality); }
        catch (e) { fromDataURL(); }
      } else fromDataURL();
    });
  };

  function blobBytes(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (resolve, reject) {
      var rd = new FileReader(); rd.onload = function () { resolve(new Uint8Array(rd.result)); }; rd.onerror = reject; rd.readAsArrayBuffer(blob);
    });
  }

  /* ---------- minimal zip writer (stored, no compression; PNGs are already compressed) ---------- */
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function le(v, n) { var a = new Uint8Array(n); for (var i = 0; i < n; i++) a[i] = (v >>> (8 * i)) & 255; return a; }

  S.makeZip = function (files) {
    var parts = [], central = [], offset = 0, enc = new TextEncoder(), d = new Date();
    var dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var dosDate = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = f.data, crc = crc32(data), size = data.length;
      /* version needed, flags (bit 11: UTF-8 names), method 0 (stored), time, date, crc, sizes, name length, extra length */
      var common = [le(20, 2), le(0x0800, 2), le(0, 2), le(dosTime, 2), le(dosDate, 2), le(crc, 4), le(size, 4), le(size, 4), le(name.length, 2), le(0, 2)];
      var local = [le(0x04034b50, 4)].concat(common, [name, data]);
      central.push([le(0x02014b50, 4), le(20, 2)].concat(common, [le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(offset, 4), name]));
      local.forEach(function (x) { parts.push(x); offset += x.length; });
    });
    var cdStart = offset, cdSize = 0;
    central.forEach(function (c) { c.forEach(function (x) { parts.push(x); cdSize += x.length; }); });
    parts.push(le(0x06054b50, 4), le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2), le(cdSize, 4), le(cdStart, 4), le(0, 2));
    return new Blob(parts, { type: "application/zip" });
  };

  /* ---------- minimal PDF writer: one JPEG per page, page size = image size (1px = 1pt) ---------- */
  S.makePDF = function (pages) {
    var enc = new TextEncoder(), parts = [], offsets = [], pos = 0, n = pages.length;
    function push(x) { var u = typeof x === "string" ? enc.encode(x) : x; parts.push(u); pos += u.length; }
    function num(v) { return String(Math.round(v * 100) / 100); }
    /* objects: 1 catalog, 2 page tree, then per page i: page 3+3i, content 4+3i, image 5+3i */
    var total = 2 + 3 * n;
    push("%PDF-1.4\n");
    push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])); /* binary marker comment */
    function obj(id, body) { offsets[id] = pos; push(id + " 0 obj\n"); body(); push("\nendobj\n"); }
    obj(1, function () { push("<< /Type /Catalog /Pages 2 0 R >>"); });
    var kids = []; for (var i = 0; i < n; i++) kids.push((3 + 3 * i) + " 0 R");
    obj(2, function () { push("<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + n + " >>"); });
    pages.forEach(function (p, i) {
      var pid = 3 + 3 * i, cid = pid + 1, iid = pid + 2, w = num(p.w), h = num(p.h);
      var content = "q\n" + w + " 0 0 " + h + " 0 0 cm\n/Im0 Do\nQ\n";
      obj(pid, function () {
        push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + w + " " + h + "] /Resources << /XObject << /Im0 " + iid + " 0 R >> /ProcSet [/PDF /ImageC] >> /Contents " + cid + " 0 R >>");
      });
      obj(cid, function () { push("<< /Length " + enc.encode(content).length + " >>\nstream\n" + content + "endstream"); });
      obj(iid, function () {
        push("<< /Type /XObject /Subtype /Image /Width " + Math.round(p.w) + " /Height " + Math.round(p.h) +
          " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + p.jpeg.length + " >>\nstream\n");
        push(p.jpeg); push("\nendstream");
      });
    });
    var xref = pos, lines = ["xref\n0 " + (total + 1) + "\n", "0000000000 65535 f \n"];
    for (var k = 1; k <= total; k++) lines.push(("0000000000" + offsets[k]).slice(-10) + " 00000 n \n");
    push(lines.join(""));
    push("trailer\n<< /Size " + (total + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    return new Blob(parts, { type: "application/pdf" });
  };

  /* ---------- download ---------- */
  S.saveBlob = function (blob, filename) {
    if (window.navigator && window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(blob, filename); return; }
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 30000);
  };

  /* ---------- export a post ---------- */
  function pad(v) { return ("0" + v).slice(-2); }
  function stamp() { var d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()); }
  function base(post, size, st) { return "gco-" + post.template + "-" + size + "-" + st; }

  /* render one image and encode it; the canvas is released (sized to 0) right after encoding */
  function renderEncode(post, idx, type, quality) {
    return Promise.resolve(S.render(post, idx, { scale: 1 })).then(function (canvas) {
      var w = canvas.width, h = canvas.height;
      if (type === "image/jpeg") {
        /* JPEG has no alpha: put white under any transparent pixels instead of black */
        var ctx = canvas.getContext("2d");
        ctx.save(); ctx.globalCompositeOperation = "destination-over"; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, w, h); ctx.restore();
      }
      return S.toBlob(canvas, type, quality).then(function (blob) {
        canvas.width = 0; canvas.height = 0;
        return blobBytes(blob).then(function (bytes) { return { bytes: bytes, blob: blob, w: w, h: h }; });
      }, function (e) { canvas.width = 0; canvas.height = 0; throw e; });
    });
  }

  S.exportPost = function (post, mode, onProgress, opts) {
    opts = opts || {};
    var progress = typeof onProgress === "function" ? onProgress : function () {};
    if (typeof S.render !== "function") return Promise.reject(new Error("The renderer isn't loaded yet."));
    var p = S.normalizePost(S.clone(post)), t = S.template(p.template), carousel = !!t.carousel;
    var count = S.slideCount(p), st = stamp(), jobs = [];
    var label = function (j) { return carousel ? "Slide " + (j.idx + 1) + " of " + count + (mode === "sizes" ? " (" + S.SIZES[j.post.size].label + ")" : "") : S.SIZES[j.post.size].label; };

    if (mode === "png") {
      var slide = carousel ? Math.min(count - 1, Math.max(0, (opts.slide | 0))) : 0;
      jobs.push({ post: p, idx: slide, name: base(p, p.size, st) + (carousel ? "-" + pad(slide + 1) : "") + ".png" });
    } else if (mode === "slides" || mode === "pdf") {
      for (var i = 0; i < count; i++) jobs.push({ post: p, idx: i, name: base(p, p.size, st) + (carousel ? "-" + pad(i + 1) : "") + ".png" });
    } else if (mode === "sizes") {
      t.sizes.forEach(function (size) {
        var copy = S.clone(p); copy.size = size; copy = S.normalizePost(copy);
        for (var k = 0; k < count; k++) jobs.push({ post: copy, idx: k,
          name: (carousel ? size + "/" : "") + base(copy, size, st) + (carousel ? "-" + pad(k + 1) : "") + ".png" });
      });
    } else return Promise.reject(new Error("Unknown export mode: " + mode));

    var type = mode === "pdf" ? "image/jpeg" : "image/png", quality = mode === "pdf" ? 0.92 : undefined;
    var results = [], total = jobs.length, chain = Promise.resolve();
    jobs.forEach(function (j, n) {
      chain = chain.then(function () {
        progress(n, total, label(j));
        return renderEncode(j.post, j.idx, type, quality);
      }).then(function (r) {
        /* keep only bytes (or the single blob) so each canvas can be collected */
        results.push(mode === "png" ? r : { name: j.name, data: r.bytes, w: r.w, h: r.h });
        progress(n + 1, total, label(j));
      });
    });

    return chain.then(function () {
      if (mode === "png") return { blob: results[0].blob, filename: jobs[0].name };
      if (mode === "pdf") return { blob: S.makePDF(results.map(function (r) { return { jpeg: r.data, w: r.w, h: r.h }; })), filename: base(p, p.size, st) + ".pdf" };
      var zipName = mode === "sizes" ? base(p, "all-sizes", st) + ".zip" : base(p, p.size, st) + ".zip";
      return { blob: S.makeZip(results), filename: zipName };
    });
  };
})();
