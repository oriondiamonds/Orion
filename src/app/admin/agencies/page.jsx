'use client';
import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgenciesPage() {
  const [password, setPassword] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_email: ''
  });

  // Load agencies on mount
  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const res = await fetch('/api/admin/agencies');
      const data = await res.json();
      if (data.success) {
        setAgencies(data.agencies || []);
      }
    } catch (err) {
      console.error('Failed to load agencies:', err);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Agency name is required');
      return;
    }

    if (!password) {
      toast.error('Enter admin password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          name: formData.name.trim(),
          contact_email: formData.contact_email.trim() || null
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Agency added successfully');
        setFormData({ name: '', contact_email: '' });
        setShowAddForm(false);
        loadAgencies();
      } else {
        toast.error(data.error || 'Failed to add agency');
      }
    } catch (err) {
      toast.error('Failed to add agency');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    const agency = agencies.find(a => a.id === id);
    if (!agency) return;

    if (!password) {
      toast.error('Enter admin password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          id,
          name: agency.name,
          contact_email: agency.contact_email || null
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Agency updated successfully');
        setEditingId(null);
        loadAgencies();
      } else {
        toast.error(data.error || 'Failed to update agency');
      }
    } catch (err) {
      toast.error('Failed to update agency');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this agency?')) return;

    if (!password) {
      toast.error('Enter admin password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, id })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Agency deleted successfully');
        loadAgencies();
      } else {
        toast.error(data.error || 'Failed to delete agency');
      }
    } catch (err) {
      toast.error('Failed to delete agency');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = (id) => {
    if (editingId === id) {
      setEditingId(null);
    } else {
      setEditingId(id);
    }
  };

  const updateAgencyField = (id, field, value) => {
    setAgencies(agencies.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-[#0a1833]" />
            <h1 className="text-3xl font-bold text-[#0a1833]">
              Agency Management
            </h1>
          </div>
          <p className="text-gray-600">
            Manage marketing agencies for attribution tracking
          </p>
        </div>

        {/* Admin Password */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
          />
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1833] text-white rounded-lg hover:bg-[#0a1833]/90 transition"
          >
            <Plus className="w-4 h-4" />
            Add New Agency
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#0a1833] mb-4">
              Add New Agency
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agency Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Agency C"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@agency.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAdd}
                disabled={loading}
                className="px-4 py-2 bg-[#0a1833] text-white rounded-lg hover:bg-[#0a1833]/90 transition disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Agency'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', contact_email: '' });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Agencies List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-[#0a1833]">
              All Agencies ({agencies.length})
            </h3>
          </div>

          {agencies.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No agencies found. Add your first agency above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm">
                    <th className="text-left px-6 py-3 font-medium">Agency Name</th>
                    <th className="text-left px-6 py-3 font-medium">Contact Email</th>
                    <th className="text-center px-6 py-3 font-medium">Status</th>
                    <th className="text-center px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agencies.map((agency) => (
                    <tr
                      key={agency.id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        {editingId === agency.id ? (
                          <input
                            type="text"
                            value={agency.name}
                            onChange={(e) => updateAgencyField(agency.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0a1833]"
                          />
                        ) : (
                          <span className="font-medium text-[#0a1833]">
                            {agency.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === agency.id ? (
                          <input
                            type="email"
                            value={agency.contact_email || ''}
                            onChange={(e) => updateAgencyField(agency.id, 'contact_email', e.target.value)}
                            placeholder="contact@agency.com"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0a1833]"
                          />
                        ) : (
                          <span className="text-gray-600 text-sm">
                            {agency.contact_email || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            agency.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {agency.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {editingId === agency.id ? (
                            <>
                              <button
                                onClick={() => handleUpdate(agency.id)}
                                disabled={loading}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  loadAgencies(); // Reset changes
                                }}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditToggle(agency.id)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(agency.id)}
                                disabled={loading}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
