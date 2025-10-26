import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TranslatedText from '../Components/TranslatedText';
import {
  LayoutDashboard,
  Filter,
  UserPlus,
  MapPin,
  Settings,
  UploadCloud,
  ContactIcon
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [showBranding, setShowBranding] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBranding(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      id: 'search',
      title: 'Search',
      icon: <LayoutDashboard className="w-5 h-5" />,
      action: () => navigate('/search'),
    },
    {
      id: 'Lists',
      title: 'Lists',
      icon: <Filter className="w-5 h-5" />,
      action: () => navigate('/lists'),
    },
    {
      id: 'survey',
      title: 'Survey',
      icon: <UserPlus className="w-5 h-5" />,
      action: () => navigate('/survey'),
    },
    {
      id: 'booth-management',
      title: 'Booths',
      icon: <MapPin className="w-5 h-5" />,
      action: () => navigate('/booths'),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      action: () => navigate('/settings'),
    },
    {
      id: 'contactus',
      title: 'Contact',
      icon: <ContactIcon className="w-5 h-5" />,
      action: () => navigate('/contactus'),
    },
  ];

  if (showBranding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="relative w-full h-screen overflow-hidden">
          <img
            src="/bannerstarting.jpg"
            alt="Campaign banner"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Overlay with branding */}
          {/* <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-center text-white bg-white/10 backdrop-blur-sm rounded-2xl p-6 mx-4 border border-white/20">
              <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center p-3">
                <img 
                  src="https://cdn-icons-png.flaticon.com/128/17873/17873030.png" 
                  alt="JanNetaa" 
                  className="w-12 h-12"
                />
              </div>
              <h1 className="text-3xl font-bold mb-2">JanNetaa</h1>
              <p className="text-white/90">Empowering Democratic Engagement</p>
            </div>
          </div> */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white pb-8">
      {/* Enhanced Header Section */}
      <div className="pt-6 px-4 mb-6">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden">
          {/* Main Brand Card */}
          <div className="p-4">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <img 
                  src="https://cdn-icons-png.flaticon.com/128/17873/17873030.png" 
                  alt="JanNetaa" 
                  className="w-8 h-8 filter brightness-0 invert"
                />
              </div>
              
              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">
                    JanNetaa
                  </span>
                </h1>
                <p className="text-xs text-gray-600 font-medium mt-1">
                  Smart Elections Management Software
                </p>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Partners Section */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-t border-orange-100 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {/* <div className="text-gray-600 font-medium">Developed by:</div> */}
                <span className="text-orange-700 font-bold text-xsm">WebReich Solutions</span>
              </div>
              <div className="w-px h-4 bg-orange-200"></div>
              <div className="flex items-center gap-2">
                {/* <span className="text-gray-600 font-medium">Partner:</span> */}
                <span className="text-orange-700 font-bold text-xsm">PR Services & Technology</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid - Enhanced */}
      <div className="grid grid-cols-3 gap-3 mb-8 max-w-md mx-auto px-4">
        {features.map((feature) => (
          <div
            key={feature.id}
            onClick={feature.action}
            className="group cursor-pointer transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-3 text-center hover:shadow-lg transition-all duration-200 hover:border-orange-300 group-active:bg-orange-50">
              <div className="flex justify-center mb-2">
                <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <div className="text-orange-500 group-hover:text-orange-600">
                    {feature.icon}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">
                <TranslatedText>{feature.title}</TranslatedText>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Political Branding Section */}
      <div className="max-w-md mx-auto px-4">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-2xl overflow-hidden border-2 border-orange-300 transform transition-all duration-300 hover:shadow-2xl">
          
          {/* Main Content */}
          <div className="flex h-auto bg-white">
            {/* Politician Image */}
            <div className="w-2/5 flex-shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent z-10"></div>
              <img
                src="/banner2.png"
                alt="Political Leader"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='192' viewBox='0 0 120 192'%3E%3Crect width='120' height='192' fill='%23fed7aa'/%3E%3Ccircle cx='60' cy='70' r='30' fill='%23fdba74'/%3E%3Crect x='45' y='110' width='30' height='60' fill='%23fdba74'/%3E%3C/svg%3E";
                }}
              />
            </div>

            {/* Content Area */}
            <div className="w-3/5 p-3 flex flex-col justify-between bg-gradient-to-br from-orange-50 to-amber-50">
              
              {/* Top Section */}
              <div>
                {/* Party Logos */}
                <div className="flex justify-center items-center mb-2">
                  <div className="flex space-x-1">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white p-0.5 shadow-sm">
                      <img src="https://crystalpng.com/wp-content/uploads/2023/05/bjp-logo-png-1024x1024.png" alt="BJP" className="w-full h-full object-contain" />
                    </div>
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-white p-0.5 shadow-sm">
                      <img src="https://images.seeklogo.com/logo-png/39/2/shiv-sena-logo-png_seeklogo-393250.png" alt="Partner" className="w-full h-full object-contain" />
                    </div>
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-white p-0.5 shadow-sm">
                      <img src="https://www.clipartmax.com/png/middle/429-4291464_rashtrawadi-punha-clipart-nationalist-congress-party-rashtrawadi-congress-party-logo-png.png" alt="Partner" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>

                {/* Name & Position */}
                <h3 className="text-orange-600 font-bold text-sm leading-tight text-center mb-1">
                  <TranslatedText>Vinod Murlidhar Mapari</TranslatedText>
                </h3>
                <p className="text-gray-700 text-xs text-center leading-tight font-medium">
                  <TranslatedText>Akola Mahanagarpalika 2025</TranslatedText>
                </p>
              </div>

              {/* Slogan */}
              <div className="my-2">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-orange-200">
                  <p className="text-gray-800 text-xs font-bold text-center leading-tight">
                    <TranslatedText>"Your Vote, Your Voice"</TranslatedText>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button className="flex-1 bg-white text-orange-600 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-orange-50 transition-all duration-200 active:scale-95 border border-orange-200">
                  <TranslatedText>Vote Now</TranslatedText>
                </button>
                <button className="flex-1 bg-orange-700 text-white py-2 rounded-lg text-xs font-bold shadow-md hover:bg-orange-800 transition-all duration-200 active:scale-95">
                  <TranslatedText>Share</TranslatedText>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600">
            <div className="grid grid-cols-3 divide-x divide-orange-400/30">
              <div className="py-2 text-center">
                <div className="text-white font-bold text-sm">10K+</div>
                <div className="text-orange-200 text-xs"><TranslatedText>Supporters</TranslatedText></div>
              </div>
              <div className="py-2 text-center">
                <div className="text-white font-bold text-sm">50+</div>
                <div className="text-orange-200 text-xs"><TranslatedText>Booths</TranslatedText></div>
              </div>
              <div className="py-2 text-center">
                <div className="text-white font-bold text-sm">98%</div>
                <div className="text-orange-200 text-xs"><TranslatedText>Active</TranslatedText></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="max-w-md mx-auto mt-6 px-4 text-center">
        <p className="text-xs text-gray-500 font-medium">
          Empowering democratic processes through technology
        </p>
      </div>
    </div>
  );
};

export default Home;