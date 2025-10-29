import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, ref, get, update } from '../Firebase/config';
import { FiUsers, FiPlus, FiX, FiSearch, FiPrinter } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const FamilyManagement = ({ voter, familyMembers, onUpdate, candidateInfo }) => {
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [allVoters, setAllVoters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalQuery, setModalQuery] = useState('');
  const [modalPage, setModalPage] = useState(1);
  const [printing, setPrinting] = useState(false);
  
  const pageSize = 1000;
  const modalDebounceRef = useRef(null);

  useEffect(() => {
    if (showFamilyModal) {
      loadAllVoters();
      setModalQuery(searchTerm || '');
      setModalPage(1);
    }
  }, [showFamilyModal]);

  useEffect(() => {
    if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
    modalDebounceRef.current = setTimeout(() => {
      setSearchTerm(modalQuery);
      setModalPage(1);
    }, 250);
    return () => {
      if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
    };
  }, [modalQuery]);

  const loadAllVoters = async () => {
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      if (snapshot.exists()) {
        const votersData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id, ...data
        }));
        setAllVoters(votersData);
      }
    } catch (error) {
      console.error('Error loading all voters:', error);
    }
  };

  const addFamilyMember = async (memberId) => {
    try {
      const voterRef = ref(db, `voters/${voter.id}`);
      const currentVoter = await get(voterRef);
      const currentData = currentVoter.val();

      const familyMembersObj = currentData.familyMembers || {};
      familyMembersObj[memberId] = true;

      await update(voterRef, { familyMembers: familyMembersObj });

      // Also update the member to include this voter as family
      const memberRef = ref(db, `voters/${memberId}`);
      const memberData = await get(memberRef);
      const memberFamily = memberData.val().familyMembers || {};
      memberFamily[voter.id] = true;
      await update(memberRef, { familyMembers: memberFamily });

      onUpdate?.();
      setShowFamilyModal(false);
      alert('Family member added successfully!');
    } catch (error) {
      console.error('Error adding family member:', error);
      alert('Failed to add family member.');
    }
  };

  const removeFamilyMember = async (memberId) => {
    try {
      const voterRef = ref(db, `voters/${voter.id}`);
      const currentVoter = await get(voterRef);
      const currentData = currentVoter.val();

      const familyMembersObj = currentData.familyMembers || {};
      delete familyMembersObj[memberId];

      await update(voterRef, { familyMembers: familyMembersObj });

      // Also remove from the other voter
      const memberRef = ref(db, `voters/${memberId}`);
      const memberData = await get(memberRef);
      const memberFamily = memberData.val().familyMembers || {};
      delete memberFamily[voter.id];
      await update(memberRef, { familyMembers: memberFamily });

      onUpdate?.();
      alert('Family member removed successfully!');
    } catch (error) {
      console.error('Error removing family member:', error);
      alert('Failed to remove family member.');
    }
  };

  const generateWhatsAppMessage = (isFamily = false) => {
    if (isFamily && familyMembers.length > 0) {
      let message = `🗳️ *${candidateInfo.party}*\n`;
      message += `*${candidateInfo.name}*\n`;
      message += `${candidateInfo.slogan}\n\n`;
      
      message += `🏠 *कुटुंब तपशील* 🏠\n\n`;
      message += `*मुख्य मतदार:*\n`;
      message += `नाव: ${voter.name}\n`;
      message += `मतदार आयडी: ${voter.voterId || 'N/A'}\n`;
      message += `बूथ क्र.: ${voter.boothNumber || 'N/A'}\n`;
      message += `पत्ता: ${voter.pollingStationAddress || 'N/A'}\n\n`;
      
      message += `*कुटुंब सदस्य:*\n`;
      familyMembers.forEach((member, index) => {
        message += `${index + 1}. ${member.name}\n`;
        message += `   🆔 मतदार आयडी: ${member.voterId || 'N/A'}\n`;
        message += `   📍 बूथ क्र.: ${member.boothNumber || 'N/A'}\n`;
        if (member.age) message += `   👤 वय: ${member.age}\n`;
        if (member.gender) message += `   ⚤ लिंग: ${member.gender}\n`;
        message += '\n';
      });
      
      message += `\n🙏 कृपया ${candidateInfo.electionSymbol} या चिन्हावर मतदान करा\n`;
      message += `📞 संपर्क: ${candidateInfo.contact}`;
      
      return message;
    } else {
      let message = `🗳️ *${candidateInfo.party}*\n`;
      message += `*${candidateInfo.name}*\n`;
      message += `${candidateInfo.slogan}\n\n`;
      
      message += `👤 *मतदार तपशील*\n\n`;
      message += `नाव: ${voter.name}\n`;
      message += `मतदार आयडी: ${voter.voterId || 'N/A'}\n`;
      message += `अनुक्रमांक: ${voter.serialNumber || 'N/A'}\n`;
      message += `बूथ क्र.: ${voter.boothNumber || 'N/A'}\n`;
      message += `पत्ता: ${voter.pollingStationAddress || 'N/A'}\n`;
      
      if (voter.age) message += `वय: ${voter.age}\n`;
      if (voter.gender) message += `लिंग: ${voter.gender}\n`;
      
      message += `\n🙏 कृपया ${candidateInfo.electionSymbol} या चिन्हावर मतदान करा\n`;
      message += `📞 संपर्क: ${candidateInfo.contact}`;
      
      return message;
    }
  };

  const shareFamilyViaWhatsApp = () => {
    if (familyMembers.length === 0) {
      alert('No family members to share.');
      return;
    }

    const whatsappNumber = voter.whatsapp || voter.whatsappNumber;
    if (!whatsappNumber) {
      alert('WhatsApp number not available. Please add WhatsApp number first.');
      return;
    }

    const message = generateWhatsAppMessage(true);
    const formattedNumber = whatsappNumber.replace(/\D/g, '');
    const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const printFamily = async () => {
    // This will be handled by BluetoothPrinter component
    // We'll pass this function via props
    if (typeof window.printFamily === 'function') {
      window.printFamily(true);
    }
  };

  // Filter logic
  const filteredVoters = allVoters.filter(vtr =>
    vtr.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    vtr.id !== voter.id &&
    !familyMembers.some(member => member.id === vtr.id)
  );

  // Modal search and pagination logic
  const voterSurname = useMemo(() => {
    if (!voter?.name) return '';
    const parts = String(voter.name).trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }, [voter]);

  const tokenizedFilter = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    if (!tokens.length) {
      return filteredVoters;
    }
    return filteredVoters.filter((v) => {
      const name = (v.name || '').toLowerCase();
      return tokens.every(token => name.includes(token) || (String(v.voterId || '').toLowerCase().includes(token)));
    });
  }, [filteredVoters, searchTerm]);

  const [surnameTopList, surnameRestList] = useMemo(() => {
    if (!voterSurname) return [[], tokenizedFilter];
    const top = [];
    const rest = [];
    for (let item of tokenizedFilter) {
      const parts = String(item.name || '').trim().split(/\s+/);
      const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
      if (last === voterSurname) top.push(item);
      else rest.push(item);
    }
    return [top, rest];
  }, [tokenizedFilter, voterSurname]);

  const combinedList = useMemo(() => {
    return [...surnameTopList, ...surnameRestList];
  }, [surnameTopList, surnameRestList]);

  const totalPages = Math.max(1, Math.ceil(combinedList.length / pageSize));
  
  useEffect(() => {
    if (modalPage > totalPages) setModalPage(totalPages);
  }, [totalPages]);

  const paginatedList = useMemo(() => {
    const start = (modalPage - 1) * pageSize;
    return combinedList.slice(start, start + pageSize);
  }, [combinedList, modalPage]);

  // Keyboard ESC to close modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && showFamilyModal) {
        setShowFamilyModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showFamilyModal]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiUsers className="text-orange-500" />
          Family Members
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFamilyModal(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <FiPlus className="text-sm" />
            Add
          </button>
        </div>
      </div>

      {/* Family Action Buttons */}
      {familyMembers.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={printFamily}
            disabled={printing}
            className="bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
          >
            <FiPrinter className="text-lg" />
            <span>Print Family</span>
          </button>
          <button
            onClick={shareFamilyViaWhatsApp}
            className="bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md"
          >
            <FaWhatsapp className="text-lg" />
            <span>Share Family</span>
          </button>
        </div>
      )}

      <div className="space-y-3">
        {familyMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors bg-white">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{member.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                ID: {member.voterId} • Age: {member.age || 'N/A'} • Booth: {member.boothNumber || 'N/A'} • Address: {member.pollingStationAddress || 'N/A'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/voter/${member.id}`, '_blank')}
                className="text-orange-600 hover:text-orange-700 text-xs font-medium px-3 py-1 bg-orange-50 rounded-md transition-colors"
              >
                View
              </button>
              <button
                onClick={() => removeFamilyMember(member.id)}
                className="text-red-600 hover:text-red-700 text-xs font-medium px-3 py-1 bg-red-50 rounded-md transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {familyMembers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FiUsers className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-sm">No family members added yet.</p>
        </div>
      )}

      {/* Family Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Family Member
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Search and select voters to add as family members
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-xs text-gray-600 mr-2">
                  <div><strong>{combinedList.length}</strong> results</div>
                </div>
                <button
                  onClick={() => setShowFamilyModal(false)}
                  aria-label="Close"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FiX className="text-lg text-gray-600" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 overflow-hidden">
              {/* Search bar */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={modalQuery}
                  onChange={(e) => setModalQuery(e.target.value)}
                  placeholder="Type name or partial name (search not exact)..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Surname header */}
              {voterSurname && surnameTopList.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-700 font-medium">
                    Showing same surname first: <span className="ml-2 font-semibold">{voterSurname}</span> • <span className="text-xs text-gray-500">{surnameTopList.length} matches</span>
                  </div>
                </div>
              )}

              {/* Results list */}
              <div className="max-h-[60vh] overflow-y-auto border border-gray-100 rounded-md">
                {paginatedList.length > 0 ? paginatedList.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{v.name}</h4>
                      <p className="text-sm text-gray-700 truncate">ID: {v.voterId} • Booth: {v.boothNumber || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => addFamilyMember(v.id)}
                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
                      >
                        <FiPlus className="text-xs" />
                        Add
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    No voters found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalPage(prev => Math.max(1, prev - 1))}
                  disabled={modalPage <= 1}
                  className="px-3 py-2 bg-gray-100 text-sm rounded-md disabled:opacity-50"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setModalPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={modalPage >= totalPages}
                  className="px-3 py-2 bg-gray-100 text-sm rounded-md disabled:opacity-50"
                >
                  Next →
                </button>
                <div className="text-sm text-gray-600 ml-3">
                  Page {modalPage} / {totalPages}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600 mr-4">
                  Showing {combinedList.length === 0 ? 0 : ((modalPage - 1) * pageSize) + 1} - {Math.min(modalPage * pageSize, combinedList.length)} / {combinedList.length}
                </div>
                <button
                  onClick={() => setShowFamilyModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyManagement;