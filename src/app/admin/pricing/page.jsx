// src/app/admin/pricing/page.jsx
"use client";
import { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Diamond,
} from "lucide-react";

// All diamond tiers in display order
const DIAMOND_TIERS = [
  {
    key: "lessThan1ct",
    label: "< 1 Carat",
    range: "Per-stone weight under 1ct",
    showFlat: true,
  },
  {
    key: "greaterThan1ct",
    label: "1 – 2 Carats",
    range: "Per-stone weight ≥ 1ct and < 2ct",
    showFlat: true,
  },
  {
    key: "greaterThan2ct",
    label: "2 – 3 Carats",
    range: "Per-stone weight ≥ 2ct and < 3ct",
    showFlat: true,
  },
  {
    key: "greaterThan3ct",
    label: "3 – 4 Carats",
    range: "Per-stone weight ≥ 3ct and < 4ct",
    showFlat: true,
  },
  {
    key: "greaterThan4ct",
    label: "4 – 5 Carats",
    range: "Per-stone weight ≥ 4ct and < 5ct",
    showFlat: true,
  },
  {
    key: "greaterThan5ct",
    label: "5+ Carats",
    range: "Per-stone weight ≥ 5ct",
    showFlat: true,
  },
];

export default function AdminPricingPortal() {
  const [config, setConfig] = useState(null);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [updatedBy, setUpdatedBy] = useState("");
  const [goldPrice, setGoldPrice] = useState(null);
  const [refreshingGold, setRefreshingGold] = useState(false);
  const [activeTab, setActiveTab] = useState("lessThan1ct");

  useEffect(() => {
    fetchConfig();
    fetchGoldPrice();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pricing-config");
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      showMessage("error", "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const fetchGoldPrice = async () => {
    try {
      const response = await fetch("/api/gold-price");
      const data = await response.json();
      if (data.success) setGoldPrice(data);
    } catch (error) {
      console.error("Failed to fetch gold price:", error);
    }
  };

  const refreshGoldPrice = async () => {
    try {
      setRefreshingGold(true);
      const response = await fetch("/api/gold-price", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setGoldPrice({ ...data, price: data.price, date: data.date });
        showMessage("success", "Gold price refreshed successfully!");
      } else {
        showMessage("error", "Failed to refresh gold price");
      }
    } catch (error) {
      showMessage("error", "Failed to refresh gold price");
    } finally {
      setRefreshingGold(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async () => {
    if (!updatedBy.trim()) {
      showMessage("error", "Please enter your name");
      return;
    }
    if (!password.trim()) {
      showMessage("error", "Please enter admin password");
      return;
    }

    try {
      setSaving(true);

      // Convert percentages back to multipliers before saving
      const configToSave = JSON.parse(JSON.stringify(config));

      // Convert diamond margins from percentage to multiplier
      Object.keys(configToSave.diamondMargins).forEach((key) => {
        if (
          key !== "baseFees" &&
          configToSave.diamondMargins[key].multiplierPercent
        ) {
          // Convert percentage to multiplier: 170% -> 1.7
          configToSave.diamondMargins[key].multiplier =
            configToSave.diamondMargins[key].multiplierPercent / 100;
          delete configToSave.diamondMargins[key].multiplierPercent;
        }
      });

      const response = await fetch("/api/pricing-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: configToSave,
          password: password.trim(),
          updatedBy: updatedBy.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to save configuration");

      // Convert back to percentage for display
      const displayConfig = JSON.parse(JSON.stringify(result.config));
      Object.keys(displayConfig.diamondMargins).forEach((key) => {
        if (
          key !== "baseFees" &&
          displayConfig.diamondMargins[key].multiplier
        ) {
          displayConfig.diamondMargins[key].multiplierPercent =
            displayConfig.diamondMargins[key].multiplier * 100;
        }
      });

      setConfig(displayConfig);
      showMessage("success", "Configuration saved successfully!");
      setIsAuthenticated(true);
    } catch (error) {
      showMessage("error", error.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset to default values?")) return;
    if (!password.trim()) {
      showMessage("error", "Please enter admin password");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/pricing-config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password.trim(),
          updatedBy: updatedBy.trim() || "admin",
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to reset");

      // Convert to percentage for display
      const displayConfig = JSON.parse(JSON.stringify(result.config));
      Object.keys(displayConfig.diamondMargins).forEach((key) => {
        if (
          key !== "baseFees" &&
          displayConfig.diamondMargins[key].multiplier
        ) {
          displayConfig.diamondMargins[key].multiplierPercent =
            displayConfig.diamondMargins[key].multiplier * 100;
        }
      });

      setConfig(displayConfig);
      showMessage("success", "Configuration reset to defaults");
    } catch (error) {
      showMessage("error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateConfigValue = (path, value) => {
    const pathArray = path.split(".");
    const newConfig = JSON.parse(JSON.stringify(config));
    let current = newConfig;

    for (let i = 0; i < pathArray.length - 1; i++)
      current = current[pathArray[i]];

    const parsed = parseFloat(value);
    current[pathArray[pathArray.length - 1]] = isNaN(parsed) ? value : parsed;
    setConfig(newConfig);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a1833]" />
      </div>
    );
  }

  const activeTier = DIAMOND_TIERS.find((t) => t.key === activeTab);
  const tierConfig = config?.diamondMargins?.[activeTab];
  const tierMultiplierPercent =
    tierConfig?.multiplierPercent ||
    (tierConfig?.multiplier ? tierConfig.multiplier * 100 : 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 mt-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#0a1833]">
                Pricing Configuration
              </h1>
              <p className="text-gray-600 mt-1">
                Manage diamond and gold pricing margins
              </p>
              {config?.lastUpdated && (
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {new Date(config.lastUpdated).toLocaleString()}{" "}
                  by {config.updatedBy}
                </p>
              )}
            </div>
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* Gold Price */}
        {goldPrice && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl shadow-md p-6 mb-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0a1833] mb-2">
                  Current 24K Gold Price (Surat)
                </h2>
                <p className="text-3xl font-bold text-yellow-600">
                  ₹{goldPrice.price.toFixed(2)} / gram
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Last updated: {goldPrice.date}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {goldPrice.nextUpdate}
                </p>
              </div>
              <button
                onClick={refreshGoldPrice}
                disabled={refreshingGold}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <RefreshCw
                  className={`w-5 h-5 ${refreshingGold ? "animate-spin" : ""}`}
                />
                {refreshingGold ? "Refreshing..." : "Refresh Now"}
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : message.type === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-blue-50 text-blue-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : message.type === "error" ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ── Diamond Margins ── */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <Diamond className="w-5 h-5 text-[#0a1833]" />
            <h2 className="text-xl font-bold text-[#0a1833]">
              Diamond Margins
            </h2>
          </div>

          {/* Tier tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {DIAMOND_TIERS.map((tier) => (
              <button
                key={tier.key}
                onClick={() => setActiveTab(tier.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tier.key
                    ? "bg-[#0a1833] text-white shadow"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Active tier fields */}
          {activeTier && tierConfig && (
            <div className="border rounded-lg p-5 bg-gray-50">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 text-base">
                  {activeTier.label}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{activeTier.range}</p>
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Multiplier as Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Markup Percentage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={tierMultiplierPercent}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        updateConfigValue(
                          `diamondMargins.${activeTier.key}.multiplierPercent`,
                          percentage,
                        );
                        // Also update the actual multiplier
                        updateConfigValue(
                          `diamondMargins.${activeTier.key}.multiplier`,
                          percentage / 100,
                        );
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent bg-white pr-8"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {tierMultiplierPercent > 0
                      ? `Final price = base × ${(tierMultiplierPercent / 100).toFixed(2)}${
                          tierConfig.flatAddition
                            ? ` + ₹${tierConfig.flatAddition}`
                            : ""
                        }`
                      : "Enter a percentage"}
                  </p>
                </div>

                {/* Flat Addition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flat Addition (₹)
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={tierConfig.flatAddition ?? ""}
                    onChange={(e) =>
                      updateConfigValue(
                        `diamondMargins.${activeTier.key}.flatAddition`,
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {tierConfig.flatAddition
                      ? `Additional ₹${tierConfig.flatAddition} added on top`
                      : "Optional flat addition to final price"}
                  </p>
                </div>
              </div>

              {/* Quick comparison row for all tiers */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  All tiers at a glance
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {DIAMOND_TIERS.map((t) => {
                    const tierCfg = config?.diamondMargins?.[t.key];
                    const percent =
                      tierCfg?.multiplierPercent ||
                      (tierCfg?.multiplier ? tierCfg.multiplier * 100 : 0);
                    return (
                      <div
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`text-center p-3 rounded cursor-pointer transition-colors border-2 ${
                          t.key === activeTab
                            ? "bg-[#0a1833] text-white border-[#0a1833]"
                            : "bg-white border-gray-200 hover:border-[#0a1833] text-gray-700"
                        }`}
                      >
                        <p className="text-xs font-medium mb-1">{t.label}</p>
                        <p className="text-lg font-bold">{percent}%</p>
                        {tierCfg?.flatAddition ? (
                          <p className="text-xs mt-1">
                            +₹{tierCfg.flatAddition}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Base Fees — always visible below tabs */}
          <div className="border rounded-lg p-5 mt-4">
            <h3 className="font-semibold text-gray-800 mb-1">Base Fees</h3>
            <p className="text-sm text-gray-500 mb-4">
              {config?.diamondMargins?.baseFees?.description ||
                "Flat fees added to total diamond price"}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee 1 (₹)
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={config?.diamondMargins?.baseFees?.fee1 ?? ""}
                  onChange={(e) =>
                    updateConfigValue(
                      "diamondMargins.baseFees.fee1",
                      e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee 2 (₹)
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={config?.diamondMargins?.baseFees?.fee2 ?? ""}
                  onChange={(e) =>
                    updateConfigValue(
                      "diamondMargins.baseFees.fee2",
                      e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Making Charges */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-[#0a1833] mb-4">
            Making Charges
          </h2>

          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-1">
                Gold Weight &lt; 2g
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {config?.makingCharges?.lessThan2g?.description}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate per Gram (₹)
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={config?.makingCharges?.lessThan2g?.ratePerGram ?? ""}
                  onChange={(e) =>
                    updateConfigValue(
                      "makingCharges.lessThan2g.ratePerGram",
                      e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-1">
                Gold Weight ≥ 2g
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {config?.makingCharges?.greaterThan2g?.description}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate per Gram (₹)
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={
                    config?.makingCharges?.greaterThan2g?.ratePerGram ?? ""
                  }
                  onChange={(e) =>
                    updateConfigValue(
                      "makingCharges.greaterThan2g.ratePerGram",
                      e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-1">
                Final Multiplier
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {config?.makingCharges?.description}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiplier
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config?.makingCharges?.multiplier ?? ""}
                  onChange={(e) =>
                    updateConfigValue(
                      "makingCharges.multiplier",
                      e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* GST Rate */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-[#0a1833] mb-4">GST Rate</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Rate (e.g. 3 for 3%)
            </label>
            <div className="relative max-w-xs">
              <input
                type="number"
                step="0.1"
                min="0"
                value={(config?.gstRate ?? 0) * 100}
                onChange={(e) => {
                  const percentage = parseFloat(e.target.value) || 0;
                  updateConfigValue("gstRate", percentage / 100);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent pr-8"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-[#0a1833] mb-4">
            Admin Controls
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={updatedBy}
                onChange={(e) => setUpdatedBy(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !password || !updatedBy}
                className="flex-1 bg-[#0a1833] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#142850] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={handleReset}
                disabled={saving || !password}
                className="px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
