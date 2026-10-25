# iPad PDF Reader

A web app that shows PDFs two pages side by side on an iPad 2 (iOS 9.3.5). It runs entirely in Safari: no PDF is ever uploaded. Once added to the Home Screen, it works offline.

- Landscape shows two pages, portrait shows one. "Cover alone" keeps the first page on its own so book spreads line up.
- Tap the right or left edge, or swipe, to turn pages. Tap the middle for the menu. Pinch to zoom.
- It remembers the last page of each PDF.

## Why it looks old-fashioned

iOS 9 Safari has no WebAssembly, no service workers and no modern JavaScript. So:

- All code is plain ES5 with no build step. `tests/app_test.js` fails if a script is not ES5.
- PDF.js is pinned to 2.6.347 (its `es5` build), the newest release that parses on iOS 9.
- Offline support uses Application Cache (`app.appcache`). Change its `# version` line on every release, or installed iPads keep the old files.
- `github.io` uses a Let's Encrypt certificate that iOS 9 does not trust. The iPad needs `certs/isrgrootx1.der` installed once as a profile.

## Run from the Mac

```sh
bin/serve ~/path/to/pdfs        # serves the app, the folder's PDFs and the certificate on port 8000
```

The copy served by the Mac adds a "From the Mac" button that lists the folder's PDFs.

## Checks

```sh
deno test -A tests/
CHROME_PATH=<chrome-headless-shell> deno run -A tools/smoke.js http://localhost:8000/ sample.pdf
```

`tools/make-sample-pdf.swift` writes a numbered test PDF and `tools/make-icon.swift` draws `icon.png`. The smoke test drives headless Chrome at iPad size: it checks the logic, not iOS 9 itself.

PDF.js is © Mozilla, Apache License 2.0 (`vendor/pdfjs-2.6.347/LICENSE`).
