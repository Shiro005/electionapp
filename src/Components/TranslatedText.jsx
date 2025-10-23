import React, { useState, useEffect } from 'react';
import useAutoTranslate from '../hooks/useAutoTranslate.jsx';

// asText: when true, return a plain text node (useful inside <option> or <label>)
const TranslatedText = ({ children, className = '', asText = false }) => {
  const [translatedText, setTranslatedText] = useState(children);
  const { currentLanguage, translateText, translating } = useAutoTranslate();

  useEffect(() => {
    let mounted = true;
    const translate = async () => {
      if (currentLanguage !== 'en' && children) {
        const translated = await translateText(children, currentLanguage);
        if (mounted) setTranslatedText(translated);
      } else {
        if (mounted) setTranslatedText(children);
      }
    };

    translate();
    return () => { mounted = false; };
  }, [children, currentLanguage, translateText]);

  const content = translating && currentLanguage !== 'en' ? 'Translating...' : translatedText;

  if (asText) return content;

  return (
    <span className={className}>
      {content}
    </span>
  );
};

export default TranslatedText;