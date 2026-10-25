import { assert, assertEquals } from "jsr:@std/assert@1";
import * as acorn from "npm:acorn@8";

const root = new URL("../", import.meta.url);
const read = (path) => Deno.readTextFile(new URL(path, root));

async function manifestEntries() {
  const lines = (await read("app.appcache")).split("\n");
  const entries = [];
  for (const line of lines.slice(1)) {
    const entry = line.trim();
    if (entry === "NETWORK:") break;
    if (entry && !entry.startsWith("#")) entries.push(entry);
  }
  return entries;
}

// iOS 9 Safari cannot parse newer syntax, and one bad token stops the whole app.
Deno.test("every script the iPad runs is plain ES5", async () => {
  for (const path of await manifestEntries()) {
    if (!path.endsWith(".js")) continue;
    acorn.parse(await read(path), { ecmaVersion: 5 });
  }
});

Deno.test("every file in the offline manifest exists", async () => {
  for (const path of await manifestEntries()) {
    const info = await Deno.stat(new URL(path, root));
    assert(info.isFile, path);
  }
});

Deno.test("the offline manifest lists every file the page loads", async () => {
  const entries = await manifestEntries();
  const html = await read("index.html");
  const app = await read("js/app.js");
  const loaded = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const dir = app.match(/PDFJS_DIR = '([^']+)'/)[1];
  loaded.push(dir + "pdf.min.js", dir + "pdf.worker.min.js");
  for (const path of loaded) {
    assert(entries.includes(path), `${path} is missing from app.appcache`);
  }
});

Deno.test("the page points at the offline manifest", async () => {
  const html = await read("index.html");
  assertEquals(html.match(/<html[^>]*manifest="([^"]+)"/)[1], "app.appcache");
});
