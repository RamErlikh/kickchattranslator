class Translator {
    constructor() {
        this.supportedLanguages = {
            'en': 'English', 'es': 'Spanish', 'zh': 'Chinese', 'fr': 'French',
            'ar': 'Arabic', 'ru': 'Russian', 'pt': 'Portuguese', 'de': 'German',
            'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'hi': 'Hindi',
            'nl': 'Dutch', 'tr': 'Turkish', 'pl': 'Polish', 'sv': 'Swedish',
            'id': 'Indonesian', 'vi': 'Vietnamese', 'th': 'Thai', 'cs': 'Czech',
            'hu': 'Hungarian', 'fi': 'Finnish', 'no': 'Norwegian', 'da': 'Danish',
            'ro': 'Romanian', 'uk': 'Ukrainian'
        };
        
        this.translationCache = new Map();
        this.translationQueue = [];
        this.isProcessing = false;
    }

    // Detect language of text
    async detectLanguage(text) {
        try {
            // Simple language detection based on character patterns
            if (/[\u4e00-\u9fff]/.test(text)) return 'zh'; // Chinese
            if (/[\u0600-\u06ff]/.test(text)) return 'ar'; // Arabic
            if (/[\u0400-\u04ff]/.test(text)) return 'ru'; // Russian
            if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'; // Japanese
            if (/[\uac00-\ud7af]/.test(text)) return 'ko'; // Korean
            if (/[\u0e00-\u0e7f]/.test(text)) return 'th'; // Thai
            if (/[\u0370-\u03ff]/.test(text)) return 'el'; // Greek

            // Use LibreTranslate for better detection
            const response = await fetch('https://libretranslate.de/detect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text
                })
            });

            if (response.ok) {
                const result = await response.json();
                return result[0]?.language || 'en';
            }
        } catch (error) {
            console.warn('Language detection failed:', error);
        }
        
        return 'en'; // Default to English
    }

    // Translate text using multiple APIs for redundancy
    async translateText(text, fromLang, toLang) {
        if (fromLang === toLang) return text;
        
        const cacheKey = `${text}_${fromLang}_${toLang}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            // Try LibreTranslate first (free and no API key required)
            let translation = await this.translateWithLibreTranslate(text, fromLang, toLang);
            
            if (!translation) {
                // Fallback to MyMemory
                translation = await this.translateWithMyMemory(text, fromLang, toLang);
            }
            
            if (!translation) {
                // Final fallback to a simple dictionary approach for common phrases
                translation = this.translateCommonPhrases(text, toLang);
            }

            if (translation && translation !== text) {
                this.translationCache.set(cacheKey, translation);
                return translation;
            }
        } catch (error) {
            console.error('Translation failed:', error);
        }
        
        return text; // Return original if translation fails
    }

    async translateWithLibreTranslate(text, fromLang, toLang) {
        try {
            const response = await fetch('https://libretranslate.de/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: fromLang,
                    target: toLang,
                    format: 'text'
                })
            });

            if (response.ok) {
                const result = await response.json();
                return result.translatedText;
            }
        } catch (error) {
            console.warn('LibreTranslate failed:', error);
        }
        return null;
    }

    async translateWithMyMemory(text, fromLang, toLang) {
        try {
            const langPair = `${fromLang}|${toLang}`;
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.responseStatus === 200) {
                    return result.responseData.translatedText;
                }
            }
        } catch (error) {
            console.warn('MyMemory translation failed:', error);
        }
        return null;
    }

    translateCommonPhrases(text, toLang) {
        const commonPhrases = {
            'hello': {
                'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'it': 'ciao',
                'pt': 'olá', 'ru': 'привет', 'zh': '你好', 'ja': 'こんにちは',
                'ko': '안녕하세요', 'ar': 'مرحبا', 'hi': 'नमस्ते'
            },
            'thanks': {
                'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'it': 'grazie',
                'pt': 'obrigado', 'ru': 'спасибо', 'zh': '谢谢', 'ja': 'ありがとう',
                'ko': '감사합니다', 'ar': 'شكرا', 'hi': 'धन्यवाद'
            },
            'yes': {
                'es': 'sí', 'fr': 'oui', 'de': 'ja', 'it': 'sì',
                'pt': 'sim', 'ru': 'да', 'zh': '是', 'ja': 'はい',
                'ko': '네', 'ar': 'نعم', 'hi': 'हाँ'
            },
            'no': {
                'es': 'no', 'fr': 'non', 'de': 'nein', 'it': 'no',
                'pt': 'não', 'ru': 'нет', 'zh': '不', 'ja': 'いいえ',
                'ko': '아니요', 'ar': 'لا', 'hi': 'नहीं'
            }
        };

        const lowerText = text.toLowerCase().trim();
        if (commonPhrases[lowerText] && commonPhrases[lowerText][toLang]) {
            return commonPhrases[lowerText][toLang];
        }
        
        return null;
    }

    // Check if text needs translation
    async shouldTranslate(text, targetLanguage) {
        const detectedLang = await this.detectLanguage(text);
        return detectedLang !== targetLanguage && text.trim().length > 0;
    }

    // Format translation for chat
    formatTranslation(originalText, translatedText, fromLang, toLang) {
        const fromLangName = this.supportedLanguages[fromLang] || fromLang;
        const toLangName = this.supportedLanguages[toLang] || toLang;
        
        return `🔤 [${fromLangName} → ${toLangName}] ${translatedText}`;
    }

    // Clear translation cache
    clearCache() {
        this.translationCache.clear();
    }

    // Get cache size
    getCacheSize() {
        return this.translationCache.size;
    }
} 