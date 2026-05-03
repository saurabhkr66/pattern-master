import { renderMath } from "@/lib/renderMath";

export function MathText({ content, className }: { content: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderMath(content) }} />;
}
