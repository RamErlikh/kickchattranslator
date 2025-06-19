class KickTranslatorBot {
    constructor() {
        this.kickClient = null;
        this.translator = new Translator();
        this.isRunning = false;
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

            // Initialize and connect Kick client
            this.kickClient = new KickClient();
            
            // Try to login first
            this.log('Attempting to login...');
            const loginSuccess = await this.kickClient.login(this.config.username, this.config.password);
            
            if (!loginSuccess) {
                // If login fails, try simple client (read-only mode)
                this.log('Login failed, switching to read-only mode...');
                this.kickClient = new KickSimpleClient();
            }

            // Connect to chat
            this.log(`Connecting to channel: ${channelName}`);
            const connected = await this.kickClient.connectToChat(channelName);
            
            if (!connected) {
                throw new Error('Failed to connect to chat');
            }

            // Set up message handler
            this.kickClient.onMessage((message) => this.handleMessage(message));

            // Update status
            this.isRunning = true;
            this.stats.startTime = new Date();
            this.updateStatus('connected', 'Connected & Translating');
            this.elements.activeChannel.textContent = channelName;
            this.elements.stopBot.style.display = 'inline-flex';
            this.log(`Bot started successfully for channel: ${channelName}`);

        } catch (error) {
            console.error('Failed to start bot:', error);
            this.log(`Error: ${error.message}`, 'error');
            this.updateStatus('disconnected', 'Connection Failed');
            this.elements.startBot.disabled = false;
        }
    }

    async stopBot() {
        try {
            this.isRunning = false;
            
            if (this.kickClient) {
                this.kickClient.disconnect();
                this.kickClient = null;
            }

            this.updateStatus('disconnected', 'Disconnected');
            this.elements.activeChannel.textContent = 'None';
            this.elements.startBot.disabled = false;
            this.elements.stopBot.style.display = 'none';
            this.log('Bot stopped');

        } catch (error) {
            console.error('Error stopping bot:', error);
            this.log(`Error stopping bot: ${error.message}`, 'error');
        }
    }

    async handleMessage(message) {
        try {
            // Skip if bot is not running or message already processed
            if (!this.isRunning || this.processedMessages.has(message.id)) {
                return;
            }

            // Skip bot's own messages
            if (message.username === this.config.username) {
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

            // Check if message needs translation
            const shouldTranslate = await this.translator.shouldTranslate(
                message.content, 
                this.config.targetLanguage
            );

            if (shouldTranslate) {
                // Apply translation delay if configured
                if (this.config.translationDelay > 0) {
                    setTimeout(() => this.translateAndSend(message), this.config.translationDelay);
                } else {
                    await this.translateAndSend(message);
                }
            }

        } catch (error) {
            console.error('Error handling message:', error);
            this.log(`Error handling message: ${error.message}`, 'error');
        }
    }

    async translateAndSend(message) {
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

                // Add user reference
                const botMessage = `@${message.username} ${formattedTranslation}`;

                // Try to send the message (if bot has send permissions)
                try {
                    if (this.kickClient && typeof this.kickClient.sendMessage === 'function') {
                        await this.kickClient.sendMessage(botMessage);
                        this.log(`Sent translation for @${message.username}: "${message.content}" → "${translatedText}"`);
                    } else {
                        this.log(`Would translate for @${message.username}: "${message.content}" → "${translatedText}" (Read-only mode)`);
                    }
                } catch (sendError) {
                    console.warn('Failed to send message, logging translation:', sendError);
                    this.log(`Translation for @${message.username}: "${message.content}" → "${translatedText}" (Send failed: ${sendError.message})`);
                }

                // Update stats
                this.stats.translatedCount++;
                this.elements.translatedCount.textContent = this.stats.translatedCount;
            }

        } catch (error) {
            console.error('Translation error:', error);
            this.log(`Translation error: ${error.message}`, 'error');
        }
    }

    validateInputs() {
        const username = this.elements.botUsername.value.trim();
        const password = this.elements.botPassword.value.trim();
        const channelUrl = this.elements.channelUrl.value.trim();

        if (!username) {
            alert('Please enter bot username');
            return false;
        }

        if (!password) {
            alert('Please enter bot password');
            return false;
        }

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