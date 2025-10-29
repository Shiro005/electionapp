import React, { useState, useEffect } from 'react';
import { db, ref, update } from '../Firebase/config';

const VoterSurvey = ({ voter, onUpdate }) => {
  const [surveyData, setSurveyData] = useState({
    gender: '',
    dob: '',
    whatsapp: '',
    phone: '',
    city: 'Akola',
    town: '',
    colony: '',
    address: '',
    category: '',
    education: '',
    occupation: '',
    familyIncome: '',
    politicalAffiliation: '',
    issues: '',
    remarks: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (voter) {
      // Load existing survey data
      const existingData = {};
      Object.keys(surveyData).forEach(key => {
        if (voter[key] !== undefined) {
          existingData[key] = voter[key];
        }
      });
      setSurveyData(prev => ({ ...prev, ...existingData }));
    }
  }, [voter]);

  const handleInputChange = (field, value) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (field, value) => {
    // Auto-format with +91
    let formattedValue = value.replace(/\D/g, '');
    if (formattedValue && !formattedValue.startsWith('91')) {
      formattedValue = '91' + formattedValue;
    }
    if (formattedValue.length > 12) {
      formattedValue = formattedValue.slice(0, 12);
    }
    setSurveyData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const formatPhoneDisplay = (value) => {
    if (!value) return '';
    if (value.startsWith('91')) {
      return '+91 ' + value.slice(2);
    }
    return value;
  };

  const saveSurveyData = async () => {
    if (!voter?.id) return;
    
    setSaving(true);
    try {
      const voterRef = ref(db, `voters/${voter.id}`);
      await update(voterRef, surveyData);
      alert('Survey data saved successfully!');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving survey data:', error);
      alert('Failed to save survey data.');
    } finally {
      setSaving(false);
    }
  };

  const clearSurveyData = async () => {
    const confirmDelete = window.confirm('Are you sure you want to clear all survey data?');
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const voterRef = ref(db, `voters/${voter.id}`);
      const clearData = {};
      Object.keys(surveyData).forEach(key => {
        clearData[key] = null;
      });
      
      await update(voterRef, clearData);
      setSurveyData({
        gender: '',
        dob: '',
        whatsapp: '',
        phone: '',
        city: 'Akola',
        town: '',
        colony: '',
        address: '',
        category: '',
        education: '',
        occupation: '',
        familyIncome: '',
        politicalAffiliation: '',
        issues: '',
        remarks: ''
      });
      alert('Survey data cleared successfully.');
      onUpdate?.();
    } catch (error) {
      console.error('Error clearing survey data:', error);
      alert('Failed to clear survey data.');
    } finally {
      setSaving(false);
    }
  };

  const cities = ['Akola', 'Amravati', 'Nagpur', 'Mumbai', 'Pune', 'Other'];
  const categories = ['', 'General', 'OBC', 'SC', 'ST', 'Other'];
  const educationLevels = ['', 'Nothing', '10th Pass', '12th Pass', 'Graduation', 'Upper Education'];
  const occupations = ['', 'Student', 'Farmer', 'Business', 'Service', 'Professional', 'Housewife', 'Retired', 'Unemployed', 'Other'];

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        📋 Voter Survey
      </h3>

      <div className="grid grid-cols-1 gap-4 text-sm">
        {/* Personal Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Gender *</label>
            <select
              value={surveyData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Date of Birth</label>
            <input
              type="date"
              value={surveyData.dob}
              onChange={(e) => handleInputChange('dob', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">WhatsApp Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-sm">+91</span>
              <input
                type="tel"
                value={formatPhoneDisplay(surveyData.whatsapp)}
                onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                placeholder="9876543210"
                maxLength={10}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Phone Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-sm">+91</span>
              <input
                type="tel"
                value={formatPhoneDisplay(surveyData.phone)}
                onChange={(e) => handlePhoneChange('phone', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                placeholder="9876543210"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">City *</label>
            <select
              value={surveyData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Town/Village</label>
            <input
              type="text"
              value={surveyData.town}
              onChange={(e) => handleInputChange('town', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              placeholder="Enter town/village"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Colony/Area</label>
            <input
              type="text"
              value={surveyData.colony}
              onChange={(e) => handleInputChange('colony', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              placeholder="Enter colony/area"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-2 font-medium">Detailed Address</label>
          <textarea
            value={surveyData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            placeholder="Enter complete address with landmarks..."
          />
        </div>

        {/* Socio-Economic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Category</label>
            <select
              value={surveyData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat || 'Select Category'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Education</label>
            <select
              value={surveyData.education}
              onChange={(e) => handleInputChange('education', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            >
              {educationLevels.map(edu => (
                <option key={edu} value={edu}>{edu || 'Select Education'}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Occupation</label>
            <select
              value={surveyData.occupation}
              onChange={(e) => handleInputChange('occupation', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            >
              {occupations.map(occ => (
                <option key={occ} value={occ}>{occ || 'Select Occupation'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Family Income (Monthly)</label>
            <input
              type="text"
              value={surveyData.familyIncome}
              onChange={(e) => handleInputChange('familyIncome', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              placeholder="e.g., ₹25,000"
            />
          </div>
        </div>

        {/* Political Information */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Political Affiliation</label>
            <input
              type="text"
              value={surveyData.politicalAffiliation}
              onChange={(e) => handleInputChange('politicalAffiliation', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              placeholder="Political party preference"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Key Issues / Concerns</label>
            <textarea
              value={surveyData.issues}
              onChange={(e) => handleInputChange('issues', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              placeholder="What issues matter most to this voter?"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">Remarks / Notes</label>
            <textarea
              value={surveyData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={saveSurveyData}
          disabled={saving}
          className="flex-1 bg-orange-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Survey Data'}
        </button>
        <button
          onClick={clearSurveyData}
          disabled={saving}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Clear All
        </button>
      </div>

      {/* Required Fields Note */}
      <div className="text-xs text-gray-500 text-center">
        * Fields marked with asterisk are required for better voter profiling
      </div>
    </div>
  );
};

export default VoterSurvey;