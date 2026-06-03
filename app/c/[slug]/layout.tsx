// Loads the redesign fonts (Space Grotesk display + JetBrains Mono) for all
// student-facing /c/[slug] pages. Next hoists the <link> into <head>.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      {children}
    </>
  );
}
