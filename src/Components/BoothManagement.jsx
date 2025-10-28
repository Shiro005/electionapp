import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, ref, onValue, off, update, get } from '../Firebase/config';
import * as XLSX from 'xlsx';
import { 
  FiArrowLeft, 
  FiHome, 
  FiMapPin, 
  FiPhone, 
  FiSearch, 
  FiUserPlus,
  FiUser,
  FiCheck,
  FiX,
  FiFilter,
  FiPhoneOff,
  FiTrash2,
  FiRefreshCw,
  FiUsers,
  FiDownload,
  FiEye,
  FiFileText,
  FiUsers as FiTeam,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import TranslatedText from './TranslatedText';

// Load Balancer for Firebase operations
class FirebaseLoadBalancer {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.active = 0;
  }

  async execute(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.process();
    });
  }

  process() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) return;

    this.active++;
    const { operation, resolve, reject } = this.queue.shift();

    operation()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.active--;
        this.process();
      });
  }
}

const firebaseLoadBalancer = new FirebaseLoadBalancer(3);

// Optimized Voter Item
const VoterItem = React.memo(({ 
  voter, 
  onToggleVoted, 
  onViewDetails
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleVoteToggle = useCallback(async (e) => {
    e.stopPropagation();
    setIsUpdating(true);
    
    try {
      await onToggleVoted(voter.id, voter.voted);
    } catch (error) {
      console.error('Error updating vote status:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [voter.id, voter.voted, onToggleVoted]);

  return (
    <div 
      className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-sm transition-all cursor-pointer mb-2"
      onClick={() => onViewDetails(voter)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base mb-1">
            <TranslatedText>{voter.name}</TranslatedText>
          </h3>
          <div className="text-xs text-gray-500 mb-2">
            <TranslatedText>ID</TranslatedText>: {voter.voterId}
          </div>
          
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {voter.age && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                <TranslatedText>Age</TranslatedText>: {voter.age}
              </span>
            )}
            {voter.gender && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                {voter.gender}
              </span>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {voter.phone && (
                <div className="flex items-center gap-1 text-gray-600 text-xs">
                  <FiPhone size={12} />
                  <span>{voter.phone}</span>
                </div>
              )}
            </div>
            
            {voter.houseNumber && (
              <div className="text-gray-600 text-xs">
                <TranslatedText>House</TranslatedText>: {voter.houseNumber}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 ml-3">
          <button
            onClick={handleVoteToggle}
            disabled={isUpdating}
            className={`px-3 py-2 rounded font-medium flex items-center gap-1 border transition-all text-sm min-w-[80px] justify-center ${
              voter.voted 
                ? 'bg-green-500 text-white border-green-600' 
                : 'bg-gray-200 text-gray-700 border-gray-300'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
          >
            {isUpdating ? (
              <div className="flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                <span className="text-xs"><TranslatedText>Updating</TranslatedText></span>
              </div>
            ) : voter.voted ? (
              <>
                <FiCheck size={12} />
                <span><TranslatedText>Voted</TranslatedText></span>
              </>
            ) : (
              <>
                <FiCheck size={12} />
                <span><TranslatedText>Not Voted</TranslatedText></span>
              </>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(voter);
            }}
            className="text-gray-600 hover:text-gray-700 p-2 bg-gray-100 rounded transition-all flex items-center gap-1 text-xs hover:bg-gray-200"
          >
            <FiEye size={12} />
            <span><TranslatedText>View</TranslatedText></span>
          </button>
        </div>
      </div>
    </div>
  );
});

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  
  // Show up to 5 page buttons
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(
      <button
        key={i}
        onClick={() => onPageChange(i)}
        className={`px-3 py-1 rounded text-sm font-medium ${
          currentPage === i
            ? 'bg-orange-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FiChevronLeft size={16} />
      </button>
      
      {pages}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
};

// Export Modal Component
const ExportModal = ({ onClose, onExport, isLoading }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== '1234') {
      setError('Incorrect password');
      return;
    }
    onExport();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 text-lg text-center">
            <TranslatedText>Export Data</TranslatedText>
          </h3>
          <p className="text-gray-600 text-sm text-center mt-1">
            <TranslatedText>Enter password to export voter data</TranslatedText>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TranslatedText>Password</TranslatedText>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password"
              className="w-full px-3 py-3 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded p-3 mb-4">
            <div className="flex items-center gap-2">
              <FiFileText className="text-gray-600" />
              <div>
                <div className="font-medium text-gray-800 text-sm">
                  <TranslatedText>Export Format</TranslatedText>
                </div>
                <div className="text-gray-700 text-xs">
                  <TranslatedText>Excel file with all voter details</TranslatedText>
                </div>
              </div>
            </div>
          </div>
        </form>
        
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <TranslatedText>Cancel</TranslatedText>
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-orange-500 text-white py-3 rounded font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span><TranslatedText>Exporting...</TranslatedText></span>
              </>
            ) : (
              <>
                <FiDownload size={16} />
                <span><TranslatedText>Export</TranslatedText></span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const BoothManagement = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('boothList');
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [loadingBoothDetail, setLoadingBoothDetail] = useState(false);
  
  const handleBoothSelect = useCallback(async (booth) => {
    setLoadingBoothDetail(true);
    setSelectedBooth(booth);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setActiveView('boothDetail');
    setLoadingBoothDetail(false);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedBooth(null);
    setActiveView('boothList');
  }, []);

  const handleViewVoterDetails = useCallback((voter) => {
    navigate(`/voter/${voter.id}`);
  }, [navigate]);

  const handleTeamClick = useCallback(() => {
    navigate('/team');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white">
      {activeView === 'boothList' && (
        <BoothListView 
          onBoothSelect={handleBoothSelect}
          loadingBoothDetail={loadingBoothDetail}
          onViewVoterDetails={handleViewVoterDetails}
        />
      )}
      
      {activeView === 'boothDetail' && selectedBooth && (
        <BoothDetailView 
          booth={selectedBooth}
          onBack={handleBack}
          onViewVoterDetails={handleViewVoterDetails}
        />
      )}

      {/* Floating Team Button */}
      <button
        onClick={handleTeamClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center z-40"
        title="Team Management"
      >
        <FiTeam size={24} />
      </button>
    </div>
  );
};

const BoothListView = ({ onBoothSelect, loadingBoothDetail, onViewVoterDetails }) => {
  const navigate = useNavigate();
  const [booths, setBooths] = useState([]);
  const [voters, setVoters] = useState([]);
  const [karyakartas, setKaryakartas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showKaryakartaModal, setShowKaryakartaModal] = useState(false);
  const [selectedKaryakarta, setSelectedKaryakarta] = useState('');
  const [currentBooth, setCurrentBooth] = useState(null);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const createSafeId = (text) => {
    return text.replace(/[.#$/[\]]/g, '_');
  };

  const processVoterData = useCallback((rawData) => {
    if (!rawData) return [];
    
    return Object.entries(rawData).map(([key, value]) => ({
      id: key,
      name: value.name || 'Unknown Voter',
      voterId: value.voterId || 'N/A',
      pollingStationAddress: value.pollingStationAddress || value.address || 'Unknown Address',
      village: value.village || 'Unknown Area',
      phone: value.phone || '',
      voted: value.voted || false,
      hasVoted: value.hasVoted || false,
      houseNumber: value.houseNumber || '',
      assignedKaryakarta: value.assignedKaryakarta || '',
      age: value.age || '',
      gender: value.gender || '',
      serialNumber: value.serialNumber || '',
      boothNumber: value.boothNumber || '',
      supportStatus: value.supportStatus || 'unknown',
      survey: value.survey || {},
      familyMembers: value.familyMembers || {}
    }));
  }, []);

  const createBoothsFromVoters = useCallback((votersData) => {
    const boothsMap = {};

    votersData.forEach(voter => {
      const pollingAddress = voter.pollingStationAddress || '';
      if (!pollingAddress) return;

      const safeBoothId = createSafeId(pollingAddress);

      if (!boothsMap[safeBoothId]) {
        boothsMap[safeBoothId] = {
          id: safeBoothId,
          originalId: pollingAddress,
          pollingStationAddress: pollingAddress,
          voters: [],
          voterCount: 0,
          votedCount: 0,
          withPhoneCount: 0,
          assignedKaryakarta: '',
          karyakartaName: '',
          karyakartaPhone: '',
          village: voter.village || '',
          _boothNumberCounts: {}
        };
      }

      const booth = boothsMap[safeBoothId];
      booth.voters.push(voter);
      booth.voterCount++;
      if (voter.voted) booth.votedCount++;
      if (voter.phone) booth.withPhoneCount++;

      const bn = (voter.boothNumber || '').toString().trim();
      if (bn) {
        booth._boothNumberCounts[bn] = (booth._boothNumberCounts[bn] || 0) + 1;
      }
    });

    return Object.values(boothsMap).map(b => {
      let boothName = '';
      const counts = b._boothNumberCounts;
      if (counts && Object.keys(counts).length > 0) {
        boothName = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          [0][0];
      } else {
        boothName = b.pollingStationAddress;
      }

      const progressPercentage = Math.round((b.votedCount / Math.max(b.voterCount, 1)) * 100);

      return {
        ...b,
        boothName,
        boothNumber: boothName,
        progressPercentage
      };
    });
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    
    try {
      await firebaseLoadBalancer.execute(async () => {
        const votersRef = ref(db, 'voters');
        const karyakartasRef = ref(db, 'karyakartas');
        const boothsRef = ref(db, 'booths');
        
        const unsubscribeVoters = onValue(votersRef, (snapshot) => {
          if (snapshot.exists()) {
            const votersData = processVoterData(snapshot.val());
            setVoters(votersData);
            
            const boothsData = createBoothsFromVoters(votersData);
            
            const unsubscribeBooths = onValue(boothsRef, (boothSnapshot) => {
              if (boothSnapshot.exists()) {
                const boothAssignments = boothSnapshot.val();
                
                const updatedBooths = boothsData.map(booth => {
                  const assignment = boothAssignments[booth.id];
                  if (assignment) {
                    return {
                      ...booth,
                      assignedKaryakarta: assignment.assignedKaryakarta || '',
                      karyakartaName: assignment.karyakartaName || '',
                      karyakartaPhone: assignment.karyakartaPhone || '',
                    };
                  }
                  return booth;
                });
                
                setBooths(updatedBooths);
              } else {
                setBooths(boothsData);
              }
              setLoading(false);
              setRefreshing(false);
            });

            return () => off(boothsRef, 'value', unsubscribeBooths);
          } else {
            setVoters([]);
            setBooths([]);
            setLoading(false);
            setRefreshing(false);
          }
        });

        const unsubscribeKaryakartas = onValue(karyakartasRef, (snapshot) => {
          if (snapshot.exists()) {
            const karyakartasData = Object.entries(snapshot.val()).map(([key, value]) => ({
              id: key,
              name: value.name || 'Unknown Karyakarta',
              phone: value.phone || '',
            }));
            setKaryakartas(karyakartasData);
          } else {
            setKaryakartas([]);
          }
        });

        return () => {
          off(votersRef, 'value', unsubscribeVoters);
          off(karyakartasRef, 'value', unsubscribeKaryakartas);
        };
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [processVoterData, createBoothsFromVoters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportAllVoters = async () => {
    setExportLoading(true);
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      if (!snapshot.exists()) return;

      const allVoters = [];
      snapshot.forEach((child) => {
        const voter = child.val();
        const survey = voter.survey || {};
        
        allVoters.push({
          'Serial Number': voter.serialNumber || '',
          'Voter ID': voter.voterId || '',
          'Name': voter.name || '',
          'Age': voter.age || '',
          'Gender': voter.gender || '',
          'Booth Number': voter.boothNumber || '',
          'Polling Station': voter.pollingStationAddress || '',
          'Address': survey.address || voter.address || '',
          'House Number': voter.houseNumber || '',
          'Phone': survey.mobile || voter.phone || '',
          'Has Voted': voter.voted ? 'Yes' : 'No',
          'Family Members': voter.familyMembers ? Object.keys(voter.familyMembers).length : 0,
          'Family Income': survey.familyIncome || '',
          'Education': survey.education || '',
          'Occupation': survey.occupation || '',
          'Caste': survey.caste || '',
          'Political Affiliation': survey.politicalAffiliation || '',
          'Issues': survey.issues || '',
          'Support Status': voter.supportStatus || '',
          'Assigned Karyakarta': voter.assignedKaryakarta || ''
        });
      });

      const ws = XLSX.utils.json_to_sheet(allVoters);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Voters Data');

      const date = new Date().toISOString().split('T')[0];
      const filename = `Voters_Data_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
      alert(`✅ Successfully exported ${allVoters.length} voter records`);

    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const filteredBooths = useMemo(() => 
    booths.filter(booth => 
      !searchTerm.trim() ||
      booth.pollingStationAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booth.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booth.karyakartaName && booth.karyakartaName.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [booths, searchTerm]
  );

  const handleAssignKaryakarta = async () => {
    if (!selectedKaryakarta) {
      setMessage('Please select a karyakarta');
      return;
    }
    
    try {
      await firebaseLoadBalancer.execute(async () => {
        const karyakarta = karyakartas.find(k => k.id === selectedKaryakarta);
        
        if (!karyakarta) {
          setMessage('Selected karyakarta not found');
          return;
        }

        const updates = {};
        const boothId = currentBooth.id;

        updates[`booths/${boothId}`] = {
          assignedKaryakarta: selectedKaryakarta,
          karyakartaName: karyakarta.name,
          karyakartaPhone: karyakarta.phone,
          pollingStationAddress: currentBooth.pollingStationAddress,
          village: currentBooth.village,
          lastUpdated: new Date().toISOString()
        };

        const boothVoters = voters.filter(voter => 
          createSafeId(voter.pollingStationAddress) === boothId
        );
        
        boothVoters.forEach(voter => {
          updates[`voters/${voter.id}/assignedKaryakarta`] = selectedKaryakarta;
        });

        await update(ref(db), updates);
        
        setBooths(prev => prev.map(booth => 
          booth.id === boothId 
            ? {
                ...booth,
                assignedKaryakarta: selectedKaryakarta,
                karyakartaName: karyakarta.name,
                karyakartaPhone: karyakarta.phone
              }
            : booth
        ));

        setShowKaryakartaModal(false);
        setSelectedKaryakarta('');
        setCurrentBooth(null);
        setMessage(`✅ ${karyakarta.name} assigned successfully!`);
        
        setTimeout(() => setMessage(''), 3000);
      });
    } catch (error) {
      console.error('Error assigning karyakarta:', error);
      setMessage('❌ Error assigning karyakarta. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const openKaryakartaModal = (booth) => {
    setCurrentBooth(booth);
    setSelectedKaryakarta(booth.assignedKaryakarta || '');
    setShowKaryakartaModal(true);
    setMessage('');
  };

  const handleTeamClick = () => {
    navigate('/team');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            <TranslatedText>Loading polling stations...</TranslatedText>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FiHome className="text-orange-500 text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                <TranslatedText>Polling Stations</TranslatedText>
              </h1>
              <p className="text-gray-500 text-sm">
                <TranslatedText>Manage booth assignments</TranslatedText>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 transition-colors"
            title="Export All Data"
          >
            <FiDownload size={18} />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search booths by name, area, or karyakarta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
            <div className="font-bold text-gray-900 text-lg">{booths.length}</div>
            <div className="text-gray-600 text-xs">
              <TranslatedText>Total Booths</TranslatedText>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
            <div className="font-bold text-gray-900 text-lg">
              {booths.filter(b => b.assignedKaryakarta).length}
            </div>
            <div className="text-gray-600 text-xs">
              <TranslatedText>Assigned</TranslatedText>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-center font-medium text-sm ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Refresh Button */}
      <div className="px-4 mt-4">
        <button
          onClick={loadData}
          disabled={refreshing}
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
              <span className="text-sm">
                <TranslatedText>Refreshing...</TranslatedText>
              </span>
            </>
          ) : (
            <>
              <FiRefreshCw size={16} />
              <span className="text-sm">
                <TranslatedText>Refresh Data</TranslatedText>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Loading Overlay for Booth Detail */}
      {loadingBoothDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500 mx-auto mb-3"></div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              <TranslatedText>Loading Voters</TranslatedText>
            </h3>
            <p className="text-gray-600 text-sm">
              <TranslatedText>Please wait...</TranslatedText>
            </p>
          </div>
        </div>
      )}

      {/* Booths List */}
      <div className="p-4 space-y-3">
        {filteredBooths.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FiHome className="inline text-gray-300 text-4xl mb-3" />
            <p className="text-gray-600 font-medium">
              <TranslatedText>No polling stations found</TranslatedText>
            </p>
            <p className="text-gray-400 text-sm mt-1">
              <TranslatedText>Try adjusting your search terms</TranslatedText>
            </p>
          </div>
        ) : (
          filteredBooths.map((booth) => (
            <div
              key={booth.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onBoothSelect(booth)}
                >
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    {booth.boothName}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <FiMapPin size={14} />
                    <span>{booth.village}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openKaryakartaModal(booth);
                  }}
                  className="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200 transition-colors"
                >
                  <FiUserPlus size={16} />
                </button>
              </div>

              {/* Karyakarta Info */}
              {booth.assignedKaryakarta ? (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <FiUser className="text-gray-600 text-sm" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">
                          {booth.karyakartaName}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {booth.karyakartaPhone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openKaryakartaModal(booth);
                      }}
                      className="text-orange-500 font-medium hover:text-orange-600 bg-orange-50 px-3 py-1 rounded text-xs"
                    >
                      <TranslatedText>Change</TranslatedText>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 rounded-lg p-3 mb-3 border border-orange-200 text-center">
                  <p className="text-orange-700 font-medium text-sm">
                    <TranslatedText>No karyakarta assigned</TranslatedText>
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openKaryakartaModal(booth);
                    }}
                    className="mt-2 bg-orange-500 text-white px-4 py-2 rounded font-medium hover:bg-orange-600 transition-all text-xs"
                  >
                    <TranslatedText>Assign Now</TranslatedText>
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div className="bg-gray-50 rounded p-2 border border-gray-200">
                  <div className="font-bold text-gray-900 text-sm">{booth.voterCount}</div>
                  <div className="text-gray-600 text-xs">
                    <TranslatedText>Total</TranslatedText>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-200">
                  <div className="font-bold text-gray-900 text-sm">{booth.votedCount}</div>
                  <div className="text-gray-600 text-xs">
                    <TranslatedText>Voted</TranslatedText>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-200">
                  <div className="font-bold text-gray-900 text-sm">{booth.withPhoneCount}</div>
                  <div className="text-gray-600 text-xs">
                    <TranslatedText>Phones</TranslatedText>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 border border-gray-200">
                  <div className="font-bold text-gray-900 text-sm">
                    {booth.progressPercentage}%
                  </div>
                  <div className="text-gray-600 text-xs">
                    <TranslatedText>Progress</TranslatedText>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onBoothSelect(booth)}
                disabled={loadingBoothDetail}
                className={`w-full py-3 rounded font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                  loadingBoothDetail
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {loadingBoothDetail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>
                      <TranslatedText>Loading...</TranslatedText>
                    </span>
                  </>
                ) : (
                  <>
                    <FiUsers size={16} />
                    <span>
                      <TranslatedText>View Voters</TranslatedText>
                    </span>
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={exportAllVoters}
          isLoading={exportLoading}
        />
      )}

      {/* Karyakarta Assignment Modal */}
      {showKaryakartaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">
                <TranslatedText>Assign Karyakarta</TranslatedText>
              </h3>
              <p className="text-gray-500 text-sm mt-1">{currentBooth?.pollingStationAddress}</p>
            </div>
            
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TranslatedText>Select Karyakarta</TranslatedText>
              </label>
              <select
                value={selectedKaryakarta}
                onChange={(e) => setSelectedKaryakarta(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">
                  <TranslatedText>Choose a karyakarta</TranslatedText>
                </option>
                {karyakartas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} - {k.phone || 'No Phone'}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowKaryakartaModal(false);
                  setSelectedKaryakarta('');
                  setCurrentBooth(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded font-medium hover:bg-gray-200 transition-colors"
              >
                <TranslatedText>Cancel</TranslatedText>
              </button>
              <button
                onClick={handleAssignKaryakarta}
                disabled={!selectedKaryakarta}
                className="flex-1 bg-orange-500 text-white py-3 rounded font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
              >
                <TranslatedText>Assign</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BoothDetailView = ({ booth, onBack, onViewVoterDetails }) => {
  const [voters, setVoters] = useState(booth.voters || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [loadingVoters, setLoadingVoters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [votersPerPage] = useState(100);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingVoters(false);
    }, 1000);

    const votersRef = ref(db, 'voters');
    const unsubscribe = onValue(votersRef, (snapshot) => {
      if (snapshot.exists()) {
        const votersData = Object.entries(snapshot.val()).map(([key, value]) => ({
          id: key,
          name: value.name || 'Unknown Voter',
          voterId: value.voterId || 'N/A',
          pollingStationAddress: value.pollingStationAddress || value.address || 'Unknown Address',
          village: value.village || 'Unknown Area',
          phone: value.phone || '',
          voted: value.voted || false,
          hasVoted: value.hasVoted || false,
          houseNumber: value.houseNumber || '',
          assignedKaryakarta: value.assignedKaryakarta || '',
          age: value.age || '',
          gender: value.gender || '',
          serialNumber: value.serialNumber || '',
          boothNumber: value.boothNumber || '',
          supportStatus: value.supportStatus || 'unknown',
          survey: value.survey || {},
          familyMembers: value.familyMembers || {}
        }));

        const boothVoters = votersData.filter(voter => 
          voter.pollingStationAddress === booth.pollingStationAddress
        );
        
        setVoters(boothVoters);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [booth.pollingStationAddress]);

  const toggleVotedStatus = useCallback(async (voterId, currentStatus) => {
    try {
      const newVotedStatus = !currentStatus;
      
      await firebaseLoadBalancer.execute(async () => {
        await update(ref(db, `voters/${voterId}`), {
          voted: newVotedStatus,
          hasVoted: newVotedStatus
        });
      });
    } catch (error) {
      console.error('Error updating voted status:', error);
      alert('Failed to update vote status. Please try again.');
    }
  }, []);

  const exportBoothVoters = async () => {
    setExportLoading(true);
    try {
      const boothVoters = voters.filter(voter => 
        voter.pollingStationAddress === booth.pollingStationAddress
      );

      if (boothVoters.length === 0) {
        alert('No voters found for this booth');
        return;
      }

      const exportData = boothVoters.map(voter => {
        const survey = voter.survey || {};
        
        return {
          'Serial Number': voter.serialNumber || '',
          'Voter ID': voter.voterId || '',
          'Name': voter.name || '',
          'Age': voter.age || '',
          'Gender': voter.gender || '',
          'Booth Number': voter.boothNumber || '',
          'Polling Station': voter.pollingStationAddress || '',
          'Address': survey.address || voter.address || '',
          'House Number': voter.houseNumber || '',
          'Phone': survey.mobile || voter.phone || '',
          'Has Voted': voter.voted ? 'Yes' : 'No',
          'Family Members': voter.familyMembers ? Object.keys(voter.familyMembers).length : 0,
          'Family Income': survey.familyIncome || '',
          'Education': survey.education || '',
          'Occupation': survey.occupation || '',
          'Caste': survey.caste || '',
          'Political Affiliation': survey.politicalAffiliation || '',
          'Issues': survey.issues || '',
          'Support Status': voter.supportStatus || '',
          'Assigned Karyakarta': voter.assignedKaryakarta || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Booth Voters Data');

      const date = new Date().toISOString().split('T')[0];
      const boothName = booth.pollingStationAddress.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Booth_${boothName}_Voters_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
      alert(`✅ Successfully exported ${boothVoters.length} voters from ${booth.pollingStationAddress}`);

    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export booth data. Please try again.');
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const deleteBoothAndVoters = useCallback(async () => {
    try {
      await firebaseLoadBalancer.execute(async () => {
        const updates = {};
        
        updates[`booths/${booth.id}`] = null;
        
        booth.voters.forEach(voter => {
          updates[`voters/${voter.id}`] = null;
        });
        
        await update(ref(db), updates);
      });
      
      alert('Booth and all voters deleted successfully!');
      onBack();
    } catch (error) {
      console.error('Error deleting booth:', error);
      alert('Error deleting booth. Please try again.');
    }
  }, [booth, onBack]);

  const filteredVoters = useMemo(() => 
    voters.filter(voter => {
      if (searchTerm && !voter.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !voter.voterId.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !voter.phone.includes(searchTerm)) {
        return false;
      }
      
      switch (filter) {
        case 'voted': return voter.voted;
        case 'notVoted': return !voter.voted;
        case 'withPhone': return voter.phone;
        case 'withoutPhone': return !voter.phone;
        default: return true;
      }
    }),
    [voters, searchTerm, filter]
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredVoters.length / votersPerPage);
  const indexOfLastVoter = currentPage * votersPerPage;
  const indexOfFirstVoter = indexOfLastVoter - votersPerPage;
  const currentVoters = filteredVoters.slice(indexOfFirstVoter, indexOfLastVoter);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stats = useMemo(() => ({
    total: voters.length,
    voted: voters.filter(v => v.voted).length,
    withPhone: voters.filter(v => v.phone).length,
    votedPercentage: Math.round((voters.filter(v => v.voted).length / Math.max(voters.length, 1)) * 100)
  }), [voters]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={onBack} 
              className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all"
            >
              <FiArrowLeft className="text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 text-lg">{booth.boothNumber}</h1>
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                <FiMapPin size={14} />
                <span>{booth.village}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportModal(true)}
                className="w-10 h-10 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all"
                title="Export Booth Voters"
              >
                <FiDownload size={18} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all"
                title="Delete Booth"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-50 rounded p-3 text-center border border-gray-200">
              <div className="font-bold text-gray-900 text-base">{stats.total}</div>
              <div className="text-gray-600 text-xs">
                <TranslatedText>Total</TranslatedText>
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3 text-center border border-gray-200">
              <div className="font-bold text-gray-900 text-base">{stats.voted}</div>
              <div className="text-gray-600 text-xs">
                <TranslatedText>Voted</TranslatedText>
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3 text-center border border-gray-200">
              <div className="font-bold text-gray-900 text-base">{stats.withPhone}</div>
              <div className="text-gray-600 text-xs">
                <TranslatedText>Phones</TranslatedText>
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3 text-center border border-gray-200">
              <div className="font-bold text-gray-900 text-base">{stats.votedPercentage}%</div>
              <div className="text-gray-600 text-xs">
                <TranslatedText>Progress</TranslatedText>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search voters by name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-colors text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-100 text-gray-600 p-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiFilter size={16} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
              >
                <option value="all">
                  <TranslatedText>All Voters</TranslatedText>
                </option>
                <option value="voted">
                  <TranslatedText>Voted</TranslatedText>
                </option>
                <option value="notVoted">
                  <TranslatedText>Not Voted</TranslatedText>
                </option>
                <option value="withPhone">
                  <TranslatedText>With Phone</TranslatedText>
                </option>
                <option value="withoutPhone">
                  <TranslatedText>Without Phone</TranslatedText>
                </option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Voters List */}
      <div className="p-4">
        {loadingVoters ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500 mx-auto mb-3"></div>
            <h3 className="text-gray-600 font-medium mb-1">
              <TranslatedText>Loading Voters</TranslatedText>
            </h3>
            <p className="text-gray-400 text-sm">
              <TranslatedText>Please wait...</TranslatedText>
            </p>
          </div>
        ) : filteredVoters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FiUsers className="inline text-gray-300 text-4xl mb-3" />
            <p className="text-gray-600 font-medium">
              <TranslatedText>No voters found</TranslatedText>
            </p>
            <p className="text-gray-400 text-sm mt-1">
              <TranslatedText>Try adjusting your search or filters</TranslatedText>
            </p>
          </div>
        ) : (
          <>
            {/* Page Info */}
            <div className="mb-4 text-center">
              <p className="text-gray-600 text-sm">
                <TranslatedText>Showing</TranslatedText> {indexOfFirstVoter + 1}-{Math.min(indexOfLastVoter, filteredVoters.length)} <TranslatedText>of</TranslatedText> {filteredVoters.length} <TranslatedText>voters</TranslatedText>
                {totalPages > 1 && (
                  <span className="ml-2">
                    (<TranslatedText>Page</TranslatedText> {currentPage} <TranslatedText>of</TranslatedText> {totalPages})
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              {currentVoters.map((voter) => (
                <VoterItem
                  key={voter.id}
                  voter={voter}
                  onToggleVoted={toggleVotedStatus}
                  onViewDetails={onViewVoterDetails}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={exportBoothVoters}
          isLoading={exportLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                <TranslatedText>Delete Booth?</TranslatedText>
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                <TranslatedText>This booth and all</TranslatedText> <span className="font-bold text-red-600">{voters.length}</span> <TranslatedText>voters will be permanently deleted.</TranslatedText>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded font-medium hover:bg-gray-200 transition-colors"
                >
                  <TranslatedText>Cancel</TranslatedText>
                </button>
                <button
                  onClick={deleteBoothAndVoters}
                  className="flex-1 bg-red-500 text-white py-3 rounded font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiTrash2 size={16} />
                  <TranslatedText>Delete</TranslatedText>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoothManagement;