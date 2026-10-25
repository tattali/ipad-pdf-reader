import { assertEquals } from "jsr:@std/assert@1";

// spreads.js is a plain ES5 browser script, so load it the way the page does.
const src = await Deno.readTextFile(new URL("../js/spreads.js", import.meta.url));
const root = {};
new Function("root", src.replace(/\}\)\(this\);\s*$/, "})(root);"))(root);
const Spreads = root.Spreads;

Deno.test("one page per screen in portrait", () => {
  assertEquals(Spreads.build(3, false, false), [[1], [2], [3]]);
});

Deno.test("pairs pages from the first one", () => {
  assertEquals(Spreads.build(5, true, false), [[1, 2], [3, 4], [5]]);
});

Deno.test("cover alone, then pairs that line up like a book", () => {
  assertEquals(Spreads.build(5, true, true), [[1], [2, 3], [4, 5]]);
  assertEquals(Spreads.build(4, true, true), [[1], [2, 3], [4]]);
});

Deno.test("a one-page PDF is a single spread", () => {
  assertEquals(Spreads.build(1, true, true), [[1]]);
  assertEquals(Spreads.build(1, true, false), [[1]]);
});

Deno.test("finds the spread holding a page", () => {
  const s = Spreads.build(5, true, true);
  assertEquals(Spreads.indexOf(s, 1), 0);
  assertEquals(Spreads.indexOf(s, 3), 1);
  assertEquals(Spreads.indexOf(s, 4), 2);
});

Deno.test("an unknown page falls back to the first spread", () => {
  assertEquals(Spreads.indexOf(Spreads.build(5, true, false), 99), 0);
});

Deno.test("label shows the pages on screen", () => {
  assertEquals(Spreads.label([2, 3], 10), "2–3 / 10");
  assertEquals(Spreads.label([1], 10), "1 / 10");
});
