// src/utils/excelParser.js
import * as XLSX from 'xlsx';

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Normalize data keys
        const normalizedData = jsonData.map((row, index) => ({
          serialNumber: row.serialNumber || row['Serial Number'] || index + 1,
          name: row.name || row.Name || row.NAME || '',
          voterId: row.voterId || row['Voter ID'] || row['Voter Id'] || '',
          boothNumber: row.boothNumber || row['Booth Number'] || row.booth || '',
          pollingStationAddress: row.pollingStationAddress || row['Polling Station Address'] || row.address || '',
          timestamp: Date.now()
        }));
        
        resolve(normalizedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};