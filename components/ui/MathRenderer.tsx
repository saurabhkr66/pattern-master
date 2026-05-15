// components/ui/MathRenderer.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { memo, CSSProperties } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
  style?: CSSProperties;
}

// Math-scoped fixes: only applied inside $...$ and $$...$$ blocks so prose stays untouched.
const transformMath = (s: string): string =>
  s
    // Bare Greek-word names left over from the scraper (negative-lookbehind keeps already-escaped commands intact)
    .replace(
      /(?<!\\)\b(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega)(?=[_]|\b)/g,
      '\\$1'
    )
    // Bare lowercase Unicode Greek inside math
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
    // Bare big-operator / set-relation words
    .replace(/(?<!\\)\bsum\b/g, '\\sum')
    .replace(/(?<!\\)\bint\b/g, '\\int')
    .replace(/(?<!\\)\bprod\b/g, '\\prod')
    .replace(/(?<!\\)\bcap\b/g, '\\cap')
    .replace(/(?<!\\)\bcup\b/g, '\\cup')
    .replace(/(?<!\\)\bin\b/g, '\\in')
    .replace(/(?<!\\)\btimes\b/g, '\\times ')
    // Bare Unicode operators that KaTeX rejects without a backslash command
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
    // Bullet (radical dot) and ring (composition/degree)
    .replace(/•/g, '\\bullet ')
    .replace(/∘/g, '\\circ ')
    // Chemistry scraper: "H_ 3C" or "X^ 2" — strip the space between
    // sub/sup operator and its argument so KaTeX subscripts the digit, not " ".
    .replace(/([_^])\s+([a-zA-Z0-9])/g, '$1$2')
    // Unicode math that appears in prose gets converted to Unicode above;
    // when inside math these must become KaTeX commands.
    .replace(/∞/g, '\\infty ')
    .replace(/→/g, '\\to ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/×/g, '\\times ')
    // ── Array / cases hygiene ───────────────────────────────────────────
    // 1. `\text{...}` containing `_` or `^` errors in KaTeX (text mode
    //    forbids those operators). Common pattern from scrapers that wrap
    //    a whole table cell — including its math — in \text{}. Wrap the
    //    body in `$...$` so the operators evaluate as math instead of
    //    breaking the whole expression. Handles one level of nested braces.
    .replace(/\\text\{((?:[^{}]|\{[^{}]*\})*)\}/g, (match, body: string) => {
      if (!/[_^]/.test(body)) return match;
      return '\\text{$' + body + '$}';
    })
    // 2. Normalize malformed `\\hline` / `\\\\hline` (no space between line
    //    break and hline command). Without normalization KaTeX parses `\\`
    //    as line break and then "hline" as plain text, which is illegal
    //    inside an array row separator and aborts the whole environment.
    .replace(/(?:\\\\)+\\?hline/g, '\\\\ \\hline');

// Brace-aware comma split: only splits at depth-0 commas so that `{,}`
// placeholders (the scraper's empty-middle-column marker) survive intact.
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
    } else if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// Drop empty cells and the scraper's `{,}` empty-column placeholder.
const cleanCells = (cells: string[]): string[] =>
  cells.map((c) => c.trim()).filter((c) => c.length > 0 && c !== '{,}');

// Wrap bare \begin{ENV}...\end{ENV} blocks that live in prose so KaTeX sees
// them as math. Hand-written because the previous regex used non-greedy
// `[\s\S]*?` which couldn't pair an outer \begin{array} with its outer
// \end{array} when other arrays were nested inside — it grabbed the first
// inner \end and left the outer mismatched, which then rendered as red.
// This version skips over $...$ and $$...$$ regions (so it never re-wraps
// content that is already math), then for each top-level \begin{ENV} finds
// the depth-balanced \end{ENV}. Also absorbs an adjacent \left<delim> before
// and \right<delim> after, so cases-like \left\{ \begin{matrix}...\end{matrix} \right.
// constructs end up entirely inside one math span.
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

function wrapBareMathEnvs(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    // Pass through $$...$$ display blocks unchanged.
    if (s.startsWith('$$', i)) {
      const close = s.indexOf('$$', i + 2);
      if (close === -1) { out += s.slice(i); return out; }
      out += s.slice(i, close + 2);
      i = close + 2;
      continue;
    }
    // Pass through single-line $...$ inline math unchanged.
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
      // Newline inside $...$ — not real inline math, fall through and emit the $
    }
    // Look for \begin{ENV} at the current position.
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

