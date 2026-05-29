import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("pages delegate document chrome to BaseLayout and page components", async () => {
  const indexPage = await read("src/pages/index.astro");
  const todoPage = await read("src/pages/todo.astro");

  assert.match(
    indexPage,
    /import BaseLayout from ["']\.\.\/layouts\/BaseLayout\.astro["']/,
  );
  assert.match(
    indexPage,
    /import CalculatorPage from ["']\.\.\/components\/calculator\/CalculatorPage\.astro["']/,
  );
  assert.doesNotMatch(indexPage, /<html\b/);
  assert.doesNotMatch(indexPage, /<body\b/);

  assert.match(
    todoPage,
    /import BaseLayout from ["']\.\.\/layouts\/BaseLayout\.astro["']/,
  );
  assert.match(
    todoPage,
    /import TodoPage from ["']\.\.\/components\/todo\/TodoPage\.astro["']/,
  );
  assert.doesNotMatch(todoPage, /<html\b/);
  assert.doesNotMatch(todoPage, /<body\b/);
});

test("shared layout and page components exist", async () => {
  assert.equal(
    existsSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(new URL("../src/components/AppNav.astro", import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(
      new URL(
        "../src/components/calculator/CalculatorPage.astro",
        import.meta.url,
      ),
    ),
    true,
  );
  assert.equal(
    existsSync(
      new URL("../src/components/todo/TodoPage.astro", import.meta.url),
    ),
    true,
  );

  const layout = await read("src/layouts/BaseLayout.astro");
  assert.match(layout, /import ["']\.\.\/assets\/css\/style\.css["']/);
  assert.match(layout, /<AppNav\s+activePage=\{activePage\}/);
  assert.match(layout, /<slot\s*\/>/);
});

test("BaseLayout loads Pretendard from the local package", async () => {
  const layout = await read("src/layouts/BaseLayout.astro");

  assert.match(layout, /import ["']@fontsource\/pretendard\/300\.css["']/);
  assert.match(layout, /import ["']@fontsource\/pretendard\/400\.css["']/);
  assert.match(layout, /import ["']@fontsource\/pretendard\/600\.css["']/);
  assert.match(layout, /import ["']@fontsource\/pretendard\/700\.css["']/);
  assert.match(layout, /import ["']@fontsource\/pretendard\/900\.css["']/);
  assert.doesNotMatch(layout, /fonts\.googleapis\.com/);
  assert.doesNotMatch(layout, /fonts\.gstatic\.com/);
});
