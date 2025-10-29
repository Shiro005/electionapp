import React, { useState } from 'react';
import { db, ref, update } from '../Firebase/config';
import { FaWhatsapp } from 'react-icons/fa';
import { Phone, Share } from 'lucide-react';

const ContactManagement = ({ voter, candidateInfo, onUpdate }) => {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [tempWhatsApp, setTempWhatsApp] = useState('');

  const generateWhatsAppMessage = () => {
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
  };

  const handleWhatsAppShare = async () => {
    const whatsappNumber = voter.whatsapp || voter.whatsappNumber;
    
    if (!whatsappNumber) {
      setShowWhatsAppModal(true);
      return;
    }

    try {
      const message = generateWhatsAppMessage();
      const imageUrl = `${window.location.origin}/frontpageimage.jpeg`;
      
      // Try Web Share API first
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${candidateInfo.party} - ${voter.name}`,
            text: message,
            url: imageUrl
          });
          return;
        } catch (err) {
          console.warn('Web Share API failed, falling back to WhatsApp URL');
        }
      }
      
      // Fallback to WhatsApp URL
      const formattedNumber = whatsappNumber.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message + '\n\n' + imageUrl)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const confirmWhatsAppNumber = async () => {
    if (tempWhatsApp && tempWhatsApp.length >= 10) {
      try {
        const voterRef = ref(db, `voters/${voter.id}`);
        await update(voterRef, { whatsapp: tempWhatsApp });
        setShowWhatsAppModal(false);
        onUpdate?.();
        // Automatically send message after saving
        setTimeout(() => handleWhatsAppShare(), 500);
      } catch (error) {
        console.error('Error saving WhatsApp number:', error);
        alert('Failed to save WhatsApp number.');
      }
    } else {
      alert('Please enter a valid WhatsApp number (at least 10 digits)');
    }
  };

  const makeCall = () => {
    const phoneNumber = voter.phone || voter.whatsapp;
    if (phoneNumber) {
      window.open(`tel:+${phoneNumber}`, '_blank');
    } else {
      alert('No phone number available for this voter.');
    }
  };

  const shareViaSMS = () => {
    const message = generateWhatsAppMessage();
    const phoneNumber = voter.phone || voter.whatsapp;
    if (phoneNumber) {
      window.open(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`, '_blank');
    } else {
      alert('No phone number available for SMS.');
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ActionBtn
          icon={FaWhatsapp}
          label="WhatsApp"
          onClick={handleWhatsAppShare}
          color="bg-green-500 hover:bg-green-600"
        />
        <ActionBtn
          icon={Phone}
          label="Call"
          onClick={makeCall}
          color="bg-blue-500 hover:bg-blue-600"
        />
        <ActionBtn
          icon={Share}
          label="SMS"
          onClick={shareViaSMS}
          color="bg-purple-500 hover:bg-purple-600"
        />
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enter WhatsApp Number</h3>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">+91</span>
              <input
                type="tel"
                value={tempWhatsApp}
                onChange={(e) => setTempWhatsApp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Enter 10-digit WhatsApp number without country code</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmWhatsAppNumber}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Save & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, color, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white py-4 px-3 rounded-xl font-medium transition-all duration-200 flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md`}
  >
    <Icon className="text-lg" />
    <span>{label}</span>
  </button>
);

export default ContactManagement;