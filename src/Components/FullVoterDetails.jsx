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

// Import WhatsApp service
import {
  handleWhatsAppShare,
  handleFamilyWhatsAppShare,
  handleCall
} from '../hooks/WhatsAppServices';

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

  // Updated WhatsApp share handler
  const handleWhatsAppClick = async () => {
    const result = await handleWhatsAppShare(
      voter,
      contactNumbers.whatsapp,
      candidateInfo,
      setShowWhatsAppModal,
      setTempWhatsApp,
      voterId,
      db,
      update,
      setContactNumbers,
      contactNumbers
    );

    if (result === 'number_required') {
      setShowWhatsAppModal(true);
      setTempWhatsApp('');
    }
  };

  // Updated Family WhatsApp share handler
  const handleFamilyWhatsAppClick = async () => {
    const result = await handleFamilyWhatsAppShare(
      voter,
      familyMembers,
      contactNumbers.whatsapp,
      candidateInfo,
      setShowWhatsAppModal,
      setTempWhatsApp,
      voterId,
      db,
      update,
      setContactNumbers,
      contactNumbers
    );

    if (result === 'number_required') {
      setShowWhatsAppModal(true);
      setTempWhatsApp('');
    }
  };

  // Updated call handler
  const handleCallClick = () => {
    handleCall(contactNumbers.whatsapp);
  };

  const confirmWhatsAppNumber = async () => {
    if (tempWhatsApp && tempWhatsApp.length >= 10) {
      try {
        const voterRef = ref(db, `voters/${voterId}`);
        await update(voterRef, { whatsappNumber: tempWhatsApp });
        setContactNumbers({ ...contactNumbers, whatsapp: tempWhatsApp });
        setShowWhatsAppModal(false);

        // After saving number, trigger the appropriate WhatsApp share based on current context
        if (activeTab === 'family') {
          handleFamilyWhatsAppClick();
        } else {
          handleWhatsAppClick();
        }
      } catch (error) {
        console.error('Error saving WhatsApp number:', error);
        alert('Failed to save WhatsApp number.');
      }
    } else {
      alert('Please enter a valid WhatsApp number (at least 10 digits)');
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
                  <span><TranslatedText>{tab.label}</TranslatedText></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">

        {/* Print/Share Buttons */}
        <div className="flex items-center gap-2 mb-3 justify-center">
          {/* WhatsApp Button - Mobile Only */}
          <div className="md:hidden">
            <button
              onClick={handleWhatsAppClick}
              className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <FaWhatsapp className="text-base" />
              <span className="hidden sm:inline"><TranslatedText>WhatsApp</TranslatedText></span>
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={() => printViaBluetooth(false)}
            disabled={printing}
            className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <FiPrinter className="text-base" />
            <span className="hidden sm:inline">
              {printing ? <TranslatedText>Printing...</TranslatedText> : <TranslatedText>Print</TranslatedText>}
            </span>
          </button>

          {/* Bluetooth Status */}
          {bluetoothConnected && (
            <button
              onClick={disconnectBluetooth}
              className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FiBluetooth className="text-base" />
              <span className="hidden sm:inline"><TranslatedText>Connected</TranslatedText></span>
            </button>
          )}
        </div>
        {/* Voter Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{voter.name}</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiHash className="text-orange-500" />
                    <span><TranslatedText>Voter ID:</TranslatedText> <strong className="text-gray-900">{voter.voterId}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiHash className="text-orange-500" />
                    <span><TranslatedText>Serial No:</TranslatedText> <strong className="text-gray-900">{voter.serialNumber}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiMapPin className="text-orange-500" />
                    <span><TranslatedText>Booth No:</TranslatedText> <strong className="text-gray-900">{voter.boothNumber}</strong></span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiCalendar className="text-orange-500" />
                    <span><TranslatedText>Age:</TranslatedText> <strong className="text-gray-900">{voter.age}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiUser className="text-orange-500" />
                    <span><TranslatedText>Gender:</TranslatedText> <strong className="text-gray-900">{voter.gender}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiHome className="text-orange-500" />
                    <span><TranslatedText>Address:</TranslatedText> <strong className="text-gray-900">{voter.address}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gray-50 rounded-lg p-4 min-w-[280px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900"><TranslatedText>Contact Details</TranslatedText></h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-orange-600 hover:text-orange-700 p-1 rounded"
                  >
                    <FiEdit2 className="text-sm" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={saveContactNumbers}
                      className="text-green-600 hover:text-green-700 p-1 rounded"
                    >
                      <FiSave className="text-sm" />
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setContactNumbers({
                          whatsapp: voter.whatsappNumber || '',
                          phone: voter.phoneNumber || '',
                        });
                      }}
                      className="text-gray-600 hover:text-gray-700 p-1 rounded"
                    >
                      <FiX className="text-sm" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <TranslatedText>WhatsApp Number</TranslatedText>
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={contactNumbers.whatsapp}
                      onChange={(e) => setContactNumbers(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter WhatsApp number"
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">
                        {contactNumbers.whatsapp || <span className="text-gray-400"><TranslatedText>Not added</TranslatedText></span>}
                      </span>
                      {contactNumbers.whatsapp && (
                        <div className="flex gap-1">
                          <button
                            onClick={handleCallClick}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded"
                            title="Call"
                          >
                            <FiPhone className="text-sm" />
                          </button>
                          <button
                            onClick={handleWhatsAppClick}
                            className="text-green-600 hover:text-green-700 p-1 rounded"
                            title="WhatsApp"
                          >
                            <FaWhatsapp className="text-sm" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <TranslatedText>Phone Number</TranslatedText>
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={contactNumbers.phone}
                      onChange={(e) => setContactNumbers(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <span className="text-sm text-gray-900">
                      {contactNumbers.phone || <span className="text-gray-400"><TranslatedText>Not added</TranslatedText></span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Polling Station Address */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FiMapPin className="text-orange-500" />
              <TranslatedText>Polling Station Address</TranslatedText>
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">{voter.pollingStationAddress}</p>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText>Voter Information</TranslatedText></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Voter Name</TranslatedText></span>
                  <span className="font-medium text-gray-900">{voter.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Voter ID</TranslatedText></span>
                  <span className="font-medium text-gray-900">{voter.voterId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Serial Number</TranslatedText></span>
                  <span className="font-medium text-gray-900">{voter.serialNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Booth Number</TranslatedText></span>
                  <span className="font-medium text-gray-900">{voter.boothNumber}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Age</TranslatedText></span>
                  <span className="font-medium text-gray-900">{voter.age}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Gender</TranslatedText></span>
                  <span className="font-medium text-gray-900">{voter.gender}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Address</TranslatedText></span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px]">{voter.address}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600"><TranslatedText>Polling Station</TranslatedText></span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px]">{voter.pollingStationAddress}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'family' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900"><TranslatedText>Family Members</TranslatedText></h2>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Family WhatsApp Button - Mobile Only */}
                <div className="md:hidden">
                  <button
                    onClick={handleFamilyWhatsAppClick}
                    className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors w-full justify-center"
                  >
                    <FaWhatsapp className="text-base" />
                    <span><TranslatedText>Send Family Details</TranslatedText></span>
                  </button>
                </div>
                <button
                  onClick={() => printViaBluetooth(true)}
                  disabled={printing}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <FiPrinter className="text-base" />
                  <span><TranslatedText>Print Family</TranslatedText></span>
                </button>
                <button
                  onClick={() => setShowFamilyModal(true)}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  <FiPlus className="text-base" />
                  <span><TranslatedText>Add Family Member</TranslatedText></span>
                </button>
              </div>
            </div>

            {familyMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiUsers className="text-4xl mx-auto mb-3 text-gray-300" />
                <p><TranslatedText>No family members added yet.</TranslatedText></p>
                <button
                  onClick={() => setShowFamilyModal(true)}
                  className="mt-3 text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  <TranslatedText>Add your first family member</TranslatedText>
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {familyMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{member.name}</h3>
                        <p className="text-sm text-gray-600">
                          <TranslatedText>Voter ID:</TranslatedText> {member.voterId} • <TranslatedText>Age:</TranslatedText> {member.age}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/voter/${member.id}`)}
                        className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <FiUser className="text-sm" />
                      </button>
                      <button
                        onClick={() => removeFamilyMember(member.id)}
                        className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'survey' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900"><TranslatedText>Voter Survey</TranslatedText></h2>
              <button
                onClick={saveSurveyData}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <TranslatedText>Save Survey</TranslatedText>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Complete Address</TranslatedText>
                  </label>
                  <textarea
                    value={surveyData.address}
                    onChange={(e) => handleSurveyChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter complete address with landmarks"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value=""><TranslatedText>Select Income Range</TranslatedText></option>
                    <option value="0-3 LPA">0-3 LPA</option>
                    <option value="3-6 LPA">3-6 LPA</option>
                    <option value="6-10 LPA">6-10 LPA</option>
                    <option value="10+ LPA">10+ LPA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Education</TranslatedText>
                  </label>
                  <select
                    value={surveyData.education}
                    onChange={(e) => handleSurveyChange('education', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value=""><TranslatedText>Select Education</TranslatedText></option>
                    <option value="Illiterate"><TranslatedText>Illiterate</TranslatedText></option>
                    <option value="Primary"><TranslatedText>Primary</TranslatedText></option>
                    <option value="Secondary"><TranslatedText>Secondary</TranslatedText></option>
                    <option value="Graduate"><TranslatedText>Graduate</TranslatedText></option>
                    <option value="Post Graduate"><TranslatedText>Post Graduate</TranslatedText></option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Occupation</TranslatedText>
                  </label>
                  <input
                    type="text"
                    value={surveyData.occupation}
                    onChange={(e) => handleSurveyChange('occupation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter occupation"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Caste</TranslatedText>
                  </label>
                  <input
                    type="text"
                    value={surveyData.caste}
                    onChange={(e) => handleSurveyChange('caste', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter caste"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter religion"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Political Affiliation</TranslatedText>
                  </label>
                  <select
                    value={surveyData.politicalAffiliation}
                    onChange={(e) => handleSurveyChange('politicalAffiliation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value=""><TranslatedText>Select Affiliation</TranslatedText></option>
                    <option value="BJP"><TranslatedText>BJP</TranslatedText></option>
                    <option value="Congress"><TranslatedText>Congress</TranslatedText></option>
                    <option value="Shiv Sena"><TranslatedText>Shiv Sena</TranslatedText></option>
                    <option value="NCP"><TranslatedText>NCP</TranslatedText></option>
                    <option value="Other"><TranslatedText>Other</TranslatedText></option>
                    <option value="Undecided"><TranslatedText>Undecided</TranslatedText></option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Key Issues</TranslatedText>
                  </label>
                  <textarea
                    value={surveyData.issues}
                    onChange={(e) => handleSurveyChange('issues', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter key issues and concerns"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText>Remarks</TranslatedText>
                  </label>
                  <textarea
                    value={surveyData.remarks}
                    onChange={(e) => handleSurveyChange('remarks', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Any additional remarks"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Number Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              <TranslatedText>WhatsApp Number Required</TranslatedText>
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              <TranslatedText>Please enter WhatsApp number to send voter details</TranslatedText>
            </p>
            <input
              type="tel"
              value={tempWhatsApp}
              onChange={(e) => setTempWhatsApp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
              placeholder="Enter WhatsApp number"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <TranslatedText>Cancel</TranslatedText>
              </button>
              <button
                onClick={confirmWhatsAppNumber}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <TranslatedText>Save & Send</TranslatedText>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  <TranslatedText>Add Family Member</TranslatedText>
                </h3>
                <button
                  onClick={() => setShowFamilyModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                <TranslatedText>Search and select voters to add as family members</TranslatedText>
              </p>

              {/* Search Input */}
              <div className="mt-4 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={modalQuery}
                  onChange={(e) => setModalQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Search by name or voter ID..."
                />
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                  <span>
                    <TranslatedText>Page</TranslatedText> {modalPage} <TranslatedText>of</TranslatedText> {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalPage(p => Math.max(1, p - 1))}
                      disabled={modalPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <TranslatedText>Previous</TranslatedText>
                    </button>
                    <button
                      onClick={() => setModalPage(p => Math.min(totalPages, p + 1))}
                      disabled={modalPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <TranslatedText>Next</TranslatedText>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {paginatedList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiSearch className="text-3xl mx-auto mb-3 text-gray-300" />
                  <p><TranslatedText>No voters found</TranslatedText></p>
                  <p className="text-sm mt-1">
                    <TranslatedText>Try adjusting your search terms</TranslatedText>
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {paginatedList.map((voterItem) => (
                    <div
                      key={voterItem.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{voterItem.name}</h4>
                        <p className="text-xs text-gray-600">
                          <TranslatedText>Voter ID:</TranslatedText> {voterItem.voterId} • <TranslatedText>Age:</TranslatedText> {voterItem.age}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {voterItem.address}
                        </p>
                      </div>
                      <button
                        onClick={() => addFamilyMember(voterItem.id)}
                        className="bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors whitespace-nowrap"
                      >
                        <TranslatedText>Add</TranslatedText>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullVoterDetails;