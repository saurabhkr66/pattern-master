import { T, type MasteryNoteData } from "./types";

// Authoring rule for mastery notes: write real LaTeX between $…$ in ANY field —
// name, title, body, bound, hint, gloss, ladder rungs, section titles. Every one
// of them is rendered through <MathInline>/<MathRenderer>, so unicode lookalikes
// (≤, Θ, ⁿ, ₀) are no longer needed and should be avoided: they don't kern, don't
// scale with the surrounding text, and break when the font falls back.
// Use $$…$$ only inside a `markdown` block — inline slots downgrade it to $…$.

export const SAMPLE: MasteryNoteData = {
  meta: { readTime: '~9 min', cards: 23, updated: '3d ago' },
  sections: [
    {
      id: 'def', title: 'Formal Definitions',
      sub: 'Three asymptotic bounds — write from memory', open: true,
      blocks: [{ kind: 'def', items: [
        { sym: '$O$', name: 'Big-O', bound: 'Upper', formula: '$f(n) \\le c \\cdot g(n)$', cond: '$n \\ge n_0$', gloss: '$f$ never grows faster than $g$.', color: T.bad },
        { sym: '$\\Omega$', name: 'Omega', bound: 'Lower', formula: '$f(n) \\ge c \\cdot g(n)$', cond: '$n \\ge n_0$', gloss: '$f$ always grows at least as fast as $g$.', color: T.good },
        { sym: '$\\Theta$', name: 'Theta', bound: 'Tight', formula: '$c_1 g(n) \\le f(n) \\le c_2 g(n)$', cond: '$n \\ge n_0$', gloss: '$f$ and $g$ grow at the same rate.', color: T.accent },
      ]}],
    },
    {
      id: 'lad', title: 'Growth-Rate Ladder',
      sub: 'Memorize this ordering', open: true,
      blocks: [
        { kind: 'ladder', label: 'Slowest → Fastest', items: [
          '$O(1)$', '$O(\\log \\log n)$', '$O(\\log n)$', '$O(n^{1/k})$', '$O(n)$',
          '$O(n \\log n)$', '$O(n^k)$', '$O(a^n)$', '$O(n!)$',
        ]},
        { kind: 'rules', label: 'Consequences', items: [
          { title: '$\\log(n!) = \\Theta(n \\log n)$', body: 'Useful in comparison-sort lower bounds — this is why no comparison sort beats $O(n \\log n)$.' },
          { title: 'Polynomial $<$ Exponential', body: '$n^k$ is always slower-growing than $a^n$ for $a > 1$ and large $n$, no matter how big $k$ is.' },
        ]},
      ],
    },
    {
      id: 'prop', title: 'Properties',
      sub: 'The four moves in nearly every Big-O proof',
      blocks: [{ kind: 'props', items: [
        { name: 'Transitivity', formula: '$f = O(g),\\; g = O(h) \\Rightarrow f = O(h)$', eg: 'If $f$ is $O(n^2)$ and $n^2$ is $O(n^3)$, then $f$ is $O(n^3)$.' },
        { name: 'Summation',    formula: '$O(f + g) = \\max\\bigl(O(f),\\, O(g)\\bigr)$', eg: 'Bigger term wins; drop the smaller.' },
        { name: 'Product',      formula: '$O(f \\cdot g) = O(f) \\cdot O(g)$',            eg: 'Nested loops multiply: $O(n) \\times O(n) = O(n^2)$.' },
        { name: 'Symmetry',     formula: '$f = \\Theta(g) \\iff g = \\Theta(f)$',          eg: '$\\Theta$ is the only bound that flips both ways.' },
      ]}],
    },
    {
      id: 'tips', title: 'GATE Code Tips',
      sub: 'Spot the loop pattern → write the bound',
      blocks: [{ kind: 'tips', items: [
        { label: 'Iterative · additive',       code: 'i = i + k',                   bound: '$O(n)$',           hint: 'Linear update → linear work.' },
        { label: 'Iterative · multiplicative', code: 'i = i * k\ni = i / k',        bound: '$O(\\log_k n)$',   hint: 'Multiply/divide → log base $k$.' },
        { label: 'Recursive',                  code: '$T(n) = a\\,T(n/b) + \\Theta(n^k)$', bound: 'Master Theorem', hint: 'Compare $n^k$ to $n^{\\log_b a}$.' },
      ]}],
    },
    {
      id: 'pit', title: 'Pitfalls',
      sub: 'What examiners trap you with',
      blocks: [{ kind: 'pitfalls', items: [
        { title: 'Confusing $\\Theta$ with $O$', wrong: '$f(n) = O(n)$ implies $f(n) = \\Theta(n)$.', right: '$O$ is only an upper bound — $f$ could grow much slower, e.g. $f(n) = \\log n$.' },
        { title: 'Dropping log bases', wrong: 'Treating $\\log_2 n$ and $\\log_{10} n$ as different orders.', right: 'Base change is a constant factor: $\\log_b n = \\frac{\\log_2 n}{\\log_2 b}$, so same $\\Theta$ class.' },
      ]}],
    },
    {
      id: 'master', title: 'Master Theorem',
      sub: 'Display math lives in a markdown block',
      blocks: [{ kind: 'markdown', items: [
        'For $T(n) = a\\,T(n/b) + f(n)$ with $a \\ge 1$, $b > 1$, compare $f(n)$ against $n^{\\log_b a}$:',
        '',
        '$$',
        'T(n) = \\begin{cases}',
        '\\Theta\\bigl(n^{\\log_b a}\\bigr) & \\text{if } f(n) = O\\bigl(n^{\\log_b a - \\epsilon}\\bigr) \\\\',
        '\\Theta\\bigl(n^{\\log_b a} \\log n\\bigr) & \\text{if } f(n) = \\Theta\\bigl(n^{\\log_b a}\\bigr) \\\\',
        '\\Theta\\bigl(f(n)\\bigr) & \\text{if } f(n) = \\Omega\\bigl(n^{\\log_b a + \\epsilon}\\bigr)',
        '\\end{cases}',
        '$$',
        '',
        'Case 3 also needs the regularity condition $a\\,f(n/b) \\le c\\,f(n)$ for some $c < 1$.',
      ]}],
    },
  ],
};
