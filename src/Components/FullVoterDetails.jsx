import React, { useState, useEffect } from 'react';
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

  // --- NEW Bluetooth / Printer state ---
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState([]); // {id, name, device}
  const [connectedPrinter, setConnectedPrinter] = useState(null);   // {device, server, writeChar}
  const [scanningPrinter, setScanningPrinter] = useState(false);
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  // NUS service / characteristic often used for BLE UART-like printers
  const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const NUS_TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write

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

  // ----- REPLACED printVoterDetails with Bluetooth-aware printing flow -----
  const buildPrintableText = () => {
    // Create a plaintext ESC/POS friendly representation for portable printers like RPD-588
    const lines = [];
    lines.push('*** VOTER DETAILS ***');
    lines.push('');
    lines.push(`Name : ${voter.name || 'N/A'}`);
    lines.push(`Voter ID : ${voter.voterId || 'N/A'}`);
    lines.push(`Serial No : ${voter.serialNumber || 'N/A'}`);
    lines.push(`Booth : ${voter.boothNumber || 'N/A'}`);
    lines.push(`Age : ${voter.age || 'N/A'}`);
    lines.push(`Gender : ${voter.gender || 'N/A'}`);
    lines.push('');
    lines.push('Address:');
    const addr = (voter.pollingStationAddress || 'N/A').toString().replace(/\n/g, ' ');
    lines.push(addr);
    lines.push('');
    lines.push('-----------------------------');
    lines.push(`Printed: ${new Date().toLocaleString()}`);
    lines.push('\n\n'); // feed
    return lines.join('\n');
  };

  // If browser supports Web Bluetooth - try to list already-authorized devices
  const refreshKnownPrinters = async () => {
    if (!navigator.bluetooth) return;
    try {
      // getDevices() returns devices that the origin has access to (Chrome)
      if (navigator.bluetooth.getDevices) {
        const devices = await navigator.bluetooth.getDevices();
        const printers = devices
          .filter(d => d.name && /rpd|rpd-588|printer|pos/i.test(d.name))
          .map(d => ({ id: d.id, name: d.name, device: d }));
        setAvailablePrinters(printers);
      }
    } catch (err) {
      console.warn('refreshKnownPrinters error', err);
    }
  };

  // Trigger browser chooser to scan/select a printer. Browser chooser is required user gesture.
  const scanForPrinters = async () => {
    if (!navigator.bluetooth) {
      alert('Bluetooth not available in this browser. Falling back to normal print.');
      return;
    }

    setScanningPrinter(true);
    try {
      // Prefer to show devices that look like our mobile portable printers
      const filters = [
        { namePrefix: 'RPD' }, // RPD-588 etc
        // fallback generic filter removed because many printers do not expose GATT services
      ];

      // Use acceptAllDevices to not block devices; we will filter by name after selection
      const device = await navigator.bluetooth.requestDevice({
        // accept all so chooser lists dedicated BT devices; optionalServices might help for BLE printers that support NUS or custom services
        acceptAllDevices: true,
        optionalServices: [NUS_SERVICE_UUID]
      });

      if (device) {
        // add to list, allow connect
        setAvailablePrinters(prev => {
          const exists = prev.some(p => p.id === device.id);
          if (exists) return prev;
          return [{ id: device.id, name: device.name || 'Unknown Device', device }, ...prev];
        });
      }
    } catch (err) {
      console.warn('scanForPrinters cancelled or failed', err);
    } finally {
      setScanningPrinter(false);
    }
  };

  const connectToPrinter = async (printerEntry) => {
    // printerEntry: {id, name, device}
    if (!printerEntry || !printerEntry.device) {
      alert('No printer selected.');
      return;
    }
    setConnectingPrinter(true);
    try {
      const device = printerEntry.device;
      if (!device.gatt) {
        // device may not be a BLE device supporting GATT
        alert('Selected device does not support BLE GATT. Many portable printers use Bluetooth Classic and are not reachable from browser. If your printer supports BLE, ensure it is in BLE mode.');
        setConnectingPrinter(false);
        return;
      }

      const server = await device.gatt.connect();
      // Try NUS service (common UART over BLE)
      let service;
      try {
        service = await server.getPrimaryService(NUS_SERVICE_UUID);
      } catch (e) {
        // Service not present - printer might use different services. We'll still keep connection and attempt write using first writable char.
        service = null;
      }

      let writeChar = null;
      if (service) {
        try {
          writeChar = await service.getCharacteristic(NUS_TX_CHAR_UUID);
        } catch (e) {
          writeChar = null;
        }
      }

      // If we didn't find NUS write char, try to find any writable characteristic
      if (!writeChar && service) {
        try {
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            const props = c.properties;
            if (props && props.write) {
              writeChar = c;
              break;
            }
          }
        } catch (e) { /* ignore */ }
      }

      // Save connection details
      setConnectedPrinter({
        device,
        server,
        writeChar
      });

      alert(`Connected to printer: ${printerEntry.name || printerEntry.id}`);
      setShowPrinterModal(false);
    } catch (err) {
      console.error('connectToPrinter error', err);
      alert('Failed to connect to printer. See console for details.');
    } finally {
      setConnectingPrinter(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      if (connectedPrinter?.device && connectedPrinter.device.gatt?.connected) {
        connectedPrinter.device.gatt.disconnect();
      }
    } catch (e) { /* ignore */ }
    setConnectedPrinter(null);
  };

  // Try print via connected BLE printer (NUS / writable char). If not possible, fallback to window print.
  const printVoterDetails = async () => {
    try {
      // If already connected to a BLE printer and has a writable characteristic -> send data
      if (connectedPrinter && connectedPrinter.device && connectedPrinter.server) {
        const printer = connectedPrinter;
        if (printer.writeChar) {
          const text = buildPrintableText();
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          // write in chunks (some characteristics have MTU limits)
          const CHUNK = 128;
          for (let i = 0; i < data.length; i += CHUNK) {
            const slice = data.slice(i, i + CHUNK);
            await printer.writeChar.writeValue(slice);
            // small delay to avoid overwhelming device
            await new Promise(r => setTimeout(r, 50));
          }
          alert('Printed to connected Bluetooth printer.');
          return;
        } else {
          alert('Connected to printer but no writable characteristic found. Falling back to regular print.');
        }
      }

      // If not connected: show modal to scan/select or let user choose fallback print
      setShowPrinterModal(true);
    } catch (err) {
      console.error('Error printing to Bluetooth printer:', err);
      alert('Bluetooth print failed. Falling back to normal print.');
      // fallback to native print window
      openPrintWindow();
    }
  };

  // Fallback: open print window (keeps original behavior)
  const openPrintWindow = async () => {
    try {
      const element = document.getElementById('voter-details-card');
      if (!element || !voter) return;

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
      console.error('Error printing voter details:', err);
      alert('Failed to print. Please try again.');
    }
  };

  // When user selects "Scan/Connect" modal actions
  const handlePrinterConnectAndPrint = async (printerEntry) => {
    await connectToPrinter(printerEntry);
    // After connect, attempt to print
    if (connectedPrinter && connectedPrinter.writeChar) {
      // connectedPrinter state may not be updated immediately; small delay and then attempt
      setTimeout(async () => {
        if (connectedPrinter && connectedPrinter.writeChar) {
          try {
            const text = buildPrintableText();
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const CHUNK = 128;
            for (let i = 0; i < data.length; i += CHUNK) {
              const slice = data.slice(i, i + CHUNK);
              await connectedPrinter.writeChar.writeValue(slice);
              await new Promise(r => setTimeout(r, 50));
            }
            alert('Printed to connected Bluetooth printer.');
            setShowPrinterModal(false);
          } catch (e) {
            console.error('Print-after-connect failed', e);
            alert('Failed to print after connecting. Use normal print as fallback.');
            openPrintWindow();
          }
        } else {
          // fallback
          openPrintWindow();
        }
      }, 500);
    } else {
      // fallback
      openPrintWindow();
    }
  };

  // Call when user presses the Print action button (keeps same name used in UI)
  // Note: printVoterDetails above now acts as the entry point showing modal when needed.
  const printVoterDetailsHandler = () => {
    printVoterDetails();
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
              {/* <span><TranslatedText>Back</TranslatedText></span> */}
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

      {/* Printer Modal */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900"><TranslatedText>Bluetooth Printers</TranslatedText></h3>
                <p className="text-sm text-gray-500 mt-1"><TranslatedText>Select a Bluetooth printer (e.g. RPD-588) or scan for devices</TranslatedText></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { refreshKnownPrinters(); scanForPrinters(); }}
                  className="px-3 py-1 bg-orange-500 text-white rounded text-sm"
                >
                  <TranslatedText>Scan Printers</TranslatedText>
                </button>
                <button
                  onClick={() => { setShowPrinterModal(false); openPrintWindow(); }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  <TranslatedText>Use Normal Print</TranslatedText>
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {availablePrinters.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <TranslatedText>No Bluetooth printers found. Click "Scan Printers" to search.</TranslatedText>
                </div>
              )}

              <div className="space-y-3">
                {availablePrinters.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900">{p.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">ID: {p.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await connectToPrinter(p);
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                      >
                        <TranslatedText>Connect</TranslatedText>
                      </button>
                      <button
                        onClick={async () => {
                          // Try connect then print
                          await connectToPrinter(p);
                          // attempt print after connect
                          setTimeout(() => {
                            if (connectedPrinter && connectedPrinter.writeChar) {
                              // print directly
                              (async () => {
                                try {
                                  const text = buildPrintableText();
                                  const encoder = new TextEncoder();
                                  const data = encoder.encode(text);
                                  const CHUNK = 128;
                                  for (let i = 0; i < data.length; i += CHUNK) {
                                    const slice = data.slice(i, i + CHUNK);
                                    await connectedPrinter.writeChar.writeValue(slice);
                                    await new Promise(r => setTimeout(r, 50));
                                  }
                                  alert('Printed to connected Bluetooth printer.');
                                  setShowPrinterModal(false);
                                } catch (e) {
                                  console.error('Print-after-connect failed', e);
                                  alert('Printing failed after connect. Using normal print.');
                                  openPrintWindow();
                                }
                              })();
                            } else {
                              openPrintWindow();
                            }
                          }, 700);
                        }}
                        className="px-3 py-1 bg-orange-500 text-white rounded text-sm"
                      >
                        <TranslatedText>Connect & Print</TranslatedText>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => { setShowPrinterModal(false); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
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