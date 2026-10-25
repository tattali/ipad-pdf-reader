// Drives the reader in headless Chrome at iPad 2 size and checks page turns.
// Run: CHROME_PATH=<chrome-headless-shell> deno run -A tools/smoke.js <url> <sample.pdf> [screenshot-dir]
// Chrome is not iOS 9 Safari: this checks the logic, not old-Safari support.
import puppeteer from "npm:puppeteer-core@24";

const [url, pdf, shots] = Deno.args;
const browser = await puppeteer.launch({ executablePath: Deno.env.get("CHROME_PATH"), headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const landscape = { width: 1024, height: 768, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
const portrait = { ...landscape, width: 768, height: 1024 };
let failed = 0;
const label = () => page.$eval("#where", (e) => e.textContent);
const canvases = () => page.$$eval("#pages canvas", (c) => c.length);
async function expect(name, want) {
  await new Promise((r) => setTimeout(r, 400));
  const got = await label();
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got}${ok ? "" : ` (want ${want})`}, ${await canvases()} canvas(es)`);
  if (shots) await page.screenshot({ path: `${shots}/${name.replace(/\W+/g, "-")}.png` });
}

await page.setViewport(landscape);
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });

await (await page.$("#file")).uploadFile(pdf);
await page.waitForSelector("#pages canvas");
await expect("opened with the cover alone", "1 / 9");
await page.touchscreen.tap(950, 400);
await expect("tap right edge", "2–3 / 9");
await page.touchscreen.tap(950, 400);
await expect("tap right edge again", "4–5 / 9");
await page.touchscreen.tap(60, 400);
await expect("tap left edge", "2–3 / 9");
await page.touchscreen.touchStart(700, 400);
await page.touchscreen.touchMove(400, 410);
await page.touchscreen.touchEnd();
await expect("swipe left", "4–5 / 9");
await page.touchscreen.tap(512, 400);
const barShown = await page.$eval("#bar", (b) => b.className === "");
console.log(`${barShown ? "ok  " : "FAIL"} tap middle shows the menu`);
if (!barShown) failed++;
await page.click("#cover");
await expect("cover alone off", "3–4 / 9");
const hint = await page.$eval("#cover-hint", (e) => e.textContent);
const hintOk = hint === "Pages in pairs: 1–2, 3–4…";
console.log(`${hintOk ? "ok  " : "FAIL"} cover hint: ${hint}`);
if (!hintOk) failed++;
await page.setViewport(portrait);
await expect("portrait shows one page", "3 / 9");
await page.setViewport(landscape);
await page.reload({ waitUntil: "load" });

const macShown = await page.waitForFunction(() => !document.getElementById("mac").hidden, { timeout: 3000 })
  .then(() => true, () => false);
if (macShown) {
  await page.click("#mac");
  await page.waitForSelector("#list-items button");
  await page.click("#list-items button");
  await page.waitForSelector("#pages canvas");
  await expect("reopened from the Mac at the saved page", "3–4 / 9");
} else {
  console.log("skip From the Mac: no PDF folder served");
}

for (const e of errors) console.log(`FAIL console: ${e}`);
await browser.close();
Deno.exit(failed + errors.length ? 1 : 0);
