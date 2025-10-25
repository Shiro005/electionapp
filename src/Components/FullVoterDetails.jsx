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
    name: "विनोद मुरलीधर मापारी",
    party: "भारतीय जनता पार्टी",
    electionSymbol: "कमल",
    slogan: "जनतेसाठी, जनतेद्वारा",
    contact: "९८७६५४३२१०",
    area: "अकोला प्रभाग 20",
  };

  useEffect(() => {
    loadVoterDetails();
    loadAllVoters();

    // Initialize from global connection state
    setBluetoothConnected(globalBluetoothConnection.connected);
    setPrinterDevice(globalBluetoothConnection.device);
    setPrinterCharacteristic(globalBluetoothConnection.characteristic);
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
    const message = generateWhatsAppMessage();
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

  // Enhanced WhatsApp message generation in Marathi
  const generateWhatsAppMessage = (isFamily = false) => {
    if (isFamily && familyMembers.length > 0) {
      let familyMessage = `🏠 *कुटुंब तपशील* 🏠\n\n`;
      familyMessage += `*मुख्य मतदार:* ${voter.name}\n`;
      familyMessage += `*मतदार आयडी:* ${voter.voterId || 'N/A'}\n`;
      familyMessage += `*बूथ क्रमांक:* ${voter.boothNumber || 'N/A'}\n\n`;
      familyMessage += `*कुटुंब सदस्य:*\n`;

      familyMembers.forEach((member, index) => {
        familyMessage += `${index + 1}. ${member.name}\n`;
        familyMessage += `   🆔: ${member.voterId || 'N/A'}\n`;
        familyMessage += `   वय: ${member.age || 'N/A'}\n`;
        familyMessage += `   लिंग: ${member.gender || 'N/A'}\n\n`;
      });

      familyMessage += `📍 *पत्ता:* ${voter.pollingStationAddress || 'N/A'}\n\n`;
      familyMessage += `_${candidateInfo.slogan}_`;

      return familyMessage;
    } else {
      return `🗳️ *मतदार तपशील* 🗳️\n\n👤 *नाव:* ${voter.name}\n🆔 *मतदार आयडी:* ${voter.voterId || 'N/A'}\n🔢 *अनुक्रमांक:* ${voter.serialNumber || 'N/A'}\n🏛️ *बूथ क्रमांक:* ${voter.boothNumber || 'N/A'}\n📍 *पत्ता:* ${voter.pollingStationAddress || 'N/A'}\n\n_${candidateInfo.slogan}_`;
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
      const translatedVoter = {
        name: await translateToMarathi(voter.name),
        voterId: await translateToMarathi(voter.voterId),
        serialNumber: await translateToMarathi(voter.serialNumber?.toString()),
        boothNumber: await translateToMarathi(voter.boothNumber?.toString()),
        pollingStationAddress: await translateToMarathi(voter.pollingStationAddress),
      };

      const translatedFamily =
        isFamily && familyMembers.length > 0
          ? await Promise.all(
            familyMembers.map(async (member) => ({
              ...member,
              name: await translateToMarathi(member.name),
              voterId: await translateToMarathi(member.voterId),
              boothNumber: await translateToMarathi(member.boothNumber?.toString()),
              pollingStationAddress: await translateToMarathi(member.pollingStationAddress),
            }))
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
    safeDiv.style.padding = '1px';
    safeDiv.style.background = '#fff';
    safeDiv.style.fontFamily = `"Noto Sans Devanagari", sans-serif`;
    safeDiv.style.fontSize = '12px';
    safeDiv.style.lineHeight = '1.3';
    safeDiv.style.position = 'absolute';
    safeDiv.style.left = '-9999px';

    let html = `
    <div style="text-align:center;font-weight:700;font-size:13px;border-bottom:1px solid #000">
      ${escapeHtml(candidateInfo.party)}<br/>
      <div style="font-size:14px;">${escapeHtml(candidateInfo.name)}</div>
      <div style="font-size:10px;margin-top:2px;">${escapeHtml(candidateInfo.slogan)}</div>
      <div style="font-size:10px;margin-top:2px;padding-bottom:10px">${escapeHtml(candidateInfo.area)}</div>
    </div>
  `;

    if (isFamily && familyData.length > 0) {
      html += `
      <div style="text-align:center;margin-top:0px;"><b>कुटुंब तपशील</b></div>
      <div style="margin-top:5px;"><b>मुख्य मतदार: ${escapeHtml(voterData.name)}</b></div>
      <div><b>मतदार आयडी:</b> ${escapeHtml(voterData.voterId)}</div>
      <div><b>बूथ क्रमांक:</b> ${escapeHtml(voterData.boothNumber)}</div>
      <div style="margin-top:1px;"><b>पत्ता:</b> ${escapeHtml(voterData.pollingStationAddress || '')}</div>
      <div style="margin-top:5px;"><b>कुटुंब सदस्य:</b></div>
    `;

      familyData.forEach((m, i) => {
        html += `
        <div style="margin-top:4px;font-size:12px;margin-bottom:4px;">
          <b>${i + 1}) ${escapeHtml(m.name)}</b> <br/>
          आयडी: ${escapeHtml(m.voterId)} <br/> 
          बूथ: ${escapeHtml(m.boothNumber)}<br/>
          पत्ता: ${escapeHtml(m.pollingStationAddress || '')}
        </div>
      `;
      });

      html += ` <div style="margin-top:2px;border-top:1px #000;">मी आपला <b>विनोद मुरलीधर मापारी</b> माझी निशाणी <b>कमल</b> या चिन्ह च बटन दाबून मला प्रचंड बहुमतांनी विजय करा</div>
      <div style="margin-top:2px;text-align:center"><b>जननेता</b></div>
      <div style="margin-top:30px;text-align:center"></div>
      `

    } else {
      html += `
      <div style="text-align:center;margin-top:2px;">मतदार तपशील</div>
      <div style="margin-top:5px;"><b>नाव:</b> ${escapeHtml(voterData.name)}</div>
      <div><b>मतदार आयडी:</b> ${escapeHtml(voterData.voterId)}</div>
      <div><b>अनुक्रमांक:</b> ${escapeHtml(voterData.serialNumber)}</div>
      <div><b>बूथ क्रमांक:</b> ${escapeHtml(voterData.boothNumber)}</div>
      <div style="margin-top:2px;margin-bottom:10px;"><b>पत्ता:</b> ${escapeHtml(voterData.pollingStationAddress || '')}</div>
      <div style="margin-top:0px;magrin-bottom:50px;border-top:1px #000">मी आपला <b>विनोद मुरलीधर मापारी</b> माझी निशाणी <b>कमल</b> या चिन्ह च बटन दाबून मला प्रचंड बहुमतांनी विजय करा</div>
      <div style="margin-top:2px;text-align:center"><b>जननेता</b></div>
      <div style="margin-top:30px;"></div>
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

  // const printViaBluetooth = async (isFamily = false) => {
  //   if (!voter) {
  //     alert('No voter data available');
  //     return;
  //   }

  //   if (isFamily && familyMembers.length === 0) {
  //     alert('No family members to print');
  //     return;
  //   }

  //   try {
  //     setPrinting(true);

  //     let connection;
  //     if (globalBluetoothConnection.connected &&
  //       globalBluetoothConnection.device &&
  //       globalBluetoothConnection.characteristic &&
  //       globalBluetoothConnection.device.gatt &&
  //       globalBluetoothConnection.device.gatt.connected) {
  //       connection = {
  //         device: globalBluetoothConnection.device,
  //         characteristic: globalBluetoothConnection.characteristic
  //       };
  //     } else {
  //       connection = await connectBluetooth();
  //     }

  //     if (!connection || !connection.characteristic) {
  //       setPrinting(false);
  //       return;
  //     }

  //     await printReceiptAsImage(connection.characteristic, isFamily);

  //     alert(isFamily ? 'कुटुंब तपशील यशस्वीरित्या प्रिंट झाले! 🎉' : 'मतदाराची माहिती यशस्वीरित्या प्रिंट झाली! 🎉');
  //   } catch (error) {
  //     console.error('Printing failed:', error);
  //     globalBluetoothConnection.connected = false;
  //     globalBluetoothConnection.device = null;
  //     globalBluetoothConnection.characteristic = null;
  //     setBluetoothConnected(false);
  //     setPrinterDevice(null);
  //     setPrinterCharacteristic(null);

  //     alert('प्रिंटिंग अयशस्वी: ' + (error?.message || error));
  //   } finally {
  //     setPrinting(false);
  //   }
  // };

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

  const downloadAsImage = async () => {
    setPrinting(true);
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
      setPrinting(false);
    }
  };

  const downloadAsPDF = async () => {
    setPrinting(true);
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
      setPrinting(false);
    }
  };

  const filteredVoters = allVoters.filter(voter =>
    voter.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    voter.id !== voterId &&
    !familyMembers.some(member => member.id === voter.id)
  );

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
                  <span className="hidden sm:inline"><TranslatedText>{tab.label}</TranslatedText></span>
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
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-3"><TranslatedText>{voter.name}</TranslatedText></h1>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                  <TranslatedText>Voter ID:</TranslatedText>
                  <span>{voter.voterId}</span>
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-full"><TranslatedText>Serial: {voter.serialNumber}</TranslatedText></div>
                <div className="bg-gray-100 px-3 py-1 rounded-full"><TranslatedText>Booth: {voter.boothNumber}</TranslatedText></div>
                <div className="bg-gray-100 px-3 py-1 rounded-full"><TranslatedText>Address: {voter.pollingStationAddress}</TranslatedText></div>
              </div>

              {/* Voting Status */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2">
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

                <select
                  value={voter.supportStatus || 'unknown'}
                  onChange={(e) => {
                    const voterRef = ref(db, `voters/${voterId}`);
                    update(voterRef, { supportStatus: e.target.value });
                    setVoter(prev => ({ ...prev, supportStatus: e.target.value }));
                  }}
                  className={`text-sm font-medium rounded-full px-3 py-1 border ${voter.supportStatus === 'supporter'
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
                  <button
                    onClick={() => setShowFamilyModal(true)}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    <FiPlus className="text-sm" />
                    <TranslatedText>Add</TranslatedText>
                  </button>
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
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium px-3 py-1 bg-blue-50 rounded-md transition-colors"
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
                  <TranslatedText>Family Survey</TranslatedText>
                </h3>
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium">Complete Address</label>
                    <textarea
                      value={surveyData.address}
                      onChange={(e) => handleSurveyChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                      placeholder="Enter complete address..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Mobile Number</label>
                      <input
                        type="tel"
                        value={surveyData.mobile}
                        onChange={(e) => handleSurveyChange('mobile', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        placeholder="Enter mobile number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Family Income</label>
                      <select
                        value={surveyData.familyIncome}
                        onChange={(e) => handleSurveyChange('familyIncome', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                      >
                        <option value="">Select Income</option>
                        <option value="below-3L">Below 3 Lakhs</option>
                        <option value="3L-5L">3-5 Lakhs</option>
                        <option value="5L-10L">5-10 Lakhs</option>
                        <option value="above-10L">Above 10 Lakhs</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-medium">Key Issues & Concerns</label>
                    <textarea
                      value={surveyData.issues}
                      onChange={(e) => handleSurveyChange('issues', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                      placeholder="Enter key issues and concerns..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveSurveyData}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    <TranslatedText>Save Survey</TranslatedText>
                  </button>
                  <button
                    onClick={() => setSurveyData({
                      address: '', mobile: '', familyIncome: '', education: '', occupation: '',
                      caste: '', religion: '', politicalAffiliation: '', issues: '', remarks: ''
                    })}
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
                title: `Voter Details - ${voter.name}`,
                text: `Voter Details: ${voter.name}, Voter ID: ${voter.voterId}, Booth: ${voter.boothNumber}`,
                url: window.location.href
              })}
              color="bg-purple-500 hover:bg-purple-600"
            />
          </div>

          {/* Secondary Action Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              disabled={printing}
            />
            <ActionBtn
              icon={FaRegFilePdf}
              label="PDF"
              onClick={downloadAsPDF}
              color="bg-red-500 hover:bg-red-600"
              disabled={printing}
            />
          </div>

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

      {showFamilyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredVoters.map((voter) => (
                  <div key={voter.id} className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900"><TranslatedText>{voter.name}</TranslatedText></h4>
                      <p className="text-sm text-gray-500">ID: {voter.voterId} | <TranslatedText>Booth: {voter.boothNumber}</TranslatedText></p>
                    </div>
                    <button
                      onClick={() => addFamilyMember(voter.id)}
                      className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
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
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
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