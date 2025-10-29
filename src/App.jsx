import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import useAutoTranslate from './hooks/useAutoTranslate';
import Dashboard from './Components/Dashboard';
import Upload from './Components/Upload';
import './App.css';
import Home from './Pages/Home';
import { ChevronDown, Globe, Menu, X, User, LogOut, Settings } from 'lucide-react';
import TranslatedText from './Components/TranslatedText';
import BoothManagement from './Components/BoothManagement';
import FilterPage from './Components/FilterPage';
import FullVoterDetails from './Components/FullVoterDetails';
import Team from './Components/Team';

// Navigation component for better organization
const Navigation = ({ currentLanguage, languages, changeLanguage, translating, mobileMenuOpen, setMobileMenuOpen }) => {
  const location = useLocation();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', path: '/home', icon: '' },
    { name: 'Search', path: '/search', icon: '' },
    // { name: 'Upload', path: '/upload', icon: '' },
    { name: 'Booth', path: '/booths', icon: '' },
    { name: 'Lists', path: '/lists', icon: '' },
    { name: 'Setting', path: '/setting', icon: '' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-3 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-green-200 to-orange-600 rounded-full flex items-center justify-center">
                  <img
                    src="/logo.jpeg"
                    alt="Logo"
                    className='rounded-full'
                  />
                </div>
                {/* <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl opacity-20 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div> */}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                  <TranslatedText>JanNetaa</TranslatedText>
                </span>
                <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
                  <TranslatedText>Election Management App</TranslatedText>
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(item.path)
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                {/* <span className="text-base">{item.icon}</span> */}
                <TranslatedText className='text-semibold'>{item.name}</TranslatedText>
              </Link>
            ))}
          </div>

          {/* Right Side Controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLanguageOpen(!languageOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm"
              >
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {languages.find(lang => lang.code === currentLanguage)?.flag}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${languageOpen ? 'rotate-180' : ''}`} />
              </button>

              {languageOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLanguageOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 px-3 py-2 uppercase tracking-wide">
                        Select Language
                      </div>
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            changeLanguage(lang.code);
                            setLanguageOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${currentLanguage === lang.code
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          disabled={translating}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className="font-medium flex-1 text-left">{lang.name}</span>
                          {currentLanguage === lang.code && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900"> <TranslatedText>JaanNetaa</TranslatedText></div>
                  <div className="text-xs text-gray-500"><TranslatedText>Candidate</TranslatedText></div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="p-2">
                      <div className="px-3 py-3 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900"><TranslatedText>JanNetaa</TranslatedText></div>
                        <div className="text-xs text-gray-500"><TranslatedText>jannetaa@campaign.com</TranslatedText></div>
                      </div>

                      <button className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <Settings className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700"><TranslatedText>Settings</TranslatedText></span>
                      </button>

                      <button className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <LogOut className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700"><TranslatedText>Sign Out</TranslatedText></span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${isActive(item.path)
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                <TranslatedText>{item.name}</TranslatedText>
              </Link>
            ))}

            {/* Mobile Language Selector */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="text-sm font-semibold text-gray-500 px-4 py-2 uppercase tracking-wide">
                <TranslatedText>Language</TranslatedText>
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentLanguage === lang.code
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium"><TranslatedText>{lang.name}</TranslatedText></span>
                  {currentLanguage === lang.code && (
                    <div className="ml-auto w-2 h-2 bg-orange-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Mobile User Info */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900"><TranslatedText>Jannetaa</TranslatedText></div>
                  <div className="text-xs text-gray-500"><TranslatedText>Candidate</TranslatedText></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('upload');
  const [uploadComplete, setUploadComplete] = useState(false);
  const { currentLanguage, languages, changeLanguage, translating } = useAutoTranslate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleUploadComplete = (totalVoters) => {
    setUploadComplete(true);
    setCurrentView('dashboard');
  };

  return (
    <Router>
      <div className="App min-h-screen">
        <Navigation
          currentLanguage={currentLanguage}
          languages={languages}
          changeLanguage={changeLanguage}
          translating={translating}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <main className="flex-1">
          <Routes>
            <Route
              path="/upload"
              element={<Upload onUploadComplete={handleUploadComplete} />}
            />
            <Route path="/search" element={<Dashboard />} />
            <Route path="/home" element={<Home />} />
            <Route path="/team" element={<Team />} />
            <Route path="/booths" element={<BoothManagement />} />
            <Route path="/lists" element={<FilterPage />} />
            <Route path="/voter/:voterId" element={<FullVoterDetails />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>

        <footer class="bg-orange-100 sticky bottom-0 text-black py-2">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-center text-xs text-gray-300">
            <img src="https://webreich.vercel.app/logo.png" alt="" className='h-5 w-5 mr-2' />
              <strong class="text-orange-400 font-semibold">WebReich Solutions</strong>
              <span class="text-gray-900 mr-2 ml-2">|</span>
              <span className='text-black'>Partner PR Services & Technology</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;