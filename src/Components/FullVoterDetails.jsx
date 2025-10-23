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
  FiDownload,
  FiMessageCircle,
  FiBluetooth,
} from 'react-icons/fi';
import { FaWhatsapp, FaRegFilePdf } from 'react-icons/fa';
import { GiVote } from 'react-icons/gi';

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();
  
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [editMode, setEditMode] = useState(false);
  
  // Contact and family states
  const [contactNumbers, setContactNumbers] = useState({ whatsapp: '', phone: '' });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [tempWhatsApp, setTempWhatsApp] = useState('');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [allVoters, setAllVoters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Survey data
  const [surveyData, setSurveyData] = useState({
    address: '', mobile: '', familyIncome: '', education: '', occupation: '',
    caste: '', religion: '', politicalAffiliation: '', issues: '', remarks: ''
  });

  // Printer states
  const [printing, setPrinting] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Candidate branding
  const candidateInfo = {
    name: "RAJESH KUMAR",
    party: "BHARATIYA JANTA PARTY",
    electionSymbol: "LOTUS",
    slogan: "सबका साथ, सबका विकास, सबका विश्वास",
    contact: "+91-XXXXXXXXXX",
    area: "Your Constituency Area"
  };

  useEffect(() => {
    loadVoterDetails();
    loadAllVoters();
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

        // Load survey data
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
          id, ...data
        }));
        setAllVoters(votersData);
      }
    } catch (error) {
      console.error('Error loading all voters:', error);
    }
  };

  // Contact management
  const saveContactNumbers = async () => {
    try {
      const voterRef = ref(db, `voters/${voterId}`);
      await update(voterRef, {
        whatsappNumber: contactNumbers.whatsapp,
        phoneNumber: contactNumbers.phone,
      });
      setVoter({ ...voter, ...contactNumbers });
      setEditMode(false);
      alert('Contact numbers saved successfully!');
    } catch (error) {
      console.error('Error saving contact numbers:', error);
      alert('Failed to save contact numbers.');
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

  // Family management
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

  // Survey management
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
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  // Enhanced Bluetooth Printing Functions from second code
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      alert('Bluetooth is not supported in this browser. Please use Chrome or Edge on Android.');
      return null;
    }

    try {
      setPrinting(true);
      
      console.log('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'RPD588' },
          { name: 'RPD-588' },
          { name: 'RP-588' },
          { name: 'BT-588' },
          { namePrefix: 'RPD' },
          { namePrefix: 'RP' },
          { namePrefix: 'BT' }
        ],
        optionalServices: [
          'generic_access',
          'device_information',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      });

      console.log('Connecting to GATT server...');
      const server = await device.gatt.connect();
      
      console.log('Getting primary services...');
      const services = await server.getPrimaryServices();

      let printerService = null;
      for (let service of services) {
        if (service.uuid.includes('ff00') || service.uuid.includes('ffe0') || service.uuid.includes('18f0')) {
          printerService = service;
          break;
        }
      }

      if (!printerService) {
        printerService = services[0];
      }

      console.log('Using service:', printerService.uuid);
      
      const characteristics = await printerService.getCharacteristics();
      console.log('Available characteristics:', characteristics.map(c => c.uuid));

      let writeCharacteristic = characteristics.find(c => 
        c.properties.write || c.properties.writeWithoutResponse
      );

      if (!writeCharacteristic) {
        writeCharacteristic = characteristics[0];
      }

      console.log('Using characteristic:', writeCharacteristic.uuid);
      
      setPrinterDevice(device);
      setPrinterCharacteristic(writeCharacteristic);
      setBluetoothConnected(true);
      setPrinting(false);
      
      return { device, server, characteristic: writeCharacteristic };
      
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      setPrinting(false);
      setBluetoothConnected(false);
      
      if (error.name === 'NotFoundError') {
        alert('No Bluetooth printer found. Please make sure:\n\n1. Your printer is turned ON\n2. Bluetooth is enabled\n3. Printer is in pairing mode\n4. Printer is within range');
      } else if (error.name === 'SecurityError') {
        alert('Bluetooth permissions denied. Please allow Bluetooth access.');
      } else {
        alert(`Bluetooth connection failed: ${error.message}`);
      }
      return null;
    }
  };

  const generateESC_POSCommands = () => {
    const commands = [];
    
    // Initialize printer
    commands.push('\x1B\x40'); // Initialize
    
    // Candidate Branding Header
    commands.push('\x1B\x61\x01'); // Center alignment
    
    // Party Name - Double height
    commands.push('\x1D\x21\x11'); // Double height and width
    commands.push(`${candidateInfo.party}\n`);
    commands.push('\x1D\x21\x00'); // Normal text
    
    // Candidate Name - Bold
    commands.push('\x1B\x45\x01'); // Bold on
    commands.push(`${candidateInfo.name}\n`);
    commands.push('\x1B\x45\x00'); // Bold off
    
    // Election Symbol
    commands.push(`Symbol: ${candidateInfo.electionSymbol}\n`);
    commands.push(`${candidateInfo.slogan}\n`);
    commands.push('------------------------\n');
    
    // Reset to left alignment for voter details
    commands.push('\x1B\x61\x00'); // Left alignment
    
    // Voter Details Section Header
    commands.push('\x1B\x45\x01'); // Bold on
    commands.push('VOTER INFORMATION\n');
    commands.push('\x1B\x45\x00'); // Bold off
    commands.push('------------------------\n');
    
    // Voter details
    commands.push(`Name: ${voter?.name || 'N/A'}\n`);
    commands.push(`Voter ID: ${voter?.voterId || 'N/A'}\n`);
    commands.push(`Serial: ${voter?.serialNumber || 'N/A'}\n`);
    commands.push(`Booth: ${voter?.boothNumber || 'N/A'}\n`);
    commands.push(`Age: ${voter?.age || '-'} | Gender: ${voter?.gender || '-'}\n`);
    
    // Voted status
    if (voter?.hasVoted) {
      commands.push('------------------------\n');
      commands.push('\x1B\x45\x01'); // Bold on
      commands.push('VOTING COMPLETED\n');
      commands.push('\x1B\x45\x00'); // Bold off
    } else {
      commands.push('------------------------\n');
      commands.push('\x1B\x45\x01'); // Bold on
      commands.push('PENDING VOTING\n');
      commands.push('\x1B\x45\x00'); // Bold off
    }
    commands.push('------------------------\n');
    
    // Address information
    const address = voter?.pollingStationAddress;
    if (address) {
      commands.push('Address:\n');
      const shortAddress = address.length > 100 ? address.substring(0, 100) + '...' : address;
      const addressLines = shortAddress.match(/.{1,30}/g) || [shortAddress];
      addressLines.forEach(line => commands.push(`${line}\n`));
    }
    
    // Footer section
    commands.push('------------------------\n');
    commands.push('\x1B\x61\x01'); // Center alignment
    commands.push(`Contact: ${candidateInfo.contact}\n`);
    commands.push(`${candidateInfo.area}\n`);
    commands.push('------------------------\n');
    commands.push(`Date: ${new Date().toLocaleDateString('en-IN')}\n`);
    commands.push(`Time: ${new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}\n`);
    commands.push('Thank you!\n');
    commands.push('Jai Hind!\n');
    
    // Feed paper and cut
    commands.push('\n\n'); // Feed paper
    commands.push('\x1D\x56\x00'); // Cut paper
    
    return commands.join('');
  };

  const splitDataIntoChunks = (data, chunkSize = 500) => {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const chunks = [];
    
    for (let i = 0; i < dataBytes.length; i += chunkSize) {
      const chunk = dataBytes.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  };

  const printViaBluetooth = async () => {
    if (!voter) {
      alert('No voter data available');
      return;
    }

    try {
      setPrinting(true);
      
      let connection;
      
      if (printerDevice && printerCharacteristic && bluetoothConnected) {
        console.log('Using existing Bluetooth connection');
        connection = {
          device: printerDevice,
          characteristic: printerCharacteristic
        };
      } else {
        console.log('Establishing new Bluetooth connection');
        connection = await connectBluetooth();
        if (!connection) {
          setPrinting(false);
          return;
        }
      }

      const { characteristic } = connection;
      const receiptText = generateESC_POSCommands();
      console.log('Receipt text length:', receiptText.length);
      
      const chunks = splitDataIntoChunks(receiptText, 500);
      console.log(`Splitting data into ${chunks.length} chunks`);
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Sending chunk ${i + 1}/${chunks.length}`);
        
        if (characteristic.properties.write) {
          await characteristic.writeValue(chunks[i]);
        } else if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(chunks[i]);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log('All chunks sent successfully');
      alert('Receipt printed successfully! 🎉');

    } catch (error) {
      console.error('Printing failed:', error);
      
      setBluetoothConnected(false);
      setPrinterDevice(null);
      setPrinterCharacteristic(null);
      
      if (error.message.includes('GATT Server') || error.message.includes('disconnected')) {
        alert('Printer connection lost. Please reconnect and try again.');
      } else {
        alert(`Printing failed: ${error.message}\n\nPlease check printer status.`);
      }
    } finally {
      setPrinting(false);
    }
  };

  const disconnectBluetooth = async () => {
    if (printerDevice && printerDevice.gatt.connected) {
      try {
        await printerDevice.gatt.disconnect();
        console.log('Bluetooth disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    setBluetoothConnected(false);
    setPrinterDevice(null);
    setPrinterCharacteristic(null);
    alert('Bluetooth printer disconnected');
  };

  // Share and Download functions
  const generateWhatsAppMessage = () => `Voter: ${voter?.name || ''}
Voter ID: ${voter?.voterId || ''}
Booth: ${voter?.boothNumber || ''}
Address: ${voter?.pollingStationAddress || ''}`;

  const shareOnWhatsApp = async () => {
    const message = generateWhatsAppMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(generateWhatsAppMessage())}`, '_blank');
  };

  const downloadAsImage = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('voter-receipt');
      const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#fff', useCORS: true });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `voter-${voter?.voterId || 'receipt'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Error downloading image');
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsPDF = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('voter-receipt');
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`voter-${voter?.voterId || 'receipt'}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF');
    } finally {
      setDownloading(false);
    }
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
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium p-2"
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
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
        {/* Main Content */}
        <div id="voter-receipt" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Candidate Branding Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 text-center">
            <div className="text-sm font-semibold opacity-90">{candidateInfo.party}</div>
            <div className="text-lg font-bold mt-1">{candidateInfo.name}</div>
            <div className="text-xs opacity-80 mt-1">Symbol: {candidateInfo.electionSymbol}</div>
            <div className="text-xs opacity-80 mt-1">{candidateInfo.slogan}</div>
          </div>

          <div className="p-6">
            {/* Voter Header Info */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{voter.name}</h1>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <FiHash className="text-orange-500" />
                  {voter.voterId}
                </div>
                <div>Serial: {voter.serialNumber}</div>
                <div>Booth: {voter.boothNumber}</div>
              </div>

              {/* Voting Status */}
              <div className="flex items-center justify-center gap-4 mb-4">
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    <TranslatedText>{voter.hasVoted ? 'Voted ✓' : 'Mark as Voted'}</TranslatedText>
                  </span>
                </label>

                <select
                  value={voter.supportStatus || 'unknown'}
                  onChange={(e) => {
                    const voterRef = ref(db, `voters/${voterId}`);
                    update(voterRef, { supportStatus: e.target.value });
                    setVoter(prev => ({ ...prev, supportStatus: e.target.value }));
                  }}
                  className={`text-sm font-medium rounded-lg px-3 py-1 ${voter.supportStatus === 'supporter'
                    ? 'bg-green-500 text-white'
                    : voter.supportStatus === 'medium'
                      ? 'bg-yellow-500 text-white'
                      : voter.supportStatus === 'not-supporter'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  <option value="unknown"><TranslatedText>Support Level</TranslatedText></option>
                  <option value="supporter"><TranslatedText>Strong</TranslatedText></option>
                  <option value="medium"><TranslatedText>Medium</TranslatedText></option>
                  <option value="not-supporter"><TranslatedText>Not</TranslatedText></option>
                </select>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1">Age</div>
                    <div className="font-semibold">{voter.age || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-medium mb-1">Gender</div>
                    <div className="font-semibold">{voter.gender || 'N/A'}</div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FaWhatsapp className="text-green-500" />
                        <span className="text-sm text-gray-600">WhatsApp</span>
                      </div>
                      {editMode ? (
                        <input
                          type="tel"
                          value={contactNumbers.whatsapp}
                          onChange={(e) => setContactNumbers({ ...contactNumbers, whatsapp: e.target.value })}
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                          placeholder="Enter number"
                        />
                      ) : (
                        <span className="text-sm font-medium">{contactNumbers.whatsapp || 'Not set'}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiPhone className="text-blue-500" />
                        <span className="text-sm text-gray-600">Phone</span>
                      </div>
                      {editMode ? (
                        <input
                          type="tel"
                          value={contactNumbers.phone}
                          onChange={(e) => setContactNumbers({ ...contactNumbers, phone: e.target.value })}
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                          placeholder="Enter number"
                        />
                      ) : (
                        <span className="text-sm font-medium">{contactNumbers.phone || 'Not set'}</span>
                      )}
                    </div>
                  </div>

                  {editMode ? (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={saveContactNumbers}
                        className="flex-1 bg-green-500 text-white py-2 rounded text-sm font-medium hover:bg-green-600"
                      >
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
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-300"
                      >
                        <TranslatedText>Cancel</TranslatedText>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full mt-3 bg-orange-500 text-white py-2 rounded text-sm font-medium hover:bg-orange-600"
                    >
                      <TranslatedText>Edit Contact Information</TranslatedText>
                    </button>
                  )}
                </div>

                {/* Address */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Polling Station Address</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{voter.pollingStationAddress}</p>
                </div>
              </div>
            )}

            {activeTab === 'family' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Family Members</h3>
                  <button
                    onClick={() => setShowFamilyModal(true)}
                    className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-orange-600"
                  >
                    <FiPlus className="text-sm" />
                    <TranslatedText>Add</TranslatedText>
                  </button>
                </div>

                <div className="space-y-2">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-gray-500">ID: {member.voterId} • Age: {member.age || 'N/A'}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/voter/${member.id}`)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
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
                  ))}
                </div>

                {familyMembers.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <FiUsers className="text-3xl text-gray-300 mx-auto mb-2" />
                    <p className="text-sm"><TranslatedText>No family members added yet.</TranslatedText></p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'survey' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Family Survey</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Complete Address</label>
                    <textarea
                      value={surveyData.address}
                      onChange={(e) => handleSurveyChange('address', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={surveyData.mobile}
                        onChange={(e) => handleSurveyChange('mobile', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Family Income</label>
                      <select
                        value={surveyData.familyIncome}
                        onChange={(e) => handleSurveyChange('familyIncome', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
                      >
                        <option value="">Select Income</option>
                        <option value="below-3L">Below 3 Lakhs</option>
                        <option value="3L-5L">3-5 Lakhs</option>
                        <option value="5L-10L">5-10 Lakhs</option>
                        <option value="above-10L">Above 10 Lakhs</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Education</label>
                      <input
                        type="text"
                        value={surveyData.education}
                        onChange={(e) => handleSurveyChange('education', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Occupation</label>
                      <input
                        type="text"
                        value={surveyData.occupation}
                        onChange={(e) => handleSurveyChange('occupation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Key Issues & Concerns</label>
                    <textarea
                      value={surveyData.issues}
                      onChange={(e) => handleSurveyChange('issues', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveSurveyData}
                    className="flex-1 bg-orange-500 text-white py-2 rounded text-sm font-medium hover:bg-orange-600"
                  >
                    <TranslatedText>Save Survey</TranslatedText>
                  </button>
                  <button
                    onClick={() => setSurveyData({
                      address: '', mobile: '', familyIncome: '', education: '', occupation: '',
                      caste: '', religion: '', politicalAffiliation: '', issues: '', remarks: ''
                    })}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-300"
                  >
                    <TranslatedText>Clear</TranslatedText>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
          
          {/* Primary Action Row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
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
              onClick={printViaBluetooth}
              color="bg-indigo-600 hover:bg-indigo-700"
              disabled={printing}
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

          {/* Secondary Action Row */}
          <div className="grid grid-cols-3 gap-2">
            <ActionBtn
              icon={FiMessageCircle}
              label="SMS"
              onClick={shareViaSMS}
              color="bg-blue-400 hover:bg-blue-500"
            />
            <ActionBtn
              icon={FiDownload}
              label="Image"
              onClick={downloadAsImage}
              color="bg-purple-500 hover:bg-purple-600"
              disabled={downloading}
            />
            <ActionBtn
              icon={FaRegFilePdf}
              label="PDF"
              onClick={downloadAsPDF}
              color="bg-red-500 hover:bg-red-600"
              disabled={downloading}
            />
          </div>

          {/* Bluetooth Status */}
          <div className="mt-3 text-xs text-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiBluetooth className={bluetoothConnected ? "text-green-500" : "text-gray-400"} />
              <span>Printer: {bluetoothConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {bluetoothConnected && (
              <button 
                onClick={disconnectBluetooth}
                className="text-red-600 text-xs hover:text-red-700"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">Example: 919876543210 (with country code)</p>
        </Modal>
      )}

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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
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
                      className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
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
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                <TranslatedText>Close</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, color, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white py-3 px-2 rounded-lg font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-sm hover:shadow`}
  >
    <Icon className="text-base" />
    <span>{label}</span>
  </button>
);

const Modal = ({ title, children, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
        >
          <TranslatedText>Cancel</TranslatedText>
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
        >
          <TranslatedText>Confirm</TranslatedText>
        </button>
      </div>
    </div>
  </div>
);

export default FullVoterDetails;