/* Georgia Center for Opportunity brand guide: social templates, brand checks.
   S.checkPost(post) reads a post and returns plain-English issues based on brand-guide.md
   (Names, Typography, Voice, Writing style, Social media, Guardrails).
   Pure: no DOM, no state. Runs on every keystroke, so it is cheap and never throws. */
(function () {
  "use strict";
  var S = window.GCOSocial = window.GCOSocial || {};

  /* ---------- the rules (documented for the UI and for reviewers) ---------- */
  S.CHECK_RULES = [
    { id: "avoid-words",     severity: "error", description: "Words we avoid (Voice): the poor, the needy, handouts, victims, dependency, broken families, at-risk kids, liberal / conservative, game-changer, unprecedented." },
    { id: "word-list",       severity: "warn",  description: "Word list (Writing style): benefit cliffs; child care, day care, health care (two words); email; nonprofit; safety net; task force; midterm." },
    { id: "names",           severity: "error", description: "Names: never call the organization \"For Opportunity\"; BETTER WORK is always in capitals; the website is always lowercase (foropportunity.org)." },
    { id: "numbers",         severity: "warn",  description: "Numbers (Writing style): \"more than 2,000\" not \"2,000+\"; \"million\" not \"M\"; the % symbol not \"percent\"; commas in numbers above 999." },
    { id: "click-here",      severity: "warn",  description: "Links (Writing style): use descriptive words like \"learn more\", never \"click here\"." },
    { id: "sentence-case",   severity: "warn",  description: "Capitalization (Typography, Writing style): every headline, label, button and line of text uses sentence case. Capitalize only the first word and proper nouns." },
    { id: "required",        severity: "error", description: "Required fields (Guardrails): every number needs a source and a year." },
    { id: "source-year",     severity: "warn",  description: "Sources (Guardrails): a source for a number needs a four-digit year." },
    { id: "char-limit",      severity: "warn",  description: "Length (Social media): keep each field within its character limit so text stays large and readable." },
    { id: "all-caps",        severity: "warn",  description: "All caps (Typography): avoid all caps except very short labels and BETTER WORK." },
    { id: "exclamation",     severity: "tip",   description: "Voice: hopeful and plain-spoken; use one exclamation mark at most per post." },
    { id: "first-names",     severity: "warn",  description: "Stories and consent (Guardrails): first names only, with a signed release." },
    { id: "carousel-length", severity: "tip",   description: "Carousels: use 3 to 10 slides." },
    { id: "carousel-end",    severity: "tip",   description: "Carousels: end with a Closing slide so the post ends with a next step." }
  ];

  /* ---------- word lists ---------- */
  var AVOID = [
    { re: /\bthe\s+poor\b/gi,                              alt: "families, parents or Georgians" },
    { re: /\bthe\s+needy\b/gi,                             alt: "families, parents or Georgians" },
    { re: /\bhand-?outs\b/gi,                              alt: "support" },
    { re: /\bvictims?\b/gi,                                alt: "people or families" },
    { re: /\bdependency\b/gi,                              alt: "the barrier you mean, e.g. benefit cliffs" },
    { re: /\bbroken\s+(?:famil(?:y|ies)|homes?)\b/gi,      alt: "families facing stress at home" },
    { re: /\bat[-\s]risk\s+(?:kids|children|youth)\b/gi,   alt: "kids, children or young people" },
    { re: /\bgame[-\s]?changers?\b/gi,                     alt: "what changed and why it matters" },
    { re: /\bunprecedented\b/gi,                           alt: "what's new, with a source" },
    { re: /\b(?:liberals?|conservatives?)\b/gi,            alt: "nonpartisan wording such as \"lawmakers from both parties\"", soft: true }
  ];
  var WORDS = [
    { re: /\bbenefits[-\s]+cliff\b/gi,  good: "benefit cliff" },
    { re: /\bbenefits[-\s]+cliffs\b/gi, good: "benefit cliffs" },
    { re: /\bchild-?care\b/gi,          good: "child care" },
    { re: /\bhealth-?care\b/gi,         good: "health care" },
    { re: /\bday-?care\b/gi,            good: "day care" },
    { re: /\be-mails?\b/gi,             good: "email" },
    { re: /\bnon-profits?\b/gi,         good: "nonprofit" },
    { re: /\bsafety-nets?\b/gi,         good: "safety net" },
    { re: /\btask-?forces?\b/gi,        good: "task force" },
    { re: /\bmid-terms?\b/gi,           good: "midterm" }
  ];
  /* short words that don't start a name */
  var MINOR = toSet("a an the and but or for nor so yet at by in of on to up as is if via vs per from with into onto than off en de");
  /* program and role words: "RHCK Graduate" or "Program Participant" is not a person's full name */
  var ROLE = toSet("graduate graduates grad participant participants parent parents mom mother father dad grandmother grandfather grandparent " +
    "educator facilitator partner volunteer member alum alumna alumnus student coach mentor staff director manager leader pastor teacher " +
    "employer jobseeker job-seeker cohort class team family neighbor client attendee instructor specialist coordinator officer president " +
    "founder owner worker resident trainee intern advocate friend supporter donor program initiative community church school " +
    "rhck better work raising highly capable kids alliance opportunity georgia center gco a4o jobs life atlanta county");
  /* proper names removed before judging sentence case, so they don't count as Title Case */
  var PROPER = /Georgia Center for Opportunity|Occupational Licensing Index|Alliance for Opportunity|Raising Highly Capable Kids|Jobs for Life|BETTER WORK|Better Work|United States|Census Bureau|Georgians?|Atlanta|America(?:ns?)?|Congress|Medicaid|Medicare|COVID-19|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\bI\b/g;

  function toSet(s) { var o = {}; s.split(" ").forEach(function (w) { o[w] = true; }); return o; }
  function str(v) { return typeof v === "string" ? v : (typeof v === "number" && isFinite(v) ? String(v) : ""); }
  function noMarks(s) { return s.replace(/\*/g, ""); }
  function q(s) { return "\u201C" + s + "\u201D"; }
  function commas(d) { return d.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function list(words) { var u = []; words.forEach(function (w) { if (u.indexOf(w) < 0) u.push(w); }); return u.slice(0, 3).map(q).join(", ") + (u.length > 3 ? " and " + (u.length - 3) + " more" : ""); }

  /* ---------- collect the text a post shows ---------- */
  function fieldDefs(defs, values) {
    if (Array.isArray(defs) && defs.length) return defs;
    /* unknown template or slide type: check whatever strings are there, with no case rule */
    return Object.keys(values || {}).map(function (k) { return { key: k, label: k, kind: "input", case: "none", max: 0, required: false }; });
  }
  function collect(post, tpl) {
    var items = [], fields = post.fields && typeof post.fields === "object" ? post.fields : {};
    fieldDefs(tpl && tpl.fields, fields).forEach(function (fd) {
      if (fd && fd.key) items.push({ fd: fd, key: fd.key, slide: null, value: str(fields[fd.key]), slideType: null, stat: !!tpl && tpl.id === "stat" });
    });
    if (tpl && tpl.carousel && Array.isArray(post.slides)) {
      post.slides.forEach(function (s, i) {
        if (!s || typeof s !== "object") return;
        var st = S.SLIDE_TYPES && S.SLIDE_TYPES[s.type], sf = s.fields && typeof s.fields === "object" ? s.fields : {};
        fieldDefs(st && st.fields, sf).forEach(function (fd) {
          if (fd && fd.key) items.push({ fd: fd, key: fd.key, slide: i, value: str(sf[fd.key]), slideType: st ? st.id : null, stat: !!st && st.id === "stat" });
        });
      });
    }
    return items;
  }

  /* ---------- individual rules ---------- */
  function checkAvoid(it, add) {
    AVOID.forEach(function (w) {
      w.re.lastIndex = 0; var m = w.re.exec(it.text);
      if (m) add(w.soft ? "warn" : "error", "avoid-words", "Avoid " + q(m[0]) + ". Try " + w.alt + " instead (Words we avoid).");
    });
  }
  function checkWordList(it, add) {
    WORDS.forEach(function (w) {
      w.re.lastIndex = 0; var m = w.re.exec(it.text);
      if (m) add("warn", "word-list", "Write " + q(w.good) + ", not " + q(m[0]) + " (Word list).");
    });
  }
  function checkWebsite(it, add) {
    var re = /[A-Za-z0-9.-]*foropportunity\.org/gi, m;
    while ((m = re.exec(it.text))) {
      if (m[0] !== m[0].toLowerCase()) { add("error", "names", "Write the website in lowercase: foropportunity.org (Names)."); return; }
    }
  }
  /* words before "For Opportunity" that make it read as a name ("Join For Opportunity", "the For Opportunity team") */
  function checkNames(it, add) {
    var t = it.text, re = /For\s+Opportunity\b/g, m;
    /* "For Opportunity" as a name. Fine inside "Georgia Center for Opportunity", "Alliance for Opportunity" and the domain. */
    while ((m = re.exec(t))) {
      var before = t.slice(0, m.index);
      if (/(?:center|alliance)\s+$/i.test(before)) {
        add("warn", "names", "Write " + q((/alliance\s+$/i.test(before) ? "Alliance" : "Georgia Center") + " for Opportunity") + " with a lowercase " + q("for") + " (Names).");
        continue;
      }
      if (/[@#\w]$/.test(before)) continue;                    /* part of a handle or word */
      var prev = before.replace(/\s+$/, "").split(/\s+/).pop() || "";
      add("error", "names", "Don't call us " + q("For Opportunity") + ". Write " + q("Georgia Center for Opportunity") + " or " + q("GCO") + " (Names).");
      break;
    }
    /* BETTER WORK, always in capitals */
    var bw = /\bbetter\s+work\b(?!-)/gi;
    while ((m = bw.exec(t))) {
      if (m[0] === "BETTER WORK" || /^BETTER\s+WORK$/.test(m[0])) continue;
      var after = t.slice(m.index + m[0].length), capW = /W/.test(m[0].charAt(m[0].length - 4)), capB = m[0].charAt(0) === "B";
      var programAfter = /^['\u2019]?s?\s+(?:program|initiative|cohorts?|class(?:es)?|participants?|graduates?|grads?|team|partners?|sites?|staff|coach(?:es)?)\b/i.test(after);
      var preceded = t.slice(0, m.index);
      var atStart = !preceded.trim() || /[.!?:\n]\s*$/.test(preceded);
      if (it.key === "eyeb" || programAfter || /\b(?:in|joined|join|through|with|from)\s+$/i.test(preceded) && (capB || capW)) {
        add("error", "names", "Write " + q("BETTER WORK") + " in all capital letters, always (Names)."); return;
      }
      if (capW || (capB && !atStart)) {
        add("error", "names", "Write " + q("BETTER WORK") + " in all capital letters, always (Names)."); return;
      }
    }
  }
  function checkNumbers(it, add) {
    var t = it.text, m;
    if ((m = /(\d[\d,.]*)\+(?![\d+])/.exec(t))) add("warn", "numbers", "Write " + q("more than " + m[1]) + ", not " + q(m[0]) + " (Numbers).");
    if ((m = /(^|[^\w.])(\$?)(\d+(?:\.\d+)?)\s?(M|B)\b/.exec(t)) && (m[4] === "M" || m[2])) {
      add("warn", "numbers", "Write " + q(m[2] + m[3] + (m[4] === "M" ? " million" : " billion")) + ", not " + q(m[2] + m[3] + m[4]) + " (Numbers).");
    }
    if ((m = /(\d[\d,.]*)\s*(?:percent|per\s+cent)\b/i.exec(t))) add("warn", "numbers", "Use the % symbol: write " + q(m[1] + "%") + ", not " + q(m[0]) + " (Numbers).");
    var re = /\d[\d,]*/g;
    while ((m = re.exec(t))) {
      var d = m[0].replace(/,+$/, "");
      if (d.indexOf(",") >= 0 || d.length < 4) continue;
      var pc = t.charAt(m.index - 1), nc = t.charAt(m.index + d.length);
      if (/^\s*(?:x|\u00D7|px)\b/i.test(t.slice(m.index + d.length)) || /(?:x|\u00D7)\s*$/i.test(t.slice(0, m.index))) continue; /* pixel sizes */
      if (/[A-Za-z0-9.\-\/#:@_]/.test(pc) || /[A-Za-z0-9\-\/_]/.test(nc) || (nc === "." && /\d/.test(t.charAt(m.index + d.length + 1)))) continue;
      if (d.length === 4 && +d >= 1800 && +d <= 2199) continue;                       /* a year */
      if (d.length === 5 && /\b(?:GA|Georgia)\s*$/.test(t.slice(0, m.index))) continue; /* a ZIP code */
      if (/\S*(?:\.[a-z]{2,}|\/)\S*$/i.test(t.slice(0, m.index))) continue;            /* inside a web address */
      if (d.charAt(0) === "0") continue;
      add("warn", "numbers", "Use commas in numbers above 999: write " + q(commas(d)) + " (Numbers).");
      break;
    }
  }
  function checkClickHere(it, add) {
    var m = /\bclick\s+here\b/i.exec(it.text);
    if (m) add("warn", "click-here", "Use descriptive words like " + q("learn more") + ", not " + q(m[0]) + " (Links).");
  }
  function checkAllCaps(it, add) {
    var words = it.text.replace(/BETTER\s+WORK/g, " ").split(/\s+/), run = 0, worst = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!/[A-Za-z]/.test(w)) continue;                     /* numbers and symbols don't break a run */
      if (/[a-z]/.test(w)) { run = 0; continue; }
      run++; if (run > worst) worst = run;
    }
    if (worst > 3) add("warn", "all-caps", "Avoid all caps except very short labels; use sentence case (Typography).");
  }
  /* does this token end a sentence? "U.S.", "D.C.", "p.m." and "Dr." don't */
  function ends(tok) {
    var t = tok.replace(/["'\u201D\u2019)\]]+$/, "");
    if (/^[\u2014\u2013-]$/.test(t)) return true;
    if (!/[.?!:\u2014]$/.test(t)) return false;
    if (/\.$/.test(t) && (/[A-Za-z]\.[A-Za-z]\.$/.test(t) || /^(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|No|Inc|Co|etc)\.$/i.test(t.replace(/^\W+/, "")))) return false;
    return true;
  }
  function core(tok) { return tok.replace(/^[^A-Za-z0-9#$@]+/, "").replace(/[^A-Za-z0-9]+$/, ""); }
  function checkSentence(it, add) {
    var eligible = 0, caps = 0;
    it.text.replace(PROPER, " ").split("\n").forEach(function (line) {
      var first = true;
      line.split(/\s+/).forEach(function (tok) {
        var c = core(tok), isFirst = first;
        if (!c) return;
        first = ends(tok);
        if (isFirst || !/^[A-Za-z]/.test(c) || /\d/.test(c) || c.length < 2 || !/[a-z]/.test(c)) return; /* first word, acronyms, numbers */
        eligible++; if (/^[A-Z]/.test(c)) caps++;
      });
    });
    /* long text: mostly capitalized words; short headlines, labels and buttons: any run of capitalized words */
    var short = (+it.fd.max || 0) <= 110;
    if ((eligible >= 3 && caps >= 3 && caps / eligible >= 0.75) || (short && caps >= 1 && caps * 2 >= eligible)) add("warn", "sentence-case", "Use sentence case here: capitalize only the first word and names (Capitalization).");
  }
  function checkLimits(it, add) {
    var fd = it.fd, max = +fd.max || 0;
    if (fd.kind === "lines") {
      var lines = it.value.split("\n").filter(function (l) { return l.trim(); }), cap = /up to (\d+)/i.exec(fd.label || "");
      if (cap && lines.length > +cap[1]) add("warn", "char-limit", "Use up to " + cap[1] + " items, one per line; this has " + lines.length + " (Length).");
      if (max) lines.forEach(function (l, i) {
        var n = noMarks(l).trim().length;
        if (n > max) add("warn", "char-limit", "Item " + (i + 1) + " is " + n + " characters; keep it to " + max + " or fewer (Length).");
      });
      return;
    }
    var len = noMarks(it.value).replace(/\s*\n\s*/g, " ").trim().length;
    if (max && len > max) add("warn", "char-limit", (fd.label || "This field") + " is " + len + " characters; keep it to " + max + " or fewer (Length).");
  }
  function checkWho(it, add) {
    var t = it.text.split(/[,(\u2014\u2013|]/)[0].trim();
    var toks = t.split(/\s+/), m;
    if ((m = /^(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z][a-z]/.exec(t))) { add("warn", "first-names", "Use first names only, with a signed release (Guardrails)."); return; }
    for (var i = 0; i + 1 < toks.length; i++) {
      var a = core(toks[i]), b = core(toks[i + 1]);
      if (/^[A-Z][a-z'\u2019\-]+$/.test(a) && /^[A-Z][a-z'\u2019\-]+[a-z]$/.test(b) && !ROLE[a.toLowerCase()] && !ROLE[b.toLowerCase()] && !MINOR[b.toLowerCase()]) {
        add("warn", "first-names", "Use first names only, with a signed release (Guardrails).");
        return;
      }
    }
  }

  var ORDER = { error: 0, warn: 1, tip: 2 };

  S.checkPost = function (post) {
    var out = [];
    try {
      if (!post || typeof post !== "object") return out;
      var tpl = S.template ? S.template(post.template) : null;
      var items = collect(post, tpl), bangs = 0, bangAt = null, seen = {};

      items.forEach(function (it) {
        try {
          it.text = noMarks(it.value);
          var fd = it.fd, key = it.key, empty = !it.value.trim();
          var add = function (sev, rule, msg) {
            var sig = rule + "|" + it.slide + "|" + key + "|" + msg;
            if (seen[sig]) return; seen[sig] = true;
            out.push({ severity: sev, field: key, slide: it.slide, message: msg, rule: rule });
          };
          if (empty) {
            if (fd.required) add("error", "required", key === "source" ? "Every number needs a source and a year (Guardrails)." : "Add " + (fd.label || key).toLowerCase() + "; it's required.");
            return;
          }
          checkLimits(it, add);
          checkWebsite(it, add);
          if (key === "source" || key === "url") return;    /* names of sources and addresses: only length and lowercase web address */
          checkAvoid(it, add);
          checkWordList(it, add);
          checkNames(it, add);
          checkNumbers(it, add);
          checkClickHere(it, add);
          if (key !== "stat") checkAllCaps(it, add);
          if (fd.case === "sentence") checkSentence(it, add);
          if (key === "who" && (post.template === "quote" || it.slideType === "quote")) checkWho(it, add);
          var b = it.text.match(/!/g);
          if (b) { bangs += b.length; if (bangs > 1 && bangAt === null) bangAt = it; }
        } catch (e) { /* one bad field never stops the rest */ }
      });

      /* a number needs a source with a year (big stat template and stat slides) */
      var groups = {};
      items.forEach(function (it) { if (it.key === "stat" || it.key === "source") { var g = groups[it.slide === null ? "p" : it.slide] = groups[it.slide === null ? "p" : it.slide] || {}; g[it.key] = it; } });
      Object.keys(groups).forEach(function (k) {
        var g = groups[k];
        if (g.stat && g.source && /\d/.test(g.stat.value) && g.source.value.trim() && !/(?:^|\D)(?:1[89]|2[01])\d{2}(?!\d)/.test(g.source.value)) {
          out.push({ severity: "warn", field: "source", slide: g.source.slide, rule: "source-year", message: "Add the year to the source, e.g. " + q("U.S. Census Bureau, 2025") + " (Guardrails)." });
        }
      });

      if (bangs > 1) out.push({ severity: "tip", field: bangAt ? bangAt.key : null, slide: bangAt ? bangAt.slide : null, rule: "exclamation", message: "Use one exclamation mark at most per post; let the words carry the energy (Voice)." });

      if (tpl && tpl.carousel) {
        var slides = Array.isArray(post.slides) ? post.slides.filter(function (s) { return s && typeof s === "object"; }) : [];
        var max = S.MAX_SLIDES || 10;
        if (slides.length < 3) out.push({ severity: "tip", field: null, slide: null, rule: "carousel-length", message: "Carousels work best with 3 to " + max + " slides; this has " + slides.length + "." });
        else if (slides.length > max) out.push({ severity: "warn", field: null, slide: null, rule: "carousel-length", message: "Use " + max + " slides or fewer; this has " + slides.length + "." });
        if (slides.length && !slides.some(function (s) { return s.type === "end"; })) out.push({ severity: "tip", field: null, slide: null, rule: "carousel-end", message: "End with a Closing slide so people know what to do next (Ready to publish)." });
      }
    } catch (e) { /* never throw: return what we have */ }
    return out.map(function (x, i) { x._i = i; return x; })
      .sort(function (a, b) { return (ORDER[a.severity] - ORDER[b.severity]) || (a._i - b._i); })
      .map(function (x) { delete x._i; return x; });
  };
})();
