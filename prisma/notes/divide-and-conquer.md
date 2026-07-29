---
topic: Divide and Conquer
---

## Core Idea

Split a problem of size $n$ into $a$ subproblems of size $n/b$, solve them
recursively, then combine the results in $f(n)$ time. Every divide-and-conquer
algorithm collapses to the same recurrence:

$$
T(n) = a\,T\!\left(\frac{n}{b}\right) + f(n), \qquad a \ge 1,\; b > 1
$$

The whole difficulty of a GATE question is reading $a$, $b$ and $f(n)$ off the
pseudocode correctly — the solving step is mechanical.

## Master Theorem

Compare the combine cost $f(n)$ against the recursion cost $n^{\log_b a}$.

$$
T(n) =
\begin{cases}
\Theta\!\left(n^{\log_b a}\right)
  & \text{if } f(n) = O\!\left(n^{\log_b a - \epsilon}\right) \\
\Theta\!\left(n^{\log_b a}\log n\right)
  & \text{if } f(n) = \Theta\!\left(n^{\log_b a}\right) \\
\Theta\!\left(f(n)\right)
  & \text{if } f(n) = \Omega\!\left(n^{\log_b a + \epsilon}\right)
\end{cases}
$$

### When it does not apply

Case 3 additionally requires the regularity condition $a\,f(n/b) \le c\,f(n)$ for
some constant $c < 1$ and large $n$. The theorem also says nothing when $f(n)$
sits between two cases — the classic gap being $f(n) = \Theta\!\left(n^{\log_b a}
\log n\right)$, which needs the Akra–Bazzi method or a recursion tree.

## Standard Recurrences

| Algorithm | Recurrence | Result |
|---|---|---|
| Binary search | $T(n) = T(n/2) + \Theta(1)$ | $\Theta(\log n)$ |
| Merge sort | $T(n) = 2T(n/2) + \Theta(n)$ | $\Theta(n \log n)$ |
| Karatsuba | $T(n) = 3T(n/2) + \Theta(n)$ | $\Theta\!\left(n^{\log_2 3}\right) \approx \Theta(n^{1.585})$ |
| Strassen | $T(n) = 7T(n/2) + \Theta(n^2)$ | $\Theta\!\left(n^{\log_2 7}\right) \approx \Theta(n^{2.807})$ |
| Quicksort (worst) | $T(n) = T(n-1) + \Theta(n)$ | $\Theta(n^2)$ |
| Median of medians | $T(n) = T(n/5) + T(7n/10) + \Theta(n)$ | $\Theta(n)$ |

Note the last one: the subproblem sizes sum to $\tfrac{1}{5} + \tfrac{7}{10} =
\tfrac{9}{10} < 1$, which is exactly why the total work stays linear. The Master
Theorem does not cover unequal splits — use a recursion tree.

## Pitfalls

- **Misreading $b$.** A loop that halves the *range* gives $b = 2$; one that
  halves the *step* does not. Trace two iterations before committing.
- **Counting the combine step as $\Theta(1)$.** Merging two sorted halves is
  $\Theta(n)$, not constant — that single mistake turns $\Theta(n \log n)$ into
  $\Theta(n)$.
- **Applying case 1 without the $\epsilon$.** $f(n) = O\!\left(n^{\log_b a}\right)$
  is not enough; the gap must be *polynomial*, i.e. $n^{\log_b a - \epsilon}$ for
  some $\epsilon > 0$. $f(n) = n^{\log_b a}/\log n$ fails this.
- **Assuming divide-and-conquer always beats iteration.** With $a = 1$, $b = 2$,
  $f(n) = \Theta(n)$ the recurrence gives $\Theta(n)$ — the same as a single pass,
  plus the recursion overhead.
