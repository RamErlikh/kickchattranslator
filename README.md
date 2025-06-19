# Kick Chat Translator Bot

A free, browser-based chatbot that automatically translates messages in Kick.com chat rooms in real-time. This bot detects non-English messages (or your selected target language) and provides instant translations to help bridge language barriers in live streams.

## ✨ Features

- 🌍 **Multi-language Support**: Supports 25+ languages including English, Spanish, Chinese, French, Arabic, Russian, and more
- 🤖 **Real-time Translation**: Automatically detects and translates messages as they appear in chat
- 🔄 **Multiple Translation APIs**: Uses LibreTranslate and MyMemory for reliable translations
- 🎯 **Smart Language Detection**: Automatically detects the source language of messages
- ⚡ **Free to Use**: No API keys required, completely free translation service
- 🎮 **Works on Any Kick Channel**: Simply enter the channel URL to start translating
- 📱 **Responsive Design**: Works on desktop and mobile browsers
- 💾 **Save Configuration**: Remembers your settings between sessions
- 📊 **Real-time Statistics**: Track translation count and bot status

## 🚀 Quick Start

### 1. Create a Bot Account

1. Go to [Kick.com](https://kick.com) and create a new account for your translator bot
2. Choose a username like "TranslatorBot" or "ChatTranslator"
3. Verify the account if required

### 2. Host on GitHub Pages

1. Fork this repository or create a new repository
2. Upload all the files to your repository
3. Go to your repository Settings → Pages
4. Set Source to "Deploy from a branch" and select `main` branch
5. Your translator will be available at `https://yourusername.github.io/repository-name`

### 3. Configure and Start

1. Open your hosted translator page
2. Enter your bot account credentials
3. Select your target language (language that should NOT be translated)
4. Enter the Kick channel URL (e.g., `https://kick.com/channelname`)
5. Click "Start Translation Bot"

## 📋 Setup Instructions

### For GitHub Pages Deployment

1. **Create a new repository** on GitHub
2. **Upload these files**:
   - `index.html`
   - `styles.css`
   - `translator.js`
   - `kick-client.js`
   - `main.js`
   - `README.md`

3. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose `main` branch and `/ (root)` folder
   - Click Save

4. **Access your bot**: Visit `https://yourusername.github.io/repository-name`

## 🔧 Configuration Options

- **Bot Username**: Your bot account username
- **Bot Password**: Your bot account password
- **Target Language**: The language that should NOT be translated (default: English)
- **Translation Delay**: Optional delay between translations to avoid spam
- **Channel URL**: The Kick channel where you want the bot to operate

## 🌐 Supported Languages

The bot supports translation between these languages:

- English (en)
- Spanish (es)
- Chinese (zh)
- French (fr)
- Arabic (ar)
- Russian (ru)
- Portuguese (pt)
- German (de)
- Italian (it)
- Japanese (ja)
- Korean (ko)
- Hindi (hi)
- Dutch (nl)
- Turkish (tr)
- Polish (pl)
- Swedish (sv)
- Indonesian (id)
- Vietnamese (vi)
- Thai (th)
- Czech (cs)
- Hungarian (hu)
- Finnish (fi)
- Norwegian (no)
- Danish (da)
- Romanian (ro)
- Ukrainian (uk)

## 🛠️ How It Works

1. **Connection**: The bot connects to Kick's chat using WebSocket/Pusher API
2. **Message Detection**: Monitors all incoming chat messages
3. **Language Detection**: Automatically detects the language of each message
4. **Translation**: If the message is not in the target language, it gets translated
5. **Response**: The bot posts the translation as a reply in chat

## ⚠️ Important Notes

### Browser Limitations & CORS
- This is a **browser-based solution** that requires the page to stay open
- **CORS (Cross-Origin Resource Sharing)** restrictions prevent direct login to Kick.com from GitHub Pages
- The bot will automatically switch to **READ-ONLY MODE** when CORS blocks the login
- Some browsers may limit background tab activity
- For 24/7 operation, consider using a VPS with a headless browser

### Authentication Modes
1. **Full Bot Mode** (can post translations to chat):
   - Requires running from a server or browser extension
   - Can authenticate with Kick.com and post messages
   - Supports 2FA/OTP authentication

2. **Read-Only Mode** (shows translations but can't post):
   - Works from GitHub Pages and any browser
   - Can see and translate messages
   - Translations appear in the log but are not posted to chat
   - You can manually copy-paste translations

### Solutions for Full Bot Mode
1. **Browser Extension**: Create a browser extension with host permissions
2. **Local Server**: Run with `npm start` on your computer
3. **VPS/Cloud Server**: Deploy to a server with proper CORS handling
4. **Manual Copy-Paste**: Use read-only mode and copy translations manually

### Rate Limiting
- Built-in protection against message spam
- Configurable delays between translations
- Automatic duplicate message detection

### CORS and Security
- GitHub Pages has CORS restrictions for security
- Translation APIs are free but may have rate limits
- No sensitive data is stored permanently

## 🔍 Troubleshooting

### Bot Won't Connect
- Check your bot account credentials
- Ensure the channel URL is correct (format: `https://kick.com/channelname`)
- Make sure the channel exists and is live

### Translations Not Appearing
- Verify bot account has chat permissions
- Check if the channel has chat restrictions
- Look at the browser console for error messages

### Poor Translation Quality
- The bot uses free translation services
- Quality may vary for complex or slang text
- Multiple translation APIs provide fallback options

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests to improve:

- Translation accuracy
- Additional language support
- UI/UX improvements
- Performance optimizations
- Bug fixes

## 📜 License

This project is open source and available under the MIT License.

## 🚨 Disclaimer

- This bot is for educational and community purposes
- Users are responsible for following Kick.com's Terms of Service
- The bot should be used respectfully and not for spam
- Translation accuracy depends on external APIs and may not be perfect
- The developers are not responsible for any misuse of this software

## 📞 Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your bot account and channel settings
3. Try refreshing the page and reconnecting
4. Create an issue on GitHub for persistent problems

---

**Made with ❤️ for the Kick.com community** 