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
        <div className="w-full h-screen overflow-hidden">
          <img
            src="/frontstaringbanner.jpeg"
            alt="Campaign banner"
            loading="eager"
            className="absolute inset-0 w-full h-full object-center"
          />
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
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
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
                    <TranslatedText>JanNetaa</TranslatedText>
                  </span>
                </h1>
                <p className="text-xs text-gray-600 font-medium mt-1">
                  <TranslatedText>Smart Elections Management Software</TranslatedText>
                </p>
              </div>

              {/* CTA Button */}
              {/* <button
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Get Started
              </button> */}
            </div>
          </div>

          {/* Partners Section */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-t border-orange-100 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {/* <div className="text-gray-600 font-medium">Developed by:</div> */}
                <span className="text-orange-600 font-semibold">
                  WebReich Solutions
                  
                  {/* <img src="/brand1.png" alt="" className='h-7 w-30' /> */}
                </span>
              </div>
              <div className="w-px h-4 bg-orange-200"></div>
              <div className="flex items-center gap-2">
                {/* <span className="text-gray-600 font-medium">Partner:</span> */}
                <span className="text-orange-600 font-semibold">
                  PR Services & Technology
                </span>
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
        <img src="/frontbanner.jpeg" alt="" />
      </div>

      {/* Footer Note */}
      <div className="max-w-md mx-auto mt-6 px-4 text-center">
        <p className="text-xs text-gray-500 font-medium">
          <TranslatedText>Empowering democratic processes through technology</TranslatedText>
        </p>
      </div>

      
    </div>
  );
};

export default Home;