/* Georgia Center for Opportunity brand guide: social templates editor (v2).
   Builds the editor inside #sx from window.GCOSocial. Every other social-*.js module is optional:
   each feature checks for the functions it needs and hides itself when they're missing. */
(function () {
  "use strict";
  var S = window.GCOSocial, root = document.getElementById("sx");
  if (!S || !S.TEMPLATES || !root) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var has = function (name) { return typeof S[name] === "function"; };
  var MAX_SLIDES = S.MAX_SLIDES || 10;
  var SEV = [["error", "Fix before posting", "Fix"], ["warn", "Check these", "Check"], ["tip", "Tips", "Tip"]];

  /* ---------- small DOM helper ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  var ICON = {
    up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5"/></svg>',
    del: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/></svg>'
  };

  /* ---------- state: one post per template, so switching tabs keeps your edits ---------- */
  var posts = {}, slideOf = {}, cur = S.TEMPLATES[0].id;
  S.TEMPLATES.forEach(function (t) { posts[t.id] = S.defaultPost(t.id); slideOf[t.id] = 0; });
  function post() { return posts[cur]; }
  function tpl() { return S.template(cur); }
  function isCarousel() { return !!tpl().carousel; }
  function curSlide() { var n = post().slides.length; if (slideOf[cur] > n - 1) slideOf[cur] = Math.max(0, n - 1); return isCarousel() ? slideOf[cur] : 0; }
  function sizeOf(p) { return S.SIZES[p.size] || S.SIZES.square; }

  /* ---------- elements from the section markup ---------- */
  var tabs = $("#sx-tabs"), frame = $("#sx-frame"), canvas = $("#sx-canvas"), ctx = canvas.getContext("2d");
  var nav = $("#sx-slide-nav"), navN = $("#sx-slide-n"), prevB = $("#sx-prev"), nextB = $("#sx-next");
  var dragHint = $("#sx-drag-hint"), statusEl = $("#sx-status"), issuesEl = $("#sx-issues"), checksSum = $("#sx-checks-sum");
  var formatEl = $("#sx-format"), photoEl = $("#sx-photo"), textEl = $("#sx-text"), slidesEl = $("#sx-slides");
  var dlMain = $("#sx-dl-main"), dlMore = $("#sx-dl-more"), copyCap = $("#sx-copy-caption"), copyAlt = $("#sx-copy-alt");
  var moreEl = $("#sx-more");

  /* ---------- status, toast, clipboard ---------- */
  var toastT;
  function toast(msg) { var t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 1600); }
  function status(msg) { statusEl.textContent = msg || ""; }
  function copyText(text, label) {
    function ok() { toast(label + " copied"); }
    function fallback() {
      var ta = el("textarea", { readonly: true, style: "position:fixed;opacity:0;left:0;top:0" }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("Select the text and copy it manually"); }
      document.body.removeChild(ta);
    }
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  }
  /* inline "Undo" bar shown in a host element until the next change there */
  function offerUndo(host, msg, restore) {
    var old = host.querySelector(".sx-undo"); if (old) old.remove();
    var bar = el("div", { class: "sx-undo", role: "status" }, [el("span", { text: msg }), el("button", { type: "button", class: "sx-link", text: "Undo", onclick: function () { bar.remove(); restore(); } })]);
    host.insertBefore(bar, host.firstChild);
  }

  /* ---------- template tabs ---------- */
  S.TEMPLATES.forEach(function (t) {
    tabs.appendChild(el("button", { type: "button", "aria-pressed": t.id === cur ? "true" : "false", "data-tpl": t.id, text: t.label, onclick: function () { if (cur !== t.id) { cur = t.id; buildAll(); } } }));
  });
  function pressTabs() { Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-tpl") === cur ? "true" : "false"); }); }

  /* ---------- segmented control (sizes, backgrounds) ---------- */
  function seg(label, id, options, value, onPick) {
    var group = el("div", { class: "tabs sx-seg", role: "group", "aria-labelledby": id });
    options.forEach(function (o) {
      group.appendChild(el("button", { type: "button", "aria-pressed": o.id === value ? "true" : "false", onclick: function () {
        Array.prototype.forEach.call(group.children, function (b) { b.setAttribute("aria-pressed", b === this ? "true" : "false"); }, this); onPick(o.id); } },
        [el("span", { text: o.label }), o.note ? el("small", { text: o.note }) : null]));
    });
    return el("div", { class: "sx-ctl" }, [el("span", { class: "sx-ctl-label", id: id, text: label }), group]);
  }

  /* ---------- Format: size, background, program preset ---------- */
  function buildFormat() {
    var t = tpl(), p = post(); formatEl.innerHTML = "";
    if (t.sizes.length > 1) formatEl.appendChild(seg("Size", "sx-size-l", t.sizes.map(function (k) { var z = S.SIZES[k]; return { id: k, label: z.label, note: z.use }; }), p.size, function (v) {
      post().size = v; dirtyAllThumbs(); sizeThumbs(); schedule(0);
    }));
    var bgs = t.backgrounds.filter(function (b) { return b !== "photo" || t.photo; });
    if (bgs.length > 1) formatEl.appendChild(seg("Background", "sx-bg-l", bgs.map(function (k) { return { id: k, label: (S.BACKGROUNDS[k] || { label: k }).label }; }), p.bg, function (v) {
      post().bg = v; buildPhoto(); dirtyAllThumbs(); schedule(0);
    }));
    if (S.PRESETS && (has("applyPreset") || Object.keys(S.PRESETS).length)) {
      var sel = el("select", { id: "sx-preset" }, [el("option", { value: "", text: "None" })]);
      Object.keys(S.PRESETS).forEach(function (k) { sel.appendChild(el("option", { value: k, text: S.PRESETS[k].label || k })); });
      sel.value = p.preset && S.PRESETS[p.preset] ? p.preset : "";
      sel.addEventListener("change", function () {
        var id = sel.value; if (!id) return;
        var before = S.clone(post()), next;
        try { next = has("applyPreset") ? S.applyPreset(post(), id) : S.PRESETS[id].apply(post()); } catch (e) { next = null; }
        if (!next) { sel.value = before.preset || ""; status("That preset couldn't be applied."); return; }
        posts[cur] = S.normalizePost(next); posts[cur].preset = id;
        buildText(); buildSlides(); dirtyAllThumbs(); schedule(0);
        status((S.PRESETS[id].label || id) + " preset applied.");
        offerUndo(textEl, (S.PRESETS[id].label || id) + " preset applied.", function () { posts[cur] = before; buildAll(); });
      });
      formatEl.appendChild(el("div", { class: "sx-ctl" }, [el("label", { class: "sx-ctl-label", for: "sx-preset", text: "Program preset" }), sel,
        el("p", { class: "xs sx-hint", text: "Fills in the label and approved program copy." })]));
    }
    formatEl.hidden = !formatEl.children.length;
  }

  /* ---------- photos ---------- */
  function shrinkLocal(dataURL) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
        if (k >= 1 && dataURL.length < 2.5e6) return resolve(dataURL);
        var c = el("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL("image/jpeg", 0.85)); } catch (e) { resolve(dataURL); }
      };
      im.onerror = function () { resolve(null); };
      im.src = dataURL;
    });
  }
  function readPhoto(file) {
    return new Promise(function (resolve) {
      if (!file || !/^image\//.test(file.type)) return resolve(null);
      var rd = new FileReader();
      rd.onload = function () { var d = rd.result; (has("shrinkPhoto") ? S.shrinkPhoto(d) : shrinkLocal(d)).then(resolve, function () { shrinkLocal(d).then(resolve); }); };
      rd.onerror = function () { resolve(null); };
      rd.readAsDataURL(file);
    });
  }
  /* photo controls for one photo object (post.photo or a slide's photo); get() returns the live object */
  function photoControls(prefix, get, intro) {
    var box = el("div", { class: "sx-photo-ctl" });
    function draw() {
      var ph = get(); box.innerHTML = "";
      var file = el("input", { type: "file", accept: "image/*", hidden: true, tabindex: "-1", "aria-hidden": "true" });
      file.addEventListener("change", function () {
        var f = file.files && file.files[0]; file.value = ""; if (!f) return;
        status("Adding photo…");
        readPhoto(f).then(function (src) {
          if (!src) { status("That file isn't an image we can use. Try a JPG or PNG."); return; }
          var o = get(); o.src = src; o.x = 0.5; o.y = 0.5; o.zoom = 1;
          draw(); dirtyThumb(); schedule(0); status("Photo added. Drag the preview to move it.");
        });
      });
      var row = el("div", { class: "row" }, [file,
        el("button", { type: "button", class: "btn btn-secondary btn-sm", id: prefix + "-add", text: ph.src ? "Replace photo" : "Add photo", onclick: function () { file.click(); } }),
        ph.src ? el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Remove photo", onclick: function () {
          var o = get(); o.src = null; draw(); dirtyThumb(); schedule(0); status("Photo removed."); var b = $("#" + prefix + "-add"); if (b) b.focus();
        } }) : null]);
      if (!ph.src) { if (intro) box.appendChild(el("p", { class: "xs sx-hint", text: intro })); box.appendChild(row); return; }
      var zid = prefix + "-zoom", out = el("output", { for: zid, text: Math.round(ph.zoom * 100) + "%" });
      var zoom = el("input", { type: "range", id: zid, min: "1", max: "3", step: "0.05", value: String(ph.zoom) });
      zoom.addEventListener("input", function () { var o = get(); o.zoom = +zoom.value; out.textContent = Math.round(o.zoom * 100) + "%"; schedule(30, true); });
      zoom.addEventListener("change", function () { dirtyThumb(); schedule(0); });
      box.appendChild(row);
      box.appendChild(el("div", { class: "sx-zoom" }, [el("label", { for: zid, text: "Zoom" }), zoom, out,
        el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Center", onclick: function () {
          var o = get(); o.x = 0.5; o.y = 0.5; o.zoom = 1; zoom.value = "1"; out.textContent = "100%"; dirtyThumb(); schedule(0); status("Photo centered.");
        } })]));
      box.appendChild(el("p", { class: "xs sx-hint", text: "Drag the preview to move the photo, or focus the preview and use the arrow keys." }));
      box._zoom = zoom; box._out = out;
    }
    box.refresh = draw; draw();
    return box;
  }
  var tplPhotoBox = null;
  function buildPhoto() {
    var t = tpl(), p = post(); photoEl.innerHTML = ""; tplPhotoBox = null;
    var show = !t.carousel && t.photo && p.bg === "photo";
    photoEl.hidden = !show;
    if (!show) return;
    tplPhotoBox = photoControls("sx-ph", function () { return post().photo; }, "Use a real photo of Georgians, with signed releases. A slate gradient keeps the text readable.");
    photoEl.appendChild(el("h3", { class: "sx-legend", text: "Photo" }));
    photoEl.appendChild(tplPhotoBox);
  }

  /* ---------- fields ---------- */
  function fid(slide, key) { return slide == null ? "sx-f-" + key : "sx-s" + slide + "-" + key; }
  function countText(fd, v) {
    if (!fd.max) return "";
    if (fd.kind === "lines") { var longest = 0; String(v).split("\n").forEach(function (l) { longest = Math.max(longest, l.length); }); return "Longest line " + longest + "/" + fd.max; }
    return String(v).length + "/" + fd.max;
  }
  function overMax(fd, v) {
    if (!fd.max) return false;
    return fd.kind === "lines" ? String(v).split("\n").some(function (l) { return l.length > fd.max; }) : String(v).length > fd.max;
  }
  function fieldControl(fd, obj, slide) {
    var id = fid(slide, fd.key), v = obj[fd.key] == null ? "" : obj[fd.key];
    var multi = fd.kind !== "input";
    var inp = el(multi ? "textarea" : "input", { id: id, "data-key": fd.key, "data-slide": slide == null ? null : String(slide), rows: multi ? (fd.kind === "lines" ? "5" : "3") : null, type: multi ? null : "text", spellcheck: "true" });
    inp.value = v;
    var described = [], kids = [];
    var count = fd.max ? el("span", { class: "sx-count", id: id + "-count", "aria-hidden": "true", text: countText(fd, v) }) : null;
    var top = el("div", { class: "sx-field-top" }, [el("label", { for: id, text: fd.label + (fd.required ? " (required)" : "") }), count]);
    kids.push(top, inp);
    if (fd.hint) { kids.push(el("p", { class: "xs sx-hint", id: id + "-hint", text: fd.hint })); described.push(id + "-hint"); }
    if (fd.max) { kids.push(el("span", { class: "sx-sr", id: id + "-limit", text: "Up to " + fd.max + " characters" + (fd.kind === "lines" ? " per line." : ".") })); described.push(id + "-limit"); }
    kids.push(el("p", { class: "xs sx-field-issue", id: id + "-issue", hidden: true })); described.push(id + "-issue");
    inp.setAttribute("aria-describedby", described.join(" "));
    if (count) count.classList.toggle("over", overMax(fd, v));
    inp.addEventListener("input", function () {
      obj[fd.key] = inp.value;
      if (count) { count.textContent = countText(fd, inp.value); count.classList.toggle("over", overMax(fd, inp.value)); }
      if (slide == null && isCarousel()) dirtyAllThumbs(); else dirtyThumb(slide);
      schedule();
    });
    return el("div", { class: "sx-field" }, kids);
  }
  function buildText() {
    var t = tpl(), p = post(); textEl.innerHTML = "";
    textEl.appendChild(el("h3", { class: "sx-legend", text: t.carousel ? "Series" : "Text" }));
    var anyHl = t.fields.some(function (fd) { return fd.hl; }) || t.carousel;
    t.fields.forEach(function (fd) { textEl.appendChild(fieldControl(fd, p.fields, null)); });
    if (anyHl && !t.carousel) textEl.appendChild(el("p", { class: "xs sx-tip", html: "Wrap words in <code>*asterisks*</code> to underline them in orange. Press Enter for a new line." }));
    textEl.appendChild(el("div", { class: "row" }, [el("button", { type: "button", class: "sx-link", text: t.carousel ? "Reset all slides to the example" : "Reset text to the example", onclick: resetText })]));
  }
  function resetText() {
    var before = S.clone(post()), d = S.defaultPost(cur), p = post();
    p.fields = d.fields; p.preset = null;
    if (isCarousel()) { p.slides = d.slides; slideOf[cur] = 0; }
    buildFormat(); buildText(); buildSlides(); dirtyAllThumbs(); schedule(0);
    status("Text reset.");
    offerUndo(textEl, "Text reset to the example.", function () { posts[cur] = before; buildAll(); });
  }

  /* ---------- carousel slides ---------- */
  var thumbDirty = {}, thumbBusy = false;
  function dirtyThumb(i) { if (isCarousel()) thumbDirty[i == null ? curSlide() : i] = true; }
  function dirtyAllThumbs() { if (isCarousel()) post().slides.forEach(function (s, i) { thumbDirty[i] = true; }); }
  function sizeThumbs() {
    var z = sizeOf(post());
    Array.prototype.forEach.call(slidesEl.querySelectorAll("canvas.sx-thumb"), function (c) { c.width = Math.round(z.w / 8); c.height = Math.round(z.h / 8); });
  }
  function paintThumb(i, src) {
    var c = slidesEl.querySelector('.sx-slide[data-i="' + i + '"] canvas.sx-thumb'); if (!c || !src) return;
    var g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
    try { g.drawImage(src, 0, 0, c.width, c.height); } catch (e) { /* ignore */ }
  }
  function processThumbs() {
    if (thumbBusy || !isCarousel() || !has("render")) return;
    var keys = Object.keys(thumbDirty).filter(function (k) { return thumbDirty[k]; });
    if (!keys.length) return;
    var i = +keys[0], tplAt = cur; delete thumbDirty[i];
    if (i >= post().slides.length) return processThumbs();
    thumbBusy = true;
    Promise.resolve().then(function () { return S.render(S.clone(post()), i, { scale: 0.25 }); }).then(function (c) {
      thumbBusy = false; if (tplAt === cur) paintThumb(i, c); setTimeout(processThumbs, 30);
    }, function () { thumbBusy = false; setTimeout(processThumbs, 30); });
  }
  function selectSlide(i, opts) {
    opts = opts || {};
    var n = post().slides.length; i = Math.max(0, Math.min(n - 1, i));
    var changed = slideOf[cur] !== i; slideOf[cur] = i;
    Array.prototype.forEach.call(slidesEl.querySelectorAll(".sx-slide"), function (li) {
      var on = +li.getAttribute("data-i") === i; li.classList.toggle("is-current", on);
      var pick = li.querySelector(".sx-slide-pick"); if (pick) pick.setAttribute("aria-pressed", on ? "true" : "false");
    });
    updateNav();
    if (changed) schedule(0);
    if (opts.scroll) { var li = slidesEl.querySelector('.sx-slide[data-i="' + i + '"]'); if (li && li.scrollIntoView) li.scrollIntoView({ block: "nearest" }); }
  }
  function moveSlide(i, d) {
    var sl = post().slides, j = i + d; if (j < 0 || j >= sl.length) return;
    var tmp = sl[i]; sl[i] = sl[j]; sl[j] = tmp; slideOf[cur] = j;
    buildSlides(); dirtyAllThumbs(); schedule(0);
    var b = slidesEl.querySelector('.sx-slide[data-i="' + j + '"] [data-act="' + (d < 0 ? "up" : "down") + '"]');
    if (b && !b.disabled) b.focus(); else { b = slidesEl.querySelector('.sx-slide[data-i="' + j + '"] .sx-slide-pick'); if (b) b.focus(); }
    status("Moved to slide " + (j + 1) + " of " + sl.length + ".");
  }
  function deleteSlide(i) {
    var sl = post().slides; if (sl.length <= 1) return;
    var removed = sl.splice(i, 1)[0], tplAt = cur;
    slideOf[cur] = Math.min(i, sl.length - 1);
    buildSlides(); dirtyAllThumbs(); schedule(0);
    var label = (S.SLIDE_TYPES[removed.type] || { label: "Slide" }).label;
    status(label + " slide deleted.");
    offerUndo(slidesEl.querySelector(".sx-slide-list-wrap"), label + " slide " + (i + 1) + " deleted.", function () {
      if (cur !== tplAt) return;
      post().slides.splice(i, 0, removed); slideOf[cur] = i; buildSlides(); dirtyAllThumbs(); schedule(0);
      var b = slidesEl.querySelector('.sx-slide[data-i="' + i + '"] .sx-slide-pick'); if (b) b.focus();
    });
    var nb = slidesEl.querySelector('.sx-slide[data-i="' + slideOf[cur] + '"] .sx-slide-pick'); if (nb) nb.focus();
  }
  function addSlide(type) {
    var sl = post().slides; if (sl.length >= MAX_SLIDES) return;
    var at = curSlide() + 1;
    if (sl[at - 1] && sl[at - 1].type === "end" && at - 1 === sl.length - 1) at = sl.length - 1; /* keep the closing slide last */
    sl.splice(at, 0, S.defaultSlide(type)); slideOf[cur] = at;
    buildSlides(); dirtyAllThumbs(); schedule(0);
    var first = slidesEl.querySelector('.sx-slide[data-i="' + at + '"] input, .sx-slide[data-i="' + at + '"] textarea') || slidesEl.querySelector('.sx-slide[data-i="' + at + '"] .sx-slide-pick');
    if (first) first.focus();
    status((S.SLIDE_TYPES[type] || { label: "New" }).label + " slide added as slide " + (at + 1) + ".");
  }
  function buildSlides() {
    slidesEl.innerHTML = "";
    if (!isCarousel()) { slidesEl.hidden = true; return; }
    slidesEl.hidden = false;
    var p = post(), n = p.slides.length, z = sizeOf(p), sel = curSlide();
    slidesEl.appendChild(el("h3", { class: "sx-legend", text: "Slides" }));
    slidesEl.appendChild(el("p", { class: "xs sx-tip", html: "Click into a slide to preview it. Wrap words in <code>*asterisks*</code> to underline them in orange." }));
    var wrap = el("div", { class: "sx-slide-list-wrap" }), list = el("ol", { class: "sx-slides", id: "sx-slide-list" });
    p.slides.forEach(function (s, i) {
      var type = S.SLIDE_TYPES[s.type] || S.SLIDE_TYPES.text;
      var thumb = el("canvas", { class: "sx-thumb", width: String(Math.round(z.w / 8)), height: String(Math.round(z.h / 8)), "aria-hidden": "true" });
      var pick = el("button", { type: "button", class: "sx-slide-pick", "aria-pressed": i === sel ? "true" : "false", onclick: function () { selectSlide(i); } },
        [thumb, el("span", { class: "sx-slide-name" }, [el("b", { text: "Slide " + (i + 1) }), el("span", { text: type.label })])]);
      pick.setAttribute("aria-label", "Slide " + (i + 1) + " of " + n + ", " + type.label + ". Show in preview");
      var tools = el("div", { class: "sx-slide-tools" }, [
        el("button", { type: "button", class: "sx-icon", "data-act": "up", html: ICON.up, "aria-label": "Move slide " + (i + 1) + " up", disabled: i === 0, onclick: function () { moveSlide(i, -1); } }),
        el("button", { type: "button", class: "sx-icon", "data-act": "down", html: ICON.down, "aria-label": "Move slide " + (i + 1) + " down", disabled: i === n - 1, onclick: function () { moveSlide(i, 1); } }),
        el("button", { type: "button", class: "sx-icon sx-icon-del", "data-act": "del", html: ICON.del, "aria-label": "Delete slide " + (i + 1), disabled: n <= 1, onclick: function () { deleteSlide(i); } })
      ]);
      var body = el("div", { class: "sx-slide-body" });
      type.fields.forEach(function (fd) { body.appendChild(fieldControl(fd, s.fields, i)); });
      if (type.photo) {
        var ph = photoControls("sx-s" + i + "-ph", function () { var x = post().slides[i]; if (!x.photo) x.photo = S.emptyPhoto(); return x.photo; },
          s.type === "photo" ? "Add a photo for this slide. Without one, the slide uses the background." : "Optional: add a photo behind the cover.");
        ph.setAttribute("data-photo-slide", String(i));
        body.appendChild(ph);
      }
      var li = el("li", { class: "sx-slide" + (i === sel ? " is-current" : ""), "data-i": String(i) }, [el("div", { class: "sx-slide-head" }, [pick, tools]), body]);
      li.addEventListener("focusin", function (e) { if (!e.target.closest(".sx-slide-tools")) selectSlide(i); });
      list.appendChild(li);
    });
    wrap.appendChild(list);
    slidesEl.appendChild(wrap);
    var full = n >= MAX_SLIDES, typeSel = el("select", { id: "sx-add-type", disabled: full });
    Object.keys(S.SLIDE_TYPES).forEach(function (k) { typeSel.appendChild(el("option", { value: k, text: S.SLIDE_TYPES[k].label })); });
    typeSel.value = "text";
    slidesEl.appendChild(el("div", { class: "sx-add" }, [
      el("label", { for: "sx-add-type", text: "New slide type" }),
      el("div", { class: "row" }, [typeSel, el("button", { type: "button", class: "btn btn-secondary btn-sm", id: "sx-add-slide", disabled: full, text: "Add slide", onclick: function () { addSlide(typeSel.value); } })]),
      el("p", { class: "xs sx-hint", text: full ? "A carousel can have up to " + MAX_SLIDES + " slides. Delete one to add another." : n + " of up to " + MAX_SLIDES + " slides. New slides go after the one you're editing." })
    ]));
    updateNav();
  }
  function updateNav() {
    if (!isCarousel()) { nav.hidden = true; return; }
    var n = post().slides.length, i = curSlide();
    nav.hidden = false; navN.textContent = "Slide " + (i + 1) + " of " + n;
    prevB.disabled = i === 0; nextB.disabled = i >= n - 1;
  }
  prevB.addEventListener("click", function () { selectSlide(curSlide() - 1, { scroll: true }); if (prevB.disabled) nextB.focus(); });
  nextB.addEventListener("click", function () { selectSlide(curSlide() + 1, { scroll: true }); if (nextB.disabled) prevB.focus(); });

  /* ---------- preview ---------- */
  var renderSeq = 0, timer, quickTimer, lastAlt = "";
  function schedule(delay, previewOnly) {
    if (previewOnly) { clearTimeout(quickTimer); quickTimer = setTimeout(renderPreview, delay || 0); return; }
    clearTimeout(timer); timer = setTimeout(update, delay == null ? 120 : delay);
  }
  function update() { renderPreview(); runChecks(); updateAlt(); updateDrag(); }
  function renderPreview() {
    if (!has("render")) { frame.classList.add("is-off"); return; }
    var seq = ++renderSeq, i = curSlide(), tplAt = cur;
    frame.classList.add("is-busy");
    Promise.resolve().then(function () { return S.render(S.clone(post()), i, {}); }).then(function (c) {
      if (seq !== renderSeq) return;
      frame.classList.remove("is-busy", "is-error");
      if (canvas.width !== c.width) canvas.width = c.width;
      if (canvas.height !== c.height) canvas.height = c.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(c, 0, 0);
      frame.style.setProperty("--ar", c.width + " / " + c.height);
      if (tplAt === cur && isCarousel()) { paintThumb(i, c); delete thumbDirty[i]; processThumbs(); }
    }, function (e) {
      if (seq !== renderSeq) return;
      frame.classList.remove("is-busy"); frame.classList.add("is-error");
      if (window.console) console.warn("Social preview failed", e);
    });
  }
  function fallbackAlt(p) {
    var words = [];
    S.template(p.template).fields.forEach(function (fd) { if (p.fields[fd.key]) words.push(S.plain(p.fields[fd.key])); });
    (p.slides || []).forEach(function (s) { Object.keys(s.fields).forEach(function (k) { if (s.fields[k]) words.push(S.plain(s.fields[k])); }); });
    return "Graphic that reads: " + words.join(". ") + ". Georgia Center for Opportunity logo.";
  }
  function altFor(p) { if (has("altText")) { try { return S.altText(p); } catch (e) { /* fall through */ } } return fallbackAlt(p); }
  function updateAlt() {
    var a = altFor(post()), t = tpl(), lbl = "Preview of the " + t.label.toLowerCase() + " post" + (isCarousel() ? ", slide " + (curSlide() + 1) + " of " + post().slides.length : "") + ". " + a;
    if (lbl !== lastAlt) { canvas.setAttribute("aria-label", lbl); lastAlt = lbl; }
  }

  /* ---------- drag and keys to move the photo ---------- */
  var imgCache = { src: null, img: null };
  function activePhoto() {
    var t = tpl(), p = post();
    if (t.carousel) { var s = p.slides[curSlide()]; return s && (S.SLIDE_TYPES[s.type] || {}).photo && s.photo && s.photo.src ? s.photo : null; }
    return t.photo && p.bg === "photo" && p.photo.src ? p.photo : null;
  }
  function photoBoxFor() { return isCarousel() ? slidesEl.querySelector('[data-photo-slide="' + curSlide() + '"]') : tplPhotoBox; }
  function updateDrag() {
    var on = !!activePhoto();
    frame.classList.toggle("can-drag", on); dragHint.hidden = !on;
    if (on) canvas.setAttribute("tabindex", "0"); else canvas.removeAttribute("tabindex");
  }
  function naturalSize(src) {
    if (imgCache.src !== src) { imgCache.src = src; imgCache.img = new Image(); imgCache.img.src = src; }
    var im = imgCache.img; return im.naturalWidth ? { w: im.naturalWidth, h: im.naturalHeight } : null;
  }
  /* how far the photo can pan (canvas px) in each axis at its current zoom, for a "cover" fit */
  function panRange(ph) {
    var z = sizeOf(post()), nat = naturalSize(ph.src); if (!nat) return { x: z.w, y: z.h };
    var k = Math.max(z.w / nat.w, z.h / nat.h) * (ph.zoom || 1);
    return { x: Math.max(0, nat.w * k - z.w), y: Math.max(0, nat.h * k - z.h) };
  }
  function nudge(ph, dx, dy) {
    var r = panRange(ph);
    if (r.x > 0) ph.x = Math.min(1, Math.max(0, ph.x - dx / r.x));
    if (r.y > 0) ph.y = Math.min(1, Math.max(0, ph.y - dy / r.y));
  }
  var drag = null;
  canvas.addEventListener("pointerdown", function (e) {
    var ph = activePhoto(); if (!ph || e.button > 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); frame.classList.add("is-dragging"); e.preventDefault();
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return; var ph = activePhoto(); if (!ph) return;
    var k = canvas.width / (canvas.clientWidth || canvas.width);
    nudge(ph, (e.clientX - drag.x) * k, (e.clientY - drag.y) * k); drag.x = e.clientX; drag.y = e.clientY;
    schedule(16, true);
  });
  function endDrag(e) { if (!drag || (e && e.pointerId !== drag.id)) return; drag = null; frame.classList.remove("is-dragging"); dirtyThumb(); schedule(0); }
  canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("keydown", function (e) {
    var ph = activePhoto(); if (!ph) return;
    var step = e.shiftKey ? 80 : 20, map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }, m = map[e.key];
    if (m) { nudge(ph, m[0], m[1]); }
    else if (e.key === "+" || e.key === "=") ph.zoom = Math.min(3, (ph.zoom || 1) + 0.1);
    else if (e.key === "-" || e.key === "_") ph.zoom = Math.max(1, (ph.zoom || 1) - 0.1);
    else return;
    e.preventDefault();
    var box = photoBoxFor(); if (box && box._zoom) { box._zoom.value = String(ph.zoom); box._out.textContent = Math.round(ph.zoom * 100) + "%"; }
    dirtyThumb(); schedule(40, true);
  });

  /* ---------- brand checks ---------- */
  var checkSeq = 0;
  function fieldLabel(key, slide) {
    var p = post(), defs = slide != null && p.slides[slide] ? (S.SLIDE_TYPES[p.slides[slide].type] || { fields: [] }).fields : tpl().fields;
    for (var i = 0; i < defs.length; i++) if (defs[i].key === key) return defs[i].label;
    return null;
  }
  function runChecks() {
    var p = post(), base = [], seq = ++checkSeq;
    if (has("checkPost")) { try { base = (S.checkPost(p) || []).slice(); } catch (e) { base = []; } }
    if (!has("checkPost") && !has("layout")) { $("#sx-checks").hidden = true; return; }
    if (!has("layout")) return paintIssues(base);
    var idx = isCarousel() ? p.slides.map(function (s, i) { return i; }) : [0], snap = S.clone(p);
    Promise.all(idx.map(function (i) { return Promise.resolve().then(function () { return S.layout(snap, i); }).catch(function () { return null; }); })).then(function (res) {
      if (seq !== checkSeq) return;
      var extra = [];
      res.forEach(function (r, n) {
        if (!r || !r.overflow) return;
        var sl = isCarousel() ? idx[n] : null, keys = Object.keys(r.fields || {}).filter(function (k) { return r.fields[k] && r.fields[k].overflow; });
        if (!keys.length) keys = [null];
        keys.forEach(function (k) { extra.push({ severity: "error", field: k, slide: sl, message: "This text doesn't fit and will be cut off. Shorten it or pick a taller size." }); });
      });
      paintIssues(extra.concat(base));
    });
  }
  var jump = $("#sx-checks-jump"), jumpSum = $("#sx-checks-jump-sum");
  jump.addEventListener("click", function () {
    var first = issuesEl.querySelector("button.sx-issue") || $("#sx-checks-h");
    first.focus({ preventScroll: true }); $("#sx-checks").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  function mirrorSum() { jump.hidden = false; jumpSum.textContent = checksSum.textContent; jumpSum.className = checksSum.className; }
  function paintIssues(list) {
    $("#sx-checks").hidden = false;
    setTimeout(mirrorSum, 0);
    var p = post(); issuesEl.innerHTML = "";
    Array.prototype.forEach.call(root.querySelectorAll(".sx-field-issue"), function (n) { n.hidden = true; n.textContent = ""; n.className = "xs sx-field-issue"; });
    Array.prototype.forEach.call(root.querySelectorAll("[aria-invalid]"), function (n) { n.removeAttribute("aria-invalid"); });
    list = (list || []).filter(function (x) { return x && x.message; });
    var counts = { error: 0, warn: 0, tip: 0 };
    list.forEach(function (x) { if (!counts.hasOwnProperty(x.severity)) x.severity = "warn"; counts[x.severity]++; });
    if (!list.length) {
      checksSum.textContent = "No issues found";
      checksSum.className = "sx-checks-sum ok";
      issuesEl.appendChild(el("p", { class: "sx-ok" }, [el("span", { "aria-hidden": "true", text: "✓" }), " This post follows the brand checks. Still read it once before posting."]));
      return;
    }
    var parts = [];
    if (counts.error) parts.push(counts.error + (counts.error === 1 ? " to fix" : " to fix"));
    if (counts.warn) parts.push(counts.warn + " to check");
    if (counts.tip) parts.push(counts.tip + (counts.tip === 1 ? " tip" : " tips"));
    checksSum.textContent = parts.join(", ");
    checksSum.className = "sx-checks-sum " + (counts.error ? "bad" : counts.warn ? "warn" : "tip");
    SEV.forEach(function (sv) {
      var items = list.filter(function (x) { return x.severity === sv[0]; }); if (!items.length) return;
      var ul = el("ul", { class: "sx-issue-list" });
      items.forEach(function (x) {
        var where = [];
        if (x.slide != null && isCarousel()) where.push("Slide " + (+x.slide + 1));
        var fl = x.field ? fieldLabel(x.field, x.slide != null && isCarousel() ? +x.slide : null) : null; if (fl) where.push(fl);
        var target = x.field ? document.getElementById(fid(x.slide != null && isCarousel() ? +x.slide : null, x.field)) : null;
        var kids = [el("span", { class: "sx-sev", text: sv[2] }), where.length ? el("b", { text: where.join(" · ") + ": " }) : null, el("span", { text: x.message })];
        var item = (target || (x.slide != null && isCarousel()))
          ? el("button", { type: "button", class: "sx-issue " + sv[0], onclick: function () { goToIssue(x); } }, kids)
          : el("div", { class: "sx-issue " + sv[0] }, kids);
        ul.appendChild(el("li", null, [item]));
        if (target) {
          var note = document.getElementById(target.id + "-issue");
          if (note && note.hidden) { note.hidden = false; note.textContent = x.message; note.classList.add(sv[0]); }
          if (sv[0] === "error") target.setAttribute("aria-invalid", "true");
        }
      });
      issuesEl.appendChild(el("div", { class: "sx-issue-group" }, [el("h4", { class: "sx-issue-h " + sv[0], text: sv[1] }), ul]));
    });
  }
  function goToIssue(x) {
    var slide = x.slide != null && isCarousel() ? +x.slide : null;
    if (slide != null) selectSlide(slide);
    var t = x.field ? document.getElementById(fid(slide, x.field)) : null;
    if (!t && slide != null) t = slidesEl.querySelector('.sx-slide[data-i="' + slide + '"] .sx-slide-pick');
    if (t) { t.focus({ preventScroll: true }); if (t.scrollIntoView) t.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }

  /* ---------- downloads ---------- */
  var busy = false;
  function stamp() { var d = new Date(), z = function (n) { return ("0" + n).slice(-2); }; return "" + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes()); }
  function saveBlob(blob, name) {
    if (has("saveBlob")) return S.saveBlob(blob, name);
    var a = el("a", { href: URL.createObjectURL(blob), download: name }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }
  function fallbackPng(p, slide) {
    return S.render(p, slide, {}).then(function (c) {
      return new Promise(function (r, j) { c.toBlob(function (b) { if (b) r(b); else j(new Error("toBlob failed")); }, "image/png"); });
    }).then(function (b) { return { blob: b, filename: "gco-" + p.template + "-" + p.size + "-" + stamp() + (isCarousel() ? "-" + ("0" + (slide + 1)).slice(-2) : "") + ".png" }; });
  }
  function exportButtons() { return root.querySelectorAll("[data-export]"); }
  function setBusy(on) { busy = on; Array.prototype.forEach.call(exportButtons(), function (b) { b.disabled = on; }); root.classList.toggle("sx-exporting", on); }
  function doExport(mode, btn) {
    if (busy) return;
    var p = S.clone(post()), slide = curSlide();
    var errors = 0; try { if (has("checkPost")) errors = (S.checkPost(p) || []).filter(function (x) { return x.severity === "error"; }).length; } catch (e) { errors = 0; }
    setBusy(true);
    status(mode === "png" ? "Preparing your PNG…" : "Preparing your download…");
    var onProgress = function (done, total, label) { status("Preparing " + (label ? label + " " : "") + "(" + Math.min(done + 1, total) + " of " + total + ")…"); };
    var job = has("exportPost") ? Promise.resolve().then(function () { return S.exportPost(p, mode, onProgress, { slide: slide }); }) : fallbackPng(p, slide);
    job.then(function (r) {
      if (!r || !r.blob) throw new Error("No file");
      saveBlob(r.blob, r.filename);
      status("Downloaded " + r.filename + "." + (errors ? " Brand checks found " + errors + (errors === 1 ? " thing" : " things") + " to fix before you post." : ""));
    }).catch(function (e) {
      if (window.console) console.warn("Social export failed", e);
      status("Couldn't make the file. Try again, or reload the page.");
    }).then(function () { setBusy(false); if (btn && document.activeElement === document.body) btn.focus(); });
  }
  function exportBtn(mode, text, cls) {
    var b = el("button", { type: "button", class: "btn " + (cls || "btn-secondary btn-sm"), "data-export": mode, text: text });
    b.addEventListener("click", function () { doExport(mode, b); });
    return b;
  }
  function buildActions() {
    var canRender = has("render"), full = has("exportPost");
    dlMain.innerHTML = ""; dlMore.innerHTML = "";
    if (!canRender) { dlMain.appendChild(el("p", { class: "small", text: "Downloads aren't available right now. Reload the page to try again." })); $("#sx-dl-more-wrap").hidden = true; return; }
    if (isCarousel() && full) {
      dlMain.appendChild(exportBtn("slides", "Download all slides (.zip)", "btn-donate"));
      dlMore.appendChild(exportBtn("png", "This slide (PNG)"));
      dlMore.appendChild(exportBtn("pdf", "PDF for LinkedIn"));
    } else {
      dlMain.appendChild(exportBtn("png", isCarousel() ? "Download this slide (PNG)" : "Download PNG", "btn-donate"));
    }
    if (full && tpl().sizes.length > 1) dlMore.appendChild(exportBtn("sizes", "All sizes (.zip)"));
    $("#sx-dl-more-wrap").hidden = !dlMore.children.length;
    var hint = $("#sx-dl-hint");
    if (hint) hint.textContent = isCarousel() ? "Upload the slides in order. LinkedIn takes the PDF as a document post." : "PNG at " + sizeOf(post()).w + " × " + sizeOf(post()).h + ".";
    setBusy(busy);
  }
  if (has("caption")) copyCap.addEventListener("click", function () { var t; try { t = S.caption(post()); } catch (e) { t = ""; } if (t) copyText(t, "Caption"); else toast("Add some text first"); });
  else copyCap.hidden = true;
  copyAlt.addEventListener("click", function () { copyText(altFor(post()), "Image description"); });

  /* ---------- drafts and share links ---------- */
  var hasDrafts = has("saveDraft") && has("listDrafts") && has("loadDraft"), hasShare = has("shareURL");
  function fmtDate(t) {
    var d = new Date(t); if (isNaN(d)) return "";
    var M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var h = d.getHours(), m = d.getMinutes(), ap = h < 12 ? "a.m." : "p.m."; h = h % 12 || 12;
    return M[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() + ", " + (h === 12 && m === 0 && ap === "p.m." ? "noon" : h + (m ? ":" + ("0" + m).slice(-2) : "") + " " + ap);
  }
  function suggestedName() {
    var p = post(), f = p.fields, s = isCarousel() && p.slides[0] ? p.slides[0].fields : {};
    var txt = S.plain(f.head || s.head || f.q || f.eyeb || f.stat || "");
    return (tpl().label + (txt ? ": " + txt : "")).slice(0, 60);
  }
  function refreshDrafts() {
    var list = $("#sx-draft-list"); if (!list || !hasDrafts) return;
    var items = []; try { items = S.listDrafts() || []; } catch (e) { items = []; }
    list.innerHTML = "";
    if (!items.length) { list.appendChild(el("li", { class: "sx-empty xs", text: "No saved drafts yet." })); return; }
    items.forEach(function (d) {
      var t = S.template(d.template);
      list.appendChild(el("li", { class: "sx-draft" }, [
        el("div", { class: "sx-draft-meta" }, [el("b", { text: d.name || "Untitled draft" }), el("span", { class: "xs", text: (t ? t.label + " · " : "") + fmtDate(d.savedAt) })]),
        el("div", { class: "row" }, [
          el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Open", "aria-label": "Open draft " + (d.name || ""), onclick: function () {
            var p = null; try { p = S.loadDraft(d.id); } catch (e) { p = null; }
            if (!p) { status("That draft couldn't be opened."); refreshDrafts(); return; }
            loadPost(p); status("Opened draft " + (d.name || "") + "."); toast("Draft opened");
          } }),
          has("deleteDraft") ? el("button", { type: "button", class: "sx-link", text: "Delete", "aria-label": "Delete draft " + (d.name || ""), onclick: function () {
            try { S.deleteDraft(d.id); } catch (e) { /* ignore */ }
            refreshDrafts(); status("Draft deleted."); var n = $("#sx-draft-name"); if (n) n.focus();
          } }) : null
        ])
      ]));
    });
  }
  function buildMore() {
    if (!hasDrafts && !hasShare) { moreEl.hidden = true; return; }
    var body = $("#sx-more-body"); body.innerHTML = "";
    if (hasDrafts) {
      var name = el("input", { type: "text", id: "sx-draft-name", maxlength: "60", placeholder: suggestedName() });
      var save = el("button", { type: "button", class: "btn btn-secondary btn-sm", text: "Save draft" });
      var doSave = function () {
        var nm = name.value.trim() || suggestedName(), r;
        try { r = S.saveDraft(post(), nm); } catch (e) { r = null; }
        if (!r) { status("Couldn't save the draft. This browser may block storage."); return; }
        name.value = "";
        var dropped = r && typeof r === "object" && r.photoDropped;
        status("Saved draft " + nm + "." + (dropped ? " The photo was too large to keep, so add it again when you open the draft." : ""));
        toast("Draft saved"); refreshDrafts();
      };
      save.addEventListener("click", doSave);
      name.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSave(); } });
      name.addEventListener("focus", function () { name.placeholder = suggestedName(); });
      body.appendChild(el("div", { class: "sx-ctl" }, [el("label", { class: "sx-ctl-label", for: "sx-draft-name", text: "Draft name" }), el("div", { class: "sx-inline" }, [name, save]),
        el("p", { class: "xs sx-hint", text: "Drafts are saved in this browser on this device only." })]));
      body.appendChild(el("div", { class: "sx-ctl" }, [el("h4", { class: "sx-ctl-label", id: "sx-drafts-h", text: "Recent drafts" }), el("ul", { class: "sx-drafts", id: "sx-draft-list", "aria-labelledby": "sx-drafts-h" })]));
    }
    if (hasShare) {
      body.appendChild(el("div", { class: "sx-ctl" }, [el("span", { class: "sx-ctl-label", text: "Share link" }),
        el("div", { class: "row" }, [el("button", { type: "button", class: "btn btn-secondary btn-sm", id: "sx-share", text: "Copy share link", onclick: function () {
          Promise.resolve().then(function () { return S.shareURL(post()); }).then(function (u) { copyText(u, "Share link"); status("Share link copied. Photos aren't included in share links."); },
            function () { status("Couldn't make a share link."); });
        } })]),
        el("p", { class: "xs sx-hint", text: "Anyone with the link can open this post's text and settings. Photos aren't included in share links." })]));
    }
    refreshDrafts();
  }

  /* ---------- load a post (draft or share link) ---------- */
  function loadPost(p) {
    p = S.normalizePost(p);
    cur = p.template; posts[cur] = p; slideOf[cur] = 0;
    buildAll();
  }

  /* ---------- build everything for the current template ---------- */
  function buildAll() {
    pressTabs(); thumbDirty = {};
    root.setAttribute("data-template", cur);
    buildFormat(); buildPhoto(); buildText(); buildSlides(); buildActions(); updateNav();
    dirtyAllThumbs(); schedule(0);
  }

  $("#sx-editor").addEventListener("submit", function (e) { e.preventDefault(); });
  frame.classList.toggle("is-off", !has("render"));
  buildMore();
  buildAll();
  if (has("preload")) Promise.resolve().then(function () { return S.preload(); }).then(function () { dirtyAllThumbs(); schedule(0); }, function () { /* render still tries */ });
  function openFromHash() {
    if (!has("readShareFromHash") || location.hash.indexOf("post=") < 0) return;
    Promise.resolve().then(function () { return S.readShareFromHash(); }).then(function (p) {
      if (!p) { status("That share link couldn't be opened. Ask for a new one."); return; }
      loadPost(p);
      try { history.replaceState(null, "", location.pathname + location.search + "#social"); } catch (e) { /* ignore */ }
      var sec = document.getElementById("social"); if (sec && sec.scrollIntoView) sec.scrollIntoView();
      status("Opened a shared post. Photos aren't included in share links, so add any photo again.");
    }, function () { status("That share link couldn't be opened."); });
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();
