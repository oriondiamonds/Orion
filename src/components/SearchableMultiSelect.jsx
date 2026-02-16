'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * SearchableMultiSelect - Searchable dropdown with visual chips for selected items
 *
 * @param {string} label - Label displayed above dropdown
 * @param {Array} options - Array of options with { id, name } or { handle, title }
 * @param {Array} selected - Array of selected IDs/handles
 * @param {Function} onChange - Callback when selection changes
 * @param {string} placeholder - Placeholder text for search
 * @param {boolean} loading - Show loading state
 */
export default function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Search...",
  loading = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize options to handle both {id, name} and {handle, title} formats
  const normalizedOptions = options.map(opt => ({
    value: opt.id || opt.handle || opt.value,
    label: opt.name || opt.title || opt.label,
    raw: opt
  }));

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selected.includes(opt.value)
  );

  // Get selected items details
  const selectedItems = selected
    .map(val => normalizedOptions.find(opt => opt.value === val))
    .filter(Boolean);

  const addItem = (value) => {
    if (!selected.includes(value)) {
      onChange([...selected, value]);
    }
    setSearchQuery('');
  };

  const removeItem = (value) => {
    onChange(selected.filter(v => v !== value));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {/* Selected Items as Chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedItems.map((item) => (
            <div
              key={item.value}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm"
            >
              <span className="max-w-[200px] truncate">{item.label}</span>
              <button
                onClick={() => removeItem(item.value)}
                className="text-blue-600 hover:text-blue-800 p-0.5"
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={clearAll}
            className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
            type="button"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left flex items-center justify-between hover:border-gray-400 focus:ring-2 focus:ring-[#0a1833] focus:border-transparent transition"
        >
          <span className="text-gray-600">
            {selected.length === 0
              ? `Select ${label.toLowerCase()}...`
              : `${selected.length} selected`}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500">
                  {searchQuery ? 'No results found' : 'No more options available'}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => addItem(option.value)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition flex items-center justify-between group"
                  >
                    <span className="truncate text-gray-700">{option.label}</span>
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">
                      Click to add
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {selected.length === 0
          ? `Search and select ${label.toLowerCase()}`
          : `${selected.length} ${label.toLowerCase()} selected`}
      </p>
    </div>
  );
}
