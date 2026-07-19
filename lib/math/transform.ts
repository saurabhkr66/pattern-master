// lib/math/transform.ts
//
// Pure string-transform pipeline extracted VERBATIM from components/ui/MathRenderer.tsx.
// Takes raw scraped content and returns the markdown string that is then handed
// to react-markdown (remark-math + rehype-katex). No React, no DOM — safe to run
// in Node (benchmarks, backfill scripts, ingestion).
//
// IMPORTANT: keep this byte-identical to the pipeline in MathRenderer until that
// component is refactored to import from here. Any divergence makes the benchmark
// (and later, stored HTML) misrepresent real render output.

/* ── Math-scoped helpers ──────────────────────────────────────────────────── */

const ROW_BREAK_ENV_NAMES = '(?:array|matrix|bmatrix|vmatrix|pmatrix|aligned|align\\*?|cases)';
const ROW_BREAK_ENV_RE = new RegExp(
  `(\\\\begin\\{${ROW_BREAK_ENV_NAMES}\\}(?:\\{[^}]*\\})?)([\\s\\S]*?)(\\\\end\\{${ROW_BREAK_ENV_NAMES}\\})`,
  'g'
);
const fixRowBreaks = (s: string): string =>
  s.replace(ROW_BREAK_ENV_RE, (_m, begin, body, end) =>
    begin + body.replace(/(?<!\\)\\(?=\s)/g, '\\\\') + end
  );

const transformMath = (s: string): string =>
  fixRowBreaks(s)
    .replace(
      /(?<!\\)\b(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega)(?=[_]|\b)/g,
      '\\$1'
    )
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/ε/g, '\\epsilon ')
    .replace(/θ/g, '\\theta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/π/g, '\\pi ')
    .replace(/ρ/g, '\\rho ')
    .replace(/σ/g, '\\sigma ')
    .replace(/τ/g, '\\tau ')
    .replace(/φ/g, '\\varphi ')
    .replace(/ω/g, '\\omega ')
    .replace(/µ/g, '\\mu ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/∆/g, '\\Delta ')
    .replace(/(?<!\\)\bsum(?![a-zA-Z])/g, '\\sum')
    .replace(/(?<!\\)\bint(?![a-zA-Z])/g, '\\int')
    .replace(/(?<!\\)\bprod(?![a-zA-Z])/g, '\\prod')
    // Upright trig/log function names that lost their backslash during scraping
    // (e.g. "sin", "cos" left as plain letters renders as italic s·i·n).
    .replace(/(?<!\\)\b(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|cot|sec|csc|log|ln)(?![a-zA-Z])/g, '\\$1')
    // A thin-space (\;) stranded right before a super/subscript detaches the
    // exponent from its base ("sin \;^2 x" → sin ² x). Drop it so it binds.
    .replace(/\\[;,]\s*(?=[\^_])/g, '')
    .replace(/(?<!\\)\bcap\b/g, '\\cap')
    .replace(/(?<!\\)\bcup\b/g, '\\cup')
    .replace(/(?<!\\)\bin\b/g, '\\in')
    .replace(/(?<!\\)\btimes\b/g, '\\times ')
    .replace(/∴/g, '\\therefore ')
    .replace(/∵/g, '\\because ')
    .replace(/⇒/g, '\\Rightarrow ')
    .replace(/⟶/g, '\\longrightarrow ')
    .replace(/⋅/g, '\\cdot ')
    .replace(/∣/g, '\\mid ')
    .replace(/≡/g, '\\equiv ')
    .replace(/≈/g, '\\approx ')
    .replace(/△/g, '\\triangle ')
    .replace(/∝/g, '\\propto ')
    .replace(/∈/g, '\\in ')
    .replace(/•/g, '\\bullet ')
    .replace(/∘/g, '\\circ ')
    .replace(/([_^])\s+([a-zA-Z0-9])/g, '$1$2')
    .replace(/∞/g, '\\infty ')
    .replace(/→/g, '\\to ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/×/g, '\\times ')
    .replace(/\\text\{((?:[^{}]|\{[^{}]*\})*)\}/g, (match, body: string) => {
      if (!/[_^]/.test(body)) return match;
      const cleaned = body.replace(/\$/g, '');
      return '\\text{$' + cleaned + '$}';
    })
    .replace(/(?:\\\\)+\\?hline/g, '\\\\ \\hline');

function splitTopLevelCommas(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') {
      depth++;
      cur += ch;
    } else if (ch === '}') {
      depth--;
      cur += ch;
    } else if (ch === ',' && depth === 0 && s[i - 1] !== '\\') {
      // Skip escaped commas (\, is a LaTeX thin-space, not a cell separator).
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const cleanCells = (cells: string[]): string[] =>
  cells.map((c) => c.trim()).filter((c) => c.length > 0 && c !== '{,}');

const WRAP_ENV_SET = new Set([
  'cases', 'bmatrix', 'vmatrix', 'pmatrix', 'matrix',
  'aligned', 'align', 'align*', 'array',
]);

function findBalancedEnvEnd(s: string, fromIdx: number, env: string): number {
  const beginTok = `\\begin{${env}}`;
  const endTok = `\\end{${env}}`;
  let depth = 1;
  let i = fromIdx;
  while (i < s.length) {
    if (s.startsWith(beginTok, i)) {
      depth++;
      i += beginTok.length;
    } else if (s.startsWith(endTok, i)) {
      depth--;
      i += endTok.length;
      if (depth === 0) return i;
    } else {
      i++;
    }
  }
  return -1;
}

function autoCloseDisplayMath(s: string): string {
  const matches = s.match(/\$\$/g);
  if (!matches || matches.length % 2 === 0) return s;
  return s + '\n$$';
}

function wrapBareMathEnvs(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('$$', i)) {
      const close = s.indexOf('$$', i + 2);
      if (close === -1) { out += s.slice(i); return out; }
      out += s.slice(i, close + 2);
      i = close + 2;
      continue;
    }
    if (s[i] === '$') {
      const nextDollar = s.indexOf('$', i + 1);
      if (nextDollar === -1) {
        out += s.slice(i);
        return out;
      }
      const between = s.slice(i + 1, nextDollar);
      if (!between.includes('\n')) {
        out += s.slice(i, nextDollar + 1);
        i = nextDollar + 1;
        continue;
      }
    }
    if (s.startsWith('\\begin{', i)) {
      const braceEnd = s.indexOf('}', i + 7);
      if (braceEnd !== -1) {
        const env = s.slice(i + 7, braceEnd);
        if (WRAP_ENV_SET.has(env)) {
          const endIdx = findBalancedEnvEnd(s, braceEnd + 1, env);
          if (endIdx !== -1) {
            let blockStart = i;
            let blockEnd = endIdx;
            const beforeMatch = /\\left(?:\\.|[^\s])\s*$/.exec(out);
            if (beforeMatch) {
              out = out.slice(0, out.length - beforeMatch[0].length);
              blockStart -= beforeMatch[0].length;
            }
            const afterMatch = /^\s*\\right(?:\\.|[^\s])/.exec(s.slice(endIdx));
            if (afterMatch) blockEnd += afterMatch[0].length;
            out += `\n$$\n${s.slice(blockStart, blockEnd)}\n$$\n`;
            i = blockEnd;
            continue;
          }
        }
      }
    }
    out += s[i];
    i++;
  }
  return out;
}

const expandTextTable = (s: string): string =>
  s
    .replace(/\[\s*\\text\{table\}\s*([\s\S]*?)\s*\]/g, (_, body: string) => {
      const rows = body
        .split(/(?<!\\);/)
        .map((r) => cleanCells(splitTopLevelCommas(r)).join(' & '));
      return '\\begin{bmatrix}' + rows.join(' \\\\ ') + '\\end{bmatrix}';
    })
    .replace(/(?:\\left\s*)?\|\s*\\text\{table\}\s*([\s\S]*?)\s*\|(?:\s*\\right)?/g, (_, body: string) => {
      const rows = body
        .split(/(?<!\\);/)
        .map((r) => cleanCells(splitTopLevelCommas(r)).join(' & '));
      return '\\begin{vmatrix}' + rows.join(' \\\\ ') + '\\end{vmatrix}';
    })
    .replace(/\\\{\s*\\text\{table\}\s*([\s\S]+?)\s*\.(?!\d)/g, (_, body: string) => {
      const rows = body.split(/(?<!\\);/).map((r) => {
        const cells = cleanCells(splitTopLevelCommas(r));
        if (cells.length > 2) {
          return cells[0] + ' & ' + cells.slice(1).join(' ');
        }
        return cells.join(' & ');
      });
      return '\\begin{cases}' + rows.join(' \\\\ ') + '\\end{cases}';
    });

const formatCCode = (raw: string): string => {
  let out = '';
  let indent = 0;
  let i = 0;
  let parenDepth = 0;
  let inForParen = false;
  const INDENT = '    ';

  const flush = (line: string) => {
    const trimmed = line.trim();
    if (trimmed) out += INDENT.repeat(indent) + trimmed + '\n';
  };

  let cur = '';
  while (i < raw.length) {
    const ch = raw[i];

    if (ch === '(') {
      parenDepth++;
      if (/\bfor\s*$/.test(cur)) inForParen = true;
      cur += ch;
    } else if (ch === ')') {
      parenDepth--;
      if (parenDepth === 0) inForParen = false;
      cur += ch;
    } else if (ch === '{') {
      flush(cur + ' {');
      cur = '';
      indent++;
    } else if (ch === '}') {
      flush(cur);
      cur = '';
      indent = Math.max(0, indent - 1);
      const rest = raw.slice(i + 1).trimStart();
      if (rest.startsWith('else')) {
        out += INDENT.repeat(indent) + '} ';
      } else {
        out += INDENT.repeat(indent) + '}\n';
      }
    } else if (ch === ';' && !inForParen) {
      flush(cur + ';');
      cur = '';
    } else {
      cur += ch;
    }
    i++;
  }
  flush(cur);
  return out.trim();
};

const wrapInlineCode = (s: string): string => {
  const SIG_RE = /(?<![`])((?:(?:int|void|char|float|double|long|short|unsigned|struct|bool|auto)\s+)+\w+\s*\([^)]*\)\s*)\{/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = SIG_RE.exec(s)) !== null) {
    const sigStart = match.index;
    const bodyStart = match.index + match[0].length;

    let depth = 1;
    let j = bodyStart;
    while (j < s.length && depth > 0) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') depth--;
      j++;
    }
    if (depth !== 0) continue;

    const rawCode = match[1] + '{' + s.slice(bodyStart, j);
    const formatted = formatCCode(rawCode.trim());
    result += s.slice(lastIndex, sigStart) + `\n\n\`\`\`c\n${formatted}\n\`\`\`\n\n`;
    lastIndex = j;
    SIG_RE.lastIndex = j;
  }
  result += s.slice(lastIndex);
  return result;
};

/**
 * The full transform pipeline. Mirrors the body of MathRenderer up to (but not
 * including) the <ReactMarkdown> render. Output is the markdown string that
 * react-markdown / remark-math / rehype-katex consume.
 */
export function transformMathContent(content: string): string {
  const baseContent = wrapInlineCode(content || '')
    .replace(/[‘’ʼ´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/([^\n])\$\$[ \t]*\n+[ \t]*(\\begin\{)/g, (_m, before, begin) => `${before}\n\n$$\n${begin}`)
    .replace(/([^\n])\$\$(\\begin\{)/g, (_m, before, begin) => `${before}\n\n$$\n${begin}`)
    .replace(/\{\{([a-zA-Z])\}\}\^\{\\\^\}/g, '\\hat{$1}')
    .replace(/\{([a-zA-Z])\^\{\\\^\}\}/g, '\\hat{$1}')
    .replace(/\{\{([a-zA-Z])\}\}\^\{\\to\s*\}/g, '\\vec{$1}')
    .replace(/\{([a-zA-Z])\}\^\{\\to\s*\}/g, '\\vec{$1}')
    .replace(/\{\{([a-zA-Z])\}↖\{\s*→\s*\}\}/g, '\\vec{$1}')
    .replace(/\{([a-zA-Z])\}↖\{\s*→\s*\}/g, '\\vec{$1}')
    .replace(/\{\{([a-zA-Z])\}↖\{\\\^\}\}/g, '\\hat{$1}')
    .replace(/\{([a-zA-Z])\}↖\{\\\^\}/g, '\\hat{$1}')
    .replace(/\\∝/g, '\\propto')
    .replace(/\\∵/g, '\\because')
    .replace(/\\⇒/g, '\\Rightarrow')
    .replace(/\\Δ/g, '\\Delta')
    .replace(/\\δ/g, '\\delta')
    .replace(/\\λ/g, '\\lambda')
    .replace(/\\α/g, '\\alpha ')
    .replace(/\\β/g, '\\beta ')
    .replace(/\\π/g, '\\pi ')
    .replace(/\\∫/g, '\\int ')
    .replace(/\\∑/g, '\\sum ')
    .replace(/\\γ/g, '\\gamma ')
    .replace(/\\ϕ/g, '\\phi ')
    .replace(/\\ω/g, '\\omega ')
    .replace(/\\∈/g, '\\in ')
    .replace(/\\θ/g, '\\theta ')
    .replace(/\\ρ/g, '\\rho ')
    .replace(/\\σ/g, '\\sigma ')
    .replace(/\\τ/g, '\\tau ')
    .replace(/\\η/g, '\\eta ')
    .replace(/\\ε/g, '\\epsilon ')
    .replace(/\\χ/g, '\\chi ')
    .replace(/\\υ/g, '\\upsilon ')
    .replace(/\\Θ/g, '\\Theta ')
    .replace(/\\Λ/g, '\\Lambda ')
    .replace(/\\→/g, '\\to ')
    .replace(/\\∞/g, '\\infty ')
    .replace(/\\∨/g, '\\vee ')
    .replace(/\\∧/g, '\\wedge ')
    .replace(/\\∴/g, '\\therefore ')
    .replace(/\\≤/g, '\\le ')
    .replace(/\\≥/g, '\\ge ')
    .replace(/\\≠/g, '\\ne ')
    .replace(/\\≡/g, '\\equiv ')
    .replace(/\\≃/g, '\\simeq ')
    .replace(/\\≈/g, '\\approx ')
    .replace(/\\≅/g, '\\cong ')
    .replace(/\\∪/g, '\\cup ')
    .replace(/\\∩/g, '\\cap ')
    .replace(/\\↔/g, '\\leftrightarrow ')
    .replace(/\\↑/g, '\\uparrow ')
    .replace(/\\↓/g, '\\downarrow ')
    .replace(/\\⊕/g, '\\oplus ')
    .replace(/\\⊖/g, '\\ominus ')
    .replace(/\\⊥/g, '\\perp ')
    .replace(/\\∀/g, '\\forall ')
    .replace(/\\∠/g, '\\angle ')
    .replace(/\{─+[▸▶]\}\s*↖\{\s*([^{}]+?)\s*\}/g, '\\xrightarrow{$1}')
    .replace(/─+[▸▶]/g, '\\to ')
    .replace(/↙/g, '_')
    .replace(/↖/g, '^')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\to\b/g, '→')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\ne\b/g, '≠')
    .replace(/\\times\b/g, '×')
    .replace(/\\pix/g, '\\pi x')
    .replace(/\{([a-zA-Z])\}\^\{\\\^\}/g, '\\hat{$1}')
    .replace(/\{\{\{([a-zA-Z])\}\}\}\^\{\\\^\}/g, '\\hat{$1}')
    .replace(/\{\{([a-zA-Z])\^\{\\\^\}\}\}/g, '\\hat{$1}')
    .replace(/\{\{\\text\{([a-zA-Z])\}\}\}\^\{\\\^\}/g, '\\hat{$1}')
    // Space-tolerant variants of the hat-accent patterns above (scraper emits
    // "{ {\text{i}}}^{\^}" with stray spaces, which the strict rules miss and
    // leave a bare \^ that KaTeX errors on).
    .replace(/\{\s*\{\s*\\text\{([a-zA-Z])\}\s*\}\s*\}\s*\^\{\s*\\\^\s*\}/g, '\\hat{$1}')
    .replace(/\{\s*\{\s*([a-zA-Z])\s*\}\s*\}\s*\^\{\s*\\\^\s*\}/g, '\\hat{$1}')
    .replace(/([a-zA-Z])\^\{\\\^\}/g, '\\hat{$1}')
    // Primes stored inside a superscript group ("^{'}", "^{''}", "^{' '}") are a
    // double-superscript error in KaTeX; convert to real \prime tokens (g'' etc).
    .replace(/\^\{\s*('(?:\s*')*)\s*\}/g, (_m: string, primes: string) =>
      '^{' + '\\prime'.repeat((primes.match(/'/g) || []).length) + '}')
    .replace(/\\alphax/g, '\\alpha x')
    .replace(/\\betay/g, '\\beta y')
    .replace(/\\gammaz/g, '\\gamma z')
    .replace(/\\⌷/g, '\\square ')
    .replace(/⋀/g, '\\wedge ')
    .replace(/⋁/g, '\\vee ')
    .replace(/\\∼/g, '\\sim ')
    .replace(/\\ohm/g, '\\Omega')
    .replace(/\\Ω/g, '\\Omega')
    .replace(/\\µ/g, '\\mu')
    .replace(/\\∆/g, '\\Delta')
    .replace(/\$([^$]*?)∵([^$]*?)\$/g, (_, a, b) => `$${a}\\because ${b}$`)
    .replace(/\$([^$]*?)⇒([^$]*?)\$/g, (_, a, b) => `$${a}\\Rightarrow ${b}$`)
    .replace(/\$(?!\$)((?:[^$]|\\\$)*\\begin\{cases\}[\s\S]*?\\end\{cases\}(?:[^$]|\\\$)*)\$/g,
      (_m, body) => `\n\n$$\n${body}\n$$\n\n`)
    .replace(/\$(?!\$)((?:[^$]|\\\$)*\\begin\{aligned\}[\s\S]*?\\end\{aligned\}(?:[^$]|\\\$)*)\$/g,
      (_m, body) => `\n\n$$\n${body}\n$$\n\n`)
    .replace(/(?<!\$)\$(?!\$)((?:[^$]|\\\$)*\\begin\{(bmatrix|vmatrix|pmatrix|matrix|array)\}[\s\S]*?\\end\{\2\}(?:[^$]|\\\$)*)\$(?!\$)/g,
      (_m, body) => `\n\n$$\n${body}\n$$\n\n`)
    .replace(/(\\begin\{cases\}[\s\S]*?\\end\{cases\})/g,
      (match) => match.replace(/(&\s*\\text\{[^}]*\}\s*)&/g, '$1'))
    .replace(/\{((?:[^{}]|\{[^{}]*\})+)\}\/\{((?:[^{}]|\{[^{}]*\})+)\}/g, '\\frac{$1}{$2}')
    .replace(/\{((?:[^{}]|\{[^{}]*\})+)\}\s*\{\/\}\s*\{((?:[^{}]|\{[^{}]*\})+)\}/g, '\\frac{$1}{$2}')
    .replace(/\{([a-zA-Z])\^\{∧\}/g, '\\hat{$1}')
    .replace(/\^\{∘\}/g, '^{\\circ}')
    .replace(/\\text\{_{2,}\}/g, '\\underline{\\hspace{3em}}')
    .replace(/_(\d+)_(\d+)/g, '_{$1}{}_{$2}')
    // Superscripted ion charge (Mg^2+ -> Mg^{2+}) only when the sign is terminal
    // (end / space / close-bracket / comma). Otherwise "x^2+g" is algebra, not a
    // charge, and must stay as x squared PLUS g.
    .replace(/\^(\d+)([+-])(?=[\s)\]},.]|$)/g, '^{$1$2}')
    .replace(/(?<!\$)\[([^\[\]]+\^[^\[\]]+)\](?!\()(?!\$)/g, '\\$$[$1]\\$$')
    .replace(/\\left\s*\[/g, '\\left[')
    .replace(/\\right\s*\]/g, '\\right]')
    .replace(/([\]\}])\s*\\?\$([_^])/g, '$1$2')
    .replace(/([\[\(\{])\s*\\?\$([\\]?(frac|sum|int|sqrt|left|right|\[|{|text))/g, '$1$2')
    .replace(/(\\left|\\right)\s*\\?\$([\[\(\{])/g, '$1$2')
    .replace(/\b([A-Z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, (m) => m.replace(/\s+/g, ''))
    .replace(/\b([A-Z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, (m) => m.replace(/\s+/g, ''));

  const closedContent = autoCloseDisplayMath(baseContent);
  const envWrapped = wrapBareMathEnvs(closedContent);
  const tableExpanded = expandTextTable(envWrapped);

  const processedContent = tableExpanded
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, body: string) => `$$${balanceBraces(transformMath(body))}$$`)
    .replace(/\$([^$\n]+?)\$/g, (_m, body: string) => `$${balanceBraces(transformMath(body))}$`);

  return processedContent;
}

// Safety net for scraped LaTeX with a stray/dropped brace (e.g. "{ \vec{\text{u}}"
// where the closing "}" was lost). An unbalanced group makes KaTeX error out and
// render the whole span as a red source dump. We count only unescaped braces and
// pad the shorter side so at least *something* renders. A well-formed span is
// already balanced, so this is a no-op for correct content.
function balanceBraces(body: string): string {
  let open = 0;
  let close = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i - 1] === '\\') continue;
    if (body[i] === '{') open++;
    else if (body[i] === '}') close++;
  }
  if (open > close) return body + '}'.repeat(open - close);
  if (close > open) return '{'.repeat(close - open) + body;
  return body;
}
