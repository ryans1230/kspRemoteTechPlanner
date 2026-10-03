# Deployment Guide

## GitHub Pages (Primary)

This is a **static site** — no build step, no bundler, no server-side rendering.

### Setup

1. Push to GitHub repository
2. Enable GitHub Pages: Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `/ (root)`
3. Site available at `https://<username>.github.io/<repo>/`

### Requirements

- `index.html` at repository root (entry point)
- All JS modules use relative imports (`./js/...`)
- No `package.json` dependencies needed at runtime
- `jsdom`, `oxlint`, `oxfmt`, `serve` are dev dependencies only

### How It Works

```
index.html
  └── <script type="module" src="js/main.js"></script>
        └── imports js/store.js, js/views/*.js, js/calculator/*.js, etc.
              └── Browser loads ES modules directly via HTTP
```

### Cache Considerations

- GitHub Pages serves with caching headers
- Module imports are cached by browser
- After updates: users may need hard refresh (Ctrl+F5) or wait for cache expiry
- No cache-busting needed for typical usage

---

## Local Development

```bash
# Install dev dependencies
npm install

# Start dev server (serves root on port 8712)
npm run dev
# → http://localhost:8712/
```

### Dev Server Details

- Uses `serve` package (included in devDependencies)
- Serves current directory as static files
- No hot reload — refresh browser after changes
- ES modules load directly from filesystem via HTTP

---

## Running Tests

```bash
# Unit tests (Node.js, no browser)
npm test

# Smoke test (mounts all views in jsdom)
npm run smoke

# Drive test (simulates user interactions in jsdom)
npm run drive

# Import verification
npm run check-imports

# Lint
npm run lint

# Format
npm run format
```

---

## CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

Runs on every PR:
1. `npm test` — Unit tests
2. `npm run smoke` — View mount + mutation
3. `npm run check-imports` — Import resolution
4. `npm run lint` — oxlint
5. `npm run format` — oxfmt (check mode)

### Required Status Checks

All 5 jobs must pass for PR merge.

---

## Browser Compatibility

- **ES Modules** — Requires modern browser (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+)
- **No transpilation** — Code runs as-written
- **JSDoc types** — Not TypeScript; no compilation needed
- **No polyfills** — Uses standard APIs only

---

## File Structure for Deployment

```
/
├── index.html          # Entry point
├── app.css             # Styles
├── .nojekyll           # Disables Jekyll processing on GitHub Pages
├── js/
│   ├── main.js
│   ├── reactive.js
│   ├── html.js
│   ├── store.js
│   ├── format.js
│   ├── data/
│   │   ├── antennas-stock-raw.js
│   │   ├── antennas-remotetech-raw.js
│   │   ├── antennas-realantennas-raw.js
│   │   ├── antenna-types.js
│   │   └── bodies.js
│   ├── calculator/
│   │   ├── stock-antenna.js
│   │   ├── remote-tech-antenna.js
│   │   ├── realantennas-antenna.js
│   │   ├── satellite.js
│   │   ├── orbital.js
│   │   ├── euclidean.js
│   │   └── point.js
│   └── views/
│       ├── planner.js
│       ├── entireView.js
│       ├── nightView.js
│       ├── singleLaunchView.js
│       ├── multiLaunchView.js
│       ├── dataInput.js
│       ├── settings.js
│       ├── bodyEdit.js
│       ├── antennaEdit.js
│       ├── craft.js
│       └── description.js
├── docs/               # Documentation (not loaded by app)
├── test/               # Tests (not loaded by app)
├── vendor/             # Source cfg files (not loaded by app)
├── package.json        # Dev dependencies only
└── README.md
```

---

## Troubleshooting

### "Failed to resolve module specifier"

- Check import paths in JS files
- Run `npm run check-imports` to verify
- All imports must be relative (`./` or `../`) or absolute (`/js/...`)

### CORS Errors Opening index.html Directly

- ES modules require HTTP(S), not `file://`
- Use `npm run dev` or any static server
- `npx serve .` works too

### Changes Not Reflecting

- Browser caches modules aggressively
- Hard refresh: Ctrl+Shift+R (Windows/Linux), Cmd+Shift+R (Mac)
- Or open DevTools → Network → "Disable cache"

### GitHub Pages 404 on Subpaths

- This is a single-page app with hash routing (`#planner`, `#settings`, etc.)
- All navigation stays on `index.html`
- No server-side routing needed

---

## Performance Notes

- No build step = zero bundle size overhead
- Modules loaded on-demand (tab lazy-mounting in `main.js`)
- Initial load: `main.js` + `store.js` + `reactive.js` + `html.js` + `format.js` + `planner.js` + `dataInput.js`
- Other views load when tab first visited

---

## Security

- No user input sent to server
- All data in `localStorage` (client-side only)
- No cookies, no tracking, no external requests
- Content Security Policy: not strictly needed but can add:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self';">
```

---

## Custom Domain (Optional)

1. Add `CNAME` file to repo root with domain name
2. Configure DNS: CNAME → `<username>.github.io`
3. Enable HTTPS in GitHub Pages settings