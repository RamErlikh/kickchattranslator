# Kick Chat Translator

A web-based chat translator similar to the Kick streaming platform's translation service. This application allows users to configure language preferences and provides real-time chat translation simulation.

## 🌟 Features

- **Multi-language Support**: Support for 25+ languages including English, Spanish, Chinese, French, Arabic, Russian, and many more
- **Smart Translation Logic**: Avoids translating messages in your native language and optional second language
- **Flexible Delay Settings**: Configure translation delays from no limit to 3 minutes
- **Tiered Plans**: Free (5K characters), Basic ($2 - 50K characters/month), Premium ($4 - 150K characters/month)
- **Persistent Configuration**: Settings are saved locally and restored on return visits
- **Interactive Chat Demo**: Test the translation functionality with a live chat simulation
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Modern UI**: Clean, attractive interface with smooth animations

## 🚀 Live Demo

Visit the live demo: [Your GitHub Pages URL will go here]

## 📁 Project Structure

```
kick-chat-translator/
├── index.html          # Main HTML file
├── style.css           # Stylesheet with modern design
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## 🛠 How to Deploy to GitHub Pages

### Method 1: Direct Upload
1. Create a new repository on GitHub
2. Upload all files from the `kick-chat-translator` folder to your repository
3. Go to Settings → Pages in your repository
4. Select "Deploy from a branch" and choose "main" branch
5. Your site will be available at `https://ramerlikh.github.io/kickchattranslator/`

### Method 2: Git Commands
```bash
# Clone or create your repository
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name

# Copy the files to your repository
# Copy all files from kick-chat-translator/ to your repo directory

# Add, commit, and push
git add .
git commit -m "Add Kick Chat Translator"
git push origin main

# Enable GitHub Pages in repository settings
```

## 💻 Local Development

To run locally, simply open `index.html` in your web browser. No build process or server required!

## 🔧 Configuration Options

### Language Selection
- **Native Language**: Language you DON'T want translated (required)
- **Second Language**: Optional second language to exclude from translation

### Translation Delays
- No Limit
- 5 seconds
- 10 seconds
- 30 seconds
- 1 minute
- 3 minutes

### Plans
- **Free**: 5,000 characters (expires after 24 hours)
- **Basic ($2)**: 50,000 characters per month
- **Premium ($4)**: 150,000 characters per month

## 🎯 How It Works

1. **Setup**: Select your native language, optional second language, delay preferences, and plan
2. **Authorization**: Click "Authorize" to save your configuration
3. **Translation Demo**: Use the chat interface to test translation functionality
4. **Smart Detection**: The system simulates language detection and translation
5. **Persistent Settings**: Your configuration is saved and restored on future visits

## 🧪 Translation Simulation

The current version includes:
- Basic translation samples for common phrases
- Language detection simulation
- Character usage tracking
- Delay enforcement
- Plan limitations

### Extending Translation Capabilities

To add real translation functionality:

1. **Google Translate API**:
```javascript
// Replace simulateTranslation function with:
async function translateText(text, targetLang) {
    const response = await fetch(`https://translate.googleapis.com/translate/v2?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            q: text,
            target: targetLang,
            source: 'auto'
        })
    });
    const data = await response.json();
    return data.data.translations[0].translatedText;
}
```

2. **Microsoft Translator API**:
```javascript
async function translateText(text, targetLang) {
    const response = await fetch('https://api.cognitive.microsofttranslator.com/translate', {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ text: text }])
    });
    const data = await response.json();
    return data[0].translations[0].text;
}
```

## 🎨 Customization

### Styling
Edit `style.css` to customize:
- Color scheme
- Typography
- Layout
- Animations

### Functionality
Edit `script.js` to modify:
- Translation logic
- Language detection
- Character limits
- Delay behaviors

## 📱 Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🔒 Privacy & Security

- All data is stored locally in browser localStorage
- No server-side data collection
- Configurations expire automatically for free plans
- No external API calls in demo mode

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by the original Kick Chat Translator service
- Uses Inter font family for modern typography
- Built with vanilla JavaScript for maximum compatibility

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Ensure JavaScript is enabled
3. Try clearing localStorage and reconfiguring
4. Open an issue on GitHub

---

**Note**: This is a demonstration/simulation of chat translation functionality. For production use with real translation capabilities, integrate with a proper translation API service. 
