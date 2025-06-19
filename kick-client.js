class KickClient {
    constructor() {
        this.socket = null;
        this.pusher = null;
        this.chatroom = null;
        this.authToken = null;
        this.isConnected = false;
        this.messageHandlers = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.channelId = null;
        this.chatroomId = null;
        this.csrfToken = null;
    }

    // Get CSRF token
    async getCSRFToken() {
        try {
            const response = await fetch('https://kick.com/api/v1/authentication/csrf', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrf_token || data.token;
                return this.csrfToken;
            }
            throw new Error('Failed to get CSRF token');
        } catch (error) {
            console.error('CSRF token error:', error);
            return null;
        }
    }

    // Login to Kick (step 1 - sends OTP to email)
    async login(username, password) {
        try {
            // Get CSRF token first
            const csrfToken = await this.getCSRFToken();
            if (!csrfToken) {
                throw new Error('Could not obtain CSRF token due to browser CORS restrictions');
            }

            // Initial login request (this will trigger OTP email)
            const loginResponse = await fetch('https://kick.com/mobile/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: username,
                    password: password,
                    remember_me: true
                })
            });

            const responseData = await loginResponse.json();

            if (loginResponse.ok) {
                // Full login successful (no 2FA required)
                this.authToken = responseData.token;
                return { success: true, requiresOTP: false };
            } else if (loginResponse.status === 422 || responseData.requires_2fa) {
                // 2FA required
                return { success: false, requiresOTP: true, message: 'OTP required' };
            } else {
                throw new Error(responseData.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Detect CORS-related errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('CORS: Browser blocked request to Kick.com');
            }
            
            return { success: false, requiresOTP: false, error: error.message };
        }
    }

    // Complete login with OTP
    async loginWithOTP(username, password, otpCode) {
        try {
            if (!this.csrfToken) {
                await this.getCSRFToken();
            }

            const response = await fetch('https://kick.com/mobile/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: username,
                    password: password,
                    one_time_password: otpCode,
                    remember_me: true
                })
            });

            if (response.ok) {
                const userData = await response.json();
                this.authToken = userData.token;
                return { success: true };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'OTP verification failed');
            }
        } catch (error) {
            console.error('OTP login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Resend OTP code
    async resendOTP(username) {
        try {
            const response = await fetch('https://kick.com/api/v1/authentication/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': this.csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: username
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Resend OTP error:', error);
            return false;
        }
    }

    // Get channel information
    async getChannelInfo(channelName) {
        try {
            const response = await fetch(`https://kick.com/api/v2/channels/${channelName}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const channelData = await response.json();
                this.channelId = channelData.id;
                this.chatroomId = channelData.chatroom.id;
                return channelData;
            }
            throw new Error('Channel not found');
        } catch (error) {
            console.error('Failed to get channel info:', error);
            return null;
        }
    }

    // Connect to chat using WebSocket and Pusher
    async connectToChat(channelName) {
        try {
            const channelInfo = await this.getChannelInfo(channelName);
            if (!channelInfo) {
                throw new Error('Could not get channel information');
            }

            // Initialize Pusher connection (Kick uses Pusher for real-time chat)
            this.pusher = new Pusher('eb1d5f283081a78b932c', {
                wsHost: 'ws-us2.pusher.channels.pusher.com',
                wsPort: 443,
                wssPort: 443,
                forceTLS: true,
                enabledTransports: ['ws', 'wss'],
                cluster: 'us2'
            });

            // Subscribe to chatroom channel
            const channel = this.pusher.subscribe(`chatrooms.${this.chatroomId}.v2`);
            
            // Listen for chat messages
            channel.bind('App\\Events\\ChatMessageEvent', (data) => {
                this.handleMessage(data);
            });

            // Connection state handlers
            this.pusher.connection.bind('connected', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('Connected to Kick chat');
            });

            this.pusher.connection.bind('disconnected', () => {
                this.isConnected = false;
                console.log('Disconnected from Kick chat');
                this.attemptReconnect();
            });

            this.pusher.connection.bind('error', (error) => {
                console.error('Pusher connection error:', error);
            });

            return true;
        } catch (error) {
            console.error('Failed to connect to chat:', error);
            return false;
        }
    }

    // Handle incoming chat messages
    handleMessage(data) {
        if (data && data.data) {
            const message = {
                id: data.data.id,
                username: data.data.sender.username,
                content: data.data.content,
                timestamp: new Date(data.data.created_at),
                user: data.data.sender
            };

            // Notify all message handlers
            this.messageHandlers.forEach(handler => {
                try {
                    handler(message);
                } catch (error) {
                    console.error('Message handler error:', error);
                }
            });
        }
    }

    // Send a message to the chat
    async sendMessage(message) {
        if (!this.isConnected || !this.chatroomId) {
            throw new Error('Not connected to chat');
        }

        try {
            const response = await fetch(`https://kick.com/api/v2/messages/send/${this.chatroomId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                    'X-XSRF-TOKEN': this.csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: message,
                    type: 'message'
                })
            });

            if (response.ok) {
                return await response.json();
            }
            
            throw new Error(`Failed to send message: ${response.status}`);
        } catch (error) {
            console.error('Send message error:', error);
            throw error;
        }
    }

    // Add message handler
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }

    // Remove message handler
    removeMessageHandler(handler) {
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
            this.messageHandlers.splice(index, 1);
        }
    }

    // Attempt to reconnect
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                if (this.pusher) {
                    this.pusher.connect();
                }
            }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    // Disconnect from chat
    disconnect() {
        if (this.pusher) {
            this.pusher.disconnect();
            this.pusher = null;
        }
        
        this.isConnected = false;
        this.messageHandlers = [];
        this.reconnectAttempts = 0;
    }

    // Get connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            channelId: this.channelId,
            chatroomId: this.chatroomId,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Alternative simpler implementation with better error handling
class KickSimpleClient {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.messageHandlers = [];
        this.channelName = null;
    }

    // Connect using direct API calls (no CORS proxy needed)
    async connectToChat(channelName) {
        try {
            this.channelName = channelName;
            
            // Start polling for messages directly
            this.startPolling(channelName);
            
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect:', error);
            return false;
        }
    }

    // Poll for new messages directly from Kick API
    startPolling(channelName) {
        let lastMessageId = 0;
        
        const poll = async () => {
            try {
                // Try direct API call first
                const response = await fetch(`https://kick.com/api/v2/channels/${channelName}/messages`, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        const newMessages = data.data.filter(msg => msg.id > lastMessageId);
                        
                        newMessages.forEach(msgData => {
                            if (msgData.id > lastMessageId) {
                                lastMessageId = msgData.id;
                                const message = {
                                    id: msgData.id,
                                    username: msgData.sender?.username || 'Anonymous',
                                    content: msgData.content,
                                    timestamp: new Date(msgData.created_at),
                                    user: msgData.sender
                                };
                                
                                this.handleMessage(message);
                            }
                        });
                    }
                } else {
                    console.warn(`API returned status ${response.status}`);
                }
            } catch (error) {
                console.warn('Polling error:', error.message);
            }
            
            if (this.isConnected) {
                setTimeout(poll, 5000); // Poll every 5 seconds
            }
        };
        
        poll();
    }

    // Handle incoming messages
    handleMessage(message) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('Message handler error:', error);
            }
        });
    }

    // Add message handler
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }

    // Disconnect
    disconnect() {
        this.isConnected = false;
        this.messageHandlers = [];
    }

    // Note: This simplified client can only read messages, not send them
    async sendMessage(message) {
        throw new Error('Message sending not supported in simple client mode. Please use the full KickClient with proper authentication.');
    }
} 