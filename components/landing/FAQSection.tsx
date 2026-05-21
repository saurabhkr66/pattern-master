import FAQAccordion from "@/components/landing/FAQAccordion";
import { FAQS } from "@/components/landing/homeMetadata";

export default function FAQSection() {
  return (
    <section
      className="px-6 py-20 border-t"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
      aria-labelledby="faq-heading"
    >
      <div className="max-w-2xl mx-auto">
        <h2
          id="faq-heading"
          className="text-2xl md:text-3xl font-black mb-10 text-center"
          style={{ color: "var(--text-primary)" }}
        >
          Frequently asked questions
        </h2>
        <FAQAccordion faqs={FAQS} />
      </div>
    </section>
  );
}
