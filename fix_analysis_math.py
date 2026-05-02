import re

with open('components/test/TestAnalysis.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The replacement renderMath block
new_func = r"""function renderMath(text: string): string {
  if (!text) return '';
  let t = text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
  // Break adjacent inline-math junctions: $A$$B$ becomes $A$ $B$
  t = t.replace(/\$\$/g, '$ $');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_: string, m: string) => {
    try { return '<span class="math-block">' + katex.renderToString(m.trim(), { displayMode: true, throwOnError: false }) + '</span>'; }
    catch { return '<span>[math]</span>'; }
  });
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_: string, m: string) => {
    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }
    catch { return '[math]'; }
  });
  t = t.replace(/\$\$([^$]+?)\$\$/g, (_: string, m: string) => {
    try { return '<span class="math-block">' + katex.renderToString(m.trim(), { displayMode: true, throwOnError: false }) + '</span>'; }
    catch { return '<span>[math]</span>'; }
  });
  t = t.replace(/\$([^$]+?)\$/g, (_: string, m: string) => {
    try { return katex.renderToString(m.trim(), { displayMode: false, throwOnError: false }); }
    catch { return '[math]'; }
  });
  return t;
}"""

# Replace from "function renderMath" to the closing "}" before "function MathText"
content = re.sub(
    r'function renderMath\(text: string\): string \{[\s\S]*?\}\n(?=\nfunction MathText)',
    new_func + '\n',
    content
)

with open('components/test/TestAnalysis.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
