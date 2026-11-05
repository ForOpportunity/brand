/* Georgia Center for Opportunity brand guide: interactions (Edition 02, website system) */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- palette: single source for swatches, contrast and tokens ---------- */
  var PALETTE = [
    { id: "slate", name: "Opportunity Slate", hex: "#2F4F68", role: "Primary brand color: headlines, buttons, dark sections. The website's primary, headline and dark color.", text: "#FFFFFF", feature: true, src: "Website primary" },
    { id: "light", name: "Warm Off-White", hex: "#FAF9F7", role: "Page canvas and section backgrounds.", text: "#2F4F68", src: "Website light" },
    { id: "white", name: "White", hex: "#FFFFFF", role: "Cards, forms, alternating sections.", text: "#2F4F68", src: "Website white" },
    { id: "orange", name: "Sunrise Orange", hex: "#FFA149", role: "Donate buttons, underlines, icons and one accent per screen. Never text on light.", text: "#2F4F68", feature: true, src: "Brand secondary" },
    { id: "teal", name: "Coastal Teal", hex: "#78B2B9", role: "Quote marks, icon tiles and illustration.", text: "#2F4F68", src: "Website accent" },
    { id: "peach", name: "Peach", hex: "#FFBC7D", role: "Warm highlight on slate. The arrow's peach band fades toward #FFECDA.", text: "#2F4F68", src: "Website accent tint" },
    { id: "border", name: "Line", hex: "#E6E9EC", role: "Borders and dividers. Hover: #A3AFB7.", text: "#2F4F68", src: "Website border" }
  ];
  var tokens = {
    name: "Georgia Center for Opportunity", edition: "02", version: "2.0.0",
    color: {}, font: { family: "Inter, system-ui, Arial, sans-serif", weights: { body: 400, medium: 500, headline: 600 }, headlineTracking: "-0.027em", headlineLineHeight: 1.2, bodyLineHeight: 1.65 },
    radius: { sm: "8px", default: "20px", lg: "32px" },
    button: { font: "Inter 500 16px", padding: "19px 32px", radius: "20px", textTransform: "none" },
    layout: { containerMaxWidth: "1200px", widgetSpacing: "20px", spaceScale: [8, 16, 20, 32, 48, 64] },
    photoGradient: "linear-gradient(180deg, rgba(31,53,71,0) 30%, rgba(31,53,71,0.8) 100%)"
  };
  PALETTE.forEach(function (p) { tokens.color[p.id] = p.hex; });
  var tokensStr = JSON.stringify(tokens, null, 2);

  function rgb(hex) { hex = hex.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); }); }
  function lum(hex) { var c = rgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function cmyk(hex) { var c = rgb(hex).map(function (v) { return v / 255; }); var k = 1 - Math.max.apply(null, c); if (k >= 1) return "0 0 0 100"; return c.map(function (v) { return Math.round((1 - v - k) / (1 - k) * 100); }).concat(Math.round(k * 100)).join(" "); }

  /* ---------- toast + clipboard ---------- */
  var toastT;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 1800); }
  function copyText(text, btn, label) {
    function ok() { toast((label || "Text") + " copied"); if (btn) { btn.classList.add("done"); setTimeout(function () { btn.classList.remove("done"); }, 1200); } }
    function fallback() { var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) { toast("Select the text and copy it manually"); } document.body.removeChild(ta); }
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  }
  function pressGroup(group, btn) { $$("button", group).forEach(function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); }); }

  /* ---------- swatches ---------- */
  var sw = $("#swatches");
  PALETTE.forEach(function (p) {
    var r = rgb(p.hex), el = document.createElement("div");
    el.className = "swatch" + (p.id === "slate" ? " feature" : "");
    el.innerHTML = '<div class="chip" style="background:' + p.hex + ';color:' + p.text + '"><span>' + p.name + '</span><span style="opacity:.8;font-weight:500">' + p.src + '</span></div>' +
      '<div class="info"><b>' + p.name + '</b><p class="small">' + p.role + '</p><div class="codes">' +
      '<button class="copy" type="button" data-v="' + p.hex + '">' + p.hex + '</button>' +
      '<button class="copy" type="button" data-v="rgb(' + r.join(", ") + ')">RGB ' + r.join(" ") + '</button>' +
      '<button class="copy" type="button" data-v="' + cmyk(p.hex) + '">CMYK ' + cmyk(p.hex) + '</button></div></div>';
    sw.appendChild(el);
  });
  sw.addEventListener("click", function (e) { var b = e.target.closest(".copy"); if (b) copyText(b.getAttribute("data-v"), b, b.getAttribute("data-v")); });

  /* ---------- contrast table ---------- */
  var PAIRS = [
    ["#2F4F68", "#FAF9F7", "Slate on Off-White", "Headlines, buttons, links"],
    ["#FFFFFF", "#2F4F68", "White on Slate", "Text on dark sections and buttons"],
    ["#1B2F3F", "#FFA149", "Dark text on Orange", "Donate button text"],
    ["#FFBC7D", "#2F4F68", "Peach on Slate", "Labels and highlights on slate"],
    ["#FFA149", "#2F4F68", "Orange on Slate", "Large text and icons only"],
    ["#78B2B9", "#2F4F68", "Teal on Slate", "Large text (24px+, or 19px+ bold), icons and accents only"],
    ["#FFA149", "#FFFFFF", "Orange on White", "Shapes only, never text"],
    ["#78B2B9", "#FFFFFF", "Teal on White", "Shapes only, never text"],
    ["#FFFFFF", "#FFA149", "White on Orange", "Never"]
  ];
  var tb = $("#pairs tbody");
  PAIRS.forEach(function (p) {
    var r = ratio(p[0], p[1]);
    var v = r >= 7 ? '<span class="pass">AAA</span>' : r >= 4.5 ? '<span class="pass">AA</span>' : r >= 3 ? '<span class="lg">Large text only</span>' : '<span class="fail">Fails</span>';
    var tr = document.createElement("tr");
    tr.innerHTML = '<td><span class="sample" style="color:' + p[0] + ';background:' + p[1] + '">Aa</span></td><td>' + p[2] + '</td><td class="num">' + r.toFixed(2) + ':1 ' + v + '</td><td>' + p[3] + '</td>';
    tb.appendChild(tr);
  });

  /* ---------- tokens ---------- */
  if ($("#tokens-json")) $("#tokens-json").textContent = tokensStr;
  $$("[data-copy-tokens]").forEach(function (b) { b.addEventListener("click", function () { copyText(tokensStr, b, "Tokens"); }); });
  $$("[data-copy-from]").forEach(function (b) { b.addEventListener("click", function () { copyText($("#" + b.getAttribute("data-copy-from")).textContent.trim(), b, "Copy"); }); });

  /* ---------- scroll progress ---------- */
  var bar = $(".scroll-progress");
  if (bar) {
    var tick = false;
    var setP = function () { var h = document.documentElement.scrollHeight - innerHeight; bar.style.setProperty("--p", h > 0 ? Math.min(1, scrollY / h) : 0); tick = false; };
    addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(setP); } }, { passive: true });
    addEventListener("resize", setP); setP();
  }

  /* ---------- TOC highlight ---------- */
  var links = $$(".toc a");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + en.target.id;
          a.classList.toggle("on", on);
          if (on) { a.setAttribute("aria-current", "true"); if (window.innerWidth <= 980) { var ol = a.closest("ol"); ol.scrollTo({ left: a.offsetLeft - (ol.clientWidth - a.offsetWidth) / 2, behavior: "smooth" }); } } else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    $$("main .sec").forEach(function (s) { io.observe(s); });
  }

  /* ---------- type playground ---------- */
  var play = $("#type-play");
  var STYLES = { display: ["600", "clamp(32px,5vw,62px)", "-0.027em", "1.1"], medium: ["500", "clamp(24px,3.4vw,40px)", "-0.015em", "1.25"], body: ["400", "clamp(18px,2vw,22px)", "0", "1.6"] };
  $$(".playground .seg").forEach(function (b) {
    b.addEventListener("click", function () {
      pressGroup(b.parentNode, b);
      var s = STYLES[b.getAttribute("data-style")]; play.style.fontWeight = s[0]; play.style.fontSize = s[1]; play.style.letterSpacing = s[2]; play.style.lineHeight = s[3];
    });
  });

  /* ---------- photo treatment ---------- */
  var tf = $("#treat-file"), op = $("#treat-op");
  tf.addEventListener("change", function () {
    var f = tf.files && tf.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { ["#treat-before", "#treat-after"].forEach(function (s) { var el = $(s); el.classList.remove("empty-ph"); el.style.backgroundImage = "url(" + rd.result + ")"; }); $("#treat-before span").textContent = ""; };
    rd.readAsDataURL(f);
  });
  op.addEventListener("input", function () { $("#treat-after").style.setProperty("--ov", op.value / 100); $("#treat-op-v").textContent = op.value + "%"; });

  /* ---------- background art ---------- */
  var BG_SIZES = [["square", "1:1 · 1080²"], ["portrait", "4:5 · 1080×1350"], ["story", "9:16 · 1080×1920"], ["landscape", "16:9 · 1920×1080"]];
  function renderBg(set) {
    var host = $("#bg-preview"); host.innerHTML = "";
    BG_SIZES.forEach(function (s) {
      var base = set + "-" + s[0], f = document.createElement("figure");
      f.innerHTML = '<div class="art"><img src="assets/backgrounds/' + base + '.svg" alt="' + set.replace("-", " ") + ' background, ' + s[1] + '"></div>' +
        '<figcaption><span>' + s[1] + '</span><span><a href="assets/backgrounds/' + base + '.svg" download>SVG</a> · <a href="assets/backgrounds/png/' + base + '.png" download>PNG</a></span></figcaption>';
      host.appendChild(f);
    });
  }
  renderBg("light-arrow");
  $$("#bg-tabs button").forEach(function (b) { b.addEventListener("click", function () { pressGroup(b.parentNode, b); renderBg(b.getAttribute("data-bg")); }); });

  /* ---------- motion ---------- */
  var stage = $("#motion-stage");
  function replay() { stage.classList.remove("play"); void stage.offsetWidth; stage.classList.add("play"); }
  $("#replay").addEventListener("click", replay);
  if ("IntersectionObserver" in window) { var mo = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { replay(); mo.disconnect(); } }, { threshold: .5 }); mo.observe(stage); }

  /* ---------- applications, email, checklist ---------- */
  $$(".amounts button").forEach(function (b) { b.addEventListener("click", function () { pressGroup(b.parentNode, b); }); });
  if ($("#copy-sig")) $("#copy-sig").addEventListener("click", function (e) { copyText($("#sig").innerHTML.trim(), e.currentTarget, "Signature HTML"); });
  $$("#email-tabs button").forEach(function (b) { b.addEventListener("click", function () { pressGroup(b.parentNode, b); $("#email-preview").classList.toggle("narrow", b.getAttribute("data-w") === "narrow"); }); });
  var boxes = $$("#ship-list input");
  function ship() { var n = boxes.filter(function (b) { return b.checked; }).length; $("#ship-bar").style.width = (n / boxes.length * 100) + "%"; $("#ship-msg").textContent = n === boxes.length ? "All set. Publish it." : n + " of " + boxes.length + " checked."; }
  boxes.forEach(function (b) { b.addEventListener("change", ship); });

  /* ---------- social templates (1080px canvases) ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /* one span per word: html2canvas draws a wrapped inline border as one bar across the whole line */
  function hl(s) { return esc(s).replace(/\*([^*]+)\*/g, function (m, t) { return t.split(/(\s+)/).map(function (w) { return /^\s+$/.test(w) || !w ? w : '<span class="hl">' + w + '</span>'; }).join(""); }); }
  function plain(s) { return String(s).replace(/\*/g, "").replace(/\s*\n\s*/g, " ").trim(); }
  /* PNG, not SVG: html2canvas draws SVGs without width/height oversized and cropped */
  function logo(light) { return '<img class="logo" src="assets/logo/png/' + (light ? "gco-logo-left-aligned-color" : "gco-logo-left-aligned-white") + '-2000.png" alt="">'; }

  var TEMPLATES = [
    { id: "stat", label: "Big stat", h: 1080, photo: true, light: false,
      fields: [["eyeb", "Label", "Occupational Licensing Index", "input"], ["stat", "Number", "#31", "input"], ["head", "Headline", "Georgia's Rank in 2026. How Many *Barriers* Stand Between Georgians and Work?", "textarea"]],
      render: function (v) { return '<div class="content"><div class="eyeb">' + esc(v.eyeb) + '</div><div class="stat">' + esc(v.stat) + '</div><div class="head" style="font-size:64px;line-height:1.15">' + hl(v.head) + '</div></div>'; },
      caption: function (v) { return plain(v.eyeb) + ": " + plain(v.stat) + ". " + plain(v.head) + " Read our analysis at foropportunity.org"; } },
    { id: "quote", label: "Quote", h: 1080, photo: false, light: true,
      fields: [["q", "Quote", "This workshop doesn't just teach parenting tips. It *transforms* the way you connect with your kids.", "textarea"], ["who", "Name", "RHCK Graduate", "input"], ["role", "Program or role", "Raising Highly Capable Kids", "input"]],
      render: function (v) { return '<img class="art" src="assets/backgrounds/light-arrow-square.svg" alt=""><div class="card-in"></div><div class="content" style="padding:150px 150px 260px;justify-content:center;gap:48px"><img class="qmark" src="assets/art/quote-open.svg" alt=""><div class="q" style="color:#2F4F68">' + hl(v.q) + '</div><div class="attr">' + esc(v.who) + '<span>' + esc(v.role) + '</span></div></div>'; },
      caption: function (v) { return "“" + plain(v.q) + "” (" + plain(v.who) + ", " + plain(v.role) + ") Learn more at foropportunity.org"; } },
    { id: "pillars", label: "Pillars", h: 1080, photo: true, light: false,
      fields: [["eyeb", "Label", "What We Do", "input"], ["items", "Items (one per line)", "Family Stability\nEconomic Mobility\nChild Opportunity\nCommunity Connection", "textarea"]],
      render: function (v) { return '<div class="content" style="gap:56px"><div class="eyeb">' + esc(v.eyeb) + '</div><ul class="list">' + v.items.split("\n").filter(Boolean).map(function (x, i) { return "<li><i>" + (i + 1) + "</i>" + hl(x) + "</li>"; }).join("") + '</ul></div>'; },
      caption: function (v) { return plain(v.eyeb) + ": " + v.items.split("\n").filter(Boolean).map(plain).join(", ") + ". foropportunity.org"; } },
    { id: "question", label: "Question", h: 1080, photo: false, light: true,
      fields: [["eyeb", "Label", "Join the conversation", "input"], ["head", "Headline", "What Do *Families* Need to Thrive?", "textarea"], ["sub", "Supporting line", "Tell us in the comments.", "input"]],
      render: function (v) { return '<img class="art" src="assets/backgrounds/light-arrow-square.svg" alt=""><div class="content" style="justify-content:center"><div class="eyeb">' + esc(v.eyeb) + '</div><div class="head" style="font-size:112px;color:#2F4F68">' + hl(v.head) + '</div><div class="sub">' + hl(v.sub) + '</div></div>'; },
      caption: function (v) { return plain(v.head) + " " + plain(v.sub); } },
    { id: "story", label: "Story 9:16", h: 1920, photo: true, light: false,
      fields: [["eyeb", "Label", "BETTER WORK", "input"], ["head", "Headline", "A Job Can Provide *Purpose*, Stability and a Path Forward", "textarea"], ["sub", "Body", "We connect job-seekers with training, support services and career pathways through local partners.", "textarea"], ["cta", "Button", "Learn More", "input"]],
      render: function (v) { return '<div class="content" style="padding:200px 96px 300px;gap:48px"><div class="eyeb">' + esc(v.eyeb) + '</div><div class="head" style="font-size:104px">' + hl(v.head) + '</div><div class="sub">' + hl(v.sub) + '</div><div class="cta">' + esc(v.cta) + '</div></div>'; },
      caption: function (v) { return plain(v.head) + " " + plain(v.sub) + " " + plain(v.cta) + " at foropportunity.org"; } },
    { id: "carousel", label: "Carousel 4:5", h: 1350, photo: false, light: false,
      fields: [["eyeb", "Series label", "Benefit Cliffs", "input"], ["head", "Cover headline", "What Is a *Benefit Cliff*?", "textarea"],
        ["slides", "Slides (one per paragraph: first line is the heading, the rest is the text)", "When a Raise Costs You\nA small pay increase can push a family just past an eligibility line, so they lose more in support than they gain in wages.\n\nWhy It Matters\nParents turn down raises and extra hours to protect their family's benefits. Work stops paying.\n\nA Better Path\nPhasing benefits out gradually lets families keep more of every raise as they move toward stability.", "textarea"],
        ["end", "Closing headline", "Let's Make *Work Pay*", "textarea"], ["cta", "Button", "Learn More", "input"]],
      slides: function (v) {
        var body = String(v.slides).split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
        var n = body.length + 2, pg = function (i) { return '<div class="pager">' + (i + 1) + ' / ' + n + '</div>'; }, out = [];
        out.push('<div class="content" style="padding:140px 96px 300px;gap:44px"><div class="eyeb">' + esc(v.eyeb) + '</div><div class="head" style="font-size:112px">' + hl(v.head) + '</div><div class="swipe">Swipe <span aria-hidden="true">&rarr;</span></div></div>' + pg(0));
        body.forEach(function (p, i) {
          var lines = p.split("\n"), h = lines.shift(), t = lines.join("\n");
          out.push('<div class="content" style="padding:140px 96px 300px;gap:40px;justify-content:center"><div class="num">' + ("0" + (i + 1)).slice(-2) + '</div><div class="head" style="font-size:80px">' + hl(h) + '</div>' + (t ? '<div class="sub" style="font-size:44px;max-width:880px">' + hl(t) + '</div>' : "") + '</div>' + pg(i + 1));
        });
        out.push('<div class="content" style="padding:140px 96px 300px;gap:56px;justify-content:center"><div class="head" style="font-size:104px">' + hl(v.end) + '</div><div class="cta">' + esc(v.cta) + '</div><div class="sub">foropportunity.org</div></div>' + pg(n - 1));
        return out;
      },
      render: function (v) { return this.slides(v)[0]; },
      caption: function (v) { return plain(v.head) + " " + String(v.slides).split(/\n\s*\n/).map(function (p) { return plain(p.split("\n")[0]); }).filter(Boolean).join(". ") + ". " + plain(v.cta) + " at foropportunity.org"; } }
  ];
  var state = {}; TEMPLATES.forEach(function (t) { state[t.id] = { photo: null, v: {}, slide: 0 }; t.fields.forEach(function (f) { state[t.id].v[f[0]] = f[2]; }); });
  var current = TEMPLATES[0], vp = $("#tpl-viewport");

  function slideCount(t) { return t.slides ? t.slides(state[t.id].v).length : 1; }
  function buildTpl(t, idx) {
    var s = state[t.id], el = document.createElement("div"), bg = "";
    el.className = "tpl t-" + t.id + (t.h === 1920 ? " tall" : t.h === 1350 ? " portrait" : "") + (t.light ? " light" : "");
    /* the logo sits on these posts, so no ring art behind it */
    if (!t.light && t.photo && s.photo) bg = '<div class="bgimg" style="background-image:url(' + s.photo + ')"></div><div class="ov"></div>';
    var body = t.slides ? t.slides(s.v)[Math.min(idx == null ? s.slide : idx, slideCount(t) - 1)] : t.render(s.v);
    el.innerHTML = bg + body + logo(t.light);
    return el;
  }
  function fit() { var sc = vp.clientWidth / 1080; vp.style.height = (current.h * sc) + "px"; if (vp.firstChild) vp.firstChild.style.transform = "scale(" + sc + ")"; }
  function altText() {
    var v = state[current.id].v, words = current.fields.map(function (f) { return plain(v[f[0]]); }).join(". ");
    if (current.slides) words = (current.slides(v).length) + "-slide carousel. " + words;
    var bg = current.light ? "Off-white background with pale slate and peach arrow shapes." : (state[current.id].photo ? "Photo under a slate gradient." : "Solid slate blue background.");
    return "Graphic that reads: " + words + ". " + bg + " Georgia Center for Opportunity logo.";
  }
  function draw() {
    var n = slideCount(current), s = state[current.id]; if (s.slide > n - 1) s.slide = n - 1;
    vp.innerHTML = ""; vp.appendChild(buildTpl(current)); fit();
    var nav = $("#tpl-slides"); nav.hidden = n < 2; $("#tpl-slide-n").textContent = "Slide " + (s.slide + 1) + " of " + n;
    $("#tpl-download").textContent = n > 1 ? "Download all slides (.zip)" : "Download PNG";
    $("#tpl-prev").disabled = s.slide === 0; $("#tpl-next").disabled = s.slide >= n - 1; vp.setAttribute("role", "img"); vp.setAttribute("aria-label", "Preview. " + altText()); }
  function fields() {
    var host = $("#tpl-fields"); host.innerHTML = "";
    current.fields.forEach(function (f) {
      var id = "tf-" + current.id + "-" + f[0], lab = document.createElement("label"); lab.setAttribute("for", id); lab.textContent = f[1];
      var inp = document.createElement(f[3] === "textarea" ? "textarea" : "input"); if (f[3] !== "textarea") inp.type = "text";
      inp.id = id; inp.value = state[current.id].v[f[0]];
      inp.addEventListener("input", function () { state[current.id].v[f[0]] = inp.value; draw(); });
      lab.appendChild(inp); host.appendChild(lab);
    });
    $("#tpl-photo-label").hidden = !current.photo; $("#tpl-photo-clear").hidden = !current.photo || !state[current.id].photo;
  }
  var tabs = $("#tpl-tabs");
  TEMPLATES.forEach(function (t, i) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = t.label; b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    b.addEventListener("click", function () { current = t; pressGroup(tabs, b); fields(); draw(); $("#tpl-status").textContent = ""; });
    tabs.appendChild(b);
  });
  $("#tpl-photo").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { state[current.id].photo = rd.result; fields(); draw(); }; rd.readAsDataURL(f); e.target.value = ""; });
  $("#tpl-photo-clear").addEventListener("click", function () { state[current.id].photo = null; fields(); draw(); });
  $("#tpl-reset").addEventListener("click", function () { current.fields.forEach(function (f) { state[current.id].v[f[0]] = f[2]; }); fields(); draw(); toast("Text reset"); });
  $("#tpl-caption").addEventListener("click", function (e) { copyText(current.caption(state[current.id].v), e.currentTarget, "Caption"); });
  $("#tpl-alt").addEventListener("click", function (e) { copyText(altText(), e.currentTarget, "Image description"); });
  /* minimal zip writer (stored, no compression; PNGs are already compressed) */
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(files) {
    var parts = [], central = [], offset = 0, enc = new TextEncoder();
    var le = function (v, n) { var a = new Uint8Array(n); for (var i = 0; i < n; i++) a[i] = (v >>> (8 * i)) & 255; return a; };
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      var common = [le(20, 2), le(0, 2), le(0, 2), le(0, 2), le(0x21, 2), le(crc, 4), le(size, 4), le(size, 4), le(name.length, 2), le(0, 2)];
      var local = [le(0x04034b50, 4)].concat(common, [name, f.data]);
      central.push([le(0x02014b50, 4), le(20, 2)].concat(common, [le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(offset, 4), name]));
      local.forEach(function (x) { parts.push(x); offset += x.length; });
    });
    var cdStart = offset, cdSize = 0;
    central.forEach(function (c) { c.forEach(function (x) { parts.push(x); cdSize += x.length; }); });
    parts.push(le(0x06054b50, 4), le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2), le(cdSize, 4), le(cdStart, 4), le(0, 2));
    return new Blob(parts, { type: "application/zip" });
  }
  function saveBlob(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }
  function renderSlide(t, idx) {
    var holder = document.createElement("div"); holder.style.cssText = "position:fixed;left:-30000px;top:0;width:1080px;height:" + t.h + "px;overflow:hidden";
    var el = buildTpl(t, idx); holder.appendChild(el); document.body.appendChild(holder);
    /* html2canvas mis-places text when body has a tall line-height, so neutralize it during export */
    var prevLH = document.body.style.lineHeight; document.body.style.lineHeight = "normal";
    var done = function () { document.body.style.lineHeight = prevLH; if (holder.parentNode) document.body.removeChild(holder); };
    var imgs = Array.prototype.slice.call(el.querySelectorAll("img")).map(function (im) { return im.complete ? Promise.resolve() : new Promise(function (r) { im.onload = im.onerror = r; }); });
    return Promise.all(imgs.concat([document.fonts ? document.fonts.ready : Promise.resolve()])).then(function () {
      return window.html2canvas(el, { scale: 1, width: 1080, height: t.h, backgroundColor: null, useCORS: true, logging: false });
    }).then(function (canvas) {
      done();
      return new Promise(function (r) { canvas.toBlob(r, "image/png"); });
    }, function (e) { done(); throw e; });
  }
  var busy = false;
  $("#tpl-download").addEventListener("click", function () {
    var st = $("#tpl-status"), btn = this, t = current;
    if (busy) return;
    if (!window.html2canvas) { st.textContent = "The image tool is still loading. Try again in a moment."; return; }
    var n = slideCount(t), stamp = Date.now(), base = "gco-" + t.id + "-" + stamp, blobs = [];
    busy = true; btn.disabled = true;
    st.textContent = n > 1 ? "Rendering slide 1 of " + n + "…" : "Rendering PNG…";
    var chain = Promise.resolve();
    for (var i = 0; i < n; i++) (function (idx) {
      chain = chain.then(function () { if (n > 1) st.textContent = "Rendering slide " + (idx + 1) + " of " + n + "…"; return renderSlide(t, idx); }).then(function (b) { blobs.push(b); });
    })(i);
    chain.then(function () {
      if (n === 1) { saveBlob(blobs[0], base + ".png"); st.textContent = "Downloaded " + base + ".png."; return; }
      return Promise.all(blobs.map(function (b) { return b.arrayBuffer(); })).then(function (bufs) {
        var zip = makeZip(bufs.map(function (buf, idx) { return { name: base + "-" + ("0" + (idx + 1)).slice(-2) + ".png", data: new Uint8Array(buf) }; }));
        saveBlob(zip, base + ".zip");
        st.textContent = "Downloaded " + base + ".zip with all " + n + " slides.";
      });
    }).catch(function () { st.textContent = "Couldn't render the image. Reload the page and try again."; })
      .then(function () { busy = false; btn.disabled = false; });
  });
  $("#tpl-prev").addEventListener("click", function () { state[current.id].slide--; draw(); });
  $("#tpl-next").addEventListener("click", function () { state[current.id].slide++; draw(); });
  fields(); draw();
  if ("ResizeObserver" in window) new ResizeObserver(fit).observe(vp); else window.addEventListener("resize", fit);
})();
