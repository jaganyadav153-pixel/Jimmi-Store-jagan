# AGENTS.md

## What this repo is
- Static "Jimmi Store" grocery storefront: plain HTML/CSS/JS, **no package.json, no build, no tests, no linter, no CI**. There is nothing to install or run — open `index.html` in a browser (or serve the folder: `python -m http.server`).
- No backend. Zero `fetch()`/XHR calls; all state is `localStorage`. Verification = open the page and check the browser console for errors.
- Git repo root is `C:\Users\Jagan` (the home directory), not this folder, and it has **zero commits**. Never `git add -A` / `git commit -a`; stage explicit file paths only. No `.gitignore` exists.

## Layout
- `index.html` (~900 lines) is the whole app: every section, drawer, modal, and the checkout UI live inline here. Most UI changes touch `index.html` + `assets/css/*` + `assets/js/*`.
- `agenda.html` is **misleadingly named** — it is the 4-step sign-up page (loads only `assets/js/auth.js`), linked from the login modal in `index.html`.
- `assets/js/` uses classic scripts, no ES modules/imports: cross-file access is via globals (`U`, `CATEGORIES`, `PRODUCTS`, `Store`, `Chat`, `window.Features`).
- `_archive/` holds an old prototype (`script.js`, `style.css`, `cube.js`, …) referenced by nothing. Do not wire it in.

## Script order is a hard dependency
`index.html:897-904` — keep this order when adding/changing script tags:
`data.js` (defines globals) → three.js CDN → `cube.js` → `loader.js` → `store.js` → `features.js` → `chat.js` → `app.js`.
- `app.js` is the bootstrap: on `DOMContentLoaded` it calls `Store.init()` and `Chat.init()` (both wrapped in try/catch).
- `cube.js`, `features.js`, `chat.js` call `Store.*` inside click handlers, so a bad order fails at runtime, not at parse time.
- New UI features are typically wired in `assets/js/features.js` (exposed as `window.Features`) or `app.js`.

## CSS
- Load order: `assets/css/base.css` (design tokens in `:root` + header/hero/footer/utilities) then `assets/css/components.css` (cards, cart, auth, checkout, drawers).
- Tokens to reuse instead of hardcoding: `--green`, `--cream`, `--orange`, `--ink`, `--muted`, `--line`, `--radius`, `--radius-sm`, `--maxw`, `--font`, `--shadow*`.
- Dark mode is `[data-theme="dark"]` on `<html>`, persisted as `jimmi_theme`.
- Inline `style="…"` attributes are used liberally in `index.html`; that is house style, not debris to clean up unprompted.

## Data & state
- Products/categories are hand-authored in `assets/js/data.js` (`PRODUCTS` with ids `p1`, `p2`…, `CATEGORIES`). Image URLs go through the `U(id)` helper (Unsplash) with `FALLBACK_IMG` so nothing ever renders broken.
- All persistence keys are prefixed `jimmi_` (`jimmi_user`, `jimmi_orders`, `jimmi_wishlist`, `jimmi_theme`, `jimmi_pincode`, `jimmi_subs`, `jimmi_recent_views`, `jimmi_recent_searches`, `jimmi_newsletter`). Grep `localStorage` before changing any state shape — it is read from many files.
- Login/OTP is a demo flow (the OTP is displayed in the UI) in both `app.js` and `auth.js`; there is no real auth.

## Chatbot
- `assets/js/chat.js` is **rule-based**, not ML: an `INTENTS` array (taxonomy derived from `grocery-chatbot-master-dataset.pdf`) plus per-intent `CONTRACTS`/handlers, all in that one file. Adding a capability means adding an intent entry + handler.
- The dataset PDF is duplicated at repo root and `assets/` (identical copies) — it is reference material only, never loaded by code.

## External deps / offline behavior
- Only network calls: Google Fonts, Unsplash images, three.js (loaded from unpkg; `cube.js` retries jsdelivr after 2.5s, then falls back to a pure-CSS 3D cube). The site is expected to keep working offline — preserve that degrade-gracefully pattern for anything new.

## Encoding
- Files are UTF-8 (no BOM) containing ₹ and emoji. In PowerShell 5.1 always pass `-Encoding UTF8` when reading/writing, otherwise you will create mojibake. Do not "repair" garbled-looking output by replacing characters — re-read the file as UTF-8 to confirm first.
- Known typo not to copy: `agenda.html` has a broken attribute `<div class=w"auth-feature">`.
