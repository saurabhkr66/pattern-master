// scripts/telegram/render.ts
//
// Renders a PYQ into a clean PNG "card" with LaTeX typeset by KaTeX.
//
// We feed the *raw* question/option strings (with $...$ delimiters) into the
// page as textContent and let KaTeX's auto-render extension typeset them, so
// this works for every question regardless of whether *_html was backfilled,
// and there is zero HTML-injection surface.
//
// The page is written into node_modules/katex/dist and opened as a real file://
// page, so katex.min.css / katex.min.js / the fonts all resolve as same-origin
// relative resources. (A setContent page has a non-file origin and Chromium
// blocks its file:// subresource loads.)

import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const KATEX_DIST = path.join(process.cwd(), "node_modules", "katex", "dist");

export interface CardData {
  emoji: string;
  label: string;
  year: number;
  marks: number;
  questionText: string;
  options: string[]; // e.g. ["A. $\\overline{B}$", ...]
  images?: string[]; // optional figure URLs (ImageKit), shown under the question
}

function pageHtml(data: CardData): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="katex.min.css">
<script src="katex.min.js"></script>
<script src="contrib/auto-render.min.js"></script>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eef2f7; }
  #card {
    width: 900px; padding: 44px 48px 40px; background: #ffffff;
    font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a;
  }
  #head { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  #badge {
    font-size: 22px; font-weight: 700; padding: 6px 16px; border-radius: 999px;
    background: #4f46e5; color: #fff; letter-spacing: .3px;
  }
  #meta { margin-left: auto; font-size: 18px; color: #64748b; font-weight: 600; }
  #q { font-size: 27px; line-height: 1.5; margin-bottom: 20px; }
  #figs { margin: 8px 0 28px; display: flex; flex-direction: column; gap: 14px; align-items: center; }
  #figs img {
    max-width: 100%; max-height: 460px; object-fit: contain;
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px;
  }
  .opt {
    font-size: 24px; line-height: 1.45; padding: 14px 20px; margin: 12px 0;
    border: 1.5px solid #e2e8f0; border-radius: 14px; background: #f8fafc;
  }
  #foot {
    margin-top: 30px; padding-top: 18px; border-top: 2px solid #eef2f7;
    display: flex; align-items: center; font-size: 20px; color: #94a3b8; font-weight: 600;
  }
  #brand { color: #4f46e5; font-weight: 800; }
  .katex { font-size: 1.02em; }
</style></head>
<body>
  <div id="card">
    <div id="head">
      <span id="badge"></span>
      <span id="meta"></span>
    </div>
    <div id="q"></div>
    <div id="figs"></div>
    <div id="opts"></div>
    <div id="foot">👉 Full solution &amp; more at&nbsp;<span id="brand"></span></div>
  </div>
<script>
  window.__ready = false;
  document.addEventListener("DOMContentLoaded", function () {
    var d = ${json};
    document.getElementById("badge").textContent = d.emoji + " " + d.label;
    document.getElementById("meta").textContent = d.year + " • " + d.marks + " mark" + (d.marks === 1 ? "" : "s");
    document.getElementById("q").textContent = d.questionText;
    document.getElementById("brand").textContent = "battleexam.com";
    var figs = document.getElementById("figs");
    (d.images || []).forEach(function (url) {
      var im = document.createElement("img");
      im.src = url;
      figs.appendChild(im);
    });
    var box = document.getElementById("opts");
    d.options.forEach(function (o) {
      var el = document.createElement("div");
      el.className = "opt";
      el.textContent = o;
      box.appendChild(el);
    });
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\\\(", right: "\\\\)", display: false },
        { left: "\\\\[", right: "\\\\]", display: true },
      ],
      throwOnError: false,
    });
    // Wait for every figure to finish loading (or error) before signalling
    // ready, so the screenshot never captures a half-loaded image.
    var imgs = Array.prototype.slice.call(document.images);
    Promise.all(
      imgs.map(function (img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function (res) { img.onload = img.onerror = res; });
      }),
    ).then(function () { window.__ready = true; });
  });
</script>
</body></html>`;
}

let browserPromise: ReturnType<typeof chromium.launch> | null = null;
function browser() {
  if (!browserPromise) browserPromise = chromium.launch({ args: ["--no-sandbox"] });
  return browserPromise;
}

/** Render a question card to a tightly-cropped PNG buffer. */
export async function renderCard(data: CardData): Promise<Buffer> {
  const b = await browser();
  const page = await b.newPage({ deviceScaleFactor: 2 });
  const tmp = path.join(KATEX_DIST, `.tg-render-${randomBytes(6).toString("hex")}.html`);
  try {
    fs.writeFileSync(tmp, pageHtml(data));
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
    await page.waitForFunction("window.__ready === true", null, { timeout: 15000 });
    await page.waitForTimeout(150); // let web fonts settle
    const card = page.locator("#card");
    return (await card.screenshot({ type: "png" })) as Buffer;
  } finally {
    await page.close();
    fs.rmSync(tmp, { force: true });
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
