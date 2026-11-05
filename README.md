# Georgia Center for Opportunity brand guidelines

Static brand guide for Georgia Center for Opportunity, built to be hosted on GitHub Pages. No build step needed.

## Publish on GitHub Pages at brand.foropportunity.org

1. Create a repository (for example `foropportunity/gco-brand`) and upload everything in this folder, including the hidden `.nojekyll` file and the `CNAME` file (it contains `brand.foropportunity.org`).
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
3. In your DNS provider for foropportunity.org, add one record:
   - Type: `CNAME`
   - Host/Name: `brand`
   - Value/Target: `<your-github-org-or-username>.github.io`
4. Back in **Settings → Pages**, confirm the custom domain shows `brand.foropportunity.org`. Once the DNS check passes (usually minutes, up to 24 hours), tick **Enforce HTTPS**.
5. Optional but recommended: verify the domain under your GitHub organization's **Settings → Pages → Verified domains** so no one else can claim it.

## What's inside

| Path | What it is |
| --- | --- |
| `brand-guide.md` | The whole guide in plain text for AI tools (Claude, ChatGPT and others), with instructions for them. Linked from the "Using AI" section and `llms.txt` |
| `llms.txt` | Points AI tools to `brand-guide.md` |
| `index.html` | All guide content (14 sections, Edition 02 built on the foropportunity.org design system: Inter, slate #2F4F68, orange #FFA149, teal #78B2B9) |
| `assets/css/site.css` | Styles and design tokens |
| `assets/js/site.js` | Palette data, contrast checker, social template editor and other interactions |
| `assets/logo/` | Logo SVGs and PNGs (traced from the official logo image on foropportunity.org; replace with the designer's original vectors when available, keeping the file names) |
| `assets/backgrounds/` | Ring backgrounds (light, slate, transparent overlay) in 1:1, 4:5, 9:16 and 16:9 (SVG + PNG) |
| `assets/examples/` | Current LinkedIn posts, shown for reference in the Social section |
| `assets/fonts/` | Self-hosted Inter (SIL Open Font License) |
| `assets/downloads/` | Logo pack, background pack, tokens JSON, email starter |

## Updating

- **Whenever you change the guide, make the same change in `brand-guide.md`.** It is the copy AI tools read, so it must match `index.html`. The website is the source of truth.

- Change copy directly in `index.html`. Each section is marked with a comment such as `<!-- 06 MESSAGING -->`.
- Change colors in the `PALETTE` list at the top of `assets/js/site.js` and in the `:root` block of `assets/css/site.css`.
- Change social templates in the `TEMPLATES` list in `assets/js/site.js`.
- Or ask Claude in the "GCO Brand" project to make the change and send you updated files.
