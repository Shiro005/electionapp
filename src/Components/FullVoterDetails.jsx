import React, { useState, useEffect, useRef, useMemo } from 'react';
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

// Global Bluetooth connection state
let globalBluetoothConnection = {
  device: null,
  characteristic: null,
  connected: false
};

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

  // --- NEW modal-specific states (for improved search / pagination) ---
  const [modalQuery, setModalQuery] = useState(''); // local controlled input
  const [modalPage, setModalPage] = useState(1);
  const pageSize = 1000; // per your request: 1000 voters per page
  const modalDebounceRef = useRef(null);

  // Survey data
  const [surveyData, setSurveyData] = useState({
    address: '', mobile: '', familyIncome: '', education: '', occupation: '',
    caste: '', religion: '', politicalAffiliation: '', issues: '', remarks: ''
  });

  // Printer states
  const [printing, setPrinting] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(globalBluetoothConnection.connected);
  const [printerDevice, setPrinterDevice] = useState(globalBluetoothConnection.device);
  const [printerCharacteristic, setPrinterCharacteristic] = useState(globalBluetoothConnection.characteristic);

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
    loadAllVoters();

    // Initialize from global connection state
    setBluetoothConnected(globalBluetoothConnection.connected);
    setPrinterDevice(globalBluetoothConnection.device);
    setPrinterCharacteristic(globalBluetoothConnection.characteristic);
  }, [voterId]);

  // Keep modalQuery in sync when modal opens or when searchTerm changes externally
  useEffect(() => {
    if (showFamilyModal) {
      setModalQuery(searchTerm || '');
      setModalPage(1);
    }
  }, [showFamilyModal]);

  // Debounce modalQuery -> setSearchTerm (acts like search input in Dashboard)
  useEffect(() => {
    if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
    modalDebounceRef.current = setTimeout(() => {
      setSearchTerm(modalQuery);
      setModalPage(1); // reset page on search
    }, 250); // 250ms debounce
    return () => {
      if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
    };
  }, [modalQuery]);

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

  const sendWhatsAppMessage = async (number) => {
    // build text message (uses existing generator which handles family vs single)
    const message = generateWhatsAppMessage();

    // candidate public image candidates (edit / add your filename in public folder if needed)
    const imageCandidates = [
      '/frontpageimage.jpeg'
    ];

    // find first existing image url
    let imageUrl = null;
    for (const p of imageCandidates) {
      try {
        const res = await fetch(p, { method: 'HEAD' });
        if (res.ok) {
          imageUrl = `${window.location.origin}${p}`;
          break;
        }
      } catch (e) {
        // ignore and try next
      }
    }

    // Try Web Share API with file (mobile browsers support sharing image+text to WhatsApp)
    try {
      if (imageUrl && navigator.canShare) {
        // fetch image blob
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          const fileExt = (blob.type || 'image/jpeg').split('/').pop().split('+')[0];
          const file = new File([blob], `share.${fileExt}`, { type: blob.type });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              text: message
            });
            return;
          }
        }
      }
    } catch (err) {
      // ignore and fallback to wa.me
      console.warn('Web Share API share failed, falling back to wa.me', err);
    }

    // Fallback: open wa.me with text and include image URL as link (WhatsApp will show preview on mobile/web if allowed)
    try {
      // include image link in message if available
      const finalText = imageUrl ? `${message}\n\n${imageUrl}` : message;
      const base = number ? `https://wa.me/${number}` : 'https://wa.me/';
      const url = `${base}?text=${encodeURIComponent(finalText)}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open WhatsApp link', err);
      alert('Unable to open WhatsApp. Please copy the message manually.');
    }
  };

  const makeCall = () => {
    if (contactNumbers.whatsappNumber) {
      window.open(`tel:${contactNumbers.whatsappNumber}`, '_blank');
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

      const familyMembersObj = currentData.familyMembers || {};
      familyMembersObj[memberId] = true;

      await update(voterRef, { familyMembers: familyMembersObj });

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

      const familyMembersObj = currentData.familyMembers || {};
      delete familyMembersObj[memberId];

      await update(voterRef, { familyMembers: familyMembersObj });

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

  // Enhanced WhatsApp message generation in Marathi
  const generateWhatsAppMessage = (isFamily = false, voter = {}, familyMembers = [], candidateInfo = {}) => {
  // Default values to prevent errors
  const safeVoter = {
    name: 'N/A',
    voterId: 'N/A',
    boothNumber: 'N/A',
    serialNumber: 'N/A',
    pollingStationAddress: 'N/A',
    ...voter
  };

  const safeFamilyMembers = Array.isArray(familyMembers) ? familyMembers : [];
  const safeCandidateInfo = {
    slogan: '',
    ...candidateInfo
  };

  if (isFamily && safeFamilyMembers.length > 0) {
    let familyMessage = `🏠 *कुटुंब तपशील* 🏠\n\n`;
    familyMessage += `*मुख्य मतदार:* ${safeVoter.name}\n`;
    familyMessage += `*मतदार आयडी:* ${safeVoter.voterId}\n`;
    familyMessage += `*बूथ क्रमांक:* ${safeVoter.boothNumber}\n\n`;
    familyMessage += `*कुटुंब सदस्य:*\n`;

    safeFamilyMembers.forEach((member, index) => {
      const safeMember = {
        name: 'N/A',
        voterId: 'N/A',
        age: 'N/A',
        gender: 'N/A',
        ...member
      };
      
      familyMessage += `${index + 1}. ${safeMember.name}\n`;
      familyMessage += `   🆔: ${safeMember.voterId}\n`;
      familyMessage += `   वय: ${safeMember.age}\n`;
      familyMessage += `   लिंग: ${safeMember.gender}\n\n`;
    });

    familyMessage += `📍 *पत्ता:* ${safeVoter.pollingStationAddress}\n\n`;
    familyMessage += `_${safeCandidateInfo.slogan}_`;

    return familyMessage;
  } else {
    return `🗳️ *मतदार तपशील* 🗳️\n\n👤 *नाव:* ${safeVoter.name}\n🆔 *मतदार आयडी:* ${safeVoter.voterId}\n🔢 *अनुक्रमांक:* ${safeVoter.serialNumber}\n🏛️ *बूथ क्रमांक:* ${safeVoter.boothNumber}\n📍 *पत्ता:* ${safeVoter.pollingStationAddress}\n\n_${safeCandidateInfo.slogan}_`;
  }
};

  // Share family details via WhatsApp
  const shareFamilyViaWhatsApp = () => {
    if (familyMembers.length === 0) {
      alert('No family members to share.');
      return;
    }

    if (!contactNumbers.whatsapp) {
      alert('WhatsApp number not available. Please add WhatsApp number first.');
      setShowWhatsAppModal(true);
      return;
    }

    const message = generateWhatsAppMessage(true);
    const url = `https://wa.me/${contactNumbers.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Enhanced Bluetooth Printing Functions
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      alert('Bluetooth is not supported in this browser. Please use Chrome or Edge on Android.');
      return null;
    }

    try {
      setPrinting(true);

      console.log('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      });

      // Add disconnect listener
      device.addEventListener?.('gattserverdisconnected', () => {
        console.log('Bluetooth device disconnected');
        globalBluetoothConnection.connected = false;
        setBluetoothConnected(false);
        setPrinterDevice(null);
        setPrinterCharacteristic(null);
      });

      console.log('Connecting to GATT server...');
      const server = await device.gatt.connect();
      console.log('Getting primary services...');
      const services = await server.getPrimaryServices();

      let foundChar = null;
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const c of characteristics) {
            if (c.properties && (c.properties.write || c.properties.writeWithoutResponse)) {
              foundChar = c;
              break;
            }
          }
          if (foundChar) break;
        } catch (err) {
          console.warn('Could not read characteristics for service', service.uuid, err);
        }
      }

      if (!foundChar) {
        // No writable characteristic found; disconnect and inform user.
        try { server.disconnect?.(); } catch (e) { /* ignore */ }
        setPrinting(false);
        alert('Connected to printer but no writable characteristic found. Many portable printers use Bluetooth Classic (SPP) which browsers cannot access. If your RPD-588 supports BLE, enable BLE mode.');
        return null;
      }

      // Save connection globally so subsequent prints reuse it
      globalBluetoothConnection.device = device;
      globalBluetoothConnection.characteristic = foundChar;
      globalBluetoothConnection.connected = true;

      setPrinterDevice(device);
      setPrinterCharacteristic(foundChar);
      setBluetoothConnected(true);
      setPrinting(false);

      console.log('Bluetooth printer connected', device.name || device.id, foundChar.uuid);
      return { device, characteristic: foundChar };
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      setPrinting(false);
      setBluetoothConnected(false);
      if (error?.name === 'NotFoundError') {
        alert('No Bluetooth printer found / selected. Make sure printer is ON and in BLE mode.');
      } else if (error?.name === 'SecurityError') {
        alert('Bluetooth permission denied. Please allow Bluetooth access.');
      } else {
        alert(`Bluetooth connection failed: ${error?.message || error}`);
      }
      return null;
    }
  };

  // Convert canvas to ESC/POS raster image command chunks
  const canvasToEscPosRaster = (canvas) => {
    // Prepare monochrome bitmap (1 = black)
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    // width in bytes (8 pixels per byte)
    const widthBytes = Math.ceil(width / 8);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const rasterData = new Uint8Array(widthBytes * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        // luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const byteIndex = y * widthBytes + (x >> 3);
        const bit = 7 - (x % 8);
        if (luminance < 160) { // threshold: adjust if needed
          rasterData[byteIndex] |= (1 << bit);
        }
      }
    }

    // Build ESC/POS command: GS v 0 m xL xH yL yH [d]...
    const header = [0x1D, 0x76, 0x30, 0x00]; // m=0 (normal)
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;

    const command = new Uint8Array(header.length + 4 + rasterData.length);
    let offset = 0;
    command.set(header, offset); offset += header.length;
    command[offset++] = xL;
    command[offset++] = xH;
    command[offset++] = yL;
    command[offset++] = yH;
    command.set(rasterData, offset);

    return command;
  };


  // Ensure Devanagari font is available for html2canvas rendering
  const ensureDevanagariFont = () => {
    if (document.getElementById('noto-devanagari-font')) return;
    const link = document.createElement('link');
    link.id = 'noto-devanagari-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap';
    document.head.appendChild(link);
  };

  // New Logic from chatgpt
  // 🔤 Utility: Translate English to Marathi using Google Translate API
  const translateToMarathi = async (text) => {
    if (!text) return '';
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mr&dt=t&q=${encodeURIComponent(text)}`
      );
      const data = await res.json();
      return data?.[0]?.[0]?.[0] || text;
    } catch (e) {
      console.error('Translation failed:', e);
      return text;
    }
  };

  // 🧾 Modified Print Function
  const printViaBluetooth = async (isFamily = false) => {
    if (!voter) {
      alert('No voter data available');
      return;
    }

    if (isFamily && familyMembers.length === 0) {
      alert('No family members to print');
      return;
    }

    try {
      setPrinting(true);

      let connection;
      if (
        globalBluetoothConnection.connected &&
        globalBluetoothConnection.device?.gatt?.connected
      ) {
        connection = {
          device: globalBluetoothConnection.device,
          characteristic: globalBluetoothConnection.characteristic,
        };
      } else {
        connection = await connectBluetooth();
      }

      if (!connection?.characteristic) {
        setPrinting(false);
        return;
      }

      // 🟡 Translate voter details dynamically before printing
      // include survey values (age/gender) if present under voter.survey, fallback to top-level fields
      const voterGender = voter?.survey?.gender || voter?.gender || '';
      const voterAge = (voter?.survey?.age ?? voter?.age ?? '')?.toString?.() || '';

      const translatedVoter = {
        name: await translateToMarathi(voter.name || ''),
        voterId: await translateToMarathi(voter.voterId || ''),
        serialNumber: await translateToMarathi(String(voter.serialNumber ?? '')),
        boothNumber: await translateToMarathi(String(voter.boothNumber ?? '')),
        pollingStationAddress: await translateToMarathi(voter.pollingStationAddress || ''),
        gender: await translateToMarathi(voterGender),
        age: await translateToMarathi(voterAge),
      };

      const translatedFamily =
        isFamily && familyMembers.length > 0
          ? await Promise.all(
              familyMembers.map(async (member) => {
                const mGender = member?.survey?.gender || member?.gender || '';
                const mAge = (member?.survey?.age ?? member?.age ?? '')?.toString?.() || '';
                return {
                  ...member,
                  name: await translateToMarathi(member.name || ''),
                  voterId: await translateToMarathi(member.voterId || ''),
                  boothNumber: await translateToMarathi(String(member.boothNumber ?? '')),
                  pollingStationAddress: await translateToMarathi(member.pollingStationAddress || ''),
                  gender: await translateToMarathi(mGender),
                  age: await translateToMarathi(mAge),
                };
              })
            )
          : [];

      await printReceiptAsImage(
        connection.characteristic,
        isFamily,
        translatedVoter,
        translatedFamily
      );

      alert(
        isFamily
          ? 'कुटुंब तपशील यशस्वीरित्या प्रिंट झाले! 🎉'
          : 'मतदाराची माहिती यशस्वीरित्या प्रिंट झाली! 🎉'
      );
    } catch (error) {
      console.error('Printing failed:', error);
      globalBluetoothConnection.connected = false;
      globalBluetoothConnection.device = null;
      globalBluetoothConnection.characteristic = null;
      setBluetoothConnected(false);
      setPrinterDevice(null);
      setPrinterCharacteristic(null);

      alert('प्रिंटिंग अयशस्वी: ' + (error?.message || error));
    } finally {
      setPrinting(false);
    }
  };

  // Enhanced print receipt function for 58mm paper (fixed: no JSX inside template strings, Marathi labels)
  const printReceiptAsImage = async (characteristic, isFamily, voterData, familyData) => {
    ensureDevanagariFont();
    await new Promise((r) => setTimeout(r, 220));

    const safeDiv = document.createElement('div');
    safeDiv.id = 'voter-receipt-printable-temp';
    safeDiv.style.width = '200px';
    safeDiv.style.padding = '10px';
    safeDiv.style.background = '#fff';
    safeDiv.style.fontFamily = `"Noto Sans Devanagari", sans-serif`;
    safeDiv.style.fontSize = '14px';
    safeDiv.style.lineHeight = '1.3';
    safeDiv.style.position = 'absolute';
    safeDiv.style.left = '-9999px';

    let html = `
      <div style="text-align:center;font-weight:700;font-size:13px;border-bottom:1px solid #000;padding-bottom:8px;">
        ${escapeHtml(candidateInfo.party)}<br/>
        <div style="font-size:18px;margin:4px 0;">${escapeHtml(candidateInfo.name)}</div>
        <div style="font-size:14px;">${escapeHtml(candidateInfo.slogan)}</div>
        <div style="font-size:14px;margin-top:4px;padding-bottom:8px;">${escapeHtml(candidateInfo.area)}</div>
      </div>
    `;

    if (isFamily && Array.isArray(familyData) && familyData.length > 0) {
      // Main voter (1)
      html += `
        <div style="text-align:center;margin-top:6px;font-size:14px;"><b>कुटुंब तपशील</b></div>
        <div style="margin-top:6px;font-size:14px;"><b>1) ${escapeHtml(voterData.name)}</b></div>
        <div style="font-size:14px;">अनुक्रमांक: ${escapeHtml(voterData.serialNumber || '')}</div>
        <div style="font-size:14px;">मतदार आयडी: ${escapeHtml(voterData.voterId || '')}</div>
        <div style="font-size:14px;">बूथ क्रमांक: ${escapeHtml(voterData.boothNumber || '')}</div>
        <div style="font-size:14px;">लिंग: ${escapeHtml(voterData.gender || '')}</div>
        <div style="font-size:14px;">वय: ${escapeHtml(voterData.age || '')}</div>
        <div style="margin-top:4px;border-bottom:1px solid #000;padding-bottom:10px;font-size:14px;">मतदान केंद्र: ${escapeHtml(voterData.pollingStationAddress || '')}</div>
      `;

      // Family members (2...)
      familyData.forEach((m, i) => {
        html += `
          <div style="margin-top:6px;font-size:14px;margin-bottom:2px;border-bottom:1px solid #000;padding-bottom:10px;">
            <div style="font-weight:700;">${i + 2}) ${escapeHtml(m.name || '')}</div>
            <div style="margin-top:4px;">अनुक्रमांक: ${escapeHtml(m.serialNumber || '')}</div>
            <div style="margin-top:2px;">मतदार आयडी: ${escapeHtml(m.voterId || '')}</div>
            <div style="margin-top:2px;">बूथ क्रमांक: ${escapeHtml(m.boothNumber || '')}</div>
            <div style="margin-top:2px;">लिंग: ${escapeHtml(m.gender || '')}</div>
            <div style="margin-top:2px;">वय: ${escapeHtml(m.age || '')}</div>
            <div style="margin-top:4px;font-size:13px;">मतदान केंद्र: ${escapeHtml(m.pollingStationAddress || '')}</div>
          </div>
        `;
      });

      html += `
        <div style="margin-top:6px;border-top:1px solid #000;padding-top:6px;font-size:13px;">
          मी आपला <b>जननेता</b> माझी निशाणी <b>कमळ</b> या चिन्हावर मतदान करून मला प्रचंड बहुमतांनी विजय करा
        </div>
        <div style="margin-top:6px;text-align:center;font-weight:700;">${escapeHtml(candidateInfo.name)}</div>
        <div style="margin-top:18px;text-align:center;"></div>
      `;
    } else {
      // Single voter
      html += `
        <div style="text-align:center;margin-top:6px;font-weight:700;">मतदार तपशील</div>
        <div style="margin-top:6px;"><b>नाव:</b> ${escapeHtml(voterData.name || '')}</div>
        <div style="margin-top:4px;"><b>मतदार आयडी:</b> ${escapeHtml(voterData.voterId || '')}</div>
        <div style="margin-top:4px;"><b>अनुक्रमांक:</b> ${escapeHtml(voterData.serialNumber || '')}</div>
        <div style="margin-top:4px;"><b>बूथ क्रमांक:</b> ${escapeHtml(voterData.boothNumber || '')}</div>
        <div style="margin-top:4px;"><b>लिंग:</b> ${escapeHtml(voterData.gender || '')}</div>
        <div style="margin-top:4px;"><b>वय:</b> ${escapeHtml(voterData.age || '')}</div>
        <div style="margin-top:6px;margin-bottom:10px;"><b>मतदान केंद्र:</b> ${escapeHtml(voterData.pollingStationAddress || '')}</div>
        <div style="margin-top:6px;border-top:1px solid #000;padding-top:6px;font-size:13px;">
          मी आपला <b>जननेता</b> माझी निशाणी <b>कमळ</b> या चिन्हावर मतदान करून मला प्रचंड बहुमतांनी विजय करा
        </div>
        <div style="margin-top:6px;text-align:center;font-weight:700;">${escapeHtml(candidateInfo.name)}</div>
        <div style="margin-top:18px;"></div>
      `;
    }

    safeDiv.innerHTML = html;
    document.body.appendChild(safeDiv);

    try {
      const canvas = await html2canvas(safeDiv, {
        scale: 2,
        backgroundColor: '#fff',
        useCORS: true,
        width: 230,
      });

      const escImage = canvasToEscPosRaster(canvas);
      const init = new Uint8Array([0x1B, 0x40]);
      const align = new Uint8Array([0x1B, 0x61, 0x01]);
      const cut = new Uint8Array([0x0A, 0x0A, 0x1D, 0x56, 0x00]);

      const payload = new Uint8Array(init.length + align.length + escImage.length + cut.length);
      payload.set(init, 0);
      payload.set(align, init.length);
      payload.set(escImage, init.length + align.length);
      payload.set(cut, init.length + align.length + escImage.length);

      for (let i = 0; i < payload.length; i += 180) {
        const slice = payload.slice(i, i + 180);
        if (characteristic.properties.writeWithoutResponse)
          await characteristic.writeValueWithoutResponse(slice);
        else await characteristic.writeValue(slice);
        await new Promise((r) => setTimeout(r, 40));
      }
    } finally {
      document.body.removeChild(safeDiv);
    }
  };

  const escapeHtml = (str) => {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const disconnectBluetooth = async () => {
    if (globalBluetoothConnection.device && globalBluetoothConnection.device.gatt.connected) {
      try {
        await globalBluetoothConnection.device.gatt.disconnect();
        console.log('Bluetooth disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }

    globalBluetoothConnection.device = null;
    globalBluetoothConnection.characteristic = null;
    globalBluetoothConnection.connected = false;

    setBluetoothConnected(false);
    setPrinterDevice(null);
    setPrinterCharacteristic(null);

    alert('Bluetooth printer disconnected');
  };

  // Share functions
  const shareOnWhatsApp = async () => {
    const message = generateWhatsAppMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(generateWhatsAppMessage())}`, '_blank');
  };

  // Filter logic (used elsewhere) - keep as before
  const filteredVoters = allVoters.filter(vtr =>
    vtr.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    vtr.id !== voterId &&
    !familyMembers.some(member => member.id === vtr.id)
  );

  // --- NEW: modal-specific derived lists and pagination ---
  // Extract surname of the current voter (last token)
  const voterSurname = useMemo(() => {
    if (!voter?.name) return '';
    const parts = String(voter.name).trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }, [voter]);

  // More flexible tokenized partial-match search (like dashboard)
  const tokenizedFilter = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    if (!tokens.length) {
      return filteredVoters; // fallback
    }
    return filteredVoters.filter((v) => {
      const name = (v.name || '').toLowerCase();
      // match if ANY token is included anywhere in name or voterId
      return tokens.every(token => name.includes(token) || (String(v.voterId || '').toLowerCase().includes(token)));
    });
  }, [filteredVoters, searchTerm]);

  // Group so that same-surname voters appear at top
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
    // top first, then rest
    return [...surnameTopList, ...surnameRestList];
  }, [surnameTopList, surnameRestList]);

  const totalPages = Math.max(1, Math.ceil(combinedList.length / pageSize));
  // ensure page bounds
  useEffect(() => {
    if (modalPage > totalPages) setModalPage(totalPages);
  }, [totalPages]);

  const paginatedList = useMemo(() => {
    const start = (modalPage - 1) * pageSize;
    return combinedList.slice(start, start + pageSize);
  }, [combinedList, modalPage]);

  // Keyboard ESC to close family modal for fast UX
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && showFamilyModal) {
        setShowFamilyModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showFamilyModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600"><TranslatedText>Loading voter details...</TranslatedText></p>
        </div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3 text-gray-400">🔍</div>
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            >
              <FiArrowLeft className="text-lg" />
              <span className="text-sm font-medium"><TranslatedText>Back</TranslatedText></span>
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
                  <span className=""><TranslatedText>{tab.label}</TranslatedText></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Main Content */}
        <div id="voter-receipt" className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Candidate Branding Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5 text-center">
            <div className="text-sm font-semibold opacity-90 mb-1">{candidateInfo.party}</div>
            <div className="text-xl font-bold mb-1">{candidateInfo.name}</div>
            <div className="text-xs opacity-80">{candidateInfo.slogan}</div>
          </div>

          <div className="p-5">
            {/* Voter Header Info */}
            <div className="">
              {/* Header */}
              <div className="text-center mb-6 border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2"><TranslatedText>{voter.name}</TranslatedText></h1>
              </div>

              {/* Voter Details - Two Column Layout */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                {/* Voter ID */}
                <div className="flex justify-between items-center border-b border-gray-200 ">
                  <span className="font-medium text-gray-700 text-sm">
                    <TranslatedText>Voter ID</TranslatedText>
                  </span>
                  <span className="text-gray-900 text-sm">{voter.voterId}</span>
                </div>

                {/* Serial Number */}
                <div className="flex justify-between items-center border-b border-gray-200">
                  <span className="font-medium text-gray-700 text-sm">
                    <TranslatedText>Serial Number</TranslatedText>
                  </span>
                  <span className="font-semibold text-sm text-gray-900"><TranslatedText>{voter.serialNumber}</TranslatedText></span>
                </div>

                {/* Booth Number */}
                <div className="flex justify-between items-center border-b border-gray-200">
                  <span className="font-medium text-gray-700 text-sm">
                    <TranslatedText>Booth Number</TranslatedText>
                  </span>
                  <span className=" text-gray-900 text-sm"><TranslatedText>{voter.boothNumber}</TranslatedText></span>
                </div>

                {/* WhatsApp Number */}
                <div className="flex justify-between items-center border-b border-gray-200">
                  <span className="font-medium text-gray-700 text-sm">
                    <TranslatedText>WhatsApp Number</TranslatedText>
                  </span>
                  <span className=" text-gray-900 text-sm"><TranslatedText>{voter.whatsappNumber}</TranslatedText></span>
                </div>

                {/* Age & Gender */}
                <div className="flex justify-between items-center border-b border-gray-200">
                  <span className="font-medium text-gray-700 text-sm">
                    <TranslatedText>Age & Gender</TranslatedText>
                  </span>
                  <span className=" text-gray-900 text-sm">
                    {voter.age} | {voter.gender}
                  </span>
                </div>

                {/* Address - Full Width */}
                <div className="flex flex-col gap-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700 text-sm">
                    <TranslatedText>Polling Station Address</TranslatedText>
                  </span>
                  <span className="text-gray-900 text-sm leading-relaxed">
                    <TranslatedText>{voter.pollingStationAddress}</TranslatedText>
                  </span>
                </div>
              </div>

              {/* Voting Status */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                {/* Voting Toggle */}
                <div className="flex items-center gap-3">
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">
                    <TranslatedText>{voter.hasVoted ? 'Voted ✓' : 'Mark as Voted'}</TranslatedText>
                  </span>
                </div>

                {/* Support Status */}
                <select
                  value={voter.supportStatus || 'unknown'}
                  onChange={(e) => {
                    const voterRef = ref(db, `voters/${voterId}`);
                    update(voterRef, { supportStatus: e.target.value });
                    setVoter(prev => ({ ...prev, supportStatus: e.target.value }));
                  }}
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
            </div>

            {/* Tab Content */}
            {activeTab === 'family' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FiUsers className="text-orange-500" />
                    <TranslatedText>Family Members</TranslatedText>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowFamilyModal(true)}
                      className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                    >
                      <FiPlus className="text-sm" />
                      <TranslatedText>Add</TranslatedText>
                    </button>
                  </div>
                </div>

                {/* Family Action Buttons */}
                {familyMembers.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => printViaBluetooth(true)}
                      disabled={printing}
                      className="bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                    >
                      <FiPrinter className="text-lg" />
                      <span><TranslatedText>Print Family</TranslatedText></span>
                    </button>
                    <button
                      onClick={shareFamilyViaWhatsApp}
                      className="bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md"
                    >
                      <FaWhatsapp className="text-lg" />
                      <span><TranslatedText>Share Family</TranslatedText></span>
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors bg-white">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900"><TranslatedText>{member.name}</TranslatedText></div>
                        <div className="text-xs text-gray-500 mt-1">ID: {member.voterId} • <TranslatedText>Age: {member.age || 'N/A'}</TranslatedText> • <TranslatedText>Booth: {member.boothNumber || 'N/A'}</TranslatedText> • <TranslatedText>Address: {member.pollingStationAddress || 'N/A'}</TranslatedText></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/voter/${member.id}`)}
                          className="text-orange-600 hover:text-orange-700 text-xs font-medium px-3 py-1 bg--50 rounded-md transition-colors"
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
                    <p className="text-sm"><TranslatedText>No family members added yet.</TranslatedText></p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'survey' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FiClipboard className="text-orange-500" />
                  <TranslatedText>Voter Survey</TranslatedText>
                </h3>

                <div className="grid grid-cols-1 gap-4 text-sm">
                  {/* Gender */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium">Gender</label>
                    <select
                      value={surveyData.gender || ''}
                      onChange={(e) => handleSurveyChange('gender', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Age and DOB */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Age</label>
                      <input
                        type="number"
                        value={surveyData.age || ''}
                        onChange={(e) => handleSurveyChange('age', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Enter age"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Date of Birth</label>
                      <input
                        type="date"
                        value={surveyData.dob || ''}
                        onChange={(e) => handleSurveyChange('dob', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Mobile Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Mobile Number 1</label>
                      <input
                        type="tel"
                        value={surveyData.mobile1 || ''}
                        onChange={(e) => handleSurveyChange('mobile1', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Enter primary number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">WhatsApp Number</label>
                      <input
                        type="tel"
                        value={surveyData.whatsapp || ''}
                        onChange={(e) => handleSurveyChange('whatsapp', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Enter WhatsApp number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Mobile Number 2</label>
                      <input
                        type="tel"
                        value={surveyData.mobile2 || ''}
                        onChange={(e) => handleSurveyChange('mobile2', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Alternate number"
                      />
                    </div>
                  </div>

                  {/* Address Info */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium">Address</label>
                    <textarea
                      value={surveyData.address || ''}
                      onChange={(e) => handleSurveyChange('address', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                      placeholder="Enter full address..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Colony</label>
                      <input
                        type="text"
                        value={surveyData.colony || ''}
                        onChange={(e) => handleSurveyChange('colony', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Colony name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Town</label>
                      <input
                        type="text"
                        value={surveyData.town || ''}
                        onChange={(e) => handleSurveyChange('town', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Town name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">District</label>
                      <input
                        type="text"
                        value={surveyData.district || ''}
                        onChange={(e) => handleSurveyChange('district', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="District name"
                      />
                    </div>
                  </div>

                  {/* Caste & Religion */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Caste</label>
                      <input
                        type="text"
                        value={surveyData.caste || ''}
                        onChange={(e) => handleSurveyChange('caste', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Enter caste"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Religion</label>
                      <input
                        type="text"
                        value={surveyData.religion || ''}
                        onChange={(e) => handleSurveyChange('religion', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Enter religion"
                      />
                    </div>
                  </div>

                  {/* Family Members & Education */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Family Members</label>
                      <input
                        type="number"
                        value={surveyData.familyCount || ''}
                        onChange={(e) => handleSurveyChange('familyCount', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Enter number of family members"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Education</label>
                      <select
                        value={surveyData.education || ''}
                        onChange={(e) => handleSurveyChange('education', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                      >
                        <option value="">Select Education</option>
                        <option value="none">Nothing</option>
                        <option value="below10">Below 10th</option>
                        <option value="12th">12th</option>
                        <option value="graduation">Graduation</option>
                        <option value="postgraduation">Upper Education</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {/* Save button — saves directly into voter root */}
                  <button
                    onClick={async () => {
                      try {
                        const voterRef = ref(db, `voters/${voterId}`);
                        await update(voterRef, surveyData);
                        alert('Survey data saved successfully!');
                      } catch (err) {
                        console.error('Error saving survey data:', err);
                        alert('Failed to save survey data.');
                      }
                    }}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    <TranslatedText>Save Survey</TranslatedText>
                  </button>

                  {/* Clear button with confirmation popup */}
                  <button
                    onClick={async () => {
                      const confirmDelete = window.confirm('Are you sure you want to delete this survey data?');
                      if (confirmDelete) {
                        try {
                          const voterRef = ref(db, `voters/${voterId}`);
                          await update(voterRef, {
                            gender: null,
                            age: null,
                            dob: null,
                            mobile1: null,
                            whatsapp: null,
                            mobile2: null,
                            address: null,
                            colony: null,
                            town: null,
                            district: null,
                            caste: null,
                            religion: null,
                            familyCount: null,
                            education: null,
                          });
                          setSurveyData({});
                          alert('Survey data deleted successfully.');
                        } catch (err) {
                          console.error('Error deleting survey data:', err);
                          alert('Failed to delete survey data.');
                        }
                      }
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    <TranslatedText>Clear</TranslatedText>
                  </button>
                </div>
              </div>
            )}


          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4"><TranslatedText>Quick Actions</TranslatedText></h3>

          {/* Primary Action Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
              onClick={() => printViaBluetooth(false)}
              color="bg-indigo-600 hover:bg-indigo-700"
              disabled={printing}
            />
            <ActionBtn
              icon={FiShare2}
              label="Share"
              onClick={() => navigator.share?.({
                title: `${candidateInfo.name} <br> ${candidateInfo.slogan} <br> Voter Details - ${voter.name}`,
                text: `Voter Details: ${voter.name}, Voter ID: ${voter.voterId}, Booth: ${voter.boothNumber}, Polling Station: ${voter.pollingStationAddress}`,

              })}
              color="bg-purple-500 hover:bg-purple-600"
            />
          </div>

          {/* Secondary Action Row */}
          {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ActionBtn
              icon={FiMessageCircle}
              label="SMS"
              onClick={shareViaSMS}
              color="bg-blue-400 hover:bg-blue-500"
            />
          </div> */}

          {/* Bluetooth Status */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiBluetooth className={bluetoothConnected ? "text-green-500" : "text-gray-400"} />
                <span className="text-xs text-gray-600">Printer: {bluetoothConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {bluetoothConnected && (
                <button
                  onClick={disconnectBluetooth}
                  className="text-red-600 text-xs hover:text-red-700 font-medium"
                >
                  <TranslatedText>Disconnect</TranslatedText>
                </button>
              )}
            </div>
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2"><TranslatedText>Example: 919876543210 (with country code)</TranslatedText></p>
        </Modal>
      )}

      {/* ----------------- UPDATED Family Modal (replace old block) ----------------- */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  <TranslatedText>Add Family Member</TranslatedText>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  <TranslatedText>Search and select voters to add as family members</TranslatedText>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-xs text-gray-600 mr-2">
                  <div><strong>{combinedList.length}</strong> <TranslatedText>results</TranslatedText></div>
                  {/* <div className="mt-1"><TranslatedText>Page</TranslatedText> {modalPage} / {totalPages}</div> */}
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
              {/* Search bar (copied / improved) */}
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

              {/* Surname header (if exists) */}
              {voterSurname && surnameTopList.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-700 font-medium">
                    <TranslatedText>Showing same surname first:</TranslatedText> <span className="ml-2 font-semibold">{voterSurname}</span> &middot; <span className="text-xs text-gray-500">{surnameTopList.length} <TranslatedText>matches</TranslatedText></span>
                  </div>
                </div>
              )}

              {/* Results list (virtual-like by pagination) */}
              <div className="max-h-[60vh] overflow-y-auto border border-gray-100 rounded-md">
                {paginatedList.length > 0 ? paginatedList.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate"><TranslatedText>{v.name}</TranslatedText></h4>
                      <p className="text-sm text-gray-700 truncate">ID: {v.voterId} • <TranslatedText>Booth:</TranslatedText> {v.boothNumber || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => addFamilyMember(v.id)}
                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
                      >
                        <FiPlus className="text-xs" />
                        <TranslatedText>Add</TranslatedText>
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <TranslatedText>No voters found matching your search.</TranslatedText>
                  </div>
                )}
              </div>
            </div>

            {/* Footer: pagination & close */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalPage(prev => Math.max(1, prev - 1))}
                  disabled={modalPage <= 1}
                  className="px-3 py-2 bg-gray-100 text-sm rounded-md disabled:opacity-50"
                >
                  ← <TranslatedText>Prev</TranslatedText>
                </button>
                <button
                  onClick={() => setModalPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={modalPage >= totalPages}
                  className="px-3 py-2 bg-gray-100 text-sm rounded-md disabled:opacity-50"
                >
                  <TranslatedText>Next</TranslatedText> →
                </button>
                <div className="text-sm text-gray-600 ml-3">
                  <TranslatedText>Page</TranslatedText> {modalPage} / {totalPages}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600 mr-4">
                  <TranslatedText>Showing</TranslatedText> {(combinedList.length === 0) ? 0 : ((modalPage - 1) * pageSize) + 1} - {Math.min(modalPage * pageSize, combinedList.length)} / {combinedList.length}
                </div>
                <button
                  onClick={() => setShowFamilyModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <TranslatedText>Close</TranslatedText>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* END updated family modal */}

    </div>
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

const Modal = ({ title, children, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          <TranslatedText>Cancel</TranslatedText>
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          <TranslatedText>Confirm</TranslatedText>
        </button>
      </div>
    </div>
  </div>
);

export default FullVoterDetails;