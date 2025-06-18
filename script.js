// Language mapping for display names
const languageNames = {
    'en': 'English',
    'es': 'Spanish',
    'zh': 'Chinese',
    'fr': 'French',
    'ar': 'Arabic',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'de': 'German',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'nl': 'Dutch',
    'tr': 'Turkish',
    'pl': 'Polish',
    'sv': 'Swedish',
    'id': 'Indonesian',
    'vi': 'Vietnamese',
    'el': 'Greek',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'th': 'Thai',
    'he': 'Hebrew',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'da': 'Danish',
    'ro': 'Romanian',
    'uk': 'Ukrainian',
    'ms': 'Malay',
    'tl': 'Filipino',
    'sr': 'Serbian',
    'hr': 'Croatian',
    'sk': 'Slovak',
    'bg': 'Bulgarian',
    'lt': 'Lithuanian',
    'lv': 'Latvian'
};

// Translation delay mapping
const delayNames = {
    '0': 'No Limit',
    '5': '5 seconds',
    '10': '10 seconds',
    '30': '30 seconds',
    '60': '1 minute',
    '180': '3 minutes'
};

// Plan mapping
const planNames = {
    'free': 'Free - 5K characters',
    'basic': '$2 - 50K characters/month',
    'premium': '$4 - 150K characters/month'
};

// Configuration storage
let translatorConfig = null;
let lastTranslationTime = 0;
let charactersUsed = 0;
let maxCharacters = 5000; // Default for free plan

// Simple translation simulation data
const translationSamples = {
    'es': {
        'Hello': 'Hola',
        'How are you?': '¿Cómo estás?',
        'Good morning': 'Buenos días',
        'Thank you': 'Gracias',
        'Welcome': 'Bienvenido',
        'Goodbye': 'Adiós',
        'Please': 'Por favor',
        'Yes': 'Sí',
        'No': 'No'
    },
    'fr': {
        'Hello': 'Bonjour',
        'How are you?': 'Comment allez-vous?',
        'Good morning': 'Bonjour',
        'Thank you': 'Merci',
        'Welcome': 'Bienvenue',
        'Goodbye': 'Au revoir',
        'Please': 'S\'il vous plaît',
        'Yes': 'Oui',
        'No': 'Non'
    },
    'de': {
        'Hello': 'Hallo',
        'How are you?': 'Wie geht es dir?',
        'Good morning': 'Guten Morgen',
        'Thank you': 'Danke',
        'Welcome': 'Willkommen',
        'Goodbye': 'Auf Wiedersehen',
        'Please': 'Bitte',
        'Yes': 'Ja',
        'No': 'Nein'
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('translatorForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Load saved configuration if exists
    loadSavedConfiguration();
});

function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const nativeLanguage = formData.get('nativeLanguage');
    const secondLanguage = formData.get('secondLanguage') || null;
    const translationDelay = formData.get('translationDelay');
    const plan = formData.get('plan');
    
    if (!nativeLanguage) {
        alert('Please select your native language.');
        return;
    }
    
    // Set character limits based on plan
    switch(plan) {
        case 'free':
            maxCharacters = 5000;
            break;
        case 'basic':
            maxCharacters = 50000;
            break;
        case 'premium':
            maxCharacters = 150000;
            break;
    }
    
    // Save configuration
    translatorConfig = {
        nativeLanguage,
        secondLanguage,
        translationDelay: parseInt(translationDelay),
        plan,
        timestamp: Date.now()
    };
    
    // Save to localStorage
    localStorage.setItem('kickTranslatorConfig', JSON.stringify(translatorConfig));
    
    // Show translator interface
    showTranslatorInterface();
}

function showTranslatorInterface() {
    const authSection = document.querySelector('.auth-section');
    const translatorSection = document.getElementById('translatorSection');
    
    // Hide auth section
    authSection.style.display = 'none';
    
    // Populate status information
    document.getElementById('selectedNative').textContent = languageNames[translatorConfig.nativeLanguage];
    document.getElementById('selectedSecond').textContent = translatorConfig.secondLanguage ? 
        languageNames[translatorConfig.secondLanguage] : 'None';
    document.getElementById('selectedDelay').textContent = delayNames[translatorConfig.translationDelay.toString()];
    document.getElementById('selectedPlan').textContent = planNames[translatorConfig.plan];
    
    // Show translator section
    translatorSection.style.display = 'block';
    
    // Add some sample translated messages
    addSampleMessages();
}

function addSampleMessages() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = ''; // Clear existing messages
    
    // Add welcome message
    addMessage('System', 'Translation service is now active!', false, true);
    
    // Add some sample messages in different languages
    setTimeout(() => {
        addMessage('User456', 'Hello everyone!', false);
        setTimeout(() => {
            addMessage('User456', 'Hola a todos!', true);
        }, 500);
    }, 1000);
    
    setTimeout(() => {
        addMessage('ChatMaster', 'Welcome to the stream!', false);
        setTimeout(() => {
            addMessage('ChatMaster', '¡Bienvenidos al stream!', true);
        }, 500);
    }, 2500);
}

function addMessage(username, text, isTranslated, isSystem = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    if (isSystem) {
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `
            <span class="username">🤖 ${username}:</span>
            <span class="text">${text}</span>
        `;
    } else {
        messageDiv.className = isTranslated ? 'message translated' : 'message original';
        messageDiv.innerHTML = `
            <span class="username">${username}:</span>
            <span class="text">${text}</span>
            ${isTranslated ? '<span class="translation-badge">Translated</span>' : ''}
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Check if delay is active
    const now = Date.now();
    const timeSinceLastTranslation = now - lastTranslationTime;
    const delayMs = translatorConfig.translationDelay * 1000;
    
    if (delayMs > 0 && timeSinceLastTranslation < delayMs) {
        const remainingTime = Math.ceil((delayMs - timeSinceLastTranslation) / 1000);
        alert(`Please wait ${remainingTime} more seconds before sending another message.`);
        return;
    }
    
    // Check character limit
    if (charactersUsed + message.length > maxCharacters) {
        alert(`Character limit exceeded! You have used ${charactersUsed}/${maxCharacters} characters.`);
        return;
    }
    
    // Add original message
    addMessage('You', message, false);
    
    // Simulate translation
    setTimeout(() => {
        const translatedMessage = simulateTranslation(message);
        addMessage('You', translatedMessage, true);
        
        // Update usage
        charactersUsed += message.length;
        lastTranslationTime = now;
        
        // Update character count display (if you want to add this feature)
        updateCharacterCount();
    }, 1000);
    
    messageInput.value = '';
}

function simulateTranslation(message) {
    // Simple translation simulation
    // In a real application, you would use a translation API like Google Translate
    
    const targetLanguage = translatorConfig.nativeLanguage === 'en' ? 'es' : 'en';
    const samples = translationSamples[targetLanguage] || translationSamples['es'];
    
    // Check if we have a direct translation
    for (const [original, translated] of Object.entries(samples)) {
        if (message.toLowerCase().includes(original.toLowerCase())) {
            return message.replace(new RegExp(original, 'gi'), translated);
        }
    }
    
    // Fallback: simple character replacement simulation
    if (targetLanguage === 'es') {
        return message
            .replace(/hello/gi, 'hola')
            .replace(/how are you/gi, 'cómo estás')
            .replace(/thank you/gi, 'gracias')
            .replace(/yes/gi, 'sí')
            .replace(/no/gi, 'no');
    }
    
    // If no translation found, add a prefix
    return `[Translated] ${message}`;
}

function updateCharacterCount() {
    // This function could be used to show character usage
    // For now, it just logs to console
    console.log(`Characters used: ${charactersUsed}/${maxCharacters}`);
}

function resetConfiguration() {
    if (confirm('Are you sure you want to reset your configuration?')) {
        // Clear saved data
        localStorage.removeItem('kickTranslatorConfig');
        translatorConfig = null;
        charactersUsed = 0;
        lastTranslationTime = 0;
        
        // Show auth section again
        document.querySelector('.auth-section').style.display = 'block';
        document.getElementById('translatorSection').style.display = 'none';
        
        // Reset form
        document.getElementById('translatorForm').reset();
    }
}

function loadSavedConfiguration() {
    const saved = localStorage.getItem('kickTranslatorConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            
            // Check if configuration is less than 24 hours old for free plan
            const hoursOld = (Date.now() - config.timestamp) / (1000 * 60 * 60);
            if (config.plan === 'free' && hoursOld > 24) {
                // Expired free plan
                localStorage.removeItem('kickTranslatorConfig');
                return;
            }
            
            translatorConfig = config;
            
            // Set character limits
            switch(config.plan) {
                case 'free':
                    maxCharacters = 5000;
                    break;
                case 'basic':
                    maxCharacters = 50000;
                    break;
                case 'premium':
                    maxCharacters = 150000;
                    break;
            }
            
            // Populate form
            document.getElementById('nativeLanguage').value = config.nativeLanguage;
            document.getElementById('secondLanguage').value = config.secondLanguage || '';
            document.getElementById('translationDelay').value = config.translationDelay;
            document.querySelector(`input[name="plan"][value="${config.plan}"]`).checked = true;
            
            // Show translator interface
            showTranslatorInterface();
        } catch (error) {
            console.error('Error loading saved configuration:', error);
            localStorage.removeItem('kickTranslatorConfig');
        }
    }
}

// Handle Enter key in message input
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.target.id === 'messageInput') {
        event.preventDefault();
        sendMessage();
    }
});

// Add some additional helper functions for future enhancements
function detectLanguage(text) {
    // Simple language detection based on common words
    // In a real application, you would use a proper language detection library
    
    const englishWords = ['the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'you', 'that'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no'];
    const frenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'];
    
    const words = text.toLowerCase().split(' ');
    
    let englishScore = 0;
    let spanishScore = 0;
    let frenchScore = 0;
    
    words.forEach(word => {
        if (englishWords.includes(word)) englishScore++;
        if (spanishWords.includes(word)) spanishScore++;
        if (frenchWords.includes(word)) frenchScore++;
    });
    
    if (englishScore > spanishScore && englishScore > frenchScore) return 'en';
    if (spanishScore > englishScore && spanishScore > frenchScore) return 'es';
    if (frenchScore > englishScore && frenchScore > spanishScore) return 'fr';
    
    return 'unknown';
}

function shouldTranslate(detectedLanguage) {
    if (!translatorConfig) return false;
    
    // Don't translate if it's the native language
    if (detectedLanguage === translatorConfig.nativeLanguage) return false;
    
    // Don't translate if it's the second language (if set)
    if (translatorConfig.secondLanguage && detectedLanguage === translatorConfig.secondLanguage) return false;
    
    return true;
}

// Export functions for potential use in other scripts
window.kickTranslator = {
    sendMessage,
    resetConfiguration,
    detectLanguage,
    shouldTranslate
}; 