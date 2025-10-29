import React, { memo, useCallback, useMemo } from 'react';
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

// Memoized Voter Card Component
const VoterCard = memo(({ voter, index }) => {
  const navigate = useNavigate();
  const [showContactModal, setShowContactModal] = React.useState(false);
  const [selectedMethod, setSelectedMethod] = React.useState('');
  const [contactValue, setContactValue] = React.useState('');
  const [sending, setSending] = React.useState(false);

  // Memoize handlers
  const handleViewDetails = useCallback(() => {
    navigate(`/voter/${voter.id}`);
  }, [voter.id, navigate]);

  const handleContactClick = useCallback((method) => {
    setSelectedMethod(method);
    setContactValue('');
    setShowContactModal(true);
  }, []);

  // Memoize voter details display
  const voterDetails = useMemo(() => ({
    name: voter.name || '—',
    boothNumber: voter.boothNumber || 'N/A',
    voterId: voter.voterId || '—',
    address: voter.pollingStationAddress || 'No address available'
  }), [voter]);

  return (
    <div
      onClick={handleViewDetails}
      className="bg-white shadow-xl mb-2 hover:bg-orange-50 cursor-pointer active:bg-orange-100 transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base truncate pr-2 group-hover:text-orange-700 transition-colors">
                <TranslatedText>{voterDetails.name}</TranslatedText>
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-semibold border border-orange-200">
                  <TranslatedText>{voterDetails.boothNumber}</TranslatedText>
                </span>
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-semibold border border-orange-200">
                  <TranslatedText>ID: </TranslatedText>{voterDetails.voterId}
                </span>
              </div>
            </div>
            
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

          <div className="flex items-start gap-2 mb-2">
            <FiMapPin className="text-red-500 mt-0.5 flex-shrink-0 text-sm" />
            <p className="text-sm text-gray-700 leading-tight">
              <TranslatedText>{voterDetails.address}</TranslatedText>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.voter.id === nextProps.voter.id &&
         prevProps.voter.name === nextProps.voter.name &&
         prevProps.voter.boothNumber === nextProps.voter.boothNumber &&
         prevProps.voter.voterId === nextProps.voter.voterId &&
         prevProps.voter.pollingStationAddress === nextProps.voter.pollingStationAddress;
});

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
  // Memoize empty state
  const EmptyState = useMemo(() => (
    <div className="text-center py-16 bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl">
      <div className="text-5xl mb-4">📋</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">No Voters Found</h3>
      <p className="text-gray-600 mx-auto">
        There are currently no voters in the database. Voters will appear here once they are added.
      </p>
    </div>
  ), []);

  // Early return for empty state
  if (!Array.isArray(voters) || voters.length === 0) {
    return EmptyState;
  }

  // Chunk voters into pages of 50 for infinite scroll
  const CHUNK_SIZE = 50;
  const [displayCount, setDisplayCount] = React.useState(CHUNK_SIZE);

  // Intersection Observer for infinite scroll
  const observerTarget = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < voters.length) {
          setDisplayCount(prev => Math.min(prev + CHUNK_SIZE, voters.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayCount, voters.length]);

  return (
    <div className="space-y-1">
      <div className="bg-white shadow-lg border border-gray-200 p-2 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Voter List
            </h2>
            <p className="text-gray-600 font-semibold">
              Showing {displayCount} of {voters.length} voters
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-2 overflow-hidden">
        {voters.slice(0, displayCount).map((voter, index) => (
          <VoterCard
            key={voter.id || index}
            voter={voter}
            index={index}
          />
        ))}
        <div ref={observerTarget} style={{ height: '20px' }} />
      </div>
    </div>
  );
};

export default memo(VoterList);