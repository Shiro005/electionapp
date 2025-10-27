import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { db, ref, onValue, off } from '../Firebase/config';
import {
  FiFilter,
  FiUsers,
  FiSearch,
  FiLoader,
  FiDownload,
  FiHome,
  FiMapPin,
  FiHash,
  FiUser,
  FiPhone,
  FiCheckCircle,
  FiCircle,
  FiChevronDown,
  FiChevronUp,
  FiArrowLeft,
  FiAlertTriangle
} from 'react-icons/fi';
import TranslatedText from './TranslatedText';
import * as XLSX from 'xlsx'

// Improved, responsive and performant FilterPage
const FilterPage = () => {
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [displayedVoters, setDisplayedVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(1000); // reduce on mobile below
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportError, setExportError] = useState('');
  const [expandedFilter, setExpandedFilter] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Use filter keys matching UI categories to avoid mismatches
  const [filters, setFilters] = useState({
    searchTerm: '',
    booth: '',
    polling: '',
    village: '',
    surname: '',
    phone: '', // 'yes' | 'no' | ''
    support: '',
    voted: '', // 'voted' | 'notVoted' | ''
    duplicateType: '',
    sortBy: 'name'
  });

  // detect mobile and adjust itemsPerPage
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setItemsPerPage(mobile ? 100 : 1000);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Map raw firebase keys to consistent local keys
  const processVoterData = useCallback((rawData) => {
    if (!rawData) return [];
    const result = [];
    let idx = 0;

    const parseBoolean = (val) => {
      if (val === true || val === 1) return true;
      if (val === false || val === 0) return false;
      if (val == null) return false;
      const s = String(val).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'y';
    };

    const entries = Object.entries(rawData);
    for (const [key, value] of entries) {
      const boothNumberRaw = value.boothNumber ?? value.booth ?? '';
      const boothNumber = boothNumberRaw === null ? '' : String(boothNumberRaw).trim();

      const pollingRaw = value.pollingStationAddress ?? value.pollingStation ?? value.address ?? '';
      const pollingStationAddress = (pollingRaw === null ? '' : String(pollingRaw)).trim();

      result.push({
        id: key,
        serial: value.serialNumber ?? key,
        name: value.name ?? 'Unknown Voter',
        voterId: value.voterId ?? value.id ?? key,
        boothNumber,
        pollingStationAddress,
        village: value.village ?? value.area ?? '',
        fatherName: value.fatherName ?? '',
        age: value.age ?? '',
        gender: value.gender ?? '',
        phone: value.phone ?? value.phoneNumber ?? '',
        address: value.address ?? '',
        houseNumber: value.houseNumber ?? '',
        // robust boolean parsing for hasVoted / voted fields
        hasVoted: parseBoolean(value.hasVoted ?? value.voted ?? value.hasVoted),
        // map assigned karyakarta if present
        assignedKaryakarta: value.assignedKaryakarta ?? value.assigned ?? '',
        supportStatus: value.supportStatus ?? value.supportLevel ?? value.support ?? 'unknown',
        dob: value.dob ?? '',
        familyMembers: value.familyMembers ?? [],
        surname: (value.name ?? '').split(' ').pop() ?? ''
      });

      // cooperative yielding for very large datasets (allow UI ticks)
      idx++;
      if (idx % 1000 === 0) {
        // give UI a tick
        // eslint-disable-next-line no-unused-expressions
        setTimeout(() => {}, 0);
      }
    }

    return result;
  }, []);

  // Load voters
  const loadVoters = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) setRefreshing(true);

      const votersRef = ref(db, 'voters');
      onValue(votersRef, (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const processed = processVoterData(raw);
          setVoters(processed);
        } else {
          setVoters([]);
        }
        setLoading(false);
        setRefreshing(false);
      });
    } catch (err) {
      console.error('Error loading voters:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, [processVoterData]);

  useEffect(() => {
    loadVoters();
    return () => {
      const votersRef = ref(db, 'voters');
      off(votersRef);
    };
  }, [loadVoters]);

  // duplicates finder
  const findDuplicates = useCallback((list, type) => {
    const map = new Map();
    const duplicates = [];
    list.forEach(v => {
      let key = '';
      switch (type) {
        case 'phone': key = v.phone?.trim(); break;
        case 'voterId': key = v.voterId?.trim(); break;
        case 'name': key = (v.name + '|' + v.fatherName).toLowerCase().trim(); break;
        case 'address': key = (v.houseNumber + '|' + v.address).toLowerCase().trim(); break;
        default: key = '';
      }
      if (!key) return;
      if (map.has(key)) {
        const arr = map.get(key);
        arr.push(v);
      } else {
        map.set(key, [v]);
      }
    });
    map.forEach(arr => {
      if (arr.length > 1) duplicates.push(...arr);
    });
    // unique
    const uniq = Array.from(new Map(duplicates.map(d => [d.id, d])).values());
    return uniq;
  }, []);

  // Core filtering function (runs on idle / in setTimeout to reduce jank)
  const applyFilters = useCallback(() => {
    if (!voters.length) {
      setFilteredVoters([]);
      setDisplayedVoters([]);
      return;
    }

    // run heavy filtering in next tick to keep UI responsive
    const runner = () => {
      let out = voters;

      // search
      if (filters.searchTerm?.trim()) {
        const terms = filters.searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        out = out.filter(v => {
          const hay = `${v.name} ${v.voterId} ${v.fatherName} ${v.boothNumber} ${v.pollingStationAddress}`.toLowerCase();
          return terms.every(t => hay.includes(t));
        });
      }

      // booth filter (match numeric or string booth number, allow partial)
      if (filters.booth) {
        const boothFilter = String(filters.booth).trim().toLowerCase();
        out = out.filter(v => {
          const bn = (v.boothNumber ?? '').toLowerCase();
          return bn === boothFilter || bn.includes(boothFilter) || (v.pollingStationAddress ?? '').toLowerCase().includes(boothFilter);
        });
      }

      // polling station (partial)
      if (filters.polling) {
        out = out.filter(v => v.pollingStationAddress?.toLowerCase().includes(filters.polling.toLowerCase()));
      }

      // village
      if (filters.village) {
        out = out.filter(v => v.village?.toLowerCase().includes(filters.village.toLowerCase()));
      }

      // surname
      if (filters.surname) {
        out = out.filter(v => v.surname?.toLowerCase().includes(filters.surname.toLowerCase()));
      }

      // phone
      if (filters.phone === 'yes') out = out.filter(v => v.phone && v.phone.trim() !== '');
      if (filters.phone === 'no') out = out.filter(v => !v.phone || v.phone.trim() === '');

      // voted
      if (filters.voted === 'voted') out = out.filter(v => v.hasVoted === true);
      if (filters.voted === 'notVoted') out = out.filter(v => v.hasVoted === false);

      // support
      if (filters.support) out = out.filter(v => (v.supportStatus || '').toLowerCase() === filters.support.toLowerCase());

      // duplicates
      if (filters.duplicateType) {
        out = findDuplicates(out, filters.duplicateType);
      }

      // sorting
      out = out.slice(); // copy
      out.sort((a, b) => {
        switch (filters.sortBy) {
          case 'name': return (a.name || '').localeCompare(b.name || '');
          case 'booth': return (a.boothNumber || '').localeCompare(b.boothNumber || '');
          case 'village': return (a.village || '').localeCompare(b.village || '');
          case 'surname': return (a.surname || '').localeCompare(b.surname || '');
          case 'serial': default: return (a.serial || '').localeCompare(b.serial || '');
        }
      });

      setFilteredVoters(out);
      setCurrentPage(1);
    };

    if ('requestIdleCallback' in window) {
      // schedule during idle
      // @ts-ignore
      requestIdleCallback(runner, { timeout: 500 });
    } else {
      // fallback to small delay
      setTimeout(runner, 0);
    }
  }, [voters, filters, findDuplicates]);

  // debounce filtering to avoid many re-renders
  const debouncedApplyFilters = useMemo(() => debounce(applyFilters, 350), [applyFilters]);
  useEffect(() => {
    debouncedApplyFilters();
    return () => debouncedApplyFilters.cancel();
  }, [debouncedApplyFilters, filters, voters]);

  // paginate displayedVoters
  useEffect(() => {
    const start = (currentPage - 1) * itemsPerPage;
    setDisplayedVoters(filteredVoters.slice(start, start + itemsPerPage));
  }, [filteredVoters, currentPage, itemsPerPage]);

  // unique values for selects
  const uniqueValues = useMemo(() => {
    const booths = [...new Set(voters.map(v => v.boothNumber).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const pollingStations = [...new Set(voters.map(v => v.pollingStationAddress).filter(Boolean))].sort();
    const villages = [...new Set(voters.map(v => v.village).filter(Boolean))].sort();
    const surnames = [...new Set(voters.map(v => v.surname).filter(Boolean))].sort();
    return { booths, pollingStations, villages, surnames };
  }, [voters]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      booth: '',
      polling: '',
      village: '',
      surname: '',
      phone: '',
      support: '',
      voted: '',
      duplicateType: '',
      sortBy: 'name'
    });
    setExpandedFilter(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadVoters(true);
  }, [loadVoters]);

  const handleExport = useCallback(() => setShowExportModal(true), []);
  // Export helper - builds sheet from provided rows (keeps preferred column order + any extra keys)
  const exportRowsToExcel = useCallback((rows, filename) => {
    if (!rows || rows.length === 0) {
      alert('No records to export');
      return;
    }

    // Collect all keys present in rows
    const allKeys = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));

    // preferred column order
    const preferred = [
      'serial', 'voterId', 'name', 'age', 'gender', 'familyMembers',
      'boothNumber', 'boothName', 'pollingStationAddress', 'address',
      'houseNumber', 'phone', 'whatsappNumber', 'hasVoted',
      'supportStatus', 'assignedKaryakarta', 'dob', 'village', 'surname', 'id'
    ];

    const headers = [
      ...preferred.filter(k => allKeys.has(k)),
      ...Array.from(allKeys).filter(k => !preferred.includes(k))
    ];

    const sheetData = rows.map(r => {
      const out = {};
      headers.forEach(h => {
        let v = r[h];
        if (v == null) v = '';
        else if (Array.isArray(v) || (typeof v === 'object' && !(v instanceof Date))) v = JSON.stringify(v);
        else if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
        out[h] = v;
      });
      return out;
    });

    const ws = XLSX.utils.json_to_sheet(sheetData, { header: headers });
    // Auto column widths (approx)
    const colWidths = headers.map(h => ({ wch: Math.min(50, Math.max(8, String(h).length + 8)) }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voters');
    XLSX.writeFile(wb, filename);
  }, []);

  const handleExportConfirm = useCallback(() => {
    // simple password check
    if (exportPassword !== 'admin123') {
      setExportError('Invalid password');
      return;
    }

    try {
      setExportError('');
      // If filteredVoters has content use it, otherwise export full voters list
      const rows = (filteredVoters && filteredVoters.length) ? filteredVoters : voters;

      // ensure familyMembers and other arrays are included
      const processedRows = rows.map(r => {
        // keep existing shape, add common aliases if missing
        return {
          serial: r.serial ?? r.serialNumber ?? '',
          voterId: r.voterId ?? r.id ?? '',
          name: r.name ?? '',
          age: r.age ?? '',
          gender: r.gender ?? '',
          // familyMembers: r.familyMembers ?? r.family || '',
          boothNumber: r.boothNumber ?? '',
          boothName: r.boothName ?? '',
          pollingStationAddress: r.pollingStationAddress ?? r.pollingStation ?? '',
          address: r.address ?? '',
          houseNumber: r.houseNumber ?? '',
          phone: r.phone ?? r.mobile ?? r.whatsappNumber ?? '',
          whatsappNumber: r.whatsappNumber ?? '',
          hasVoted: r.hasVoted ?? false,
          supportStatus: r.supportStatus ?? '',
          assignedKaryakarta: r.assignedKaryakarta ?? r.assigned ?? '',
          dob: r.dob ?? '',
          village: r.village ?? '',
          surname: r.surname ?? ((r.name || '').split(' ').pop() || ''),
          id: r.id ?? ''
        , ...r }; // include any extra keys from original object
      });

      const date = new Date().toISOString().slice(0, 10);
      const filename = `voters_export_${date}.xlsx`;
      exportRowsToExcel(processedRows, filename);

      setShowExportModal(false);
      setExportPassword('');
      alert(`Exported ${processedRows.length} records to ${filename}`);
    } catch (err) {
      console.error('Export failed', err);
      setExportError('Export failed, check console for details');
    }
  }, [exportPassword, filteredVoters, voters, exportRowsToExcel]);

  const handleVoterClick = useCallback((voterId) => {
    window.location.href = `/voter/${voterId}`;
  }, []);

  const toggleFilter = useCallback((id) => setExpandedFilter(prev => prev === id ? null : id), []);

  // responsive list item (mobile)
  const VoterCard = ({ v, index }) => (
    <div onClick={() => handleVoterClick(v.id)} className="bg-white rounded-lg p-4 shadow-sm mb-3 cursor-pointer hover:shadow-md">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-base truncate">{v.name}</div>
          <div className="text-sm text-gray-500">{v.fatherName ? `S/O ${v.fatherName}` : ''}</div>
          <div className="text-xs text-gray-400 mt-2">ID: {v.voterId}</div>
        </div>
        <div className="text-right">
          {v.hasVoted ? <div className="text-green-600 text-sm font-medium">Voted</div> : <div className="text-red-600 text-sm font-medium">Not Voted</div>}
          <div className="text-xs text-gray-500 mt-2">{v.boothNumber ? `Booth ${v.boothNumber}` : ''}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-600">
        {v.phone ? <div className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700">📞 {v.phone}</div> : <div className="inline-flex items-center px-2 py-1 rounded bg-gray-50 text-gray-500">No Phone</div>}
        <div className="text-gray-500">🏠 {v.houseNumber || v.address || '-'}</div>
      </div>
    </div>
  );

  // Pagination UI for desktop & mobile
  const Pagination = () => {
    const totalPages = Math.max(1, Math.ceil(filteredVoters.length / itemsPerPage));
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-700">Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredVoters.length)} to {Math.min(currentPage * itemsPerPage, filteredVoters.length)} of {filteredVoters.length}</div>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="px-3 py-1 rounded bg-white border disabled:opacity-50">Prev</button>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="px-3 py-1 rounded bg-white border disabled:opacity-50">Next</button>
        </div>
      </div>
    );
  };

  if (loading && voters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2"><TranslatedText>Loading Voter Data</TranslatedText></h2>
          <p className="text-gray-600"><TranslatedText>Please wait while we load the database...</TranslatedText></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiFilter className="text-orange-600" />
            <h1 className="text-lg font-semibold"><TranslatedText>Filters</TranslatedText></h1>
            <div className="text-sm text-gray-500 ml-4"><TranslatedText>Total Voters:</TranslatedText> {voters.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-3 py-2 bg-orange-600 text-white rounded"><FiDownload /></button>
            <button onClick={handleRefresh} className="px-3 py-2 bg-white border rounded">{refreshing ? <FiLoader className="animate-spin" /> : 'Refresh'}</button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} placeholder="Search by name, voter ID, father name..." className="w-full pl-10 pr-4 py-2 rounded border" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-medium">Filters</div>
              <button onClick={clearFilters} className="text-sm text-orange-600">Clear</button>
            </div>

            {/* Booth select */}
            <div className="mb-3">
              <label className="text-sm font-medium">Booth</label>
              <select value={filters.booth} onChange={(e) => handleFilterChange('booth', e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                <option value="">All Booths</option>
                {uniqueValues.booths.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Polling Station</label>
              <select value={filters.polling} onChange={(e) => handleFilterChange('polling', e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                <option value="">All</option>
                {uniqueValues.pollingStations.map(p => <option key={p} value={p}>{p.length > 40 ? p.slice(0, 40) + '...' : p}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Village</label>
              <select value={filters.village} onChange={(e) => handleFilterChange('village', e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                <option value="">All</option>
                {uniqueValues.villages.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Phone</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => handleFilterChange('phone', '')} className={`px-2 py-1 rounded ${filters.phone === '' ? 'bg-orange-100' : 'bg-gray-100'}`}>All</button>
                <button onClick={() => handleFilterChange('phone', 'yes')} className={`px-2 py-1 rounded ${filters.phone === 'yes' ? 'bg-orange-100' : 'bg-gray-100'}`}>With</button>
                <button onClick={() => handleFilterChange('phone', 'no')} className={`px-2 py-1 rounded ${filters.phone === 'no' ? 'bg-orange-100' : 'bg-gray-100'}`}>Without</button>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Voting</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => handleFilterChange('voted', '')} className={`px-2 py-1 rounded ${filters.voted === '' ? 'bg-orange-100' : 'bg-gray-100'}`}>All</button>
                <button onClick={() => handleFilterChange('voted', 'voted')} className={`px-2 py-1 rounded ${filters.voted === 'voted' ? 'bg-orange-100' : 'bg-gray-100'}`}>Voted</button>
                <button onClick={() => handleFilterChange('voted', 'notVoted')} className={`px-2 py-1 rounded ${filters.voted === 'notVoted' ? 'bg-orange-100' : 'bg-gray-100'}`}>Not Voted</button>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Support</label>
              <select value={filters.support} onChange={(e) => handleFilterChange('support', e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                <option value="">All</option>
                <option value="strong">Strong</option>
                <option value="medium">Medium</option>
                <option value="weak">Weak</option>
                <option value="against">Against</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Duplicates</label>
              <select value={filters.duplicateType} onChange={(e) => handleFilterChange('duplicateType', e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                <option value="">None</option>
                <option value="phone">Phone</option>
                <option value="voterId">Voter ID</option>
                <option value="name">Name</option>
                <option value="address">Address</option>
              </select>
            </div>

            <div className="mt-4">
              <button onClick={() => { setFilters(prev => ({ ...prev, sortBy: prev.sortBy === 'name' ? 'serial' : 'name' })); }} className="w-full py-2 bg-orange-600 text-white rounded">Toggle Sort</button>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold"><TranslatedText>Voter Results</TranslatedText></h2>
                <div className="text-sm text-gray-500 mt-1">Showing {displayedVoters.length} of {filteredVoters.length}</div>
              </div>
            </div>

            {isMobile ? (
              <div>
                {displayedVoters.map((v, i) => <VoterCard key={v.id} v={v} index={i} />)}
                <Pagination />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Voter</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contact</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Location</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedVoters.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-orange-50 cursor-pointer" onClick={() => handleVoterClick(v.id)}>
                        <td className="px-4 py-3 text-sm font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{v.name}</div>
                          <div className="text-sm text-gray-500">{v.fatherName ? `S/O ${v.fatherName}` : ''}</div>
                          <div className="text-xs text-gray-400 mt-1">ID: {v.voterId}</div>
                        </td>
                        <td className="px-4 py-3">
                          {v.phone ? <div className="text-sm text-green-700">📞 {v.phone}</div> : <div className="text-sm text-gray-400">No Phone</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">{v.boothNumber ? `Booth: ${v.boothNumber}` : ''}</div>
                          <div className="text-sm text-gray-500">{v.village}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            {v.hasVoted ? <span className="text-green-700 text-sm">Voted</span> : <span className="text-red-700 text-sm">Not Voted</span>}
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#f3f4f6' }}>{v.supportStatus || 'Unknown'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination />
              </div>
            )}
          </div>
        </main>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Export to Excel</h3>
            <p className="text-sm text-gray-600 mb-4">Enter admin password to export {filteredVoters.length} voters</p>
            <input type="password" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} className="w-full p-2 border rounded mb-3" placeholder="Admin password" />
            {exportError && <div className="text-red-600 mb-3">{exportError}</div>}
            <div className="flex gap-2">
              <button onClick={() => setShowExportModal(false)} className="flex-1 p-2 border rounded">Cancel</button>
              <button onClick={handleExportConfirm} className="flex-1 p-2 bg-orange-600 text-white rounded">Export</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPage;