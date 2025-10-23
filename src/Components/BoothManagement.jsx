import React, { useState, useEffect } from 'react';
import { db, ref, onValue, update, push, set, get } from '../Firebase/config';

const BoothManagement = () => {
  const [booths, setBooths] = useState([]);
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [showAllotmentModal, setShowAllotmentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [allotmentForm, setAllotmentForm] = useState({
    name: '',
    phone: '',
    alternatePhone: '',
    address: '',
    email: '',
    designation: '',
    experience: '',
    responsibilities: '',
    teamSize: 1
  });

  // Fetch booths and karyakartas from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch booths
        const boothsRef = ref(db, 'booths');
        const karyakartasRef = ref(db, 'karyakartas');

        // Listen for real-time updates on both booths and karyakartas
        onValue(boothsRef, (boothSnapshot) => {
          onValue(karyakartasRef, (karyakartaSnapshot) => {
            if (boothSnapshot.exists()) {
              const boothsData = [];
              const karyakartasMap = new Map();

              // Create map of karyakartas by boothId
              if (karyakartaSnapshot.exists()) {
                karyakartaSnapshot.forEach((childSnapshot) => {
                  const karyakarta = childSnapshot.val();
                  if (karyakarta.boothId) {
                    if (!karyakartasMap.has(karyakarta.boothId)) {
                      karyakartasMap.set(karyakarta.boothId, []);
                    }
                    karyakartasMap.get(karyakarta.boothId).push({
                      id: childSnapshot.key,
                      ...karyakarta
                    });
                  }
                });
              }

              // Process booths data
              boothSnapshot.forEach((childSnapshot) => {
                const booth = childSnapshot.val();
                const boothKaryakartas = karyakartasMap.get(booth.id) || [];
                
                boothsData.push({
                  id: childSnapshot.key,
                  ...booth,
                  karyakartas: boothKaryakartas,
                  allottedTo: boothKaryakartas.length > 0 ? boothKaryakartas[0].name : '',
                  teamSize: boothKaryakartas.length,
                  status: boothKaryakartas.length > 0 ? 'allotted' : 'available'
                });
              });

              // Sort by booth number
              const sortedBooths = boothsData.sort((a, b) => 
                a.number.localeCompare(b.number, undefined, { numeric: true })
              );

              setBooths(sortedBooths);
            } else {
              // If no booths in database, create from voters data
              fetchBoothsFromVoters(karyakartasMap);
            }
            setLoading(false);
          });
        });

      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fallback: Create booths from voters data if no booths collection exists
  const fetchBoothsFromVoters = async (karyakartasMap = new Map()) => {
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      
      if (snapshot.exists()) {
        const boothMap = new Map();
        
        snapshot.forEach((childSnapshot) => {
          const voter = childSnapshot.val();
          if (voter.boothNumber) {
            const boothKey = voter.boothNumber;
            if (!boothMap.has(boothKey)) {
              boothMap.set(boothKey, {
                id: boothKey,
                number: voter.boothNumber,
                name: voter.pollingStationName || `Booth ${voter.boothNumber}`,
                location: voter.pollingStationAddress || 'Location not specified',
                votersCount: 1,
                voters: [{ id: childSnapshot.key, ...voter }],
                createdAt: new Date().toISOString()
              });
            } else {
              const booth = boothMap.get(boothKey);
              booth.votersCount++;
              booth.voters.push({ id: childSnapshot.key, ...voter });
            }
          }
        });

        // Save booths to Firebase and get karyakarta data
        const boothsData = [];
        for (const [boothKey, boothData] of boothMap) {
          const boothRef = ref(db, `booths/${boothKey}`);
          await set(boothRef, boothData);
          
          const boothKaryakartas = karyakartasMap.get(boothKey) || [];
          boothsData.push({
            ...boothData,
            karyakartas: boothKaryakartas,
            allottedTo: boothKaryakartas.length > 0 ? boothKaryakartas[0].name : '',
            teamSize: boothKaryakartas.length,
            status: boothKaryakartas.length > 0 ? 'allotted' : 'available'
          });
        }

        const sortedBooths = boothsData.sort((a, b) => 
          a.number.localeCompare(b.number, undefined, { numeric: true })
        );
        
        setBooths(sortedBooths);
      }
    } catch (error) {
      console.error('Error fetching booths from voters:', error);
    }
  };

  const handleBoothSelect = (booth) => {
    setSelectedBooth(booth);
    setShowAllotmentModal(true);
    
    // Pre-fill form if booth is already allotted
    if (booth.karyakartas && booth.karyakartas.length > 0) {
      const mainKaryakarta = booth.karyakartas[0];
      setAllotmentForm({
        name: mainKaryakarta.name || '',
        phone: mainKaryakarta.phone || '',
        alternatePhone: mainKaryakarta.alternatePhone || '',
        address: mainKaryakarta.address || '',
        email: mainKaryakarta.email || '',
        designation: mainKaryakarta.designation || '',
        experience: mainKaryakarta.experience || '',
        responsibilities: mainKaryakarta.responsibilities || '',
        teamSize: booth.karyakartas.length || 1
      });
    } else {
      setAllotmentForm({
        name: '',
        phone: '',
        alternatePhone: '',
        address: '',
        email: '',
        designation: '',
        experience: '',
        responsibilities: '',
        teamSize: 1
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAllotmentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveAllotment = async () => {
    if (!selectedBooth || !allotmentForm.name || !allotmentForm.phone) {
      alert('Please fill in all required fields (Name and Phone are mandatory)');
      return;
    }

    if (allotmentForm.teamSize < 1) {
      alert('Team size must be at least 1');
      return;
    }

    setLoading(true);
    try {
      const boothId = selectedBooth.id;
      const allottedAt = new Date().toISOString();

      // Save main karyakarta details
      const karyakartaRef = push(ref(db, 'karyakartas'));
      const karyakartaId = karyakartaRef.key;
      
      const karyakartaData = {
        ...allotmentForm,
        boothId: boothId,
        boothNumber: selectedBooth.number,
        allottedAt: allottedAt,
        status: 'active',
        isPrimary: true
      };

      await set(karyakartaRef, karyakartaData);

      // Update booth with allocation info
      const boothRef = ref(db, `booths/${boothId}`);
      await update(boothRef, {
        allottedTo: allotmentForm.name,
        allottedToId: karyakartaId,
        allottedAt: allottedAt,
        status: 'allotted',
        teamSize: parseInt(allotmentForm.teamSize),
        lastUpdated: allottedAt
      });

      alert('Booth allotted successfully!');
      setShowAllotmentModal(false);
      setSelectedBooth(null);
      
      // Refresh data
      const boothsRef = ref(db, 'booths');
      const karyakartasRef = ref(db, 'karyakartas');
      const [boothSnapshot, karyakartaSnapshot] = await Promise.all([
        get(boothsRef),
        get(karyakartasRef)
      ]);

      // Update local state with fresh data
      if (boothSnapshot.exists()) {
        const updatedBooths = [];
        const karyakartasMap = new Map();

        if (karyakartaSnapshot.exists()) {
          karyakartaSnapshot.forEach((childSnapshot) => {
            const karyakarta = childSnapshot.val();
            if (karyakarta.boothId) {
              if (!karyakartasMap.has(karyakarta.boothId)) {
                karyakartasMap.set(karyakarta.boothId, []);
              }
              karyakartasMap.get(karyakarta.boothId).push({
                id: childSnapshot.key,
                ...karyakarta
              });
            }
          });
        }

        boothSnapshot.forEach((childSnapshot) => {
          const booth = childSnapshot.val();
          const boothKaryakartas = karyakartasMap.get(booth.id) || [];
          
          updatedBooths.push({
            id: childSnapshot.key,
            ...booth,
            karyakartas: boothKaryakartas,
            allottedTo: boothKaryakartas.length > 0 ? boothKaryakartas[0].name : '',
            teamSize: boothKaryakartas.length,
            status: boothKaryakartas.length > 0 ? 'allotted' : 'available'
          });
        });

        setBooths(updatedBooths.sort((a, b) => 
          a.number.localeCompare(b.number, undefined, { numeric: true })
        ));
      }

    } catch (error) {
      console.error('Error saving allotment:', error);
      alert('Error saving allotment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooths = booths.filter(booth =>
    booth.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booth.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booth.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (booth.allottedTo && booth.allottedTo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'allotted': return 'bg-green-100 text-green-800 border-green-200';
      case 'available': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'allotted': return '✅';
      case 'available': return '🟡';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading booth data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Booth Management System</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Efficiently manage and allocate polling booths to your team members with real-time updates
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Booths</p>
                <p className="text-3xl font-bold text-gray-900">{booths.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Allotted Booths</p>
                <p className="text-3xl font-bold text-gray-900">
                  {booths.filter(booth => booth.status === 'allotted').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Available Booths</p>
                <p className="text-3xl font-bold text-gray-900">
                  {booths.filter(booth => booth.status === 'available').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Team</p>
                <p className="text-3xl font-bold text-gray-900">
                  {booths.reduce((total, booth) => total + (booth.teamSize || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search booths by number, name, location, or assigned person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl focus:ring-3 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm text-lg"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Booths Grid */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Polling Booths</h2>
                <p className="text-gray-600 mt-1">Manage booth allocations and team assignments</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                  {filteredBooths.length} {filteredBooths.length === 1 ? 'booth' : 'booths'} found
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            {filteredBooths.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No booths found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  No booths match your search criteria. Try adjusting your search terms or check if any booths are available.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredBooths.map((booth) => (
                  <div
                    key={booth.id}
                    className="border-2 border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 bg-white"
                    onClick={() => handleBoothSelect(booth)}
                  >
                    {/* Booth Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">Booth {booth.number}</h3>
                          <p className="text-gray-600 font-medium">{booth.name}</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(booth.status)}`}>
                          {getStatusIcon(booth.status)} {booth.status === 'allotted' ? 'Allotted' : 'Available'}
                        </span>
                      </div>
                      
                      {/* Allotted Person Info */}
                      {booth.allottedTo && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {booth.allottedTo.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <p className="font-semibold text-green-900">{booth.allottedTo}</p>
                              <p className="text-sm text-green-700">
                                Team: {booth.teamSize} {booth.teamSize === 1 ? 'member' : 'members'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Booth Details */}
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">{booth.location}</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div className="flex items-center gap-4">
                            <span><strong>{booth.votersCount}</strong> voters</span>
                            <span className="text-blue-600">♂ {booth.voters?.filter(v => v.gender?.toLowerCase() === 'male').length || 0}</span>
                            <span className="text-pink-600">♀ {booth.voters?.filter(v => v.gender?.toLowerCase() === 'female').length || 0}</span>
                          </div>
                        </div>

                        {/* Age Distribution */}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Age Distribution</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-600">18-30: {booth.voters?.filter(v => v.age >= 18 && v.age <= 30).length || 0}</span>
                            <span className="text-green-600">31-50: {booth.voters?.filter(v => v.age > 30 && v.age <= 50).length || 0}</span>
                            <span className="text-orange-600">50+: {booth.voters?.filter(v => v.age > 50).length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <button className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                          booth.allottedTo 
                            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' 
                            : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        }`}>
                          {booth.allottedTo ? 'View/Edit Allocation' : 'Allot This Booth'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allotment Modal */}
      {showAllotmentModal && selectedBooth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">
                    {selectedBooth.allottedTo ? 'Edit Booth Allocation' : 'Allot Booth'} {selectedBooth.number}
                  </h3>
                  <p className="text-orange-100 mt-1">{selectedBooth.name}</p>
                </div>
                <button
                  onClick={() => setShowAllotmentModal(false)}
                  className="text-white hover:text-orange-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Booth Info */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Location:</span>
                    <p className="text-gray-600">{selectedBooth.location}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Total Voters:</span>
                    <p className="text-gray-600">{selectedBooth.votersCount} registered voters</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Current Status:</span>
                    <p className={`font-semibold ${selectedBooth.allottedTo ? 'text-green-600' : 'text-orange-600'}`}>
                      {selectedBooth.allottedTo ? 'Allotted' : 'Available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Karyakarta Form */}
              <div className="p-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-6">Team Leader Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h5 className="font-semibold text-gray-700 border-l-4 border-orange-500 pl-3">Personal Information</h5>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={allotmentForm.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={allotmentForm.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alternate Phone
                      </label>
                      <input
                        type="tel"
                        name="alternatePhone"
                        value={allotmentForm.alternatePhone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="Enter alternate phone"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={allotmentForm.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-4">
                    <h5 className="font-semibold text-gray-700 border-l-4 border-orange-500 pl-3">Professional Information</h5>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={allotmentForm.designation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="e.g., Booth President"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        name="experience"
                        value={allotmentForm.experience}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="Years of experience"
                        min="0"
                        max="50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team Size *
                      </label>
                      <input
                        type="number"
                        name="teamSize"
                        value={allotmentForm.teamSize}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="Number of team members"
                        min="1"
                        max="20"
                      />
                      <p className="text-xs text-gray-500 mt-1">Including team leader</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Complete Address
                    </label>
                    <textarea
                      name="address"
                      value={allotmentForm.address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Enter complete residential address"
                    />
                  </div>

                  {/* Responsibilities */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Key Responsibilities
                    </label>
                    <textarea
                      name="responsibilities"
                      value={allotmentForm.responsibilities}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Describe key responsibilities and tasks..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    onClick={() => setShowAllotmentModal(false)}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAllotment}
                    disabled={loading}
                    className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 border border-transparent rounded-xl hover:from-orange-600 hover:to-red-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {selectedBooth.allottedTo ? 'Updating...' : 'Allotting...'}
                      </span>
                    ) : (
                      selectedBooth.allottedTo ? 'Update Allocation' : 'Allot Booth'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoothManagement;