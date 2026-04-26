
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const asymptoticJSON = {
  meta: { readTime: '~9 min', cards: 23, updated: 'today' },
  sections: [
    {
      id: 'def', title: 'Formal Definitions',
      sub: 'Three asymptotic bounds — write from memory', open: true,
      blocks: [{ kind: 'def', items: [
        { sym: 'O', name: 'Big-O', bound: 'Upper', formula: 'f(n) ≤ c·g(n)', cond: 'n ≥ n₀', gloss: 'f never grows faster than g.', color: '#f87171' },
        { sym: 'Ω', name: 'Omega', bound: 'Lower', formula: 'f(n) ≥ c·g(n)', cond: 'n ≥ n₀', gloss: 'f always grows at least as fast as g.', color: '#4ade80' },
        { sym: 'Θ', name: 'Theta', bound: 'Tight', formula: 'c₁·g(n) ≤ f(n) ≤ c₂·g(n)', cond: 'n ≥ n₀', gloss: 'f and g grow at the same rate.', color: '#ff8a3d' },
      ]}],
    },
    {
      id: 'lad', title: 'Growth-Rate Ladder',
      sub: 'Memorize this ordering', open: true,
      blocks: [
        { kind: 'ladder', label: 'Slowest → Fastest', items: ['O(1)','O(log log n)','O(log n)','O(n^(1/k))','O(n)','O(n log n)','O(n^k)','O(aⁿ)','O(n!)'] },
        { kind: 'rules', items: [
          { title: 'log(n!) is Θ(n log n)', body: 'Useful in comparison-sort lower bounds.' },
          { title: 'Polynomial < Exponential', body: 'nᵏ is always slower than aⁿ for large n.' },
        ]},
      ],
    },
    {
      id: 'prop', title: 'Properties',
      sub: 'The four moves in nearly every Big-O proof',
      blocks: [{ kind: 'props', items: [
        { name: 'Transitivity', formula: 'f=O(g), g=O(h) ⇒ f=O(h)', eg: 'If f is O(n²) and n² is O(n³), then f is O(n³).' },
        { name: 'Summation',    formula: 'O(f+g) = max(O(f), O(g))', eg: 'Bigger term wins; drop the smaller.' },
        { name: 'Product',      formula: 'O(f·g) = O(f)·O(g)',       eg: 'Nested loops multiply: O(n)×O(n)=O(n²).' },
        { name: 'Symmetry',     formula: 'f=Θ(g) ⇔ g=Θ(f)',           eg: 'Theta is the only bound that flips both ways.' },
      ]}],
    },
    {
      id: 'tips', title: 'GATE Code Tips',
      sub: 'Spot the loop pattern → write the bound',
      blocks: [{ kind: 'tips', items: [
        { label: 'Iterative · additive',       code: 'i = i + k',                bound: 'O(n)',           hint: 'Linear update → linear work.' },
        { label: 'Iterative · multiplicative', code: 'i = i*k\\ni = i/k',         bound: 'O(logₖ n)',       hint: 'Multiply/divide → log base k.' },
        { label: 'Recursive',                  code: 'T(n) = aT(n/b) + Θ(nᵏ)',   bound: 'Master Theorem', hint: 'Compare nᵏ to n^(logᵦa).' },
      ]}],
    },
    {
      id: 'pit', title: 'Pitfalls',
      sub: 'What examiners trap you with',
      blocks: [{ kind: 'pitfalls', items: [
        { title: 'Confusing Θ with O', wrong: 'f(n)=O(n) implies f(n)=Θ(n).', right: 'O is only an upper bound; f could grow much slower.' },
        { title: 'Dropping log bases', wrong: 'Treating log₂ n and log₁₀ n as different orders.', right: 'Base change = constant factor. Same Θ class.' },
      ]}],
    },
  ],
};

async function main() {
  const res = await prisma.pattern.updateMany({
    where: { topic_name: 'Asymptotic Analysis' },
    data: {
      short_notes: JSON.stringify(asymptoticJSON)
    }
  });
  console.log(`✅ Updated ${res.count} topics for Asymptotic Analysis`);
}

main();
