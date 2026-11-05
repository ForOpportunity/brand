/* Georgia Center for Opportunity brand guide: social templates, shared core.
   Data only: sizes, brand values, template and slide definitions, and the post model.
   Every other social-*.js file reads from window.GCOSocial; none of them redefine these. */
(function () {
  "use strict";
  var S = window.GCOSocial = window.GCOSocial || {};

  /* ---------- canvas sizes ---------- */
  S.SIZES = {
    square:   { id: "square",   label: "Square 1:1",     w: 1080, h: 1080, use: "Feed posts" },
    portrait: { id: "portrait", label: "Portrait 4:5",   w: 1080, h: 1350, use: "Feed posts and carousels" },
    story:    { id: "story",    label: "Story 9:16",     w: 1080, h: 1920, use: "Stories and reels" },
    link:     { id: "link",     label: "Link 1.91:1",    w: 1200, h: 627,  use: "LinkedIn link image" }
  };

  /* ---------- brand values (must match brand-guide.md) ---------- */
  S.BRAND = {
    color: {
      slate: "#2F4F68", slateDeep: "#1F3547", ink: "#1B2F3F", light: "#FAF9F7", white: "#FFFFFF",
      orange: "#FFA149", peach: "#FFBC7D", teal: "#78B2B9", tealInk: "#3A757D", body: "#5A6978",
      bodyOnSlate: "#D5DEE6", mutedOnSlate: "#AFC0CE", border: "#E6E9EC"
    },
    font: "Inter",
    weights: { body: 400, medium: 500, headline: 600 },
    tracking: -0.027,                                   /* em, headlines */
    /* top -> bottom. Strong enough from the top that labels high in the text block stay readable on bright photos */
    photoOverlay: [[0, "rgba(31,53,71,0.55)"], [0.45, "rgba(31,53,71,0.82)"], [1, "rgba(31,53,71,0.92)"]],
    assets: {
      logo: { light: "assets/logo/png/gco-logo-left-aligned-color-2000.png", dark: "assets/logo/png/gco-logo-left-aligned-white-2000.png" },
      arrow: { square: "assets/backgrounds/light-arrow-square.svg", portrait: "assets/backgrounds/light-arrow-portrait.svg",
               story: "assets/backgrounds/light-arrow-story.svg", link: "assets/backgrounds/light-arrow-landscape.svg" },
      quoteMark: "assets/art/quote-open.svg"
    }
  };

  /* ---------- backgrounds ----------
     slate: solid slate. light: off-white with the light arrow art. photo: user photo under a slate gradient.
     The ring art is never used on posts, because the logo sits on every post. */
  S.BACKGROUNDS = {
    slate: { id: "slate", label: "Slate" },
    light: { id: "light", label: "Off-white" },
    photo: { id: "photo", label: "Photo" }
  };

  /* ---------- field definitions ----------
     kind: "input" (one line), "textarea" (multi-line), "lines" (one item per line)
     case: "sentence" (headlines, labels, buttons, body: sentence case per the style guide) | "none" (names, numbers)
     max: soft character limit shown in the editor and checked by brand checks
     hl: true when *asterisks* underline words in orange */
  function f(key, label, kind, opt) { opt = opt || {}; return { key: key, label: label, kind: kind, case: opt.case || "none", max: opt.max || 0, required: !!opt.required, hl: !!opt.hl, hint: opt.hint || "" }; }

  /* ---------- slide types (carousel) ---------- */
  S.SLIDE_TYPES = {
    cover: { id: "cover", label: "Cover",  fields: [f("head", "Headline", "textarea", { case: "sentence", max: 60, hl: true })], photo: true },
    text:  { id: "text",  label: "Text",   fields: [f("head", "Heading", "input", { case: "sentence", max: 50, hl: true }), f("body", "Text", "textarea", { case: "sentence", max: 220, hl: true })], photo: false },
    stat:  { id: "stat",  label: "Stat",   fields: [f("stat", "Number", "input", { max: 8 }), f("head", "What it means", "textarea", { case: "sentence", max: 90, hl: true }), f("source", "Source and year", "input", { required: true, max: 80, hint: "e.g. U.S. Census Bureau, 2025" })], photo: false },
    quote: { id: "quote", label: "Quote",  fields: [f("q", "Quote", "textarea", { case: "sentence", max: 200, hl: true }), f("who", "Name", "input", { max: 40 }), f("role", "Program or role", "input", { max: 50 })], photo: false },
    photo: { id: "photo", label: "Photo",  fields: [f("head", "Caption on photo (optional)", "textarea", { case: "sentence", max: 60, hl: true })], photo: true },
    end:   { id: "end",   label: "Closing", fields: [f("head", "Closing headline", "textarea", { case: "sentence", max: 50, hl: true }), f("cta", "Button", "input", { case: "sentence", max: 24 }), f("url", "Web address", "input", { max: 40 })], photo: false }
  };

  /* ---------- templates ----------
     sizes/backgrounds: allowed options, first is the default. photo: whether a photo background is supported.
     carousel templates keep their content in post.slides instead of post.fields. */
  S.TEMPLATES = [
    { id: "stat", label: "Big stat", sizes: ["square", "portrait", "story", "link"], backgrounds: ["slate", "photo", "light"], photo: true,
      fields: [f("eyeb", "Label", "input", { case: "sentence", max: 40 }), f("stat", "Number", "input", { max: 8 }),
               f("head", "Headline", "textarea", { case: "sentence", max: 110, hl: true }), f("source", "Source and year", "input", { required: true, max: 80, hint: "e.g. Institute for Justice, 2026" })],
      defaults: { eyeb: "Occupational Licensing Index", stat: "#31", head: "Georgia's rank in 2026. How many *barriers* stand between Georgians and work?", source: "" } },
    { id: "quote", label: "Quote", sizes: ["square", "portrait", "story", "link"], backgrounds: ["light", "slate", "photo"], photo: true,
      fields: [f("q", "Quote", "textarea", { case: "sentence", max: 200, hl: true }), f("who", "Name", "input", { max: 40, hint: "First name only, with a signed release" }), f("role", "Program or role", "input", { max: 50 })],
      defaults: { q: "This workshop doesn't just teach parenting tips. It *transforms* the way you connect with your kids.", who: "RHCK graduate", role: "Raising Highly Capable Kids" } },
    { id: "pillars", label: "Pillars", sizes: ["square", "portrait", "story", "link"], backgrounds: ["slate", "photo", "light"], photo: true,
      fields: [f("eyeb", "Label", "input", { case: "sentence", max: 40 }), f("items", "Items (one per line, up to 5)", "lines", { case: "sentence", max: 40, hl: true })],
      defaults: { eyeb: "What we do", items: "Family stability\nEconomic mobility\nChild opportunity\nCommunity connection" } },
    { id: "question", label: "Question", sizes: ["square", "portrait", "story", "link"], backgrounds: ["light", "slate", "photo"], photo: true,
      fields: [f("eyeb", "Label", "input", { case: "sentence", max: 40 }), f("head", "Headline", "textarea", { case: "sentence", max: 70, hl: true }), f("sub", "Supporting line", "input", { case: "sentence", max: 80, hl: true })],
      defaults: { eyeb: "Join the conversation", head: "What do *families* need to thrive?", sub: "Tell us in the comments." } },
    { id: "cta", label: "Call to action", sizes: ["story", "portrait", "square", "link"], backgrounds: ["slate", "photo", "light"], photo: true,
      fields: [f("eyeb", "Label", "input", { case: "sentence", max: 40 }), f("head", "Headline", "textarea", { case: "sentence", max: 70, hl: true }),
               f("sub", "Text", "textarea", { case: "sentence", max: 160, hl: true }), f("cta", "Button", "input", { case: "sentence", max: 24 })],
      defaults: { eyeb: "BETTER WORK", head: "A job can provide *purpose*, stability, and a path forward", sub: "We connect job-seekers with training, support services, and career pathways through local partners.", cta: "Learn more" } },
    { id: "carousel", label: "Carousel", carousel: true, sizes: ["portrait", "square"], backgrounds: ["slate", "light"], photo: false,
      fields: [f("eyeb", "Series label", "input", { case: "sentence", max: 40 })],
      defaults: { eyeb: "Benefit cliffs" },
      slides: [
        { type: "cover", fields: { head: "What is a *benefit cliff*?" } },
        { type: "text", fields: { head: "When a raise costs you", body: "A small pay increase can push a family just past an eligibility line, so they lose more in support than they gain in wages." } },
        { type: "text", fields: { head: "Why it matters", body: "Parents turn down raises and extra hours to protect their family's benefits. Work stops paying." } },
        { type: "text", fields: { head: "A better path", body: "Phasing benefits out gradually lets families keep more of every raise as they move toward stability." } },
        { type: "end", fields: { head: "Let's make *work pay*", cta: "Learn more", url: "foropportunity.org" } }
      ] }
  ];
  S.MAX_SLIDES = 10;

  S.template = function (id) { for (var i = 0; i < S.TEMPLATES.length; i++) if (S.TEMPLATES[i].id === id) return S.TEMPLATES[i]; return null; };

  /* ---------- post model ----------
     {
       v: 1,                         schema version
       template: "stat",             template id
       size: "square",               key of S.SIZES, must be in template.sizes
       bg: "slate",                  key of S.BACKGROUNDS, must be in template.backgrounds
       photo: { src, x, y, zoom },   src: data URL or null. x/y: focal point 0..1. zoom: 1..3
       fields: { ... },              values for template.fields
       slides: [ { type, fields, photo } ]   carousel only; slide.photo has the same shape as post.photo
       preset: null                  id from S.PRESETS when one was applied (informational)
     } */
  S.emptyPhoto = function () { return { src: null, x: 0.5, y: 0.5, zoom: 1 }; };
  S.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  S.defaultSlide = function (type) {
    var t = S.SLIDE_TYPES[type], o = { type: type, fields: {}, photo: S.emptyPhoto() };
    t.fields.forEach(function (fd) { o.fields[fd.key] = ""; });
    if (type === "end") { o.fields.cta = "Learn more"; o.fields.url = "foropportunity.org"; }
    return o;
  };
  S.defaultPost = function (templateId) {
    var t = S.template(templateId) || S.TEMPLATES[0];
    var p = { v: 1, template: t.id, size: t.sizes[0], bg: t.backgrounds[0], photo: S.emptyPhoto(), fields: S.clone(t.defaults), slides: [], preset: null };
    if (t.carousel) p.slides = t.slides.map(function (s) { var d = S.defaultSlide(s.type); Object.keys(s.fields).forEach(function (k) { d.fields[k] = s.fields[k]; }); return d; });
    return p;
  };
  /* number of rendered images for a post: carousels render one per slide */
  S.slideCount = function (post) { var t = S.template(post.template); return t && t.carousel ? Math.max(1, post.slides.length) : 1; };
  /* bring any (possibly hand-edited or decoded) post back into a valid shape */
  S.normalizePost = function (p) {
    var t = S.template(p && p.template) || S.TEMPLATES[0], d = S.defaultPost(t.id);
    if (!p || typeof p !== "object") return d;
    var out = { v: 1, template: t.id,
      size: t.sizes.indexOf(p.size) >= 0 ? p.size : d.size,
      bg: t.backgrounds.indexOf(p.bg) >= 0 ? p.bg : d.bg,
      photo: Object.assign(S.emptyPhoto(), p.photo || {}), fields: {}, slides: [], preset: p.preset || null };
    t.fields.forEach(function (fd) { out.fields[fd.key] = typeof (p.fields || {})[fd.key] === "string" ? p.fields[fd.key] : (d.fields[fd.key] || ""); });
    if (t.carousel) {
      var src = Array.isArray(p.slides) && p.slides.length ? p.slides : d.slides;
      out.slides = src.slice(0, S.MAX_SLIDES).map(function (s) {
        var type = S.SLIDE_TYPES[s && s.type] ? s.type : "text", ds = S.defaultSlide(type);
        S.SLIDE_TYPES[type].fields.forEach(function (fd) { if (s.fields && typeof s.fields[fd.key] === "string") ds.fields[fd.key] = s.fields[fd.key]; });
        ds.photo = Object.assign(S.emptyPhoto(), s.photo || {});
        return ds;
      });
    }
    if (out.bg === "photo" && !t.photo) out.bg = d.bg;
    out.photo.x = Math.min(1, Math.max(0, +out.photo.x || 0.5)); out.photo.y = Math.min(1, Math.max(0, +out.photo.y || 0.5));
    out.photo.zoom = Math.min(3, Math.max(1, +out.photo.zoom || 1));
    return out;
  };

  /* ---------- text helpers shared by renderer, checks and captions ---------- */
  /* split "a *b c* d" into runs: [{text:"a ", hl:false},{text:"b c",hl:true},{text:" d",hl:false}] */
  S.parseHighlights = function (s) {
    var out = [], re = /\*([^*]+)\*/g, last = 0, m; s = String(s || "");
    while ((m = re.exec(s))) { if (m.index > last) out.push({ text: s.slice(last, m.index), hl: false }); out.push({ text: m[1], hl: true }); last = re.lastIndex; }
    if (last < s.length) out.push({ text: s.slice(last), hl: false });
    return out;
  };
  S.plain = function (s) { return String(s || "").replace(/\*/g, "").replace(/\s*\n\s*/g, " ").trim(); };
})();
