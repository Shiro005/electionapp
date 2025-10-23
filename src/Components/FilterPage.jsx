import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { db, ref, get, onValue, off } from '../Firebase/config';
import { 
  FiFilter, 
  FiX, 
  FiUsers, 
  FiSearch,
  FiLoader,
  FiDownload,
  FiRefreshCw,
  FiHome,
  FiMapPin,
  FiHash,
  FiUser,
  FiPhone,
  FiCheckCircle,
  FiCircle,
  FiChevronRight,
  FiArrowLeft,
  FiList
} from 'react-icons/fi';
import TranslatedText from './TranslatedText';

const FilterPage = () => {
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentView, setCurrentView] = useState('filters'); // 'filters' or 'results'
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportError, setExportError] = useState('');

  const [filters, setFilters] = useState({
    searchTerm: '',
    boothNumber: '',
    pollingStation: '',
    village: '',
    hasPhone: '',
    supportStatus: '',
    hasVoted: '',
    sortBy: 'name'
  });

  // Simple filter categories for the main view
  const filterCategories = [
    {
      id: 'all',
      title: 'All Voters',
      description: 'View complete voter database',
      icon: FiUsers,
      color: 'blue'
    },
    {
      id: 'booth',
      title: 'Booth Wise',
      description: 'View voters by booth numbers',
      icon: FiHash,
      color: 'green'
    },
    {
      id: 'polling',
      title: 'Polling Station',
      description: 'Filter by polling station addresses',
      icon: FiMapPin,
      color: 'purple'
    },
    {
      id: 'alphabetical',
      title: 'Alphabetical',
      description: 'View voters in alphabetical order',
      icon: FiUser,
      color: 'orange'
    },
    {
      id: 'phone',
      title: 'With Phone Numbers',
      description: 'Voters who have phone numbers',
      icon: FiPhone,
      color: 'teal'
    },
    {
      id: 'voted',
      title: 'Voting Status',
      description: 'Filter by voted/not voted',
      icon: FiCheckCircle,
      color: 'indigo'
    },
    {
      id: 'support',
      title: 'Support Status',
      description: 'Filter by supporter levels',
      icon: FiUsers,
      color: 'pink'
    },
    {
      id: 'village',
      title: 'Village Wise',
      description: 'View voters by village',
      icon: FiHome,
      color: 'red'
    }
  ];

  // Process voter data
  const processVoterData = useCallback((rawData) => {
    if (!rawData) return [];
    
    return Object.entries(rawData).map(([key, value]) => ({
      id: key,
      serial: value.serialNumber || key,
      name: value.name || 'Unknown Voter',
      voterId: value.voterId || value.id || key,
      boothNumber: value.boothNumber || '',
      pollingStation: value.pollingStation || value.pollingStationAddress || '',
      village: value.village || value.area || '',
      fatherName: value.fatherName || '',
      age: value.age || '',
      gender: value.gender || '',
      phone: value.phone || value.phoneNumber || '',
      address: value.address || '',
      houseNumber: value.houseNumber || '',
      hasVoted: value.hasVoted || false,
      supportStatus: value.supportStatus || 'unknown',
      dob: value.dob || '',
      familyMembers: value.familyMembers || []
    }));
  }, []);

  // Load voters from Firebase
  const loadVoters = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setRefreshing(true);
      }

      const votersRef = ref(db, 'voters');
      
      onValue(votersRef, (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const processedVoters = processVoterData(rawData);
          setVoters(processedVoters);
        } else {
          setVoters([]);
        }
        setLoading(false);
        setRefreshing(false);
      });

    } catch (error) {
      console.error('Error loading voters:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [processVoterData]);

  // Initial load
  useEffect(() => {
    loadVoters();

    return () => {
      const votersRef = ref(db, 'voters');
      off(votersRef);
    };
  }, [loadVoters]);

  // Apply filters based on selected filter type
  const applyFilters = useCallback(() => {
    if (!voters.length) {
      setFilteredVoters([]);
      return;
    }

    let filtered = [...voters];

    // Apply search filter
    if (filters.searchTerm.trim()) {
      const terms = filters.searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = filtered.filter(voter => {
        const searchText = `${voter.name} ${voter.voterId} ${voter.fatherName} ${voter.village} ${voter.houseNumber}`.toLowerCase();
        return terms.every(term => searchText.includes(term));
      });
    }

    // Apply specific filters based on selected filter type
    if (selectedFilter === 'booth' && filters.boothNumber) {
      filtered = filtered.filter(voter => 
        voter.boothNumber && voter.boothNumber.toString().includes(filters.boothNumber)
      );
    }

    if (selectedFilter === 'polling' && filters.pollingStation) {
      filtered = filtered.filter(voter => 
        voter.pollingStation && voter.pollingStation.toLowerCase().includes(filters.pollingStation.toLowerCase())
      );
    }

    if (selectedFilter === 'phone') {
      if (filters.hasPhone === 'yes') {
        filtered = filtered.filter(voter => voter.phone && voter.phone.trim() !== '');
      } else if (filters.hasPhone === 'no') {
        filtered = filtered.filter(voter => !voter.phone || voter.phone.trim() === '');
      }
    }

    if (selectedFilter === 'voted') {
      if (filters.hasVoted === 'voted') {
        filtered = filtered.filter(voter => voter.hasVoted === true);
      } else if (filters.hasVoted === 'notVoted') {
        filtered = filtered.filter(voter => voter.hasVoted === false);
      }
    }

    if (selectedFilter === 'support' && filters.supportStatus) {
      filtered = filtered.filter(voter => 
        voter.supportStatus && voter.supportStatus.toLowerCase() === filters.supportStatus.toLowerCase()
      );
    }

    if (selectedFilter === 'village' && filters.village) {
      filtered = filtered.filter(voter => 
        voter.village && voter.village.toLowerCase().includes(filters.village.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'booth':
          return (a.boothNumber || '').localeCompare(b.boothNumber || '');
        case 'village':
          return (a.village || '').localeCompare(b.village || '');
        case 'serial':
        default:
          return (a.serial || '').localeCompare(b.serial || '');
      }
    });

    setFilteredVoters(filtered);
  }, [voters, filters, selectedFilter]);

  // Debounced filter application
  const debouncedApplyFilters = useMemo(
    () => debounce(applyFilters, 300),
    [applyFilters]
  );

  useEffect(() => {
    debouncedApplyFilters();
    return () => debouncedApplyFilters.cancel();
  }, [debouncedApplyFilters]);

  // Get unique values for dropdowns
  const uniqueValues = useMemo(() => {
    const booths = [...new Set(voters.map(v => v.boothNumber).filter(Boolean))].sort();
    const pollingStations = [...new Set(voters.map(v => v.pollingStation).filter(Boolean))].sort();
    const villages = [...new Set(voters.map(v => v.village).filter(Boolean))].sort();
    
    return { booths, pollingStations, villages };
  }, [voters]);

  const handleFilterSelect = useCallback((filterId) => {
    setSelectedFilter(filterId);
    setCurrentView('results');
    
    // Set default filters based on selection
    const newFilters = {
      searchTerm: '',
      boothNumber: '',
      pollingStation: '',
      village: '',
      hasPhone: '',
      supportStatus: '',
      hasVoted: '',
      sortBy: filterId === 'alphabetical' ? 'name' : 
              filterId === 'booth' ? 'booth' : 'name'
    };
    
    setFilters(newFilters);
  }, []);

  const handleBackToFilters = useCallback(() => {
    setCurrentView('filters');
    setSelectedFilter(null);
    setFilters({
      searchTerm: '',
      boothNumber: '',
      pollingStation: '',
      village: '',
      hasPhone: '',
      supportStatus: '',
      hasVoted: '',
      sortBy: 'name'
    });
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      boothNumber: '',
      pollingStation: '',
      village: '',
      hasPhone: '',
      supportStatus: '',
      hasVoted: '',
      sortBy: 'name'
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadVoters(true);
  }, [loadVoters]);

  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleExportConfirm = useCallback(() => {
    if (exportPassword === 'admin123') {
      // Export logic here
      console.log('Exporting data...', filteredVoters);
      setShowExportModal(false);
      setExportPassword('');
      setExportError('');
      alert(`Exporting ${filteredVoters.length} voters to Excel`);
    } else {
      setExportError('Invalid password');
    }
  }, [exportPassword, filteredVoters]);

  const handleVoterClick = useCallback((voterId) => {
    window.location.href = `/voter/${voterId}`;
  }, []);

  // Color mapping for filter cards
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
    orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
    teal: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
    pink: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    teal: 'text-teal-600',
    indigo: 'text-indigo-600',
    pink: 'text-pink-600',
    red: 'text-red-600'
  };

  // Loading state
  if (loading && voters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full absolute top-0 left-0 animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            <TranslatedText>Loading Voter Data</TranslatedText>
          </h2>
          <p className="text-gray-600">
            <TranslatedText>Please wait while we load the database...</TranslatedText>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              {currentView === 'results' && (
                <button
                  onClick={handleBackToFilters}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="text-gray-600 text-lg" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <TranslatedText>Voter Management System</TranslatedText>
                </h1>
                <p className="text-gray-600 mt-1">
                  {currentView === 'filters' ? (
                    <TranslatedText>Choose a filter to view voters</TranslatedText>
                  ) : (
                    <TranslatedText>Viewing filtered results</TranslatedText>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {currentView === 'results' && (
                <>
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <FiDownload className="mr-2" />
                    <TranslatedText>Export Excel</TranslatedText>
                  </button>
                  
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <FiRefreshCw className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    <TranslatedText>Refresh</TranslatedText>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search Bar - Only show in results view */}
          {currentView === 'results' && (
            <div className="pb-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search within results..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {filters.searchTerm && (
                  <button
                    onClick={() => handleFilterChange('searchTerm', '')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'filters' ? (
          /* Filters Grid View */
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                <TranslatedText>Choose Your Filter</TranslatedText>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                <TranslatedText>Select a filter category to view and manage voter data. Each filter provides different ways to organize and analyze the voter database.</TranslatedText>
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{voters.length}</div>
                <div className="text-sm text-gray-600"><TranslatedText>Total Voters</TranslatedText></div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {voters.filter(v => v.phone && v.phone.trim() !== '').length}
                </div>
                <div className="text-sm text-gray-600"><TranslatedText>With Phone</TranslatedText></div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {[...new Set(voters.map(v => v.boothNumber).filter(Boolean))].length}
                </div>
                <div className="text-sm text-gray-600"><TranslatedText>Booths</TranslatedText></div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {voters.filter(v => v.hasVoted).length}
                </div>
                <div className="text-sm text-gray-600"><TranslatedText>Voted</TranslatedText></div>
              </div>
            </div>

            {/* Filter Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filterCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleFilterSelect(category.id)}
                    className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-95 ${colorClasses[category.color]}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${colorClasses[category.color].split(' ')[0]}`}>
                        <IconComponent className={`text-xl ${iconColorClasses[category.color]}`} />
                      </div>
                      <FiChevronRight className={`text-lg ${iconColorClasses[category.color]}`} />
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2 text-left">
                      <TranslatedText>{category.title}</TranslatedText>
                    </h3>
                    <p className="text-sm opacity-75 text-left">
                      <TranslatedText>{category.description}</TranslatedText>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6">
            {/* Results Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className={`p-2 rounded-lg mr-3 ${colorClasses[filterCategories.find(f => f.id === selectedFilter)?.color].split(' ')[0]}`}>
                      {React.createElement(filterCategories.find(f => f.id === selectedFilter)?.icon, {
                        className: `text-lg ${iconColorClasses[filterCategories.find(f => f.id === selectedFilter)?.color]}`
                      })}
                    </span>
                    <TranslatedText>{filterCategories.find(f => f.id === selectedFilter)?.title}</TranslatedText>
                  </h2>
                  <p className="text-gray-600 mt-2">
                    <TranslatedText>Showing</TranslatedText> <span className="font-semibold text-blue-600">{filteredVoters.length}</span> <TranslatedText>of</TranslatedText> <span className="font-semibold">{voters.length}</span> <TranslatedText>voters</TranslatedText>
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {/* Dynamic Filter Controls */}
                  {selectedFilter === 'booth' && (
                    <select
                      value={filters.boothNumber}
                      onChange={(e) => handleFilterChange('boothNumber', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value=""><TranslatedText>All Booths</TranslatedText></option>
                      {uniqueValues.booths.map((booth) => (
                        <option key={booth} value={booth}>{booth}</option>
                      ))}
                    </select>
                  )}

                  {selectedFilter === 'polling' && (
                    <select
                      value={filters.pollingStation}
                      onChange={(e) => handleFilterChange('pollingStation', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value=""><TranslatedText>All Polling Stations</TranslatedText></option>
                      {uniqueValues.pollingStations.map((station) => (
                        <option key={station} value={station}>
                          {station.length > 40 ? station.substring(0, 40) + '...' : station}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedFilter === 'phone' && (
                    <select
                      value={filters.hasPhone}
                      onChange={(e) => handleFilterChange('hasPhone', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value=""><TranslatedText>All Voters</TranslatedText></option>
                      <option value="yes"><TranslatedText>With Phone Numbers</TranslatedText></option>
                      <option value="no"><TranslatedText>Without Phone Numbers</TranslatedText></option>
                    </select>
                  )}

                  {selectedFilter === 'voted' && (
                    <select
                      value={filters.hasVoted}
                      onChange={(e) => handleFilterChange('hasVoted', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value=""><TranslatedText>All Voters</TranslatedText></option>
                      <option value="voted"><TranslatedText>Voted</TranslatedText></option>
                      <option value="notVoted"><TranslatedText>Not Voted</TranslatedText></option>
                    </select>
                  )}

                  {selectedFilter === 'support' && (
                    <select
                      value={filters.supportStatus}
                      onChange={(e) => handleFilterChange('supportStatus', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value=""><TranslatedText>All Support Levels</TranslatedText></option>
                      <option value="strong"><TranslatedText>Strong Supporters</TranslatedText></option>
                      <option value="medium"><TranslatedText>Medium Supporters</TranslatedText></option>
                      <option value="weak"><TranslatedText>Weak Supporters</TranslatedText></option>
                      <option value="against"><TranslatedText>Against</TranslatedText></option>
                    </select>
                  )}

                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="name"><TranslatedText>Sort by Name</TranslatedText></option>
                    <option value="booth"><TranslatedText>Sort by Booth</TranslatedText></option>
                    <option value="village"><TranslatedText>Sort by Village</TranslatedText></option>
                    <option value="serial"><TranslatedText>Sort by Serial</TranslatedText></option>
                  </select>

                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <TranslatedText>Clear</TranslatedText>
                  </button>
                </div>
              </div>

              {refreshing && (
                <div className="flex items-center text-blue-600 mt-4">
                  <FiLoader className="animate-spin mr-2" />
                  <TranslatedText>Updating data...</TranslatedText>
                </div>
              )}
            </div>

            {/* Voters Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {filteredVoters.length === 0 ? (
                <div className="text-center py-16">
                  <FiUsers className="mx-auto text-gray-400 text-5xl mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    <TranslatedText>No voters found</TranslatedText>
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    <TranslatedText>Try adjusting your filters or search criteria to see more results</TranslatedText>
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <TranslatedText>Clear All Filters</TranslatedText>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText>#</TranslatedText>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText>Name</TranslatedText>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText>Father's Name</TranslatedText>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText>Phone</TranslatedText>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText>Booth</TranslatedText>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText>Voting Status</TranslatedText>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <TranslatedText>Support</TranslatedText>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredVoters.map((voter, index) => (
                        <tr 
                          key={voter.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors group"
                          onClick={() => handleVoterClick(voter.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{voter.name}</div>
                            <div className="text-sm text-gray-500">{voter.voterId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {voter.fatherName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {voter.phone ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FiPhone className="mr-1" />
                                {voter.phone}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <TranslatedText>No Phone</TranslatedText>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {voter.boothNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {voter.hasVoted ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FiCheckCircle className="mr-1" />
                                <TranslatedText>Voted</TranslatedText>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <FiCircle className="mr-1" />
                                <TranslatedText>Not Voted</TranslatedText>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              voter.supportStatus === 'strong' ? 'bg-blue-100 text-blue-800' :
                              voter.supportStatus === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              voter.supportStatus === 'weak' ? 'bg-orange-100 text-orange-800' :
                              voter.supportStatus === 'against' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {voter.supportStatus ? voter.supportStatus.charAt(0).toUpperCase() + voter.supportStatus.slice(1) : 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center">
              <FiDownload className="mx-auto text-3xl text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <TranslatedText>Export to Excel</TranslatedText>
              </h3>
              <p className="text-gray-600 mb-6">
                <TranslatedText>Enter admin password to export</TranslatedText> {filteredVoters.length} <TranslatedText>voters</TranslatedText>
              </p>
              
              <input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleExportConfirm()}
              />
              
              {exportError && (
                <p className="text-red-500 text-sm mb-4">{exportError}</p>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setExportPassword('');
                    setExportError('');
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <TranslatedText>Cancel</TranslatedText>
                </button>
                <button
                  onClick={handleExportConfirm}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <TranslatedText>Export</TranslatedText>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPage;