// WhatsAppServices.js
import { getImageBlob } from '../utils/ImageUtils';

/**
 * Handle WhatsApp share for single voter
 */
export const handleWhatsAppShare = async (
  voter, 
  whatsappNumber, 
  candidateInfo, 
  setShowWhatsAppModal,
  setTempWhatsApp,
  voterId,
  db,
  update,
  setContactNumbers,
  contactNumbers
) => {
  // Check if WhatsApp number exists
  if (!whatsappNumber) {
    return 'number_required';
  }

  try {
    // Get the banner image as blob
    const imageBlob = await getImageBlob('/bannerstarting.jpg');
    
    // Format the message for single voter
    const message = formatVoterMessage(voter, candidateInfo);
    
    // Share via WhatsApp
    await shareViaWhatsApp(whatsappNumber, message, imageBlob, voter.name);
    
    return 'success';
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error);
    alert('Failed to share via WhatsApp. Please try again.');
    return 'error';
  }
};

/**
 * Handle WhatsApp share for family voters
 */
export const handleFamilyWhatsAppShare = async (
  voter,
  familyMembers,
  whatsappNumber,
  candidateInfo,
  setShowWhatsAppModal,
  setTempWhatsApp,
  voterId,
  db,
  update,
  setContactNumbers,
  contactNumbers
) => {
  // Check if WhatsApp number exists
  if (!whatsappNumber) {
    return 'number_required';
  }

  // Check if family members exist
  if (!familyMembers || familyMembers.length === 0) {
    alert('No family members to share.');
    return 'no_family';
  }

  try {
    // Get the banner image as blob
    const imageBlob = await getImageBlob('/bannerstarting.jpg');
    
    // Format the message for family
    const message = formatFamilyMessage(voter, familyMembers, candidateInfo);
    
    // Share via WhatsApp
    await shareViaWhatsApp(whatsappNumber, message, imageBlob, `${voter.name} Family`);
    
    return 'success';
  } catch (error) {
    console.error('Error sharing family via WhatsApp:', error);
    alert('Failed to share family details via WhatsApp. Please try again.');
    return 'error';
  }
};

/**
 * Handle phone call
 */
export const handleCall = (phoneNumber) => {
  if (!phoneNumber) {
    alert('Phone number not available');
    return;
  }
  
  // Clean the phone number (remove spaces, dashes, etc.)
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Create tel: URL
  const telUrl = `tel:${cleanNumber}`;
  
  // Open dialer
  window.location.href = telUrl;
};

/**
 * Format single voter message
 */
const formatVoterMessage = (voter, candidateInfo) => {
  return `*${candidateInfo.name} - मतदार माहिती*

*मतदार तपशील:*
👤 *नाव:* ${voter.name || 'N/A'}
🆔 *मतदार आयडी:* ${voter.voterId || 'N/A'}
🔢 *अनुक्रमांक:* ${voter.serialNumber || 'N/A'}
🏛️ *बूथ क्रमांक:* ${voter.boothNumber || 'N/A'}
🎂 *वय:* ${voter.age || 'N/A'}
⚧ *लिंग:* ${voter.gender || 'N/A'}

*मतदान केंद्र:*
${voter.pollingStationAddress || 'N/A'}

*उमेदवार माहिती:*
🏛️ *पक्ष:* ${candidateInfo.party}
⭐ *उमेदवार:* ${candidateInfo.name}
🎯 *निशाणी:* ${candidateInfo.electionSymbol}
📢 *घोषणा:* ${candidateInfo.slogan}

*विनंती:* कृपया *${candidateInfo.electionSymbol}* या निशाणीवर मतदान करून आम्हाला विजयी करा!

*${candidateInfo.name}*
*संपर्क:* ${candidateInfo.contact}`;
};

/**
 * Format family voters message
 */
const formatFamilyMessage = (mainVoter, familyMembers, candidateInfo) => {
  let message = `*${candidateInfo.name} - कुटुंब मतदार माहिती*\n\n`;

  // Main voter
  message += `*मुख्य मतदार:*
👤 *नाव:* ${mainVoter.name || 'N/A'}
🆔 *मतदार आयडी:* ${mainVoter.voterId || 'N/A'}
🔢 *अनुक्रमांक:* ${mainVoter.serialNumber || 'N/A'}
🏛️ *बूथ क्रमांक:* ${mainVoter.boothNumber || 'N/A'}\n\n`;

  // Family members
  message += `*कुटुंब सदस्य (${familyMembers.length}):*\n`;
  familyMembers.forEach((member, index) => {
    message += `\n${index + 1}. *${member.name || 'N/A'}*
   🆔 मतदार आयडी: ${member.voterId || 'N/A'}
   🔢 अनुक्रमांक: ${member.serialNumber || 'N/A'}
   🏛️ बूथ क्रमांक: ${member.boothNumber || 'N/A'}
   🎂 वय: ${member.age || 'N/A'}
   ⚧ लिंग: ${member.gender || 'N/A'}\n`;
  });

  message += `\n*मतदान केंद्र:*
${mainVoter.pollingStationAddress || 'N/A'}

*उमेदवार माहिती:*
🏛️ *पक्ष:* ${candidateInfo.party}
⭐ *उमेदवार:* ${candidateInfo.name}
🎯 *निशाणी:* ${candidateInfo.electionSymbol}
📢 *घोषणा:* ${candidateInfo.slogan}

*विनंती:* कृपया *${candidateInfo.electionSymbol}* या निशाणीवर मतदान करून आम्हाला विजयी करा!

*${candidateInfo.name}*
*संपर्क:* ${candidateInfo.contact}`;

  return message;
};

/**
 * Share via WhatsApp with image
 */
const shareViaWhatsApp = async (phoneNumber, message, imageBlob, filename) => {
  // Clean phone number
  const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
  
  // Check if we're on mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // For mobile devices - use WhatsApp API with image
    await shareViaWhatsAppMobile(cleanNumber, message, imageBlob, filename);
  } else {
    // For desktop - fallback to text only
    await shareViaWhatsAppDesktop(cleanNumber, message);
  }
};

/**
 * Share via WhatsApp on mobile with image
 */
const shareViaWhatsAppMobile = async (phoneNumber, message, imageBlob, filename) => {
  try {
    // Create a file from blob
    const file = new File([imageBlob], `${filename}.jpg`, { type: 'image/jpeg' });
    
    // Check if Web Share API is available and supports files
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        text: message,
        title: 'Voter Details',
      });
    } else {
      // Fallback: Open WhatsApp with text only
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
  } catch (error) {
    console.error('Error sharing with Web Share API:', error);
    
    // Fallback to text-only WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }
};

/**
 * Share via WhatsApp on desktop (text only)
 */
const shareViaWhatsAppDesktop = async (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};