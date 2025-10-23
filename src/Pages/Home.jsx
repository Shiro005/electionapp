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
    icon: <LayoutDashboard className="w-5 h-5 text-black" />,
    action: () => navigate('/search'),
  },
  {
    id: 'filters',
    title: 'Filters',
    icon: <Filter className="w-5 h-5 text-black" />,
    action: () => navigate('/filters'),
  },
  {
    id: 'survey',
    title: 'Survey',
    icon: <UserPlus className="w-5 h-5 text-black" />,
    action: () => navigate('/survey'),
  },
  {
    id: 'booth-management',
    title: 'Booths',
    icon: <MapPin className="w-5 h-5 text-black" />,
    action: () => navigate('/booth-management'),
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: <Settings className="w-5 h-5 text-black" />,
    action: () => navigate('/settings'),
  },
  {
    id: 'contactus',
    title: 'Contact Us',
    icon: <ContactIcon className="w-5 h-5 text-black" />,
    action: () => navigate('/contactus'),
  },
];

  if (showBranding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative w-full h-screen sm:h-[70vh] md:h-screen overflow-hidden">
          {/* Background image - responsive and covers area */}
          <img
            src="/bannerstarting.jpg"
            alt="Campaign banner"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-4 p-4">
      {/* Compact Brand Card (attention-grabbing, responsive) */}
      <div className="mb-6 px-4">
        <div className="max-w-md mx-auto backdrop-blur-sm rounded-3xl shadow-lg border border-white/30 flex items-center gap-4 p-3 sm:p-4">
          {/* Gradient logo badge */}
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 transform transition-all hover:scale-105">
            <img src="https://cdn-icons-png.flaticon.com/128/17873/17873030.png" alt="JanNetaa" />
          </div>

          {/* Title, CTA and micro-stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold leading-tight text-gray-900 truncate">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600"><TranslatedText>JanNetaa</TranslatedText></span>
                  {/* <span className="ml-1 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500"><TranslatedText>Netaa</TranslatedText></span> */}
                </h1>
                <p className="text-xs text-gray-700 truncate font-semibold"><TranslatedText>By WebReich Solutions</TranslatedText></p>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <TranslatedText>Get Started</TranslatedText>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Compact Features Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">
        {features.map((feature) => (
          <div
            key={feature.id}
            onClick={feature.action}
            className="group cursor-pointer"
          >
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-3 text-center hover:shadow-md transition-all duration-200 hover:border-orange-300">
              <div className="flex justify-center mb-2">
                <div className="text-orange-500 group-hover:text-orange-600 transition-colors">
                  {feature.icon}
                </div>
              </div>
              <div className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
               <TranslatedText>{feature.title}</TranslatedText>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Political Branding Section */}


      {/* Second politicial branding section  */}
      {/* Enhanced Political Branding Section */}
      <div className="mt-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto border-2 border-orange-300">
        <div className="flex h-auto"> {/* Fixed height for consistency */}

          {/* Left Side - Politician Image (30%) */}
          <div className="w-5/10 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent z-10"></div>
            <img
              src="/banner2.png"
              alt="Political Leader"
              className="w-full h-full object-cover items-center bg-amber-50"
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='192' viewBox='0 0 120 192'%3E%3Crect width='120' height='192' fill='%23fed7aa'/%3E%3Ccircle cx='60' cy='70' r='30' fill='%23fdba74'/%3E%3Crect x='45' y='110' width='30' height='60' fill='%23fdba74'/%3E%3C/svg%3E";
              }}
            />
            {/* Badge on image */}
            {/* <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
              <span className="text-xs font-bold text-orange-600">Official</span>
            </div> */}
          </div>

          {/* Right Side - Content (70%) */}
          <div className="w-7/10 p-4 flex flex-col justify-between bg-amber-50">

            {/* Top Section - Party Logos and Heading */}
            <div>
              {/* Party Alliance Logos */}
              <div className="flex justify-center items-center mb-3">
                <div className="flex space-x-2">
                  {/* Main Party Logo */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center ">
                    <img src="https://crystalpng.com/wp-content/uploads/2023/05/bjp-logo-png-1024x1024.png" alt="BJP" />
                  </div>
                  {/* Alliance Partner 1 */}
                  <div className="w-9 h-9 rounded flex items-center justify-center">
                    <img src="https://images.seeklogo.com/logo-png/39/2/shiv-sena-logo-png_seeklogo-393250.png?v=1957904908623799264" alt="Partner" />
                  </div>
                  {/* Alliance Partner 2 */}
                  <div className="w-8 h-8 rounded flex items-center justify-center">
                    <img src="https://www.clipartmax.com/png/middle/429-4291464_rashtrawadi-punha-clipart-nationalist-congress-party-rashtrawadi-congress-party-logo-png.png" alt="Partner" />
                  </div>
                </div>
              </div>

              {/* Main Heading */}
              <h3 className="text-orange-500 font-bold text-lg mb-1 leading-tight">
                <TranslatedText>Vinod Murlidhar Mapari</TranslatedText>
              </h3>

              {/* Tagline */}
              <p className="text-gray-800 text-sm mb-3 font-medium leading-tight">
                <TranslatedText>Akola Mahanagarpalika 2025 Sarvatrik Nivadanuak Prabhag Kr. 20 che Adhikrut Umedvaar</TranslatedText>
              </p>
            </div>

            {/* Middle Section - Campaign Slogan */}
            <div className="mb-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                <p className="text-gray-900 text-sm font-bold text-center leading-tight">
                  <TranslatedText>"Your Vote, Your Voice - Let's Build Together!"</TranslatedText>
                </p>
              </div>
            </div>

            {/* Bottom Section - Call to Action */}
            <div className="flex space-x-2">
              <button className="flex-1 bg-white text-orange-600 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-orange-50 transition-all duration-200 active:scale-95 text-center">
                <TranslatedText>Vote Now</TranslatedText>
              </button>
              <button className="flex-1 bg-orange-800 text-white py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-orange-900 transition-all duration-200 active:scale-95 text-center border border-orange-300">
                <TranslatedText>Share</TranslatedText>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="bg-white/10 backdrop-blur-sm border-t border-white/20">
          <div className="grid grid-cols-3 divide-x divide-white/20">
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
  );
};

export default Home;