class KickTranslatorBot {
    constructor() {
        this.kickClient = null;
        this.translator = new Translator();
        this.isRunning = false;
        this.isReadOnlyMode = false;
        this.config = {
            username: '',
            password: '',
            targetLanguage: 'en',
            translationDelay: 0,
            channelUrl: ''
        };
        this.stats = {
            translatedCount: 0,
            startTime: null
        };
        this.processedMessages = new Set();
        
        this.initializeUI();
    }

    initializeUI() {
        // Get DOM elements
        this.elements = {
            startBot: document.getElementById('startBot'),
            stopBot: document.getElementById('stopBot'),
            botStatus: document.getElementById('botStatus'),
            translatedCount: document.getElementById('translatedCount'),
            activeChannel: document.getElementById('activeChannel'),
            translationLog: document.getElementById('translationLog'),
            clearLog: document.getElementById('clearLog'),
            botUsername: document.getElementById('botUsername'),
            botPassword: document.getElementById('botPassword'),
            targetLanguage: document.getElementById('targetLanguage'),
            translationDelay: document.getElementById('translationDelay'),
            channelUrl: document.getElementById('channelUrl')
        };

        // Add event listeners
        this.elements.startBot.addEventListener('click', () => this.startBot());
        this.elements.stopBot.addEventListener('click', () => this.stopBot());
        this.elements.clearLog.addEventListener('click', () => this.clearLog());

        // Load saved configuration
        this.loadConfiguration();
        
        // Show initial information about OTP requirement
        this.showInitialInfo();
    }

    showInitialInfo() {
        this.log('🤖 Kick Chat Translator initialized');
        this.log('ℹ️  Note: Kick.com requires OTP (One-Time Password) for login');
        this.log('📋 This bot will run in READ-ONLY mode (shows translations but cannot post)');
        this.log('💡 Translations will be displayed here for you to copy and paste manually');
    }

    async startBot() {
        try {
            // Validate inputs
            if (!this.validateInputs()) {
                return;
            }

            // Update configuration
            this.updateConfiguration();
            this.saveConfiguration();

            // Update UI
            this.updateStatus('connecting', 'Connecting...');
            this.elements.startBot.disabled = true;

            // Extract channel name from URL
            const channelName = this.extractChannelName(this.config.channelUrl);
            if (!channelName) {
                throw new Error('Invalid channel URL');
            }

            this.log('🚀 Starting Kick Chat Translator...');
            this.log(`🎯 Target Channel: ${channelName}`);
            this.log(`🌍 Target Language: ${this.config.targetLanguage.toUpperCase()} (messages in this language will NOT be translated)`);

            // Skip login attempt since we know OTP is required
            this.log('⚠️  Skipping login - Kick requires OTP authentication');
            this.log('🔍 Running in READ-ONLY mode (cannot post messages to chat)');
            
            // Use simple client directly
            this.kickClient = new KickSimpleClient();
            this.isReadOnlyMode = true;

            // Connect to chat
            this.log(`🌐 Connecting to channel: ${channelName}...`);
            const connected = await this.kickClient.connectToChat(channelName);
            
            if (!connected) {
                throw new Error('Failed to connect to chat');
            }

            // Set up message handler
            this.kickClient.onMessage((message) => this.handleMessage(message));

            // Update status for read-only mode
            this.isRunning = true;
            this.stats.startTime = new Date();
            this.updateStatus('connecting', 'Connected (Read-Only Mode)');
            this.log('✅ Successfully connected to chat!');
            this.log('👀 Now monitoring chat messages...');
            this.log('🔤 Non-English messages will be translated and shown below');
            this.log('📋 Copy translations from here and paste them into chat manually');
            
            this.elements.activeChannel.textContent = channelName;
            this.elements.stopBot.style.display = 'inline-flex';

        } catch (error) {
            console.error('Failed to start bot:', error);
            this.log(`❌ Error: ${error.message}`, 'error');
            this.updateStatus('disconnected', 'Connection Failed');
            this.elements.startBot.disabled = false;
        }
    }

    async stopBot() {
        try {
            this.isRunning = false;
            this.isReadOnlyMode = false;
            
            if (this.kickClient) {
                this.kickClient.disconnect();
                this.kickClient = null;
            }

            this.updateStatus('disconnected', 'Disconnected');
            this.elements.activeChannel.textContent = 'None';
            this.elements.startBot.disabled = false;
            this.elements.stopBot.style.display = 'none';
            this.log('🛑 Bot stopped');

        } catch (error) {
            console.error('Error stopping bot:', error);
            this.log(`❌ Error stopping bot: ${error.message}`, 'error');
        }
    }

    async handleMessage(message) {
        try {
            // Skip if bot is not running or message already processed
            if (!this.isRunning || this.processedMessages.has(message.id)) {
                return;
            }

            // Mark message as processed
            this.processedMessages.add(message.id);

            // Clean up old processed messages (keep last 1000)
            if (this.processedMessages.size > 1000) {
                const messagesArray = Array.from(this.processedMessages);
                this.processedMessages.clear();
                messagesArray.slice(-500).forEach(id => this.processedMessages.add(id));
            }

            // Log received message
            this.log(`💬 ${message.username}: ${message.content}`);

            // Check if message needs translation
            const shouldTranslate = await this.translator.shouldTranslate(
                message.content, 
                this.config.targetLanguage
            );

            if (shouldTranslate) {
                this.log(`🔍 Translating message from ${message.username}...`);
                // Apply translation delay if configured
                if (this.config.translationDelay > 0) {
                    setTimeout(() => this.translateAndShow(message), this.config.translationDelay);
                } else {
                    await this.translateAndShow(message);
                }
            }

        } catch (error) {
            console.error('Error handling message:', error);
            this.log(`❌ Error handling message: ${error.message}`, 'error');
        }
    }

