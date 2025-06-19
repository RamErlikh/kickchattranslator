class KickTranslatorBot {
    constructor() {
        this.kickClient = null;
        this.translator = new Translator();
        this.isRunning = false;
        this.isReadOnlyMode = false;
        this.awaitingOTP = false;
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
            channelUrl: document.getElementById('channelUrl'),
            otpGroup: document.getElementById('otpGroup'),
            botOtp: document.getElementById('botOtp'),
            resendOtp: document.getElementById('resendOtp')
        };

        // Add event listeners
        this.elements.startBot.addEventListener('click', () => this.startBot());
        this.elements.stopBot.addEventListener('click', () => this.stopBot());
        this.elements.clearLog.addEventListener('click', () => this.clearLog());
        
        // OTP event listeners
        if (this.elements.resendOtp) {
            this.elements.resendOtp.addEventListener('click', () => this.resendOTP());
        }
        
        // Auto-submit OTP when 6 digits are entered
        if (this.elements.botOtp) {
            this.elements.botOtp.addEventListener('input', (e) => {
                if (e.target.value.length === 6 && /^\d{6}$/.test(e.target.value)) {
                    this.submitOTP();
                }
            });
        }

        // Load saved configuration
        this.loadConfiguration();
    }

    async startBot() {
        try {
            // If awaiting OTP, submit it
            if (this.awaitingOTP) {
                await this.submitOTP();
                return;
            }

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

            // Initialize Kick client
            this.kickClient = new KickClient();
            
            // Try to login first
            this.log('🔐 Attempting to login to Kick...');
            const loginResult = await this.kickClient.login(this.config.username, this.config.password);
            
            if (loginResult.requiresOTP) {
                // Show OTP input
                this.awaitingOTP = true;
                this.showOTPInput();
                this.log('📧 2FA required - Check your email for the 6-digit code');
                this.updateStatus('connecting', 'Enter OTP Code');
                this.elements.startBot.textContent = 'Verify OTP';
                this.elements.startBot.disabled = false;
                return;
            } else if (!loginResult.success) {
                // Login failed completely
                throw new Error(loginResult.error || 'Login failed');
            }

            // Login successful, continue with chat connection
            await this.completeBotSetup(channelName);

        } catch (error) {
            console.error('Failed to start bot:', error);
            this.log(`❌ Error: ${error.message}`, 'error');
            this.updateStatus('disconnected', 'Connection Failed');
            this.resetUI();
        }
    }

    async submitOTP() {
        try {
            const otpCode = this.elements.botOtp.value.trim();
            if (!otpCode || otpCode.length !== 6) {
                alert('Please enter a valid 6-digit OTP code');
                return;
            }

            this.log('🔢 Verifying OTP code...');
            this.elements.startBot.disabled = true;

            const otpResult = await this.kickClient.loginWithOTP(
                this.config.username, 
                this.config.password, 
                otpCode
            );

            if (!otpResult.success) {
                throw new Error(otpResult.error || 'OTP verification failed');
            }

            this.log('✅ OTP verified successfully');
            this.awaitingOTP = false;
            this.hideOTPInput();

            // Continue with chat connection
            const channelName = this.extractChannelName(this.config.channelUrl);
            await this.completeBotSetup(channelName);

        } catch (error) {
            console.error('OTP verification failed:', error);
            this.log(`❌ OTP Error: ${error.message}`, 'error');
            this.elements.startBot.disabled = false;
        }
    }

    async resendOTP() {
        try {
            this.log('📧 Resending OTP code...');
            const success = await this.kickClient.resendOTP(this.config.username);
            if (success) {
                this.log('✅ New OTP code sent to your email');
            } else {
                this.log('❌ Failed to resend OTP code', 'error');
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            this.log(`❌ Error resending OTP: ${error.message}`, 'error');
        }
    }

    async completeBotSetup(channelName) {
        try {
            this.log('✅ Login successful - Full bot mode enabled');
            this.isReadOnlyMode = false;

            // Connect to chat
            this.log(`🌐 Connecting to channel: ${channelName}`);
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
            this.log('🤖 Bot is fully operational - will post translations to chat');
            
            this.elements.activeChannel.textContent = channelName;
            this.elements.stopBot.style.display = 'inline-flex';
            this.log(`🚀 Bot started successfully for channel: ${channelName}`);

        } catch (error) {
            // If full login fails, try read-only mode
            this.log('❌ Full bot mode failed, switching to read-only mode...', 'warning');
            await this.tryReadOnlyMode(channelName);
        }
    }

    async tryReadOnlyMode(channelName) {
        try {
            this.kickClient = new KickSimpleClient();
            this.isReadOnlyMode = true;

            const connected = await this.kickClient.connectToChat(channelName);
            if (!connected) {
                throw new Error('Failed to connect to chat in read-only mode');
            }

            this.kickClient.onMessage((message) => this.handleMessage(message));

            this.isRunning = true;
            this.stats.startTime = new Date();
            this.updateStatus('connecting', 'Connected (Read-Only Mode)');
            this.log('⚠️  Bot is in READ-ONLY mode - translations will be logged but NOT posted to chat');
            
            this.elements.activeChannel.textContent = channelName;
            this.elements.stopBot.style.display = 'inline-flex';
        } catch (error) {
            throw new Error('Both full and read-only modes failed: ' + error.message);
        }
    }

    showOTPInput() {
        this.elements.otpGroup.style.display = 'block';
        this.elements.botOtp.focus();
    }

    hideOTPInput() {
        this.elements.otpGroup.style.display = 'none';
        this.elements.botOtp.value = '';
    }

    resetUI() {
        this.elements.startBot.disabled = false;
        this.elements.startBot.innerHTML = '<i class="fas fa-play"></i> Start Translation Bot';
        this.awaitingOTP = false;
        this.hideOTPInput();
    }

    async stopBot() {
        try {
            this.isRunning = false;
            this.isReadOnlyMode = false;
            this.awaitingOTP = false;
            
            if (this.kickClient) {
                this.kickClient.disconnect();
                this.kickClient = null;
            }

            this.updateStatus('disconnected', 'Disconnected');
            this.elements.activeChannel.textContent = 'None';
            this.resetUI();
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

            // Log received message for debugging
            this.log(`📨 Received: ${message.username}: "${message.content}"`);

            // Check if message needs translation
            const shouldTranslate = await this.translator.shouldTranslate(
                message.content, 
                this.config.targetLanguage
            );

            if (shouldTranslate) {
                this.log(`🔍 Message needs translation from ${message.username}`);
                // Apply translation delay if configured
                if (this.config.translationDelay > 0) {
                    setTimeout(() => this.translateAndSend(message), this.config.translationDelay);
                } else {
                    await this.translateAndSend(message);
                }
            } else {
                this.log(`⏭️  Skipping translation (already in target language): ${message.content}`);
            }

        } catch (error) {
            console.error('Error handling message:', error);
            this.log(`❌ Error handling message: ${error.message}`, 'error');
        }
    }

    async translateAndSend(message) {
        try {
            if (!this.isRunning) return;

            this.log(`🔄 Translating message from ${message.username}...`);

            // Detect source language and translate
            const detectedLang = await this.translator.detectLanguage(message.content);
            this.log(`🌍 Detected language: ${detectedLang}`);
            
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
                if (this.isReadOnlyMode) {
                    this.log(`📋 [READ-ONLY] Would send: "${botMessage}"`, 'warning');
                    this.log(`🔤 Translation: "${message.content}" → "${translatedText}"`);
                } else {
                    try {
                        if (this.kickClient && typeof this.kickClient.sendMessage === 'function') {
                            await this.kickClient.sendMessage(botMessage);
                            this.log(`✅ Sent translation to chat: @${message.username}`);
                            this.log(`🔤 "${message.content}" → "${translatedText}"`);
                        } else {
                            this.log(`❌ Cannot send message - sendMessage function not available`, 'error');
                        }
                    } catch (sendError) {
                        this.log(`❌ Failed to send message: ${sendError.message}`, 'error');
                        this.log(`🔤 Translation was: "${message.content}" → "${translatedText}"`);
                    }
                }

                // Update stats
                this.stats.translatedCount++;
                this.elements.translatedCount.textContent = this.stats.translatedCount;
            } else {
                this.log(`⚠️  Translation failed or returned same text`);
            }

        } catch (error) {
            console.error('Translation error:', error);
            this.log(`❌ Translation error: ${error.message}`, 'error');
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