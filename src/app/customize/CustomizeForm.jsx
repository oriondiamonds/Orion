"use client";

import { useState } from "react";
import Image from "next/image";

const INITIAL_STATE = {
  name: "",
  email: "",
  phone: "",
  itemType: "",
  message: "",
  image: null,
};

export default function CustomizeForm() {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val) form.append(key, val);
      });
      const res = await fetch("/api/sendCustomization", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        setSubmitted(true);
        setFormData(INITIAL_STATE);
        setImagePreview(null);
      }
    } catch (err) {
      console.error("Customization form error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <p className="text-green-700 font-semibold text-lg mb-2">
          Thank you! We'll be in touch within 24 hours.
        </p>
        <p className="text-green-600 text-sm">
          Our team will review your request and reach out to discuss your custom
          piece.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
      {/* Left — image */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg aspect-square">
        <Image
          src="/cust.png"
          alt="Custom diamond jewellery"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#0a1833]/40 flex items-end p-8">
          <p className="text-white text-2xl font-light leading-snug">
            Bring your vision to life
          </p>
        </div>
      </div>

      {/* Right — form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Priya Sharma"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone / WhatsApp
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 9876543210"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jewellery Type
          </label>
          <select
            name="itemType"
            required
            value={formData.itemType}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
          >
            <option value="">Select type</option>
            <option value="Ring">Ring</option>
            <option value="Earrings">Earrings</option>
            <option value="Bracelet">Bracelet</option>
            <option value="Pendant">Pendant</option>
            <option value="Necklace">Necklace</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tell us about your design
          </label>
          <textarea
            name="message"
            required
            rows={4}
            value={formData.message}
            onChange={handleChange}
            placeholder="Describe your dream piece — metal, stone shape, occasion, budget..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Image{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#0a1833] file:text-white hover:file:bg-[#13254d]"
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-3 h-24 rounded-lg object-cover"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#0a1833] text-white py-3 rounded-lg font-medium hover:bg-[#13254d] transition disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
