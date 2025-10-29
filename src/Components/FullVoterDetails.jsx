import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, ref, get, update } from '../Firebase/config';
import VoterSurvey from './VoterSurvey';
import FamilyManagement from './FamilyManagement';
import ContactManagement from './ContactManagement';
import BluetoothPrinter from './BluetoothPrinter';
import {
  FiArrowLeft,
  FiUser,
  FiUsers,
  FiClipboard,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();

  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [familyMembers, setFamilyMembers] = useState([]);

  // Candidate branding
  const candidateInfo = {
    name: "जननेता",
    party: "भारतीय जनता पार्टी",
    electionSymbol: "कमळ",
    slogan: "सबका साथ, सबका विकास",
    contact: "8888869612",
    area: "वाशीम प्रभाग 1",
  };

  useEffect(() => {
    loadVoterDetails();
  }, [voterId]);

  const loadVoterDetails = async () => {
    setLoading(true);
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      const snapshot = await get(voterRef);

      if (snapshot.exists()) {
        const voterData = { id: voterId, ...snapshot.val() };
        setVoter(voterData);

        // Load family members
        if (voterData.familyMembers) {
          const familyPromises = Object.keys(voterData.familyMembers).map(async (memberId) => {
            const memberRef = ref(db, `voters/${memberId}`);
            const memberSnapshot = await get(memberRef);
            return memberSnapshot.exists() ? { id: memberId, ...memberSnapshot.val() } : null;
          });
          const members = await Promise.all(familyPromises);
          setFamilyMembers(members.filter(member => member !== null));
        }
      }
    } catch (error) {
      console.error('Error loading voter details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVoterField = async (field, value) => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      await update(voterRef, { [field]: value });
      setVoter(prev => ({ ...prev, [field]: value }));
    } catch (error) {
      console.error('Error updating voter:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading voter details...</p>
        </div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3 text-gray-400">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Voter Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            >
              <FiArrowLeft className="text-lg" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'details', icon: FiUser, label: 'Details' },
                { id: 'family', icon: FiUsers, label: 'Family' },
                { id: 'survey', icon: FiClipboard, label: 'Survey' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <tab.icon className="text-sm" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Candidate Branding Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5 text-center">
            <div className="text-sm font-semibold opacity-90 mb-1">{candidateInfo.party}</div>
            <div className="text-xl font-bold mb-1">{candidateInfo.name}</div>
            <div className="text-xs opacity-80">{candidateInfo.slogan}</div>
          </div>

          <div className="p-5">
            {/* Voter Details Tab */}
            {activeTab === 'details' && (
              <div>
                <div className="text-center mb-6 border-b border-gray-200 pb-4">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{voter.name}</h1>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6">
                  <DetailRow label="Voter ID" value={voter.voterId} />
                  <DetailRow label="Serial Number" value={voter.serialNumber} />
                  <DetailRow label="Booth Number" value={voter.boothNumber} />
                  <DetailRow label="WhatsApp Number" value={voter.whatsappNumber} />
                  <DetailRow label="Age & Gender" value={`${voter.age || 'N/A'} | ${voter.gender || 'N/A'}`} />
                  <DetailRow label="Polling Station Address" value={voter.pollingStationAddress} isFullWidth />
                </div>

                {/* Voting Status */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voter.hasVoted || false}
                        onChange={(e) => updateVoterField('hasVoted', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                    <span className="text-sm font-medium text-gray-700">
                      {voter.hasVoted ? 'Voted ✓' : 'Mark as Voted'}
                    </span>
                  </div>

                  <select
                    value={voter.supportStatus || 'unknown'}
                    onChange={(e) => updateVoterField('supportStatus', e.target.value)}
                    className={`text-sm font-medium rounded-full px-4 py-2 border ${voter.supportStatus === 'supporter'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : voter.supportStatus === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        : voter.supportStatus === 'not-supporter'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}
                  >
                    <option value="unknown">Support Level</option>
                    <option value="supporter">Strong</option>
                    <option value="medium">Medium</option>
                    <option value="not-supporter">Not</option>
                  </select>
                </div>

                {/* Quick Actions */}
                <ContactManagement 
                  voter={voter} 
                  candidateInfo={candidateInfo}
                  onUpdate={loadVoterDetails}
                />
              </div>
            )}

            {/* Family Tab */}
            {activeTab === 'family' && (
              <FamilyManagement
                voter={voter}
                familyMembers={familyMembers}
                onUpdate={loadVoterDetails}
                candidateInfo={candidateInfo}
              />
            )}

            {/* Survey Tab */}
            {activeTab === 'survey' && (
              <VoterSurvey
                voter={voter}
                onUpdate={loadVoterDetails}
              />
            )}
          </div>
        </div>

        {/* Bluetooth Printer Section */}
        <BluetoothPrinter
          voter={voter}
          familyMembers={familyMembers}
          candidateInfo={candidateInfo}
        />
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, isFullWidth = false }) => (
  <div className={`flex ${isFullWidth ? 'flex-col' : 'justify-between items-center'} border-b border-gray-200 pb-3`}>
    <span className="font-medium text-gray-700 text-sm">{label}</span>
    <span className={`text-gray-900 text-sm ${isFullWidth ? 'mt-2 leading-relaxed' : ''}`}>
      {value || 'N/A'}
    </span>
  </div>
);

export default FullVoterDetails;