// Scraper-invented "\text{table}" → real KaTeX environments
const expandTextTable = (s: string): string =>
  s
    // Matrix: [\text{table} a , b ; c , d]
    .replace(/\[\s*\\text\{table\}\s*([\s\S]*?)\s*\]/g, (_, body: string) => {
      const rows = body
        .split(';')
        .map((r) => cleanCells(splitTopLevelCommas(r)).join(' & '));
      return '\\begin{bmatrix}' + rows.join(' \\\\ ') + '\\end{bmatrix}';
    })
    // Determinant: |\text{table} a,b;c,d| or \left|\text{table}...\right|  → \begin{vmatrix}
    .replace(/(?:\\left\s*)?\|\s*\\text\{table\}\s*([\s\S]*?)\s*\|(?:\s*\\right)?/g, (_, body: string) => {
      const rows = body
        .split(';')
        .map((r) => cleanCells(splitTopLevelCommas(r)).join(' & '));
      return '\\begin{vmatrix}' + rows.join(' \\\\ ') + '\\end{vmatrix}';
    })
    // Cases: \{ \text{table} expr , {,} , cond ; ... .  (terminator: non-decimal dot)
    // KaTeX cases env only supports 2 columns — if the scraper emitted a 3rd
    // (typically `\text{if}` or a `{,}` placeholder), merge any extras into col 2.
    .replace(/\\\{\s*\\text\{table\}\s*([\s\S]+?)\s*\.(?!\d)/g, (_, body: string) => {
      const rows = body.split(';').map((r) => {
        const cells = cleanCells(splitTopLevelCommas(r));
        if (cells.length > 2) {
          return cells[0] + ' & ' + cells.slice(1).join(' ');
        }
        return cells.join(' & ');
      });
      return '\\begin{cases}' + rows.join(' \\\\ ') + '\\end{cases}';
    });

const MathRenderer = memo(function MathRenderer({ content, className, style }: MathRendererProps) {
  // Normalise typographic/smart characters that KaTeX doesn't understand.
  // These appear in scraped question text (e.g. "1's", "it's", "don't").
  const baseContent = (content || '')
    // Smart/curly quotes → straight equivalents
    .replace(/[‘’ʼ`´]/g, "'")   // ' ' → '
    .replace(/[“”]/g, '"')                       // " " → "
    // Em/en dashes → hyphen
    .replace(/[–—]/g, '-')
    // Ellipsis character → three dots
    .replace(/…/g, '...')
    // LaTeX delimiter conversions
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    // JEE scraper: double-brace hat {{i}}^{\^} → \hat{i}
    .replace(/\{\{([a-zA-Z])\}\}\^\{\\\^\}/g, '\\hat{$1}')
    // JEE scraper: brace-wrapped hat {i^{\^}} → \hat{i}
    .replace(/\{([a-zA-Z])\^\{\\\^\}\}/g, '\\hat{$1}')
    // JEE scraper: double-brace vector {{c}}^{\to} → \vec{c}
    .replace(/\{\{([a-zA-Z])\}\}\^\{\\to\s*\}/g, '\\vec{$1}')
    // JEE scraper: single-brace vector {c}^{\to} → \vec{c}
    .replace(/\{([a-zA-Z])\}\^\{\\to\s*\}/g, '\\vec{$1}')
    // JEE scraper: ↖-style vectors {{X}↖{→...}} and {X}↖{→...} → \vec{X}
    // Must run BEFORE the ↖→^ conversion below or the arrow context is lost.
    // Tolerates leading/trailing whitespace around the arrow.
    .replace(/\{\{([a-zA-Z])\}↖\{\s*→\s*\}\}/g, '\\vec{$1}')
    .replace(/\{([a-zA-Z])\}↖\{\s*→\s*\}/g, '\\vec{$1}')
    // JEE scraper: ↖-style hats {{X}↖{\^}} and {X}↖{\^} → \hat{X}
    // (The current chain catches these via the post-↖→^ fallback regex below,
    //  but handling them explicitly avoids the residual outer braces.)
    .replace(/\{\{([a-zA-Z])\}↖\{\\\^\}\}/g, '\\hat{$1}')
    .replace(/\{([a-zA-Z])\}↖\{\\\^\}/g, '\\hat{$1}')
    // JEE scraper: backslash + Unicode commands → valid KaTeX
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
    // Additional \<Unicode> → \<command> mappings discovered in scraper output.
    // The scraper emits `\<symbol>` (backslash + Unicode glyph). Without these
    // explicit mappings KaTeX sees a malformed command and renders garbage.
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
    // Chemistry reaction arrows: {────▸}↖{X} → \xrightarrow{X}
    // Run AFTER \<Unicode> conversions so the superscript body (e.g. \\Δ → \\Delta) is already valid.
    .replace(/\{─+[▸▶]\}\s*↖\{\s*([^{}]+?)\s*\}/g, '\\xrightarrow{$1}')
    .replace(/─+[▸▶]/g, '\\to ')

    // Standalone unicode / bare-LaTeX fixes for PROSE
    // These convert LaTeX commands → Unicode so markdown doesn't strip backslashes.
    // transformMath will convert the Unicode back to LaTeX inside $...$ blocks.
    .replace(/↙/g, '_')
    .replace(/↖/g, '^')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\to\b/g, '→')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\ne\b/g, '≠')
    .replace(/\\times\b/g, '×')
    // Already-Unicode symbols stay as-is for prose; transformMath handles them in math blocks.

    // Specific fixes for user reported issues
    .replace(/\\pix/g, '\\pi x')
    // JEE scraper: {X}^{\^} (single-brace escaped caret) → \hat{X}
    .replace(/\{([a-zA-Z])\}\^\{\\\^\}/g, '\\hat{$1}')
    // Legacy triple-brace variant
    .replace(/\{\{\{([a-zA-Z])\}\}\}\^\{\\\^\}/g, '\\hat{$1}')
    .replace(/\\alphax/g, '\\alpha x')
    .replace(/\\betay/g, '\\beta y')
    .replace(/\\gammaz/g, '\\gamma z')
    .replace(/\\⌷/g, '\\square ')
    .replace(/⋀/g, '\\wedge ')
    .replace(/⋁/g, '\\vee ')
    .replace(/\\∼/g, '\\sim ')
    // Normalise micro/ohm/delta escapes toward proper KaTeX commands
    // (KaTeX renders \mu/\Omega/\Delta correctly; bare Unicode glyphs warn about missing metrics)
    .replace(/\\ohm/g, '\\Omega')
    .replace(/\\Ω/g, '\\Omega')
    .replace(/\\µ/g, '\\mu')
    .replace(/\\∆/g, '\\Delta')
    // JEE scraper: bare Unicode inside math that KaTeX may reject
    .replace(/\$([^$]*?)∵([^$]*?)\$/g, (_, a, b) => `$${a}\\because ${b}$`)
    .replace(/\$([^$]*?)⇒([^$]*?)\$/g, (_, a, b) => `$${a}\\Rightarrow ${b}$`)
    // JEE scraper: inline $\begin{cases}...\end{cases}$ may span newlines which
    // remark-math's inline $ doesn't support — promote to display math $$...$$
    .replace(/\$(?!\$)((?:[^$]|\\\$)*\\begin\{cases\}[\s\S]*?\\end\{cases\}(?:[^$]|\\\$)*)\$/g,
      (_m, body) => `$$\n${body}\n$$`)
    // Upgrade inline \begin{aligned}...\end{aligned} spanning newlines to display math $$...$$
    .replace(/\$(?!\$)((?:[^$]|\\\$)*\\begin\{aligned\}[\s\S]*?\\end\{aligned\}(?:[^$]|\\\$)*)\$/g,
      (_m, body) => `$$\n${body}\n$$`)
    // Upgrade inline matrix-family envs to display math. Covers the cases-style
    // construct \left\{ \begin{matrix}...\end{matrix} \right. that the scraper
    // emits instead of a real \begin{cases}; remark-math's inline $ chokes on
    // its embedded newlines, which leaves \left\{ and \right. as raw prose.
    // (?<!\$) / (?!\$) on each delimiter prevent the regex from treating
    // the inner $ of a $$...$$ pair as an inline opener — that would emit
    // $$$ boundaries and break legitimate display math like
    // `$$ \begin{array}...\end{array} $$`.
    .replace(/(?<!\$)\$(?!\$)((?:[^$]|\\\$)*\\begin\{(bmatrix|vmatrix|pmatrix|matrix|array)\}[\s\S]*?\\end\{\2\}(?:[^$]|\\\$)*)\$(?!\$)/g,
      (_m, body) => `$$\n${body}\n$$`)
    // Fix 3-column cases (scraper writes: expr & \text{if} & cond) → 2-column
    // KaTeX cases only allows 2 columns; merge the extra & into the condition
    .replace(/(\\begin\{cases\}[\s\S]*?\\end\{cases\})/g,
      (match) => match.replace(/(&\s*\\text\{[^}]*\}\s*)&/g, '$1'))
    // JEE scraper: {A}/{B} fake fractions — supports one level of nested braces
    // e.g. {|{x}|}/{2} → \frac{|{x}|}{2}
    .replace(/\{((?:[^{}]|\{[^{}]*\})+)\}\/\{((?:[^{}]|\{[^{}]*\})+)\}/g, '\\frac{$1}{$2}')
    // JEE scraper: {A} {/} {B} (space + braced slash) fake fractions → \frac{A}{B}
    .replace(/\{((?:[^{}]|\{[^{}]*\})+)\}\s*\{\/\}\s*\{((?:[^{}]|\{[^{}]*\})+)\}/g, '\\frac{$1}{$2}')
    // JEE scraper: {x^{∧} (Unicode caret hat) → \hat{x}
    .replace(/\{([a-zA-Z])\^\{∧\}/g, '\\hat{$1}')
    // JEE scraper: ^{∘} (Unicode ring as degree) → ^{\circ}
    .replace(/\^\{∘\}/g, '^{\\circ}')
    // JEE scraper: \text{______} fill-in-the-blank → visible underline rule
    .replace(/\\text\{_{2,}\}/g, '\\underline{\\hspace{3em}}')
    // JEE scraper: chemistry double subscript "X_a_b" (e.g. CoNH_3_6) → "X_{a}{}_{b}" so KaTeX accepts it
    .replace(/_(\d+)_(\d+)/g, '_{$1}{}_{$2}')
    // JEE scraper: trailing charge "^3+" / "^2-" → "^{3+}" / "^{2-}"
    .replace(/\^(\d+)([+-])/g, '^{$1$2}')
    // JEE scraper: unwrapped dimensional formulas [M^...L^...T^...] → $[...]$
    // Only wraps if not already inside $...$ (negative lookbehind/lookahead for $)
    .replace(/(?<!\$)\[([^\[\]]+\^[^\[\]]+)\](?!\()(?!\$)/g, '\\$$[$1]\\$$')
    // AI DEFECT CLEANERS (Defensive Fixes)
    // 1. Fix the "Square Bracket Link" conflict: Replace [ with a version that won't trigger Markdown links
    // but KaTeX will still understand inside math blocks.
    .replace(/\\left\s*\[/g, '\\left[')
    .replace(/\\right\s*\]/g, '\\right]')

    // 2. Fix broken limits and hallucinated dollars (The root cause of red text)
    .replace(/([\]\}])\s*\\?\$([_^])/g, '$1$2')
    .replace(/([\[\(\{])\s*\\?\$([\\]?(frac|sum|int|sqrt|left|right|\[|{|text))/g, '$1$2')
    .replace(/(\\left|\\right)\s*\\?\$([\[\(\{])/g, '$1$2')

    // 3. Fix character-level spacing (e.g., G i v e n -> Given)
    .replace(/\b([A-Z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, (m) => m.replace(/\s+/g, ''))
    .replace(/\b([A-Z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, (m) => m.replace(/\s+/g, ''));

  // Wrap bare \begin{env}...\end{env} blocks (those living outside any $...$
  // or $$...$$) in display math. Uses depth-balanced matching so nested
  // arrays (e.g. \begin{array}{|l|l|}...\begin{array}{l}...\end{array}...\end{array})
  // pair correctly instead of stopping at the first inner \end{array}.
  const envWrapped = wrapBareMathEnvs(baseContent);

  // Convert scraper-invented \text{table} matrix/cases blocks before the math-scoped pass.
  const tableExpanded = expandTextTable(envWrapped);

  // Math-scoped fixes: apply only inside $$...$$ and $...$ so English prose stays untouched.
  const processedContent = tableExpanded
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, body: string) => `$$${transformMath(body)}$$`)
    .replace(/\$([^$\n]+?)\$/g, (_m, body: string) => `$${transformMath(body)}$`);


  return (
    <div className={className} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre: ({ children }) => (
            <pre className="whitespace-pre-wrap break-words bg-transparent p-0 m-0 font-mono text-[13px]">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="whitespace-pre-wrap break-words bg-transparent p-0 font-mono">
              {children}
            </code>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default MathRenderer;