    async translateAndShow(message) {
        try {
            if (!this.isRunning) return;

            // Detect source language and translate
            const detectedLang = await this.translator.detectLanguage(message.content);
            
            const translatedText = await this.translator.translateText(
                message.content,
                detectedLang,
                this.config.targetLanguage
            );

            if (translatedText && translatedText !== message.content) {
                // Format the translation
                const formattedTranslation = this.translator.formatTranslation(
                    message.content,
                    translatedText,
                    detectedLang,
                    this.config.targetLanguage
                );

                // Create the bot message that would be sent
                const botMessage = `@${message.username} ${formattedTranslation}`;

                // Show the translation prominently
                this.log(`🌟 TRANSLATION READY:`, 'translation');
                this.log(`📝 Copy this: ${botMessage}`, 'translation');
                this.log(`🔤 Original: "${message.content}" → "${translatedText}"`, 'info');
                this.log(`🌍 Language: ${this.translator.supportedLanguages[detectedLang] || detectedLang} → ${this.translator.supportedLanguages[this.config.targetLanguage] || this.config.targetLanguage}`, 'info');
                this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'separator');

                // Update stats
                this.stats.translatedCount++;
                this.elements.translatedCount.textContent = this.stats.translatedCount;

                // Optional: Add to clipboard if supported
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(botMessage);
                        this.log('📋 Translation copied to clipboard!', 'success');
                    }
                } catch (clipboardError) {
                    // Clipboard access might not be available
                }

            } else {
                this.log(`⚠️  Translation failed or returned same text for: "${message.content}"`);
            }

        } catch (error) {
            console.error('Translation error:', error);
            this.log(`❌ Translation error: ${error.message}`, 'error');
        }
    }

    validateInputs() {
        const channelUrl = this.elements.channelUrl.value.trim();

        if (!channelUrl) {
            alert('Please enter channel URL');
            return false;
        }

        const channelName = this.extractChannelName(channelUrl);
        if (!channelName) {
            alert('Invalid channel URL. Please use format: https://kick.com/channelname');
            return false;
        }

        return true;
    }

    updateConfiguration() {
        this.config.username = this.elements.botUsername.value.trim();
        this.config.password = this.elements.botPassword.value.trim();
        this.config.targetLanguage = this.elements.targetLanguage.value;
        this.config.translationDelay = parseInt(this.elements.translationDelay.value);
        this.config.channelUrl = this.elements.channelUrl.value.trim();
    }

    extractChannelName(url) {
        try {
            // Remove trailing slashes and extract channel name
            const cleanUrl = url.replace(/\/$/, '');
            const matches = cleanUrl.match(/kick\.com\/([^\/\?]+)/);
            return matches ? matches[1] : null;
        } catch (error) {
            return null;
        }
    }

    updateStatus(status, text) {
        this.elements.botStatus.className = `status-${status}`;
        this.elements.botStatus.innerHTML = `<i class="fas fa-circle"></i> ${text}`;
        
        if (status === 'connecting') {
            this.elements.botStatus.classList.add('pulse');
        } else {
            this.elements.botStatus.classList.remove('pulse');
        }
    }

    log(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const content = document.createElement('div');
        content.className = 'content';
        content.textContent = message;
        
        logEntry.appendChild(timestamp);
        logEntry.appendChild(content);
        
        this.elements.translationLog.appendChild(logEntry);
        this.elements.translationLog.scrollTop = this.elements.translationLog.scrollHeight;
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    clearLog() {
        this.elements.translationLog.innerHTML = '';
        this.showInitialInfo();
    }

    saveConfiguration() {
        try {
            const configToSave = { ...this.config };
            delete configToSave.password; // Don't save password
            localStorage.setItem('kickTranslatorConfig', JSON.stringify(configToSave));
        } catch (error) {
            console.warn('Failed to save configuration:', error);
        }
    }

    loadConfiguration() {
        try {
            const saved = localStorage.getItem('kickTranslatorConfig');
            if (saved) {
                const config = JSON.parse(saved);
                
                if (config.username) this.elements.botUsername.value = config.username;
                if (config.targetLanguage) this.elements.targetLanguage.value = config.targetLanguage;
                if (config.translationDelay !== undefined) this.elements.translationDelay.value = config.translationDelay;
                if (config.channelUrl) this.elements.channelUrl.value = config.channelUrl;
            }
        } catch (error) {
            console.warn('Failed to load configuration:', error);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load Pusher library for Kick chat connection
    const pusherScript = document.createElement('script');
    pusherScript.src = 'https://js.pusher.com/8.2.0/pusher.min.js';
    pusherScript.onload = () => {
        // Initialize the translator bot
        window.kickTranslatorBot = new KickTranslatorBot();
    };
    document.head.appendChild(pusherScript);
});

// Handle page visibility change to pause/resume bot
document.addEventListener('visibilitychange', () => {
    if (window.kickTranslatorBot) {
        if (document.hidden) {
            console.log('Page hidden, bot will continue running...');
        } else {
            console.log('Page visible again');
        }
    }
}); 