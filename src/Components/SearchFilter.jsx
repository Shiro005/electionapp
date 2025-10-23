// src/components/SearchFilter.jsx
import React from 'react';

const SearchFilter = ({ 
  searchTerm, 
  onSearchChange, 
  filters, 
  onFiltersChange, 
  boothNumbers, 
  pollingStations 
}) => {
  return (
    <div className="bg-orange-50 rounded-lg p-6 mb-6 border border-orange-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search by Name/Voter ID */}
        <div>
          <label className="block text-sm font-medium text-orange-700 mb-2">
            Search by Name or Voter ID
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Enter name or voter ID..."
            className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Filter by Booth Number */}
        <div>
          <label className="block text-sm font-medium text-orange-700 mb-2">
            Filter by Booth Number
          </label>
          <select
            value={filters.boothNumber}
            onChange={(e) => onFiltersChange({ ...filters, boothNumber: e.target.value })}
            className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">All Booths</option>
            {boothNumbers.map(booth => (
              <option key={booth} value={booth}>
                Booth {booth}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Polling Station */}
        <div>
          <label className="block text-sm font-medium text-orange-700 mb-2">
            Filter by Polling Station
          </label>
          <select
            value={filters.pollingStationAddress}
            onChange={(e) => onFiltersChange({ ...filters, pollingStationAddress: e.target.value })}
            className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">All Polling Stations</option>
            {pollingStations.map(station => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters */}
      {(searchTerm || filters.boothNumber || filters.pollingStationAddress) && (
        <div className="mt-4">
          <button
            onClick={() => {
              onSearchChange('');
              onFiltersChange({ boothNumber: '', pollingStationAddress: '' });
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;