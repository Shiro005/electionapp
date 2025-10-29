import React, { useState, useEffect } from 'react';
import { FiPrinter, FiBluetooth, FiDownload, FiShare2, FiMessageCircle } from 'react-icons/fi';
import { FaWhatsapp, FaRegFilePdf } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Global Bluetooth connection state (same as original)
let globalBluetoothConnection = {
  device: null,
  characteristic: null,
  connected: false
};

const BluetoothPrinter = ({ voter, familyMembers, candidateInfo }) => {
  const [printing, setPrinting] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(globalBluetoothConnection.connected);
  const [printerDevice, setPrinterDevice] = useState(globalBluetoothConnection.device);
  const [printerCharacteristic, setPrinterCharacteristic] = useState(globalBluetoothConnection.characteristic);

  useEffect(() => {
    // Initialize from global connection state
    setBluetoothConnected(globalBluetoothConnection.connected);
    setPrinterDevice(globalBluetoothConnection.device);
    setPrinterCharacteristic(globalBluetoothConnection.characteristic);

    // Expose print functions to window for FamilyManagement component
    window.printVoter = () => printViaBluetooth(false);
    window.printFamily = () => printViaBluetooth(true);
  }, []);

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
        try { server.disconnect?.(); } catch (e) { /* ignore */ }
        setPrinting(false);
        alert('Connected to printer but no writable characteristic found. Many portable printers use Bluetooth Classic (SPP) which browsers cannot access. If your RPD-588 supports BLE, enable BLE mode.');
        return null;
      }

      // Save connection globally
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

  const canvasToEscPosRaster = (canvas) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const widthBytes = Math.ceil(width / 8);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const rasterData = new Uint8Array(widthBytes * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const byteIndex = y * widthBytes + (x >> 3);
        const bit = 7 - (x % 8);
        if (luminance < 160) {
          rasterData[byteIndex] |= (1 << bit);
        }
      }
    }

    const header = [0x1D, 0x76, 0x30, 0x00];
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

  const ensureDevanagariFont = () => {
    if (document.getElementById('noto-devanagari-font')) return;
    const link = document.createElement('link');
    link.id = 'noto-devanagari-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap';
    document.head.appendChild(link);
  };

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

      // Translate voter details
      const voterGender = voter?.gender || '';
      const voterAge = (voter?.age ?? '')?.toString?.() || '';

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
                const mGender = member?.gender || '';
                const mAge = (member?.age ?? '')?.toString?.() || '';
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

  const shareOnWhatsApp = async () => {
    const message = generateWhatsAppMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(generateWhatsAppMessage())}`, '_blank');
  };

  const downloadAsPDF = async () => {
    try {
      setPrinting(true);
      const element = document.getElementById('voter-receipt');
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`voter-${voter.voterId || voter.id}.pdf`);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Failed to download PDF');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>

      {/* Primary Action Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <ActionBtn
          icon={FaWhatsapp}
          label="WhatsApp"
          onClick={shareOnWhatsApp}
          color="bg-green-500 hover:bg-green-600"
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
            title: `${candidateInfo.name}`,
            text: `Voter Details: ${voter.name}, Voter ID: ${voter.voterId}, Booth: ${voter.boothNumber}`,
          })}
          color="bg-purple-500 hover:bg-purple-600"
        />
        <ActionBtn
          icon={FiMessageCircle}
          label="SMS"
          onClick={shareViaSMS}
          color="bg-blue-400 hover:bg-blue-500"
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
              Disconnect
            </button>
          )}
        </div>
      </div>
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

export default BluetoothPrinter;