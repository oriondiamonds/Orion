// src/models/PricingConfig.js
import mongoose from "mongoose";

const diamondTierSchema = {
  multiplier: { type: Number, required: true },
  flatAddition: { type: Number, required: true, default: 0 },
  description: { type: String },
};

const pricingConfigSchema = new mongoose.Schema({
  diamondMargins: {
    lessThan1ct: diamondTierSchema, // < 1ct
    greaterThan1ct: diamondTierSchema, // ≥ 1ct, < 2ct
    greaterThan2ct: diamondTierSchema, // ≥ 2ct, < 3ct
    greaterThan3ct: diamondTierSchema, // ≥ 3ct, < 4ct
    greaterThan4ct: diamondTierSchema, // ≥ 4ct, < 5ct
    greaterThan5ct: diamondTierSchema, // ≥ 5ct
    baseFees: {
      fee1: { type: Number, required: true },
      fee2: { type: Number, required: true },
      description: { type: String },
    },
  },
  makingCharges: {
    lessThan2g: {
      ratePerGram: { type: Number, required: true },
      description: { type: String },
    },
    greaterThan2g: {
      ratePerGram: { type: Number, required: true },
      description: { type: String },
    },
    multiplier: { type: Number, required: true },
    description: { type: String },
  },
  gstRate: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: String, default: "system" },
});

// Use singleton: only one config document
export const PricingConfig =
  mongoose.models.PricingConfig ||
  mongoose.model("PricingConfig", pricingConfigSchema);
