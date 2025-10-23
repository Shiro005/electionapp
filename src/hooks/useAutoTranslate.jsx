import { useState, useCallback, useEffect } from 'react';

// Cache for translations to avoid repeated API calls
const translationCache = new Map();

const useAutoTranslate = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translating, setTranslating] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' }
  ];

  // Improved translation function with caching
  const translateText = useCallback(async (text, targetLang) => {
    if (!text || targetLang === 'en') return text;
    
    const cacheKey = `${text}-${targetLang}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }
    
    try {
      setTranslating(true);
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
      );
      
      if (!response.ok) throw new Error('Translation failed');
      
      const data = await response.json();
      const translatedText = data[0][0][0] || text;
      
      // Cache the translation
      translationCache.set(cacheKey, translatedText);
      return translatedText;
    } catch (error) {
      console.warn('Translation failed for:', text, error);
      return text;
    } finally {
      setTranslating(false);
    }
  }, []);

  // Batch translation for multiple texts
  const translateMultiple = useCallback(async (texts, targetLang) => {
    if (targetLang === 'en') return texts;
    
    const translatedTexts = [];
    for (const text of texts) {
      const translated = await translateText(text, targetLang);
      translatedTexts.push(translated);
    }
    return translatedTexts;
  }, [translateText]);

  const changeLanguage = async (langCode) => {
    if (langCode === currentLanguage) return;
    
    setCurrentLanguage(langCode);
    localStorage.setItem('preferredLanguage', langCode);
    
    // Clear cache when language changes
    translationCache.clear();
    
    // Force re-render of all components
    window.location.reload();
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    setCurrentLanguage(savedLang);
  }, []);

  return {
    currentLanguage,
    languages,
    changeLanguage,
    translateText,
    translateMultiple,
    translating
  };
};

export default useAutoTranslate; 