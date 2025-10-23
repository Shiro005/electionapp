import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import debounce from 'lodash.debounce';
import { db, ref, get, onValue } from '../Firebase/config';
import * as XLSX from 'xlsx';
import useAutoTranslate from '../hooks/useAutoTranslate';

// Icons
import { 
  FiFilter, 
  FiDownload, 
  FiX, 
  FiUsers, 
  FiEye,
  FiSearch,
  FiHome,
  FiLoader,
  FiChevronLeft,
  FiChevronRight,
  FiSliders,
  FiBarChart2,
  FiUserCheck,
  FiMapPin
} from 'react-icons/fi';
import TranslatedText from './TranslatedText';

// Lazy load components
const SearchFilter = lazy(() => import('./SearchFilter'));
const VoterList = lazy(() => import('./VoterList'));

const Dashboard = () => {
  const { currentLanguage, translateText, translateMultiple } = useAutoTranslate();
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    boothNumbers: [], // allow multi-select of booths
    pollingStationAddress: ''
  });
  const [boothsList, setBoothsList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSticky, setIsSticky] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load voters with pagination
  const loadVoters = useCallback(async (page = 1, search = '', filter = {}) => {
    try {
      setLoading(true);
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      
      if (snapshot.exists()) {
        const allVoters = [];
        snapshot.forEach((childSnapshot) => {
          const raw = childSnapshot.val();
          allVoters.push({
            id: childSnapshot.key,
            name: raw.name || raw.Name || '',
            voterId: raw.voterId || raw.VoterId || '',
            boothNumber: raw.boothNumber,
            pollingStationAddress: raw.pollingStationAddress,
            age: raw.age,
            gender: raw.gender
          });
        });

        // Apply search filter
        let filteredVoters = allVoters;
        if (search.trim()) {
          const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
          filteredVoters = allVoters.filter(voter => {
            const searchText = `${voter.name} ${voter.voterId}`.toLowerCase();
            return terms.every(term => searchText.includes(term));
          });
        }

        // Apply booth filter (supports multiple boothNumbers)
        if (filter.boothNumbers && Array.isArray(filter.boothNumbers) && filter.boothNumbers.length > 0) {
          const selected = filter.boothNumbers.map(b => String(b));
          filteredVoters = filteredVoters.filter(voter => voter.boothNumber && selected.includes(String(voter.boothNumber)));
        }

        // Apply polling station filter
        if (filter.pollingStationAddress) {
          filteredVoters = filteredVoters.filter(voter =>
            voter.pollingStationAddress && 
            voter.pollingStationAddress.toLowerCase().includes(filter.pollingStationAddress.toLowerCase())
          );
        }

        setTotalCount(filteredVoters.length);
        
        // Pagination
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedVoters = filteredVoters.slice(startIndex, endIndex);
        
        setVoters(paginatedVoters);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading voters:', error);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  // Debounced search
  useEffect(() => {
    const handler = debounce(() => {
      loadVoters(1, searchTerm, filters);
    }, 500);
    
    handler();
    return () => handler.cancel();
  }, [searchTerm, filters, loadVoters]);

  // Build booths list from voters in realtime
  useEffect(() => {
    const boothsRef = ref(db, 'voters');
    const unsubscribe = onValue ? onValue(boothsRef, (snapshot) => {
      const map = new Map();
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const v = child.val();
          const b = v.boothNumber ? String(v.boothNumber) : null;
          if (!b) return;
          if (!map.has(b)) {
            map.set(b, { number: b, name: v.pollingStationAddress || `Booth ${b}`, count: 1 });
          } else {
            map.get(b).count++;
          }
        });
      }
      const list = Array.from(map.values()).sort((a, b) => a.number.localeCompare(b.number));
      setBoothsList(list);
    }) : null;

    return () => {
      // remove Firebase listener if available
      try { if (unsubscribe && typeof unsubscribe === 'function') unsubscribe(); } catch (e) {}
    };
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      boothNumbers: [],
      pollingStationAddress: ''
    });
    setSearchTerm('');
  };

  // Stats calculation
  const stats = {
    total: totalCount,
    filtered: voters.length,
    filteredOut: totalCount - voters.length
  };

  // Export handlers
  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const verifyPasswordAndExport = useCallback(async () => {
    if (exportPassword === 'admin123') {
      await exportToExcel();
      setShowExportModal(false);
      setExportPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Invalid password. Please try again.');
    }
  }, [exportPassword]);

  const exportToExcel = async () => {
    setLoading(true);
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      let selectedLanguage = currentLanguage || 'en';

      // Define headers in English
      const headers = [
        'Voter ID',
        'Name',
        'Booth Number',
        'Polling Station',
        'Age',
        'Gender'
      ];

      if (snapshot.exists()) {
        const allVoters = [];
        snapshot.forEach((childSnapshot) => {
          const raw = childSnapshot.val();
          allVoters.push({
            id: childSnapshot.key,
            name: raw.name || raw.Name || '',
            voterId: raw.voterId || raw.VoterId || '',
            boothNumber: raw.boothNumber,
            pollingStationAddress: raw.pollingStationAddress,
            age: raw.age,
            gender: raw.gender
          });
        });

        // Apply current filters for export
        let filteredVoters = allVoters;
        if (searchTerm.trim()) {
          const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
          filteredVoters = allVoters.filter(voter => {
            const searchText = `${voter.name} ${voter.voterId}`.toLowerCase();
            return terms.every(term => searchText.includes(term));
          });
        }

        // Apply boothNumbers filter (multi-select)
        if (filters.boothNumbers && Array.isArray(filters.boothNumbers) && filters.boothNumbers.length > 0) {
          const selected = filters.boothNumbers.map(b => String(b));
          filteredVoters = filteredVoters.filter(voter => voter.boothNumber && selected.includes(String(voter.boothNumber)));
        }

        // Apply polling station filter
        if (filters.pollingStationAddress) {
          filteredVoters = filteredVoters.filter(voter =>
            voter.pollingStationAddress && 
            voter.pollingStationAddress.toLowerCase().includes(filters.pollingStationAddress.toLowerCase())
          );
        }

        // Translate headers and data if not English
        let translatedHeaders = headers;
        let exportData = [];
        if (selectedLanguage !== 'en') {
          // Translate headers
          translatedHeaders = await translateMultiple(headers, selectedLanguage);
          // Translate each voter's values
          for (const voter of filteredVoters) {
            const values = [
              voter.voterId ? String(voter.voterId) : '',
              voter.name ? String(voter.name) : '',
              voter.boothNumber ? String(voter.boothNumber) : '',
              voter.pollingStationAddress ? String(voter.pollingStationAddress) : '',
              voter.age ? String(voter.age) : '',
              voter.gender ? String(voter.gender) : ''
            ];
            const translatedValues = await translateMultiple(values, selectedLanguage);
            // Map translated headers to translated values
            const row = {};
            translatedHeaders.forEach((header, idx) => {
              row[header] = translatedValues[idx];
            });
            exportData.push(row);
          }
        } else {
          // English export
          exportData = filteredVoters.map(voter => ({
            'Voter ID': voter.voterId,
            'Name': voter.name,
            'Booth Number': voter.boothNumber,
            'Polling Station': voter.pollingStationAddress,
            'Age': voter.age,
            'Gender': voter.gender
          }));
        }

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Voters Data');
        XLSX.writeFile(
          workbook,
          `voters-data-${selectedLanguage}-${new Date().toISOString().split('T')[0]}.xlsx`
        );
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadVoters(newPage, searchTerm, filters);
    }
  };

  const StatsCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-orange-200">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color === 'text-orange-600' ? 'bg-orange-50' : color === 'text-blue-600' ? 'bg-blue-50' : 'bg-green-50'} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`text-lg ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">
            <TranslatedText>{label}</TranslatedText>
          </p>
          <p className={`text-xl font-bold ${color} truncate`}>{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5"><TranslatedText>{subtitle}</TranslatedText></p>}
        </div>
      </div>
    </div>
  );

  if (loading && voters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-3 border-gray-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-3 border-transparent border-t-orange-500 rounded-full absolute top-0 left-0 animate-spin"></div>
            <FiLoader className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-500 text-lg animate-pulse" />
          </div>
          <div className="text-gray-600 text-sm font-medium mt-4">
            {/* <TranslatedText>Loading voter data...</TranslatedText> */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Search & Controls Bar */}
      <div className={`bg-white border-b border-gray-200 transition-all duration-300 z-40 ${
        isSticky ? 'fixed top-0 left-0 right-0 shadow-md' : 'relative'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Search Input */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search by name or voter ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 bg-white text-sm placeholder-gray-400"
              />
            </div>

            <div className="flex gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-xl border transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
                  showFilters 
                    ? 'bg-orange-50 border-orange-200 text-orange-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-300'
                }`}
              >
                <FiSliders className="text-lg" />
                <span className="hidden sm:inline"><TranslatedText>Filters</TranslatedText></span>
              </button>

              {/* Filters dropdown/panel */}
              {showFilters && (
                <div className="absolute right-0 mt-12 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2"><TranslatedText>Booths</TranslatedText></h4>
                  <p className="text-xs text-gray-500 mb-3">Select one or more booths to filter voters</p>

                  <div className="max-h-48 overflow-auto mb-3">
                    {boothsList.length === 0 ? (
                      <p className="text-xs text-gray-400">No booths found</p>
                    ) : (
                      boothsList.map(booth => (
                        <label key={booth.number} className="flex items-center gap-2 mb-2 text-sm">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-orange-600"
                            checked={filters.boothNumbers.includes(booth.number)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFilters(prev => {
                                const next = { ...prev };
                                const setNums = new Set(next.boothNumbers || []);
                                if (checked) setNums.add(booth.number);
                                else setNums.delete(booth.number);
                                next.boothNumbers = Array.from(setNums);
                                return next;
                              });
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">Booth {booth.number}</div>
                            <div className="text-xs text-gray-500">{booth.name} • {booth.count} voters</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // select all
                          setFilters(prev => ({ ...prev, boothNumbers: boothsList.map(b => b.number) }));
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
                      >
                        <TranslatedText>Select all</TranslatedText>
                      </button>
                      <button
                        onClick={() => {
                          // clear selection
                          setFilters(prev => ({ ...prev, boothNumbers: [] }));
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
                      >
                        <TranslatedText>Clear</TranslatedText>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // apply (reload voters)
                          loadVoters(1, searchTerm, filters);
                          setShowFilters(false);
                        }}
                        className="text-xs px-3 py-1 rounded-md bg-orange-500 text-white"
                      >
                        <TranslatedText>Apply</TranslatedText>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <FiDownload className="text-lg" />
                <span className="hidden sm:inline"><TranslatedText>Export</TranslatedText></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`px-4 ${isSticky ? 'pt-28' : 'pt-6'} pb-6`}>
        
        {/* Voter List */}
        {(activeTab === 'voters' || activeTab === 'overview') && (
            <Suspense fallback={
              <div className="flex justify-center items-center py-12">
                {/* <FiLoader className="animate-spin text-orange-500 text-xl mr-2" /> */}
                <span className="text-gray-600 text-sm"><TranslatedText>Loading voters...</TranslatedText></span>
              </div>
            }>
              <VoterList voters={voters} />
            </Suspense>
        )}

        {/* Pagination Controls - Bottom */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft className="text-lg" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 ? i + 1 : 
                                currentPage >= totalPages - 2 ? totalPages - 4 + i : 
                                currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight className="text-lg" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl animate-scale-in">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              <TranslatedText>Export Data</TranslatedText>
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              <TranslatedText>Enter password to export voter data</TranslatedText>
            </p>
            <input
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 mb-3 text-sm"
            />
            {passwordError && (
              <p className="text-red-500 text-sm mb-3">{passwordError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportPassword('');
                  setPasswordError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                <TranslatedText>Cancel</TranslatedText>
              </button>
              <button
                onClick={verifyPasswordAndExport}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 text-sm font-medium"
              >
                <TranslatedText>Export</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;