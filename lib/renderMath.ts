import katex from "katex";

export function renderMath(text: string): string {
  if (!text) return '';
  let t = text
    .replace(/[''ʼ]/g, "'").replace(/[""]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...');
  // display: \[...\]
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => {
    try { return '<span class="math-block">' + katex.renderToString(m.trim(), { displayMode: true, throwOnError: false }) + '</span>'; }
    catch { return '<span>[math]</span>'; }
  });
  // inline: \(...\)
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => {
    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }
    catch { return '[math]'; }
  });
  // display: $$...$$
  t = t.replace(/\$\$([^$]+?)\$\$/g, (_, m) => {
    try { return '<span class="math-block">' + katex.renderToString(m.trim(), { displayMode: true, throwOnError: false }) + '</span>'; }
    catch { return '<span>[math]</span>'; }
  });
  // inline: $...$
  t = t.replace(/\$([^$\n]+?)\$/g, (_, m) => {
    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }
    catch { return '[math]'; }
  });
  return t;
}
