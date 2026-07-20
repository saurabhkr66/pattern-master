/* BattleExam line icons — stroked, 24x24, currentColor. Ported from the design prototype. */
import type { SVGProps, ReactElement } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  d?: string;
  paths?: { d: string }[];
  size?: number;
  sw?: number;
};

const Icon = ({ d, paths, fill, size, sw = 2, children, ...rest }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size || 24}
    height={size || 24}
    fill={fill || "none"}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {d && <path d={d} />}
    {paths && paths.map((p, i) => <path key={i} {...p} />)}
    {children}
  </svg>
);

type P = SVGProps<SVGSVGElement>;

export const I: Record<string, (p?: P) => ReactElement> = {
  arrow: (p) => <Icon {...p} paths={[{ d: "M5 12h14" }, { d: "m13 6 6 6-6 6" }]} />,
  arrowR: (p) => <Icon {...p} d="m7 17 10-10M9 7h8v8" />,
  bolt: (p) => <Icon {...p} fill="currentColor" stroke="none" d="M13 2 4.5 13.5H11l-1 8.5 9-12.5h-6.5L13 2Z" />,
  brain: (p) => (
    <Icon
      {...p}
      paths={[
        { d: "M9.5 3A2.5 2.5 0 0 0 7 5.5 2.5 2.5 0 0 0 4.8 8 2.6 2.6 0 0 0 4 12.7a2.6 2.6 0 0 0 .8 4.6A2.5 2.5 0 0 0 7 20a2.5 2.5 0 0 0 2.5 1.5V3Z" },
        { d: "M14.5 3A2.5 2.5 0 0 1 17 5.5 2.5 2.5 0 0 1 19.2 8a2.6 2.6 0 0 1 .8 4.7 2.6 2.6 0 0 1-.8 4.6A2.5 2.5 0 0 1 17 20a2.5 2.5 0 0 1-2.5 1.5V3Z" },
      ]}
    />
  ),
  sliders: (p) => (
    <Icon
      {...p}
      paths={[
        { d: "M4 6h10M18 6h2" }, { d: "M4 12h4M12 12h8" }, { d: "M4 18h12M20 18h0" },
        { d: "M16 4v4" }, { d: "M10 10v4" }, { d: "M18 16v4" },
      ]}
    />
  ),
  cards: (p) => (
    <Icon
      {...p}
      paths={[
        { d: "M7 8.5 9.2 4a1.4 1.4 0 0 1 1.8-.7l7 3a1.4 1.4 0 0 1 .7 1.8l-4 9.4" },
        { d: "M3.5 9.5h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 19v-8a1.5 1.5 0 0 1 1.5-1.5Z" },
      ]}
    />
  ),
  archive: (p) => (
    <Icon {...p} paths={[{ d: "M3 6h18v3H3z" }, { d: "M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" }, { d: "M10 13h4" }]} />
  ),
  timer: (p) => (
    <Icon {...p} paths={[{ d: "M9 2h6" }, { d: "M12 14V9" }, { d: "M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" }, { d: "m18 8 1.5-1.5" }]} />
  ),
  target: (p) => (
    <Icon {...p} paths={[{ d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" }, { d: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" }, { d: "M12 12h.01" }]} />
  ),
  check: (p) => <Icon {...p} d="M20 6 9 17l-5-5" />,
  checkCircle: (p) => <Icon {...p} paths={[{ d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" }, { d: "m8.5 12 2.5 2.5L16 9" }]} />,
  x: (p) => <Icon {...p} d="M18 6 6 18M6 6l12 12" />,
  xCircle: (p) => <Icon {...p} paths={[{ d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" }, { d: "m9 9 6 6M15 9l-6 6" }]} />,
  plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  flame: (p) => <Icon {...p} fill="currentColor" stroke="none" d="M12 2c1 3-1 4-1 6 0 1 1 2 1 2s2-1 2-3c2 1.5 3 4 3 6a5 5 0 0 1-10 0c0-3 2-5 3-6 1-1 2-2 2-5Z" />,
  refresh: (p) => <Icon {...p} paths={[{ d: "M21 12a9 9 0 1 1-2.6-6.4" }, { d: "M21 4v4h-4" }]} />,
  spark: (p) => <Icon {...p} fill="currentColor" stroke="none" d="M12 2c.5 4 1.5 5 5.5 5.5C13.5 8 12.5 9 12 13c-.5-4-1.5-5-5.5-5.5C10.5 7 11.5 6 12 2Z" />,
  rotate: (p) => <Icon {...p} paths={[{ d: "M3 12a9 9 0 0 1 15-6.7L21 8" }, { d: "M21 3v5h-5" }, { d: "M21 12a9 9 0 0 1-15 6.7L3 16" }, { d: "M3 21v-5h5" }]} />,
  star: (p) => <Icon {...p} fill="currentColor" stroke="none" d="m12 2 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.8l1.2-6.6L2.5 9.6l6.6-.9L12 2Z" />,
  bars: (p) => <Icon {...p} paths={[{ d: "M5 21V10" }, { d: "M12 21V4" }, { d: "M19 21v-7" }]} />,
  sword: (p) => <Icon {...p} fill="currentColor" stroke="none" d="M14.5 3 21 3l-9.5 9.5-2-2L14.5 3ZM7 14l3 3-4 4H3v-3l4-4Zm2.5-1.5 2 2-1.5 1.5-2-2 1.5-1.5Z" />,
  bulb: (p) => <Icon {...p} paths={[{ d: "M9 18h6" }, { d: "M10 22h4" }, { d: "M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" }]} />,
  grid: (p) => <Icon {...p} paths={[{ d: "M3 3h7v7H3z" }, { d: "M14 3h7v7h-7z" }, { d: "M14 14h7v7h-7z" }, { d: "M3 14h7v7H3z" }]} />,
  chart: (p) => <Icon {...p} paths={[{ d: "M3 3v18h18" }, { d: "m7 16 4-4 4 2 5-6" }]} />,
  layers: (p) => <Icon {...p} paths={[{ d: "m12 2 10 6.5-10 6.5L2 8.5 12 2Z" }, { d: "m2 15.5 10 6.5 10-6.5" }, { d: "m2 12 10 6.5L22 12" }]} />,
  bookmark: (p) => <Icon {...p} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  alert: (p) => <Icon {...p} paths={[{ d: "M12 9v4" }, { d: "M12 17h.01" }, { d: "M10.3 3.5 1.7 18a2 2 0 0 0 1.7 3h17.2a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" }]} />,
  heatmap: (p) => (
    <Icon {...p}>
      <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" opacity=".25" />
      <rect x="10" y="3" width="4" height="4" rx="1" fill="currentColor" opacity=".65" />
      <rect x="17" y="3" width="4" height="4" rx="1" fill="currentColor" opacity=".4" />
      <rect x="3" y="10" width="4" height="4" rx="1" fill="currentColor" opacity=".9" />
      <rect x="10" y="10" width="4" height="4" rx="1" fill="currentColor" opacity=".15" />
      <rect x="17" y="10" width="4" height="4" rx="1" fill="currentColor" opacity=".75" />
      <rect x="3" y="17" width="4" height="4" rx="1" fill="currentColor" opacity=".5" />
      <rect x="10" y="17" width="4" height="4" rx="1" fill="currentColor" opacity=".85" />
      <rect x="17" y="17" width="4" height="4" rx="1" fill="currentColor" opacity=".3" />
    </Icon>
  ),
  share: (p) => <Icon {...p} paths={[{ d: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" }, { d: "M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" }, { d: "M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" }, { d: "m8.6 13.5 6.9 3.4" }, { d: "m15.4 7.1-6.9 3.4" }]} />,
  moon: (p) => <Icon {...p} d="M21 12.8A9 9 0 0 1 11.2 3 9 9 0 1 0 21 12.8Z" />,
  mobile: (p) => <Icon {...p} paths={[{ d: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" }, { d: "M11 18h2" }]} />,
  flag: (p) => <Icon {...p} paths={[{ d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" }, { d: "M4 22v-7" }]} />,
  trophy: (p) => <Icon {...p} paths={[{ d: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6" }, { d: "M18 9h1.5a2.5 2.5 0 0 0 0-5H18" }, { d: "M6 4h12v8a6 6 0 0 1-12 0V4Z" }, { d: "M8 22h8" }, { d: "M10 22v-4" }, { d: "M14 22v-4" }]} />,
};
