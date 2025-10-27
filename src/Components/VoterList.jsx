import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser,
  FiMapPin,
  FiMessageCircle,
  FiMail,
  FiEye
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import TranslatedText from './TranslatedText';
import { db, ref, get } from '../Firebase/config';

// Voter Card Component
const VoterCard = ({ voter, index }) => {
  const navigate = useNavigate();
  const [showContactModal, setShowContactModal] = React.useState(false);
  const [selectedMethod, setSelectedMethod] = React.useState('');
  const [contactValue, setContactValue] = React.useState('');
  const [sending, setSending] = React.useState(false);

  // Get actual serial number from Firebase data - FIXED
  const serialNumber = voter.serialNumber;
  // my logic 
  const loadVoterDetails = async () => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      const snapshot = await get(voterRef);

      if (snapshot.exists()) {
        setVoter({ id: voterId, ...snapshot.val() });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading voter details:', error);
      setLoading(false);
    }
  };



  const handleViewDetails = () => {
    navigate(`/voter/${voter.id}`);
  };

  const handleContactClick = (method) => {
    setSelectedMethod(method);
    setContactValue('');
    setShowContactModal(true);
  };

  const handleSendDetails = async () => {
    if (!contactValue.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setShowContactModal(false);
      setContactValue('');
      alert(`${voter.name}'s details sent via ${selectedMethod} to ${contactValue}`);
    }, 500);
  };

  return (
    <>
      <div
        onClick={handleViewDetails}
        className="bg-white shadow-xl mb-2 hover:bg-orange-50 cursor-pointer active:bg-orange-100 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          {/* Serial Number - Prominent Display */}
          {/* <div className="flex-shrink-0">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="font-bold text-sm"># {voter.serialNumber || '—'} </span>
            </div>
          </div> */}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate pr-2 group-hover:text-orange-700 transition-colors">
                 <TranslatedText>{voter.name || '—'}</TranslatedText>
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-semibold border border-orange-200">
                    <TranslatedText>{voter.boothNumber || 'N/A'}</TranslatedText> 
                  </span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-semibold border border-orange-200">
                    <TranslatedText>ID: </TranslatedText>{voter.voterId || '—'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {/* <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContactClick('WhatsApp');
                  }}
                  className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-all duration-200 hover:scale-110"
                  title="Share via WhatsApp"
                >
                  <FaWhatsapp className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContactClick('SMS');
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110"
                  title="Share via SMS"
                >
                  <FiMessageCircle className="w-4 h-4" />
                </button> */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails();
                  }}
                  className="p-2 text-orange-600 hover:bg-orange-100 rounded-xl transition-all duration-200 hover:scale-110"
                  title="View Details"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 mb-2">
              <FiMapPin className="text-red-500 mt-0.5 flex-shrink-0 text-sm" />
              <p className="text-sm text-gray-700 leading-tight">
                <TranslatedText>{voter.pollingStationAddress || 'No address available'}</TranslatedText>
              </p>
            </div>

            {/* Additional Info */}
            {/* <div className="flex items-center gap-4 text-xs text-gray-600">
              {voter.age && (
                <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                  <FiUser className="text-gray-500" />
                  <TranslatedText>Age: <strong className="text-gray-800">{voter.age}</strong></TranslatedText>
                </span>
              )}
              {voter.gender && (
                <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                  <TranslatedText>Gender: <strong className="text-gray-800">{voter.gender}</strong></TranslatedText>  
                </span>
              )}
            </div> */}
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          voter={voter}
          serialNumber={serialNumber}
          selectedMethod={selectedMethod}
          contactValue={contactValue}
          setContactValue={setContactValue}
          sending={sending}
          onSend={handleSendDetails}
          onClose={() => setShowContactModal(false)}
        />
      )}
    </>
  );
};

// Contact Modal Component
const ContactModal = ({
  voter,
  selectedMethod,
  contactValue,
  setContactValue,
  sending,
  onSend,
  onClose
}) => (
  <div className="fixed inset-0 bg-black backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl w-full  border border-gray-200">
      {/* Header */}
      {/* <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${selectedMethod === 'WhatsApp' ? 'bg-green-500' :
              selectedMethod === 'SMS' ? 'bg-blue-500' :
                'bg-purple-500'
            } text-white shadow-lg`}>
            {selectedMethod === 'WhatsApp' && <FaWhatsapp className="text-xl" />}
            {selectedMethod === 'SMS' && <FiMessageCircle className="text-xl" />}
            {selectedMethod === 'Email' && <FiMail className="text-xl" />}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Share Details</h3>
            <p className="text-sm text-gray-600">via {selectedMethod}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <FiEye className="text-gray-500 text-lg" />
        </button>
      </div> */}

      {/* Voter Preview */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50  mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <FiUser className="text-white text-lg" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-lg"><TranslatedText>{voter.name || '—'}</TranslatedText></h4>
            <p className="text-sm text-gray-600 font-semibold"><TranslatedText>Serial {voter.serialNumber}</TranslatedText></p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600 font-medium"><TranslatedText>Voter ID:</TranslatedText></span>
            <p className="font-mono text-gray-900 font-bold">{voter.voterId || '—'}</p>
          </div>
          <div>
            <span className="text-gray-600 font-medium"><TranslatedText>Booth:</TranslatedText></span>
            <p className="text-gray-900 font-bold">{voter.boothNumber || '—'}</p>
          </div>
        </div>
      </div>

      {/* Contact Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {selectedMethod === 'Email' ? 'Email Address' : 'Phone Number'}
        </label>
        <div className="relative">
          {selectedMethod === 'Email' ? (
            <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-base" />
          ) : (
            <FiMessageCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-base" />
          )}
          <input
            type={selectedMethod === 'Email' ? 'email' : 'tel'}
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder={
              selectedMethod === 'Email'
                ? 'Enter email address'
                : 'Enter phone number'
            }
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-base"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
          disabled={sending}
        >
         <TranslatedText>Cancel</TranslatedText>
        </button>
        <button
          onClick={onSend}
          disabled={!contactValue.trim() || sending}
          className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${!contactValue.trim() || sending
              ? 'bg-gray-400 cursor-not-allowed'
              : selectedMethod === 'WhatsApp'
                ? 'bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl'
                : selectedMethod === 'SMS'
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl'
                  : 'bg-purple-500 hover:bg-purple-600 shadow-lg hover:shadow-xl'
            }`}
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sending...
            </>
          ) : (
            <>
              <FiMail className="text-lg" />
              Send
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

// Main Voter List Component
const VoterList = ({ voters }) => {
  if (!Array.isArray(voters) || voters.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl ">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Voters Found</h3>
        <p className="text-gray-600 mx-auto">
          There are currently no voters in the database. Voters will appear here once they are added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header with Count */}
      <div className="bg-white shadow-lg border border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Voter List
            </h2>
            {/* <p className="text-gray-600 font-semibold">
              Total {voters.length} voters registered
            </p> */}
          </div>
          {/* <div className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-lg">
            #{voters.length}
          </div> */}
        </div>
      </div>

      {/* Voter List */}
      <div className="bg-white p-2 overflow-hidden">
        {voters.map((voter, index) => (
          <VoterCard
            key={voter.id || index}
            voter={voter}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default VoterList;