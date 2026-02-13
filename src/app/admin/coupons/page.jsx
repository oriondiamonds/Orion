"use client";
import { useState, useEffect } from "react";
import {
  Lock,
  Plus,
  Pencil,
  Trash2,
  Tag,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_COUPON = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_amount: "",
  max_discount_amount: "",
  usage_limit: "",
  per_customer_limit: "1",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

function formatDate(dateStr) {
  if (!dateStr) return "No expiry";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toLocalDatetime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminCouponsPage() {
  const [password, setPassword] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_COUPON });
  const [expandedUsage, setExpandedUsage] = useState(null);
  const [usageHistory, setUsageHistory] = useState({});

  useEffect(() => {
    fetchCoupons();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons);
      }
    } catch (err) {
      showMessage("error", "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_COUPON });
    setShowForm(true);
  };

  const handleEdit = (coupon) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || "",
      max_discount_amount: coupon.max_discount_amount || "",
      usage_limit: coupon.usage_limit || "",
      per_customer_limit: coupon.per_customer_limit ?? "1",
      starts_at: toLocalDatetime(coupon.starts_at),
      expires_at: toLocalDatetime(coupon.expires_at),
      is_active: coupon.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!password) {
      showMessage("error", "Admin password is required");
      return;
    }
    if (!formData.code || !formData.discount_value) {
      showMessage("error", "Code and discount value are required");
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        code: formData.code,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_customer_limit: formData.per_customer_limit ? parseInt(formData.per_customer_limit) : 1,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : new Date().toISOString(),
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
      };

      let res;
      if (editingId) {
        res = await fetch("/api/admin/coupons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, id: editingId, updates: couponData }),
        });
      } else {
        res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, coupon: couponData }),
        });
      }

      const data = await res.json();

      if (data.error) {
        showMessage("error", data.error);
      } else {
        showMessage("success", editingId ? "Coupon updated" : "Coupon created");
        setShowForm(false);
        setEditingId(null);
        setFormData({ ...EMPTY_COUPON });
        fetchCoupons();
      }
    } catch (err) {
      showMessage("error", "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon) => {
    if (!password) {
      showMessage("error", "Enter admin password first");
      return;
    }

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          id: coupon.id,
          updates: { is_active: !coupon.is_active },
        }),
      });

      const data = await res.json();
      if (data.error) {
        showMessage("error", data.error);
      } else {
        fetchCoupons();
        toast.success(coupon.is_active ? "Coupon deactivated" : "Coupon activated");
      }
    } catch (err) {
      showMessage("error", "Failed to toggle coupon");
    }
  };

  const handleDelete = async (id) => {
    if (!password) {
      showMessage("error", "Enter admin password first");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });

      const data = await res.json();
      if (data.error) {
        showMessage("error", data.error);
      } else {
        showMessage("success", "Coupon deleted");
        fetchCoupons();
      }
    } catch (err) {
      showMessage("error", "Failed to delete coupon");
    }
  };

  const isExpired = (coupon) => {
    return coupon.expires_at && new Date(coupon.expires_at) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-35 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Tag className="w-8 h-8 text-[#0a1833]" />
          <div>
            <h1 className="text-3xl font-bold text-[#0a1833]">Coupon Management</h1>
            <p className="text-gray-600 text-sm">Create and manage discount coupons</p>
          </div>
        </div>

        {/* Admin Password */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Lock size={14} className="inline mr-1" />
            Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
          />
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Create Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0a1833] text-white rounded-lg text-sm font-medium hover:bg-[#1a2f5a] transition"
          >
            <Plus size={16} />
            Create Coupon
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-[#0a1833] mb-4">
              {editingId ? "Edit Coupon" : "Create New Coupon"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal note (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value *
                </label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === "percentage" ? "e.g. 10" : "e.g. 500"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Order Amount
                </label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="0 (no minimum)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {formData.discount_type === "percentage" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.max_discount_amount}
                    onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                    placeholder="No cap"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Customer Limit
                </label>
                <input
                  type="number"
                  value={formData.per_customer_limit}
                  onChange={(e) => setFormData({ ...formData, per_customer_limit: e.target.value })}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-[#0a1833] text-white rounded-lg text-sm font-medium hover:bg-[#1a2f5a] disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Coupons List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No coupons created yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${
                  !coupon.is_active
                    ? "border-gray-300"
                    : isExpired(coupon)
                    ? "border-red-400"
                    : "border-green-500"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-lg font-bold text-[#0a1833] tracking-wider">
                        {coupon.code}
                      </span>

                      {/* Type badge */}
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {coupon.discount_type === "percentage"
                          ? `${parseFloat(coupon.discount_value)}% OFF`
                          : `₹${parseFloat(coupon.discount_value)} OFF`}
                      </span>

                      {/* Status */}
                      {!coupon.is_active ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          Inactive
                        </span>
                      ) : isExpired(coupon) ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">
                          Expired
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          Active
                        </span>
                      )}
                    </div>

                    {coupon.description && (
                      <p className="text-sm text-gray-500 mt-1">{coupon.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                      {coupon.min_order_amount > 0 && (
                        <span>Min: ₹{parseFloat(coupon.min_order_amount).toLocaleString("en-IN")}</span>
                      )}
                      {coupon.max_discount_amount && (
                        <span>Max: ₹{parseFloat(coupon.max_discount_amount).toLocaleString("en-IN")}</span>
                      )}
                      <span>
                        Used: {coupon.total_uses}
                        {coupon.usage_limit ? ` / ${coupon.usage_limit}` : " (unlimited)"}
                      </span>
                      <span>Per customer: {coupon.per_customer_limit ?? "unlimited"}</span>
                      <span>Expires: {formatDate(coupon.expires_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(coupon)}
                      className={`p-2 rounded-lg transition ${
                        coupon.is_active
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-50"
                      }`}
                      title={coupon.is_active ? "Deactivate" : "Activate"}
                    >
                      {coupon.is_active ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
