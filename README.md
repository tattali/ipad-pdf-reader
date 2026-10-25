# iPad PDF Reader

A web app that shows PDFs two pages side by side on an iPad 2 (iOS 9.3.5). It runs entirely in Safari: no PDF is ever uploaded. Once added to the Home Screen, it works offline.

- Landscape shows two pages, portrait shows one. "Cover alone" keeps the first page on its own so book spreads line up.
- Tap the right or left edge, or swipe, to turn pages. Tap the middle for the menu. Pinch to zoom.
- It remembers the last page of each PDF.

## Install on an iPad 2

Do these steps on the iPad, in Safari.

**1. Install the certificate (once).** iOS 9 does not trust the certificate that GitHub Pages uses, so the app will not open until you add it.

- Tap this link: [Install the certificate](https://cdn.jsdelivr.net/gh/tattali/ipad-pdf-reader@main/certs/isrgrootx1.der)
- The "Install Profile" screen opens. It shows "ISRG Root X1". Tap **Install** (top right).
- Enter your passcode if asked, tap **Install** again, then **Done**.

This is Let's Encrypt's root certificate, the one newer iPads already trust. Its SHA-256 fingerprint is `96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6`. You can remove it any time in Settings → General → Profiles.

**2. Install the app.**

- Tap this link: [Open the reader](https://tattali.github.io/ipad-pdf-reader/)
- Tap the Share button, then **Add to Home Screen**, then **Add**.

**3. Let it save itself for offline use.** Open the reader from its Home Screen icon while on Wi-Fi and wait 10 seconds. After that it works with no network.

## Why it looks old-fashioned

iOS 9 Safari has no WebAssembly, no service workers and no modern JavaScript. So:

- All code is plain ES5 with no build step. `tests/app_test.js` fails if a script is not ES5.
- PDF.js is pinned to 2.6.347 (its `es5` build), the newest release that parses on iOS 9.
- Offline support uses Application Cache (`app.appcache`). Change its `# version` line on every release, or installed iPads keep the old files.
- `github.io` uses a Let's Encrypt certificate that iOS 9 does not trust. The iPad installs `certs/isrgrootx1.der` once, downloaded through jsDelivr: its certificate chains to a root iOS 9 trusts, and it serves `.der` files as `application/x-x509-ca-cert`, which opens the profile installer.

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
