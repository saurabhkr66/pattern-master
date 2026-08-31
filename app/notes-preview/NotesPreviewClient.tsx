"use client";

import { useState } from "react";
import MasteryNotes from "@/components/MasteryNotes";

// A short demo so the sandbox renders something on first load. Uses String.raw
// so LaTeX backslashes survive, and "~~~" fences (not backticks) so it stays a
// valid template literal.
const DEFAULT = String.raw`# Notes Preview

## 1. Formatting that works
This is **bold**, this is *italic*, and inline math $a^2 + b^2 = c^2$.

- Bullet one
- Bullet two

| Feature | Parse Tree | AST |
| --- | --- | --- |
| Complexity | High | Low |
| Use Case | Parsing | ICG |

Block math on its own line:

$$
\text{Address} = \text{Base} + (i - \text{low}) \times w
$$

~~~text
param a
param b
t1 = call f, 2
~~~
`;

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  opacity: 0.7,
  marginBottom: 8,
};

export default function NotesPreviewClient() {
  const [text, setText] = useState(DEFAULT);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={labelStyle}>Paste markdown</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: "75vh",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
            lineHeight: 1.55,
            background: "var(--bg-surface, #111214)",
            color: "var(--text-primary, #e8e8e8)",
            border: "1px solid var(--border, #2a2c31)",
            borderRadius: 8,
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={labelStyle}>Live preview — exact Mastery-notes rendering</div>
        <div
          style={{
            border: "1px solid var(--border, #2a2c31)",
            borderRadius: 8,
            overflow: "auto",
            minHeight: "75vh",
          }}
        >
          <MasteryNotes data={text} />
        </div>
      </div>
    </div>
  );
}
