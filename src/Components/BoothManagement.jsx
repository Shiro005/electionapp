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
  FiFileText
} from 'react-icons/fi';

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
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
      onClick={() => onViewDetails(voter)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Voter Name - Prominent Display */}
          <div className="mb-2">
            <h3 className="font-bold text-gray-900 text-base leading-tight">
              {voter.name}
            </h3>
            <div className="text-xs text-gray-500 font-medium mt-1">
              ID: {voter.voterId}
            </div>
          </div>
          
          {/* Quick Info Row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {voter.age && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs">
                Age: {voter.age}
              </span>
            )}
            {voter.gender && (
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs">
                {voter.gender}
              </span>
            )}
          </div>
          
          {/* Contact & Address */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {voter.phone ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <FiPhone size={12} />
                  <span>{voter.phone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <FiPhoneOff size={12} />
                  <span>No Phone</span>
                </div>
              )}
            </div>
            
            {voter.houseNumber && (
              <div className="text-gray-600 text-xs">
                House: {voter.houseNumber}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 ml-3">
          {/* Voting Toggle Button */}
          <button
            onClick={handleVoteToggle}
            disabled={isUpdating}
            className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1 border transition-all text-sm min-w-[80px] justify-center ${
              voter.voted 
                ? 'bg-green-500 text-white border-green-600' 
                : 'bg-red-500 text-white border-red-600'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            {isUpdating ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : voter.voted ? (
              <>
                <FiCheck size={12} />
                <span>Voted</span>
              </>
            ) : (
              <>
                <FiCheck size={12} />
                <span>Not Voted</span>
              </>
            )}
          </button>

          {/* View Details Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(voter);
            }}
            className="text-blue-600 hover:text-blue-700 p-2 bg-blue-100 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-xs"
          >
            <FiEye size={12} />
            <span>View</span>
          </button>
        </div>
      </div>
    </div>
  );
});

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
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 text-lg text-center">
            Export Data
          </h3>
          <p className="text-gray-600 text-sm text-center mt-1">
            Enter password to export voter data
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="bg-orange-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <FiFileText className="text-orange-600" />
              <div>
                <div className="font-medium text-orange-800 text-sm">Export Format</div>
                <div className="text-orange-700 text-xs">
                  Excel file with all voter details
                </div>
              </div>
            </div>
          </div>
        </form>
        
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FiDownload size={16} />
                <span>Export</span>
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

  return (
    <div className="min-h-screen bg-gray-50">
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
    </div>
  );
};

const BoothListView = ({ onBoothSelect, loadingBoothDetail, onViewVoterDetails }) => {
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
      const pollingAddress = voter.pollingStationAddress;
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
        };
      }
      
      boothsMap[safeBoothId].voters.push(voter);
      boothsMap[safeBoothId].voterCount++;
      
      if (voter.voted) boothsMap[safeBoothId].votedCount++;
      if (voter.phone) boothsMap[safeBoothId].withPhoneCount++;
    });
    
    return Object.values(boothsMap);
  }, []);

  // Real-time data loading
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

  // Enhanced Export Function
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

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(allVoters);

      // Set column widths
      const colWidths = [
        { wch: 8 },  // Serial Number
        { wch: 15 }, // Voter ID
        { wch: 25 }, // Name
        { wch: 5 },  // Age
        { wch: 8 },  // Gender
        { wch: 15 }, // Booth Number
        { wch: 40 }, // Polling Station
        { wch: 30 }, // Address
        { wch: 10 }, // House Number
        { wch: 12 }, // Phone
        { wch: 8 },  // Has Voted
        { wch: 12 }, // Family Members
        { wch: 15 }, // Family Income
        { wch: 15 }, // Education
        { wch: 20 }, // Occupation
        { wch: 15 }, // Caste
        { wch: 20 }, // Political Affiliation
        { wch: 30 }, // Issues
        { wch: 15 }, // Support Status
        { wch: 20 }  // Assigned Karyakarta
      ];
      ws['!cols'] = colWidths;

      // Style the header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "FFA500" } },
          alignment: { horizontal: "center" }
        };
      }

      // Create workbook and append worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Voters Data');

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Voters_Data_${date}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      // Show success message
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading polling stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <FiHome className="text-orange-600 text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Polling Stations</h1>
                <p className="text-gray-500 text-sm">Manage booth assignments</p>
              </div>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-green-500 text-white p-3 rounded-xl hover:bg-green-600 transition-colors active:scale-95"
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
              placeholder="Search booths..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
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
            <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
              <div className="font-bold text-orange-700 text-lg">{booths.length}</div>
              <div className="text-orange-600 text-xs">Total Booths</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
              <div className="font-bold text-green-700 text-lg">
                {booths.filter(b => b.assignedKaryakarta).length}
              </div>
              <div className="text-green-600 text-xs">Assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-xl text-center font-medium text-sm ${
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
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {refreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
              <span className="text-sm">Refreshing...</span>
            </>
          ) : (
            <>
              <FiRefreshCw size={16} />
              <span className="text-sm">Refresh Data</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Overlay for Booth Detail */}
      {loadingBoothDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-3"></div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Loading Voters</h3>
            <p className="text-gray-600 text-sm">Please wait...</p>
          </div>
        </div>
      )}

      {/* Booths List */}
      <div className="p-4 space-y-3">
        {filteredBooths.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
            <FiHome className="inline text-gray-300 text-4xl mb-3" />
            <p className="text-gray-600 font-medium">No polling stations found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search terms</p>
          </div>
        ) : (
          filteredBooths.map((booth) => (
            <div
              key={booth.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onBoothSelect(booth)}
                >
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    {booth.pollingStationAddress}
                  </h3>
                  <div className="flex items-center gap-1 text-orange-600 text-sm">
                    <FiMapPin size={14} />
                    <span>{booth.village}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openKaryakartaModal(booth);
                  }}
                  className="bg-orange-100 text-orange-600 p-2 rounded-lg hover:bg-orange-200 transition-colors active:scale-95"
                >
                  <FiUserPlus size={16} />
                </button>
              </div>

              {/* Karyakarta Info */}
              {booth.assignedKaryakarta ? (
                <div className="bg-green-50 rounded-lg p-3 mb-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <FiUser className="text-green-600 text-sm" />
                      </div>
                      <div>
                        <div className="font-semibold text-green-800 text-sm">
                          {booth.karyakartaName}
                        </div>
                        <div className="text-green-600 text-xs">
                          {booth.karyakartaPhone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openKaryakartaModal(booth);
                      }}
                      className="text-orange-600 font-medium hover:text-orange-700 bg-orange-100 px-3 py-1 rounded text-xs"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 rounded-lg p-3 mb-3 border border-orange-200 text-center">
                  <p className="text-orange-700 font-medium text-sm">No karyakarta assigned</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openKaryakartaModal(booth);
                    }}
                    className="mt-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 active:scale-95 transition-all text-xs"
                  >
                    Assign Now
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <div className="font-bold text-blue-700 text-sm">{booth.voterCount}</div>
                  <div className="text-blue-600 text-xs">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <div className="font-bold text-green-700 text-sm">{booth.votedCount}</div>
                  <div className="text-green-600 text-xs">Voted</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                  <div className="font-bold text-purple-700 text-sm">{booth.withPhoneCount}</div>
                  <div className="text-purple-600 text-xs">Phones</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                  <div className="font-bold text-amber-700 text-sm">
                    {Math.round((booth.votedCount / Math.max(booth.voterCount, 1)) * 100)}%
                  </div>
                  <div className="text-amber-600 text-xs">Progress</div>
                </div>
              </div>

              <button
                onClick={() => onBoothSelect(booth)}
                disabled={loadingBoothDetail}
                className={`w-full py-3 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 text-sm ${
                  loadingBoothDetail
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {loadingBoothDetail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <FiUsers size={16} />
                    <span>View Voters</span>
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
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">
                Assign Karyakarta
              </h3>
              <p className="text-gray-500 text-sm mt-1">{currentBooth?.pollingStationAddress}</p>
            </div>
            
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Karyakarta
              </label>
              <select
                value={selectedKaryakarta}
                onChange={(e) => setSelectedKaryakarta(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Choose a karyakarta</option>
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
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignKaryakarta}
                disabled={!selectedKaryakarta}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
              >
                Assign
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

  // Real-time voter data subscription
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingVoters(false);
    }, 1000);

    // Subscribe to real-time voter updates
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

        // Filter voters for this booth
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

  // Real-time vote status toggle
  const toggleVotedStatus = useCallback(async (voterId, currentStatus) => {
    try {
      const newVotedStatus = !currentStatus;
      
      await firebaseLoadBalancer.execute(async () => {
        await update(ref(db, `voters/${voterId}`), {
          voted: newVotedStatus,
          hasVoted: newVotedStatus
        });
      });
      
      // Local state will be updated automatically via real-time subscription
    } catch (error) {
      console.error('Error updating voted status:', error);
      alert('Failed to update vote status. Please try again.');
    }
  }, []);

  // Export functionality for specific booth voters only
  const exportBoothVoters = async () => {
    setExportLoading(true);
    try {
      // Filter voters for this specific booth
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

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 8 },  // Serial Number
        { wch: 15 }, // Voter ID
        { wch: 25 }, // Name
        { wch: 5 },  // Age
        { wch: 8 },  // Gender
        { wch: 15 }, // Booth Number
        { wch: 40 }, // Polling Station
        { wch: 30 }, // Address
        { wch: 10 }, // House Number
        { wch: 12 }, // Phone
        { wch: 8 },  // Has Voted
        { wch: 12 }, // Family Members
        { wch: 15 }, // Family Income
        { wch: 15 }, // Education
        { wch: 20 }, // Occupation
        { wch: 15 }, // Caste
        { wch: 20 }, // Political Affiliation
        { wch: 30 }, // Issues
        { wch: 15 }, // Support Status
        { wch: 20 }  // Assigned Karyakarta
      ];
      ws['!cols'] = colWidths;

      // Style the header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "FFA500" } },
          alignment: { horizontal: "center" }
        };
      }

      // Create workbook and append worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Booth Voters Data');

      // Generate filename with booth info and date
      const date = new Date().toISOString().split('T')[0];
      const boothName = booth.pollingStationAddress.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Booth_${boothName}_Voters_${date}.xlsx`;

      // Write file
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

  const stats = useMemo(() => ({
    total: voters.length,
    voted: voters.filter(v => v.voted).length,
    withPhone: voters.filter(v => v.phone).length,
    votedPercentage: Math.round((voters.filter(v => v.voted).length / Math.max(voters.length, 1)) * 100)
  }), [voters]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={onBack} 
              className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
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
                className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 active:scale-95 transition-all"
                title="Export Booth Voters"
              >
                <FiDownload size={18} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all"
                title="Delete Booth"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <div className="font-bold text-blue-700 text-base">{stats.total}</div>
              <div className="text-blue-600 text-xs">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <div className="font-bold text-green-700 text-base">{stats.voted}</div>
              <div className="text-green-600 text-xs">Voted</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
              <div className="font-bold text-purple-700 text-base">{stats.withPhone}</div>
              <div className="text-purple-600 text-xs">Phones</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
              <div className="font-bold text-amber-700 text-base">{stats.votedPercentage}%</div>
              <div className="text-amber-600 text-xs">Progress</div>
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
                placeholder="Search voters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors text-sm"
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
              className="bg-gray-100 text-gray-600 p-3 rounded-xl hover:bg-gray-200 active:scale-95 transition-colors"
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
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="all">All Voters</option>
                <option value="voted">Voted</option>
                <option value="notVoted">Not Voted</option>
                <option value="withPhone">With Phone</option>
                <option value="withoutPhone">Without Phone</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Voters List */}
      <div className="p-4">
        {loadingVoters ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-3"></div>
            <h3 className="text-gray-600 font-medium mb-1">Loading Voters</h3>
            <p className="text-gray-400 text-sm">Please wait...</p>
          </div>
        ) : filteredVoters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
            <FiUsers className="inline text-gray-300 text-4xl mb-3" />
            <p className="text-gray-600 font-medium">No voters found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVoters.map((voter) => (
              <VoterItem
                key={voter.id}
                voter={voter}
                onToggleVoted={toggleVotedStatus}
                onViewDetails={onViewVoterDetails}
              />
            ))}
          </div>
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
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete Booth?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                This booth and all <span className="font-bold text-red-600">{voters.length}</span> voters will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteBoothAndVoters}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiTrash2 size={16} />
                  Delete
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