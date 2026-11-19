# Brand site: working rules

This repo is the Georgia Center for Opportunity brand guide, served by GitHub Pages at https://brand.foropportunity.org from `main` (no build step).

## Keep brand-guide.md in sync (required)

`brand-guide.md` is the plain-text AI edition of the guide. AI tools read it instead of the website, so it must say the same thing as `index.html`.

- Every change to guide content, wording, rules, or examples goes into `brand-guide.md` in the same commit. That covers `index.html` and text shown on the page from `assets/js/` (palette roles, contrast pairs, social template defaults, presets, and brand-check messages).
- If the change touches the site's section list or what it links to, update `llms.txt` too.
- Before every commit or deploy, compare the changed sections of `index.html` with the matching sections of `brand-guide.md` and fix any differences. The website is the source of truth.
- A project hook (`.claude/hooks/check-guide-sync.sh`) blocks `git commit` and `git push` when `index.html` or `assets/js/` changed but `brand-guide.md` didn't. If a change really has no guide content (a pure code or style fix), put `GUIDE_SYNC_OK=1` at the start of the git command, and say why in the commit message.

## Follow the guide's own rules

The site's copy and examples must follow the GCO style guide rules in the Writing style section, especially:

- Sentence case for every title, heading, button, label, and example. Proper nouns keep their capitals. Never use Title Case.
- A comma before the last item in a series (work, family, and community).
- Numbers: spell out one through nine; use "more than," not "+"; use the % symbol.
- Spell out an acronym on first use, with the acronym in parentheses.
- Approved copy in Messaging is verbatim. Don't edit it without the Communications team's sign-off.

## Checking a change

Run `python3 -m http.server` in the repo root, open the page, and check the browser console for errors. For social template changes, call `GCOSocial.checkPost(GCOSocial.defaultPost(id))` for each template: the default text shouldn't trigger any brand-check warnings.
