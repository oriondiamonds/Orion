"use client";

import { useState } from "react";
import { FiMenu } from "react-icons/fi";

export default function FaqAccordion({ faqs }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const toggle = (idx) => setActiveIdx(activeIdx === idx ? null : idx);

  return (
    <>
      {faqs.map((faq, idx) => (
        <div key={idx} className="border-b border-gray-200">
          <button
            className="w-full flex items-center justify-between px-4 py-5 text-left text-[#0a1833] font-semibold hover:bg-gray-50 transition"
            onClick={() => toggle(idx)}
          >
            <span>{faq.question}</span>
            <FiMenu className="shrink-0 ml-4" />
          </button>
          {activeIdx === idx && (
            <div className="px-4 pb-5 text-gray-600 leading-relaxed">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
