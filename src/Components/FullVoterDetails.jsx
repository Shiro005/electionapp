// FullVoterDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, ref, get, update, set } from '../Firebase/config';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TranslatedText from './TranslatedText';
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiHash,
  FiCalendar,
  FiEdit2,
  FiSave,
  FiX,
  FiPlus,
  FiSearch,
  FiHome,
  FiUsers,
  FiClipboard,
  FiPhone,
  FiPrinter,
  FiShare2,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

/**
 * Major additions:
 * - Bluetooth printer discovery + connect (via Web Bluetooth API).
 * - Print text generation with language detection + language selector.
 * - If device already connected, print directly on subsequent clicks.
 * - Fallback to window.print() if Bluetooth unavailable or fails.
 *
 * Important:
 * - Many thermal printers use Bluetooth Classic (SPP) and won't work with Web Bluetooth.
 * - The code uses a commonly-used service/char UUID pair (FFE0/FFE1). Change if your printer needs different ones.
 */

const BLE_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb'; // common for many printers
const BLE_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [contactNumbers, setContactNumbers] = useState({
    whatsapp: '',
    phone: '',
  });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [tempWhatsApp, setTempWhatsApp] = useState('');
  const [sameBoothVoters, setSameBoothVoters] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allVoters, setAllVoters] = useState([]);
  const [surveyData, setSurveyData] = useState({
    address: '',
    mobile: '',
    familyIncome: '',
    education: '',
    occupation: '',
    caste: '',
    religion: '',
    politicalAffiliation: '',
    issues: '',
    remarks: ''
  });

  // Bluetooth / Printer states
  const [printerDevice, setPrinterDevice] = useState(null); // BluetoothDevice
  const [printerCharacteristic, setPrinterCharacteristic] = useState(null); // GATT Characteristic
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('disconnected'); // 'disconnected'|'connecting'|'connected'|'error'
  const [selectedPrintLang, setSelectedPrintLang] = useState('auto'); // 'auto'|'en'|'mr' etc.
  const gattServerRef = useRef(null);

  useEffect(() => {
    loadVoterDetails();
    loadAllVoters();
    // try reusing previously connected device if possible (not persisted across page reloads)
    // you could persist device.id and attempt navigator.bluetooth.getDevices() in browsers that support it.
  }, [voterId]);

  const loadVoterDetails = async () => {
    setLoading(true);
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      const snapshot = await get(voterRef);
      
      if (snapshot.exists()) {
        const voterData = { id: voterId, ...snapshot.val() };
        setVoter(voterData);
        setContactNumbers({
          whatsapp: voterData.whatsappNumber || '',
          phone: voterData.phoneNumber || '',
        });
        
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

        // Load same booth voters
        loadSameBoothVoters(voterData.boothNumber);
        
        // Load survey data if exists
        if (voterData.survey) {
          setSurveyData(voterData.survey);
        }
      }
    } catch (error) {
      console.error('Error loading voter details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllVoters = async () => {
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      if (snapshot.exists()) {
        const votersData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setAllVoters(votersData);
      }
    } catch (error) {
      console.error('Error loading all voters:', error);
    }
  };

  const loadSameBoothVoters = async (boothNumber) => {
    try {
      const votersRef = ref(db, 'voters');
      const snapshot = await get(votersRef);
      if (snapshot.exists()) {
        const votersData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        const sameBooth = votersData.filter(voter => 
          voter.boothNumber === boothNumber && voter.id !== voterId
        );
        setSameBoothVoters(sameBooth);
      }
    } catch (error) {
      console.error('Error loading same booth voters:', error);
    }
  };

  const saveContactNumbers = async () => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      await update(voterRef, {
        whatsappNumber: contactNumbers.whatsapp,
        phoneNumber: contactNumbers.phone,
      });
      setVoter({ ...voter, whatsappNumber: contactNumbers.whatsapp, phoneNumber: contactNumbers.phone });
      setEditMode(false);
      alert('Contact numbers saved successfully!');
    } catch (error) {
      console.error('Error saving contact numbers:', error);
      alert('Failed to save contact numbers. Please try again.');
    }
  };

  const handleWhatsAppShare = () => {
    if (!contactNumbers.whatsapp) {
      setShowWhatsAppModal(true);
      setTempWhatsApp('');
    } else {
      sendWhatsAppMessage(contactNumbers.whatsapp);
    }
  };

  const confirmWhatsAppNumber = async () => {
    if (tempWhatsApp && tempWhatsApp.length >= 10) {
      try {
        const voterRef = ref(db, `voters/${voterId}`);
        await update(voterRef, { whatsappNumber: tempWhatsApp });
        setContactNumbers({ ...contactNumbers, whatsapp: tempWhatsApp });
        setShowWhatsAppModal(false);
        sendWhatsAppMessage(tempWhatsApp);
      } catch (error) {
        console.error('Error saving WhatsApp number:', error);
        alert('Failed to save WhatsApp number.');
      }
    } else {
      alert('Please enter a valid WhatsApp number (at least 10 digits)');
    }
  };

  const sendWhatsAppMessage = (number) => {
    const message = `🗳️ *Voter Details*\n\n👤 *Name:* ${voter.name}\n🆔 *Voter ID:* ${voter.voterId}\n🏛️ *Booth:* ${voter.boothNumber}\n📍 *Address:* ${voter.pollingStationAddress}${voter.age ? `\n🎂 *Age:* ${voter.age}` : ''}${voter.gender ? `\n⚧️ *Gender:* ${voter.gender}` : ''}`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const makeCall = () => {
    if (contactNumbers.phone) {
      window.open(`tel:${contactNumbers.phone}`, '_blank');
    } else {
      alert('No phone number available for this voter.');
    }
  };

  // ---------- Printer / Bluetooth helper functions ----------

  const containsDevanagari = (s) => {
    if (!s || typeof s !== 'string') return false;
    // Devanagari Unicode range: \u0900-\u097F
    return /[\u0900-\u097F]/.test(s);
  };

  const detectLanguageAuto = (v) => {
    // Check key fields for Devanagari characters
    if (!v) return 'en';
    const fields = [
      v.name,
      v.pollingStationAddress,
      v.serialNumber,
      v.voterId
    ];
    for (const f of fields) {
      if (containsDevanagari(f)) return 'mr'; // Marathi/Devanagari
    }
    return 'en';
  };

  const generatePrintText = (lang = 'auto') => {
    if (!voter) return '';
    let chosenLang = lang;
    if (lang === 'auto') {
      chosenLang = detectLanguageAuto(voter);
    }

    // If voter has translations saved in DB, use them. Example expected structure:
    // voter.translations = { mr: { name: "नाव", pollingStationAddress: "पत्ता", ... }, en: {...} }
    const translations = voter.translations || {};
    const t = translations[chosenLang] || {};

    const getField = (key) => {
      // priority: translations -> raw value
      if (t[key]) return t[key];
      if (voter[key]) return voter[key];
      return 'N/A';
    };

    const lines = [];
    lines.push('***** VOTER DETAILS *****');
    lines.push('');
    lines.push(`Serial Number: ${getField('serialNumber')}`);
    lines.push(`Voter ID     : ${getField('voterId')}`);
    lines.push(`Full Name    : ${getField('name')}`);
    lines.push(`Age          : ${getField('age') || 'N/A'}`);
    lines.push(`Gender       : ${getField('gender') || 'N/A'}`);
    lines.push(`Booth Number : ${getField('boothNumber') || 'N/A'}`);
    lines.push('');
    const addr = getField('pollingStationAddress');
    lines.push('Polling Station Address:');
    // wrap address lines
    addr.toString().split('\n').forEach(line => lines.push(line));
    lines.push('');
    lines.push(`Printed on: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('*************************');

    return lines.join('\n');
  };

  const textToBytes = (text) => {
    // ESC/POS printers expect bytes. Use TextEncoder UTF-8.
    // For some printers you may want to encode in CP437 or other encodings - depends on printer.
    const encoder = new TextEncoder();
    return encoder.encode(text);
  };

  const writeToCharacteristic = async (characteristic, dataUint8Array) => {
    // Many BLE characteristics have MTU limits; chunk if required.
    const CHUNK_SIZE = 100; // conservative; can be increased depending on device
    for (let i = 0; i < dataUint8Array.length; i += CHUNK_SIZE) {
      const chunk = dataUint8Array.slice(i, i + CHUNK_SIZE);
      await characteristic.writeValue(chunk);
      // small delay to avoid buffer overflow on some devices
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const connectToBluetoothPrinter = async () => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth API not available in this browser. Use Chrome/Edge on desktop or a supported mobile browser. Falling back to normal print.');
      return null;
    }

    try {
      setPrinterStatus('connecting');

      // Request device. We use acceptAllDevices:true to let user pick the printer.
      // You may narrow down with filters for known names or services.
      const device = await navigator.bluetooth.requestDevice({
        // acceptAllDevices allows listing; if you know the name you can filter.
        acceptAllDevices: true,
        optionalServices: [BLE_SERVICE_UUID]
      });

      setPrinterDevice(device);

      device.addEventListener('gattserverdisconnected', () => {
        setPrinterStatus('disconnected');
        setPrinterCharacteristic(null);
        gattServerRef.current = null;
      });

      const server = await device.gatt.connect();
      gattServerRef.current = server;
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);

      setPrinterCharacteristic(characteristic);
      setPrinterStatus('connected');
      return { device, server, characteristic };
    } catch (err) {
      console.error('Bluetooth connect error:', err);
      setPrinterStatus('error');
      alert(`Failed to connect to Bluetooth printer: ${err.message || err}`);
      return null;
    }
  };

  const disconnectBluetoothPrinter = async () => {
    try {
      if (gattServerRef.current && gattServerRef.current.connected) {
        gattServerRef.current.disconnect();
      }
    } catch (err) {
      console.warn('Disconnect error', err);
    } finally {
      setPrinterDevice(null);
      setPrinterCharacteristic(null);
      setPrinterStatus('disconnected');
    }
  };

  const printViaBluetooth = async (rawText) => {
    if (!printerCharacteristic) {
      // attempt to connect
      const res = await connectToBluetoothPrinter();
      if (!res || !res.characteristic) {
        throw new Error('Printer connection failed.');
      }
    }

    if (!printerCharacteristic) throw new Error('Printer characteristic not available.');

    try {
      // some printers accept ESC/POS commands. Here we simply send the text + newlines.
      // If you want to add bold/center commands add ESC/POS bytes.
      const encoder = textToBytes(rawText + '\n\n\n'); // add some feed lines
      await writeToCharacteristic(printerCharacteristic, encoder);
      // Optionally send cut command - many thermal printers accept GS V for full cut:
      // const cutCmd = new Uint8Array([0x1d, 0x56, 0x41, 0x10]);
      // await writeToCharacteristic(printerCharacteristic, cutCmd);
      return true;
    } catch (err) {
      console.error('Error sending data to Bluetooth printer:', err);
      throw err;
    }
  };

  // ---------- Main Print handler (replaces existing printVoterDetails) ----------
  const printVoterDetails = async () => {
    try {
      if (!voter) {
        alert('No voter data to print.');
        return;
      }

      // If printer already connected and characteristic present, print directly
      if (printerCharacteristic && printerStatus === 'connected') {
        const lang = selectedPrintLang === 'auto' ? detectLanguageAuto(voter) : selectedPrintLang;
        const text = generatePrintText(lang);
        try {
          await printViaBluetooth(text);
          alert('Printed via Bluetooth printer.');
          return;
        } catch (err) {
          console.warn('Bluetooth print failed - falling back to HTML print.', err);
          // fallback to HTML print below
        }
      }

      // If here, no connected printer. Open modal for admin to choose printer & language.
      setPrinterModalOpen(true);
    } catch (err) {
      console.error('Error printing voter details:', err);
      alert('Failed to start print flow. See console for details.');
    }
  };

  // Called from modal: connect then print
  const onSelectPrinterAndPrint = async () => {
    try {
      setPrinterStatus('connecting');
      const connected = await connectToBluetoothPrinter();
      if (!connected || !connected.characteristic) {
        throw new Error('Could not connect to printer.');
      }
      setPrinterModalOpen(false);
      setPrinterStatus('connected');

      const lang = selectedPrintLang === 'auto' ? detectLanguageAuto(voter) : selectedPrintLang;
      const text = generatePrintText(lang);

      try {
        await printViaBluetooth(text);
        alert('Printed via Bluetooth printer.');
      } catch (err) {
        console.error('Bluetooth printing error:', err);
        alert('Connected to printer but failed to send data. Falling back to browser print.');
        htmlFallbackPrint();
      }
    } catch (err) {
      console.error('Printer selection/print error:', err);
      alert('Failed to connect and print: ' + (err.message || err));
      setPrinterStatus('error');
    }
  };

  const htmlFallbackPrint = () => {
    // keep your existing window.print() style fallback: create a printable DOM and call print
    try {
      const element = document.getElementById('voter-details-card');
      if (!element) return;

      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        alert('Popup blocked - please allow popups to print');
        return;
      }

      const styles = `
        <style>
          @media print {
            @page { margin: 0.5cm; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            padding: 20px; 
            color: #1f2937;
            line-height: 1.5;
          }
          .container { max-width: 800px; margin: 0 auto; }
          .header { 
            text-align: center; 
            margin-bottom: 24px; 
            padding-bottom: 16px;
            border-bottom: 2px solid #f97316;
          }
          .header h1 { 
            font-size: 24px; 
            font-weight: 700; 
            color: #1f2937;
            margin-bottom: 4px;
          }
          .header p { 
            font-size: 13px; 
            color: #6b7280;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 16px;
            margin-bottom: 16px;
          }
          .info-item { 
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 3px solid #f97316;
          }
          .info-label { 
            font-size: 11px; 
            font-weight: 600; 
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .info-value { 
            font-size: 14px; 
            font-weight: 500;
            color: #1f2937;
          }
          .footer { 
            margin-top: 24px; 
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px; 
            color: #9ca3af;
            text-align: center;
          }
        </style>
      `;

      const html = `
        <html>
          <head>
            <title>Voter Details - ${voter.name || voter.voterId}</title>
            ${styles}
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Voter Details</h1>
                <p>Official Voter Information Record</p>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Serial Number</div>
                  <div class="info-value">${voter.serialNumber || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Voter ID</div>
                  <div class="info-value">${voter.voterId || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Full Name</div>
                  <div class="info-value">${voter.name || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Age</div>
                  <div class="info-value">${voter.age || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Gender</div>
                  <div class="info-value">${voter.gender || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Booth Number</div>
                  <div class="info-value">${voter.boothNumber || 'N/A'}</div>
                </div>
              </div>
              <div class="info-item" style="grid-column: 1 / -1;">
                <div class="info-label">Polling Station Address</div>
                <div class="info-value">${(voter.pollingStationAddress || 'N/A').replace(/\n/g, ' ')}</div>
              </div>
              <div class="footer">
                Printed on ${new Date().toLocaleString()} | VoterData Pro
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    } catch (err) {
      console.error('Error printing voter details (fallback):', err);
      alert('Failed to print. Please try again.');
    }
  };

  const addFamilyMember = async (memberId) => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      const currentVoter = await get(voterRef);
      const currentData = currentVoter.val();
      
      const familyMembers = currentData.familyMembers || {};
      familyMembers[memberId] = true;
      
      await update(voterRef, { familyMembers });
      
      // Also update the member to include this voter as family
      const memberRef = ref(db, `voters/${memberId}`);
      const memberData = await get(memberRef);
      const memberFamily = memberData.val().familyMembers || {};
      memberFamily[voterId] = true;
      await update(memberRef, { familyMembers: memberFamily });
      
      loadVoterDetails();
      setShowFamilyModal(false);
      alert('Family member added successfully!');
    } catch (error) {
      console.error('Error adding family member:', error);
      alert('Failed to add family member.');
    }
  };

  const removeFamilyMember = async (memberId) => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      const currentVoter = await get(voterRef);
      const currentData = currentVoter.val();
      
      const familyMembers = currentData.familyMembers || {};
      delete familyMembers[memberId];
      
      await update(voterRef, { familyMembers });
      
      // Also remove from the other voter
      const memberRef = ref(db, `voters/${memberId}`);
      const memberData = await get(memberRef);
      const memberFamily = memberData.val().familyMembers || {};
      delete memberFamily[voterId];
      await update(memberRef, { familyMembers: memberFamily });
      
      loadVoterDetails();
      alert('Family member removed successfully!');
    } catch (error) {
      console.error('Error removing family member:', error);
      alert('Failed to remove family member.');
    }
  };

  const saveSurveyData = async () => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      await update(voterRef, { survey: surveyData });
      alert('Survey data saved successfully!');
    } catch (error) {
      console.error('Error saving survey data:', error);
      alert('Failed to save survey data.');
    }
  };

  const handleSurveyChange = (field, value) => {
    setSurveyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredVoters = allVoters.filter(voter => 
    voter.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    voter.id !== voterId &&
    !familyMembers.some(member => member.id === voter.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600"><TranslatedText>Loading voter details...</TranslatedText></p>
        </div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2"><TranslatedText>Voter Not Found</TranslatedText></h2>
          <p className="text-sm text-gray-600 mb-6"><TranslatedText>The requested voter details could not be found.</TranslatedText></p>
          <button
            onClick={() => navigate('/')}
            className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <TranslatedText>Back to Dashboard</TranslatedText>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium"
            >
              <FiArrowLeft className="text-lg" />
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="text-sm" />
                  <span><TranslatedText>{tab.label}</TranslatedText></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Main Content based on Active Tab */}
        {activeTab === 'details' && (
          <>
            {/* Main Card */}
            <div id="voter-details-card" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <FiUser className="text-white text-lg" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-white"><TranslatedText>Voter Details</TranslatedText></h1>
                      <p className="text-xs text-orange-100"><TranslatedText>Comprehensive Information</TranslatedText></p>
                    </div>
                  </div>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <FiEdit2 className="text-sm" />
                      <TranslatedText>Edit</TranslatedText>
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={saveContactNumbers}
                        className="flex items-center gap-1.5 bg-white text-orange-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-50 transition-colors"
                      >
                        <FiSave className="text-sm" />
                       <TranslatedText>Save</TranslatedText>
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setContactNumbers({
                            whatsapp: voter.whatsappNumber || '',
                            phone: voter.phoneNumber || '',
                          });
                        }}
                        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <FiX className="text-sm" />
                        <TranslatedText>Cancel</TranslatedText>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {/* Voter Status & Support Level */}
                <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voter.hasVoted || false}
                        onChange={(e) => {
                          const voterRef = ref(db, `voters/${voterId}`);
                          update(voterRef, { hasVoted: e.target.checked });
                          setVoter(prev => ({ ...prev, hasVoted: e.target.checked }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        <TranslatedText>{voter.hasVoted ? 'Voted' : 'Not Voted'}</TranslatedText>
                      </span>
                    </label>

                    <div className="border-l border-gray-300 pl-2">
                      <select
                        value={voter.supportStatus || 'unknown'}
                        onChange={(e) => {
                          const voterRef = ref(db, `voters/${voterId}`);
                          update(voterRef, { supportStatus: e.target.value });
                          setVoter(prev => ({ ...prev, supportStatus: e.target.value }));
                        }}
                        className={`text-sm font-medium rounded-lg px-3 py-2 ${
                          voter.supportStatus === 'supporter' 
                            ? 'bg-green-500 text-white'
                            : voter.supportStatus === 'medium'
                            ? 'bg-yellow-500 text-white'
                            : voter.supportStatus === 'not-supporter'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        <option value="unknown"><TranslatedText>Select</TranslatedText></option>
                        <option value="supporter" className="bg-white text-gray-700"><TranslatedText>Strong</TranslatedText></option>
                        <option value="medium" className="bg-white text-gray-700"><TranslatedText>Medium</TranslatedText></option>
                        <option value="not-supporter" className="bg-white text-gray-700"><TranslatedText>Not</TranslatedText></option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Serial Number" value={voter.serialNumber || 'N/A'} icon={FiHash} />
                  <InfoField label="Voter ID" value={voter.voterId} icon={FiUser} />
                  <InfoField label="Full Name" value={voter.name} icon={FiUser} />
                  <InfoField label="Age" value={voter.age || 'N/A'} icon={FiCalendar} />
                  <InfoField label="Gender" value={voter.gender || 'N/A'} icon={FiUser} />
                  <InfoField label="Booth Number" value={voter.boothNumber} icon={FiMapPin} />
                  
                  {/* Contact Numbers */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FaWhatsapp className="text-gray-500 text-sm" />
                      <span className="text-xs font-medium text-gray-600"><TranslatedText>WhatsApp Number</TranslatedText></span>
                    </div>
                    {editMode ? (
                      <input
                        type="tel"
                        value={contactNumbers.whatsapp}
                        onChange={(e) => setContactNumbers({ ...contactNumbers, whatsapp: e.target.value })}
                        placeholder="Enter WhatsApp number"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900"> <TranslatedText>{contactNumbers.whatsapp || 'Not provided'}</TranslatedText></p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FiPhone className="text-gray-500 text-sm" />
                      <span className="text-xs font-medium text-gray-600"><TranslatedText>Phone Number</TranslatedText></span>
                    </div>
                    {editMode ? (
                      <input
                        type="tel"
                        value={contactNumbers.phone}
                        onChange={(e) => setContactNumbers({ ...contactNumbers, phone: e.target.value })}
                        placeholder="Enter phone number"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900"> <TranslatedText>{contactNumbers.phone || 'Not provided'}</TranslatedText></p>
                    )}
                  </div>

                  {/* Address - Full Width */}
                  <div className="md:col-span-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FiMapPin className="text-gray-500 text-sm" />
                      <span className="text-xs font-medium text-gray-600"><TranslatedText>Polling Station Address</TranslatedText></span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-relaxed"><TranslatedText>{voter.pollingStationAddress}</TranslatedText></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4"><TranslatedText>Quick Actions</TranslatedText></h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ActionBtn
                  icon={FaWhatsapp}
                  label="WhatsApp"
                  onClick={handleWhatsAppShare}
                  color="bg-green-500 hover:bg-green-600"
                />
                <ActionBtn
                  icon={FiPhone}
                  label="Call"
                  onClick={makeCall}
                  color="bg-blue-500 hover:bg-blue-600"
                />
                <ActionBtn
                  icon={FiPrinter}
                  label="Print"
                  onClick={printVoterDetails}
                  color="bg-gray-700 hover:bg-gray-800"
                />
                <ActionBtn
                  icon={FiShare2}
                  label="Share"
                  onClick={() => navigator.share?.({
                    title: `Voter Details - ${voter.name}`,
                    text: `Voter Details: ${voter.name}, Voter ID: ${voter.voterId}, Booth: ${voter.boothNumber}`,
                    url: window.location.href
                  })}
                  color="bg-purple-500 hover:bg-purple-600"
                />
              </div>

              {/* Printer connection status row */}
              <div className="mt-4 text-xs text-gray-600 flex items-center gap-3">
                <div>
                  <TranslatedText>Printer Status:</TranslatedText>
                </div>
                <div className={`px-2 py-1 rounded ${printerStatus === 'connected' ? 'bg-green-100 text-green-700' : printerStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                  {printerStatus.charAt(0).toUpperCase() + printerStatus.slice(1)}
                </div>
                {printerDevice && <div className="text-sm text-gray-500">({printerDevice.name || printerDevice.id})</div>}
                {printerStatus === 'connected' && (
                  <button onClick={disconnectBluetoothPrinter} className="ml-auto text-red-600 text-xs">Disconnect Printer</button>
                )}
              </div>
            </div>

            {/* Same Booth Voters */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                <TranslatedText>Same Booth Voters</TranslatedText> 
                <span className="text-sm text-gray-500 ml-2">({sameBoothVoters.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sameBoothVoters.slice(0, 6).map((voter) => (
                  <div key={voter.id} className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">{voter.name}</h3>
                        <p className="text-xs text-gray-500">ID: {voter.voterId}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/voter/${voter.id}`)}
                        className="text-orange-600 hover:text-orange-700 text-xs font-medium"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {sameBoothVoters.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4"><TranslatedText>No other voters found in the same booth.</TranslatedText></p>
              )}
            </div>
          </>
        )}

        {activeTab === 'family' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900"><TranslatedText>Family Members</TranslatedText></h2>
              <button
                onClick={() => setShowFamilyModal(true)}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <FiPlus className="text-sm" />
                <TranslatedText>Add Family Member</TranslatedText>
              </button>
            </div>

            {/* Family Members List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {familyMembers.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                        <div><span className="font-medium">Voter ID:</span> {member.voterId}</div>
                        <div><span className="font-medium">Age:</span> {member.age || 'N/A'}</div>
                        <div><span className="font-medium">Gender:</span> {member.gender || 'N/A'}</div>
                        <div><span className="font-medium">Booth:</span> {member.boothNumber}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/voter/${member.id}`)}
                        className="text-orange-600 hover:text-orange-700 text-xs font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => removeFamilyMember(member.id)}
                        className="text-red-600 hover:text-red-700 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {familyMembers.length === 0 && (
              <div className="text-center py-8">
                <FiUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500"><TranslatedText>No family members added yet.</TranslatedText></p>
                <p className="text-sm text-gray-400 mt-1"><TranslatedText>Click "Add Family Member" to get started.</TranslatedText></p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'survey' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6"><TranslatedText>Family Survey Form</TranslatedText></h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Complete Address</TranslatedText>
                </label>
                <textarea
                  value={surveyData.address}
                  onChange={(e) => handleSurveyChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter complete residential address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Mobile Number</TranslatedText>
                </label>
                <input
                  type="tel"
                  value={surveyData.mobile}
                  onChange={(e) => handleSurveyChange('mobile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Family Income</TranslatedText>
                </label>
                <select
                  value={surveyData.familyIncome}
                  onChange={(e) => handleSurveyChange('familyIncome', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                >
                  <option value=""><TranslatedText>Select Income Range</TranslatedText></option>
                  <option value="below-3L"><TranslatedText>Below 3 Lakhs</TranslatedText></option>
                  <option value="3L-5L"><TranslatedText>3-5 Lakhs</TranslatedText></option>
                  <option value="5L-10L"><TranslatedText>5-10 Lakhs</TranslatedText></option>
                  <option value="above-10L"><TranslatedText>Above 10 Lakhs</TranslatedText></option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Education</TranslatedText>
                </label>
                <input
                  type="text"
                  value={surveyData.education}
                  onChange={(e) => handleSurveyChange('education', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Highest education"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Occupation</TranslatedText>
                </label>
                <input
                  type="text"
                  value={surveyData.occupation}
                  onChange={(e) => handleSurveyChange('occupation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Occupation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Caste</TranslatedText>
                </label>
                <input
                  type="text"
                  value={surveyData.caste}
                  onChange={(e) => handleSurveyChange('caste', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Caste"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Religion</TranslatedText>
                </label>
                <input
                  type="text"
                  value={surveyData.religion}
                  onChange={(e) => handleSurveyChange('religion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Religion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Political Affiliation</TranslatedText>
                </label>
                <input
                  type="text"
                  value={surveyData.politicalAffiliation}
                  onChange={(e) => handleSurveyChange('politicalAffiliation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Political party affiliation"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Key Issues & Concerns</TranslatedText>
                </label>
                <textarea
                  value={surveyData.issues}
                  onChange={(e) => handleSurveyChange('issues', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="What are the key issues and concerns for this family?"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText>Remarks</TranslatedText>
                </label>
                <textarea
                  value={surveyData.remarks}
                  onChange={(e) => handleSurveyChange('remarks', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Any additional remarks"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveSurveyData}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                <TranslatedText>Save Survey Data</TranslatedText>
              </button>
              <button
                onClick={() => setSurveyData({
                  address: '',
                  mobile: '',
                  familyIncome: '',
                  education: '',
                  occupation: '',
                  caste: '',
                  religion: '',
                  politicalAffiliation: '',
                  issues: '',
                  remarks: ''
                })}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <TranslatedText>Clear Form</TranslatedText>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <Modal
          title="Enter WhatsApp Number"
          onClose={() => setShowWhatsAppModal(false)}
          onConfirm={confirmWhatsAppNumber}
        >
          <input
            type="tel"
            value={tempWhatsApp}
            onChange={(e) => setTempWhatsApp(e.target.value)}
            placeholder="Enter WhatsApp number with country code"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2"><TranslatedText>Example: 919876543210 (with country code)</TranslatedText></p>
        </Modal>
      )}

      {/* Family Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                <TranslatedText>Add Family Member</TranslatedText>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                <TranslatedText>Search and select voters to add as family members</TranslatedText>
              </p>
            </div>
            
            <div className="p-6">
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search voters by name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredVoters.map((voter) => (
                  <div key={voter.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50">
                    <div>
                      <h4 className="font-medium text-gray-900">{voter.name}</h4>
                      <p className="text-sm text-gray-500">ID: {voter.voterId} | Booth: {voter.boothNumber}</p>
                    </div>
                    <button
                      onClick={() => addFamilyMember(voter.id)}
                      className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 transition-colors"
                    >
                      <FiPlus className="text-xs" />
                      <TranslatedText>Add</TranslatedText>
                    </button>
                  </div>
                ))}
                
                {filteredVoters.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <TranslatedText>No voters found matching your search.</TranslatedText>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowFamilyModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <TranslatedText>Close</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printer Modal */}
      {printerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3"><TranslatedText>Print — Select Printer & Language</TranslatedText></h3>
            <p className="text-sm text-gray-600 mb-4"><TranslatedText>Select your Bluetooth thermal printer. If you have already connected a printer earlier it will be used directly.</TranslatedText></p>

            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-1"><TranslatedText>Language</TranslatedText></label>
              <select
                value={selectedPrintLang}
                onChange={(e) => setSelectedPrintLang(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
              >
                <option value="auto"><TranslatedText>Auto-detect</TranslatedText></option>
                <option value="en">English</option>
                <option value="mr">Marathi</option>
              </select>
              <p className="text-xs text-gray-400 mt-1"><TranslatedText>Auto-detect will try to detect Devanagari characters in the data.</TranslatedText></p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onSelectPrinterAndPrint}
                className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                {printerStatus === 'connecting' ? 'Connecting...' : 'Select Printer & Print'}
              </button>
              <button
                onClick={() => {
                  setPrinterModalOpen(false);
                  // fallback to HTML print if admin cancels Bluetooth selection
                  htmlFallbackPrint();
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <TranslatedText>Cancel & Browser Print</TranslatedText>
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <div><TranslatedText>Detected language:</TranslatedText> {detectLanguageAuto(voter)}</div>
              <div><TranslatedText>Printer connection:</TranslatedText> {printerStatus}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoField = ({ label, value, icon: Icon }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="text-gray-500 text-sm" />
      <span className="text-xs font-medium text-gray-600">
        <TranslatedText>{label}</TranslatedText>
      </span>
    </div>
    <p className="text-sm font-medium text-gray-900">
      {typeof value === 'object' ? JSON.stringify(value) : 
       typeof value === 'string' ? <TranslatedText>{value}</TranslatedText> : value}
    </p>
  </div>
);

const ActionBtn = ({ icon: Icon, label, onClick, color, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white py-3 px-3 rounded-lg font-medium transition-all duration-200 flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow`}
  >
    <Icon className="text-lg" />
    <span className="text-xs">
      {typeof label === 'string' ? <TranslatedText>{label}</TranslatedText> : label}
    </span>
  </button>
);

const Modal = ({ title, children, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {typeof title === 'string' ? <TranslatedText>{title}</TranslatedText> : title}
      </h3>
      {children}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          <TranslatedText>Cancel</TranslatedText>
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          <TranslatedText>Confirm</TranslatedText>
        </button>
      </div>
    </div>
  </div>
);

export default FullVoterDetails;
