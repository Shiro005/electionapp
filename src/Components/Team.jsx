import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, ref, onValue, off, update, remove } from '../Firebase/config';
import { 
  FiArrowLeft, 
  FiUsers, 
  FiUserPlus, 
  FiPhone, 
  FiMail, 
  FiMapPin,
  FiBarChart2,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiX,
  FiHome,
  FiPhoneCall,
  FiUser
} from 'react-icons/fi';

const Team = () => {
  const [karyakartas, setKaryakartas] = useState([]);
  const [booths, setBooths] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [karyakartaToDelete, setKaryakartaToDelete] = useState(null);
  const [newKaryakarta, setNewKaryakarta] = useState({
    name: '',
    phone: '',
    email: '',
    area: '',
    assignedBooths: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const karyakartasRef = ref(db, 'karyakartas');
    const boothsRef = ref(db, 'booths');

    const unsubscribeKaryakartas = onValue(karyakartasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const karyakartasList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setKaryakartas(karyakartasList);
      } else {
        setKaryakartas([]);
      }
      setLoading(false);
    });

    const unsubscribeBooths = onValue(boothsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const boothsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setBooths(boothsList);
      } else {
        setBooths([]);
      }
    });

    return () => {
      off(karyakartasRef, 'value', unsubscribeKaryakartas);
      off(boothsRef, 'value', unsubscribeBooths);
    };
  }, []);

  const addKaryakarta = async () => {
    if (!newKaryakarta.name || !newKaryakarta.phone) {
      alert('Please fill in name and phone number');
      return;
    }

    try {
      const karyakartaId = `karyakarta_${Date.now()}`;
      const updates = {};
      
      updates[`karyakartas/${karyakartaId}`] = {
        id: karyakartaId,
        name: newKaryakarta.name.trim(),
        phone: newKaryakarta.phone.trim(),
        email: newKaryakarta.email.trim(),
        area: newKaryakarta.area.trim(),
        assignedBooths: [],
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      await update(ref(db), updates);
      setShowAddModal(false);
      setNewKaryakarta({ name: '', phone: '', email: '', area: '', assignedBooths: [] });
      alert('✅ Karyakarta added successfully!');
    } catch (error) {
      console.error('Error adding karyakarta:', error);
      alert('❌ Failed to add karyakarta. Please try again.');
    }
  };

  const deleteKaryakarta = async () => {
    if (!karyakartaToDelete) return;

    try {
      // Remove karyakarta from karyakartas node
      await remove(ref(db, `karyakartas/${karyakartaToDelete.id}`));

      // Remove karyakarta assignment from all booths
      const updates = {};
      const assignedBooths = booths.filter(booth => booth.assignedKaryakarta === karyakartaToDelete.id);
      
      assignedBooths.forEach(booth => {
        updates[`booths/${booth.id}/assignedKaryakarta`] = null;
        updates[`booths/${booth.id}/karyakartaName`] = null;
        updates[`booths/${booth.id}/karyakartaPhone`] = null;
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }

      setShowDeleteModal(false);
      setKaryakartaToDelete(null);
      alert('✅ Karyakarta deleted successfully!');
    } catch (error) {
      console.error('Error deleting karyakarta:', error);
      alert('❌ Failed to delete karyakarta. Please try again.');
    }
  };

  const openDeleteModal = (karyakarta) => {
    const stats = getKaryakartaStats(karyakarta.id);
    if (stats.assignedBooths > 0) {
      alert(`Cannot delete ${karyakarta.name}. Please unassign them from ${stats.assignedBooths} booth(s) first.`);
      return;
    }
    setKaryakartaToDelete(karyakarta);
    setShowDeleteModal(true);
  };

  const getKaryakartaStats = (karyakartaId) => {
    const assignedBooths = booths.filter(booth => booth.assignedKaryakarta === karyakartaId);
    const totalVoters = assignedBooths.reduce((sum, booth) => sum + (booth.voterCount || 0), 0);
    const totalVoted = assignedBooths.reduce((sum, booth) => sum + (booth.votedCount || 0), 0);
    const withPhoneCount = assignedBooths.reduce((sum, booth) => sum + (booth.withPhoneCount || 0), 0);
    
    return {
      assignedBooths: assignedBooths.length,
      totalVoters,
      totalVoted,
      withPhoneCount,
      progress: totalVoters > 0 ? (totalVoted / totalVoters * 100).toFixed(1) : 0
    };
  };

  const filteredKaryakartas = karyakartas.filter(karyakarta =>
    karyakarta.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    karyakarta.phone.includes(searchTerm) ||
    karyakarta.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeKaryakartas = karyakartas.filter(k => getKaryakartaStats(k.id).assignedBooths > 0);
  const unassignedKaryakartas = karyakartas.filter(k => getKaryakartaStats(k.id).assignedBooths === 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-b-3xl shadow-lg">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)} 
                className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all"
              >
                <FiArrowLeft className="text-white text-lg" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Team Management</h1>
                <p className="text-orange-100">Manage your karyakartas and their assignments</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-50 transition-all shadow-lg flex items-center gap-2"
            >
              <FiUserPlus />
              Add Karyakarta
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <FiUsers className="absolute left-4 top-4 text-orange-300 text-lg" />
            <input
              type="text"
              placeholder="Search karyakartas by name, phone, or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg"
            />
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{karyakartas.length}</div>
              <div className="text-orange-100 text-sm">Total Karyakartas</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{activeKaryakartas.length}</div>
              <div className="text-orange-100 text-sm">Active Workers</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">
                {booths.filter(b => b.assignedKaryakarta).length}
              </div>
              <div className="text-orange-100 text-sm">Assigned Booths</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-2xl font-bold">{unassignedKaryakartas.length}</div>
              <div className="text-orange-100 text-sm">Available</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Karyakartas Grid */}
        <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FiUsers className="text-orange-600" />
              Karyakartas ({filteredKaryakartas.length})
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl font-medium hover:bg-orange-200 transition-all text-sm"
              >
                Clear Search
              </button>
            </div>
          </div>
          
          {filteredKaryakartas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiUsers className="inline text-6xl mb-4 text-gray-300" />
              <p className="text-lg font-semibold mb-2">
                {searchTerm ? 'No karyakartas found' : 'No karyakartas added yet'}
              </p>
              <p className="text-gray-400 mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first karyakarta'}
              </p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-all"
              >
                Add First Karyakarta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKaryakartas.map((karyakarta) => {
                const stats = getKaryakartaStats(karyakarta.id);
                return (
                  <div key={karyakarta.id} className="border border-gray-200 rounded-2xl p-4 hover:border-orange-300 hover:shadow-lg transition-all bg-white">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <FiUser className="text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{karyakarta.name}</h3>
                          <p className="text-gray-600 text-sm flex items-center gap-1">
                            <FiMapPin className="text-orange-500" size={12} />
                            {karyakarta.area || 'No area assigned'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stats.assignedBooths > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {stats.assignedBooths > 0 ? 'Active' : 'Available'}
                      </span>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <FiPhone className="text-blue-500" />
                        <span className="font-medium">{karyakarta.phone}</span>
                      </div>
                      {karyakarta.email && (
                        <div className="flex items-center gap-2">
                          <FiMail className="text-purple-500" />
                          <span>{karyakarta.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    {stats.assignedBooths > 0 ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                            <div className="font-bold text-blue-700">{stats.assignedBooths}</div>
                            <div className="text-xs text-blue-600">Booths</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                            <div className="font-bold text-green-700">{stats.totalVoters}</div>
                            <div className="text-xs text-green-600">Voters</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                            <div className="font-bold text-purple-700">{stats.progress}%</div>
                            <div className="text-xs text-purple-600">Progress</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Voting Progress</span>
                            <span className="font-semibold">{stats.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${stats.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-3 bg-gray-50 rounded-xl mb-3">
                        <p className="text-gray-500 text-sm">No booths assigned</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate('/booths')}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-all flex items-center justify-center gap-1"
                      >
                        <FiHome size={14} />
                        Assign Booth
                      </button>
                      <button 
                        onClick={() => openDeleteModal(karyakarta)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                        title="Delete Karyakarta"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance Overview */}
        {activeKaryakartas.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-orange-600" />
              Team Performance
            </h2>
            
            <div className="space-y-4">
              {activeKaryakartas.map((karyakarta) => {
                const stats = getKaryakartaStats(karyakarta.id);
                return (
                  <div key={karyakarta.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <FiUser className="text-orange-600" size={14} />
                        </div>
                        <span className="font-semibold text-gray-900">{karyakarta.name}</span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiHome size={14} />
                          {stats.assignedBooths} booths
                        </span>
                        <span className="flex items-center gap-1">
                          <FiPhoneCall size={14} />
                          {stats.withPhoneCount} contacts
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-orange-400 to-amber-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${stats.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>{stats.totalVoted} voted of {stats.totalVoters}</span>
                      <span className="font-semibold">{stats.progress}% complete</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Karyakarta Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-xl">Add New Karyakarta</h3>
              <p className="text-gray-500 text-sm mt-1">Fill in the details to add a new team member</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newKaryakarta.name}
                  onChange={(e) => setNewKaryakarta({...newKaryakarta, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={newKaryakarta.phone}
                  onChange={(e) => setNewKaryakarta({...newKaryakarta, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newKaryakarta.email}
                  onChange={(e) => setNewKaryakarta({...newKaryakarta, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assigned Area
                </label>
                <input
                  type="text"
                  value={newKaryakarta.area}
                  onChange={(e) => setNewKaryakarta({...newKaryakarta, area: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter assigned area/village"
                />
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewKaryakarta({ name: '', phone: '', email: '', area: '', assignedBooths: [] });
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addKaryakarta}
                disabled={!newKaryakarta.name.trim() || !newKaryakarta.phone.trim()}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                Add Karyakarta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && karyakartaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-xl">Delete Karyakarta</h3>
              <p className="text-gray-500 text-sm mt-1">This action cannot be undone</p>
            </div>
            
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <FiUser className="text-red-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-red-800">{karyakartaToDelete.name}</div>
                    <div className="text-red-600 text-sm">{karyakartaToDelete.phone}</div>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-center">
                Are you sure you want to delete <strong>{karyakartaToDelete.name}</strong> from the team?
              </p>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setKaryakartaToDelete(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteKaryakarta}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;