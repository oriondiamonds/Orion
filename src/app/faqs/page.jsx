import FaqAccordion from "./FaqAccordion";

export const metadata = {
  title: "FAQs",
  description:
    "Answers to common questions about lab-grown diamonds — what they are, how they're made, durability, resale value, certification, and customisation at Orion Diamonds.",
};

const FAQS = [
  {
    question: "What are lab-grown diamonds?",
    answer:
      "Lab-grown diamonds are real diamonds created in a lab using advanced technology. They have the same physical, chemical, and optical properties as mined diamonds.",
  },
  {
    question: "Are lab-grown diamonds real diamonds?",
    answer:
      "Yes, lab-grown diamonds are 100% real. They are certified and graded just like mined diamonds.",
  },
  {
    question: "How are lab-grown diamonds made?",
    answer:
      "They are made using two methods: HPHT (High Pressure High Temperature) or CVD (Chemical Vapor Deposition), replicating the natural diamond-growing process. We prefer and use the CVD method.",
  },
  {
    question: "Do lab-grown diamonds look different from natural diamonds?",
    answer:
      "No — they are visually identical. Even trained gemologists cannot distinguish a lab-grown diamond from a mined one without specialised equipment.",
  },
  {
    question: "Will a lab-grown diamond last forever?",
    answer:
      "Yes. Just like mined diamonds, they score 10 on the Mohs hardness scale and are extremely durable — built to last a lifetime.",
  },
  {
    question: "Why should I choose lab-grown over natural diamonds?",
    answer:
      "Lab-grown diamonds offer the same beauty at a better price, with ethical sourcing and lower environmental impact. Orion also provides an 80% buyback guarantee on all purchases.",
  },
  {
    question: "Can I customise lab-grown diamond jewellery?",
    answer:
      "Absolutely. At Orion, we craft each piece to match your vision — from rings to earrings, every design is tailored to your style and preferences. Use our customisation form or contact us to get started.",
  },
  {
    question: "Are your diamonds certified?",
    answer:
      "Yes. All our diamonds come with IGI (International Gemological Institute) certification, graded on the same 4Cs as mined diamonds. They are inscribed as 'LAB GROWN' for complete transparency.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};

export default function FAQsPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Navy hero banner */}
      <div className="bg-[#0a1833] pt-40 pb-16 text-center">
        <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-3">
          Orion Diamonds
        </p>
        <h1 className="text-4xl md:text-5xl font-light text-white tracking-wide">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-400 mt-3 text-sm">
          Everything you need to know about lab-grown diamonds
        </p>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <FaqAccordion faqs={FAQS} />
      </div>
    </div>
  );
}
