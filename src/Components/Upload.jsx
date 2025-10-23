import React, { useState, useRef } from 'react';
import { parseExcelFile } from '../utils/excelParser';
import { db, ref, set, push } from '../Firebase/config';
import { UploadIcon } from 'lucide-react';
import TranslatedText from './TranslatedText';
import useAutoTranslate from '../hooks/useAutoTranslate.jsx';

const Upload = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { currentLanguage } = useAutoTranslate();

  const handleFileUpload = async (file) => {
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    try {
      const startTime = performance.now();
      const voterData = await parseExcelFile(file);
      const totalVoters = voterData.length;
      
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < voterData.length; i += batchSize) {
        batches.push(voterData.slice(i, i + batchSize));
      }

      let processed = 0;
      
      for (const batch of batches) {
        const uploadPromises = batch.map(voter => {
          const newVoterRef = push(ref(db, 'voters'));
          return set(newVoterRef, voter);
        });

        await Promise.all(uploadPromises);
        
        processed += batch.length;
        const newProgress = Math.min((processed / totalVoters) * 100, 100);
        setProgress(newProgress);
      }
      
      const endTime = performance.now();
      console.log(`Upload completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      onUploadComplete(totalVoters);
      setUploading(false);
      setProgress(0);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-xl p-6 sm:p-8 border border-white/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UploadIcon className="text-orange-500 font-bold" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              <TranslatedText>Upload Voter Data</TranslatedText>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              <TranslatedText>Upload Excel files with voter information</TranslatedText>
            </p>
          </div>

          {/* Upload Area */}
          <div 
            className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-300 cursor-pointer ${
              dragActive 
                ? 'border-orange-500 bg-orange-50/50 scale-[1.02]' 
                : uploading 
                  ? 'border-gray-300 bg-gray-50/50 cursor-not-allowed'
                  : 'border-orange-300 bg-white/50 hover:border-orange-400 hover:bg-orange-50/30 hover:scale-[1.01]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className={`w-12 h-12 mx-auto transition-colors ${
                uploading ? 'text-gray-400' : 'text-orange-500'
              }`}>
                {uploading ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>
              
              <div className="space-y-2">
                <p className={`font-medium transition-colors ${
                  uploading ? 'text-gray-600' : 'text-gray-800'
                }`}>
                  {uploading ? (
                    <TranslatedText>Uploading your file...</TranslatedText>
                  ) : (
                    <>
                      <span className="text-orange-600 hover:text-orange-700 underline">
                        <TranslatedText>Click to upload</TranslatedText>
                      </span>{' '}
                      <TranslatedText>or drag and drop</TranslatedText>
                    </>
                  )}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {uploading ? fileName : <TranslatedText>Excel files (.xlsx, .xls, .csv) up to 1MB</TranslatedText>}
                </p>
              </div>
            </div>

            {/* Drag overlay */}
            {dragActive && (
              <div className="absolute inset-0 bg-orange-500/10 rounded-xl border-2 border-orange-500 border-dashed flex items-center justify-center">
                <div className="text-orange-600 text-center">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-medium"><TranslatedText>Drop file here</TranslatedText></p>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-6 space-y-3 animate-fade-in">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="truncate flex-1 mr-2">{fileName}</span>
                <span className="font-medium text-orange-600 whitespace-nowrap">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                <TranslatedText>Processing data... Please don't close this window</TranslatedText>
              </p>
            </div>
          )}

          {/* Features */}
          {!uploading && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white/50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-700">
                  <TranslatedText>Fast Upload</TranslatedText>
                </p>
                <p className="text-xs text-gray-500">
                  <TranslatedText>Optimized for speed</TranslatedText>
                </p>
              </div>
              <div className="p-3 bg-white/50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-700">
                  <TranslatedText>Secure</TranslatedText>
                </p>
                <p className="text-xs text-gray-500">
                  <TranslatedText>Data protected</TranslatedText>
                </p>
              </div>
              <div className="p-3 bg-white/50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-700">
                  <TranslatedText>Mobile Ready</TranslatedText>
                </p>
                <p className="text-xs text-gray-500">
                  <TranslatedText>Fully responsive</TranslatedText>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;