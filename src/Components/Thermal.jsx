import React, { useState } from "react";

export default function Thermal() {
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState("Not connected");

  const printData = async () => {
    try {
      setStatus("Requesting Bluetooth device...");
      const printer = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0x18f0], // Generic printer service
      });

      setDevice(printer);
      setStatus(`Connecting to ${printer.name}...`);

      const server = await printer.gatt.connect();
      setStatus("Connected. Sending data...");

      // Many thermal printers use a custom service/characteristic
      const service = await server.getPrimaryService(0x18f0).catch(async () => {
        // If 0x18F0 not found, get any available one
        const services = await server.getPrimaryServices();
        return services[0];
      });

      const characteristic = await service.getCharacteristic(0x2af1).catch(async () => {
        const chars = await service.getCharacteristics();
        return chars[0];
      });

      const text = `
Vinod Murlidhar Mapari
Akola Mahanagarpalika 2025 Sarvatrik Nivadanuak Prabhag Kr. 20 che Adhikrut Umedvaar

"Your Vote, Your Voice - Let's Build Together!"

🗳️ Vote Now
📣 Share
`;

      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      await characteristic.writeValue(data);
      setStatus("✅ Print data sent successfully!");
    } catch (error) {
      console.error(error);
      setStatus("❌ " + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold mb-3">Bluetooth Printer</h1>
        <p className="text-gray-600 mb-6">
          {status}
        </p>
        <button
          onClick={printData}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
        >
          Connect & Print
        </button>
        {device && (
          <p className="text-sm text-gray-500 mt-3">
            Connected to: {device.name}
          </p>
        )}
      </div>
    </div>
  );
}
