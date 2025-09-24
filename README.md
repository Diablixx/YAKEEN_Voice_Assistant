# Voice Assistant PWA - n8n Integration

A voice-controlled Progressive Web App optimized for iPhone that directly integrates with n8n workflows. Speak commands naturally and have them processed by your n8n automation workflows.

## 🚀 Features

- **Voice Recognition**: Always-listening mode with automatic speech detection
- **Direct n8n Integration**: Send voice commands directly to n8n webhooks
- **iPhone Optimized**: Specifically designed for iPhone 15 Pro Max
- **PWA Support**: Install as a native-feeling app on iOS
- **Offline Capable**: Core functionality works offline with service worker caching
- **Real-time Feedback**: Visual voice level indicators and status updates
- **iOS Optimizations**: Dynamic Island support, safe area handling, 120Hz display optimization

## 📱 Quick Start

### 1. Deploy to Vercel

1. Fork this repository to your GitHub account
2. Connect your GitHub repo to Vercel
3. Deploy - Vercel will automatically detect and deploy the PWA
4. Your app will be available at `https://your-app-name.vercel.app`

### 2. Setup n8n Webhook

You'll need to provide your n8n webhook URL when you first open the app. The webhook should:

- Accept POST requests
- Receive JSON payload with `text` field containing your voice input
- Return JSON response with `text` field for voice feedback

Example n8n webhook payload:
```json
{
  "text": "Send an email to John about the meeting",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "voice-assistant",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "timestamp": 1704110400000
  }
}
```

### 3. Install on iPhone

1. Open the deployed app URL in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear on your home screen as a native app

### 4. Configure iOS Shortcuts (Optional)

For instant access via Action Button:

1. Open Shortcuts app
2. Create new shortcut
3. Add "Open App" action
4. Select your Voice Assistant PWA
5. Assign to Action Button in Settings → Action Button

## ⚙️ Configuration

### First Time Setup

1. Open the app
2. Tap "Settings" button
3. Enter your n8n webhook URL
4. Adjust voice settings (speed/pitch) if desired
5. Tap "Save"
6. The app will test the connection and start listening

### Voice Settings

- **Voice Speed**: 0.5x to 2.0x playback speed
- **Voice Pitch**: 0 to 2.0 pitch adjustment
- **Auto Listen**: Always listening mode (recommended)

## 🎤 Usage

### Basic Voice Commands

1. **Start the app** - It will begin listening automatically
2. **Speak naturally** - Say your command clearly
3. **Wait for processing** - Visual feedback shows processing status
4. **Listen to response** - The app will speak back the n8n response
5. **Continuous use** - App returns to listening mode after each interaction

### Voice Flow

```
You speak → Speech Recognition → Text Processing → n8n Webhook → Response → Speech Synthesis → Back to Listening
```

### Example Commands

Depends on your n8n workflows, but common examples:

- "Send an email to Sarah about the project update"
- "Add milk and bread to my shopping list"
- "What's on my calendar for tomorrow?"
- "Create a note about the team meeting"
- "Send a message to the development team on Slack"

## 🔧 Technical Details

### Architecture

- **Frontend**: Vanilla JavaScript PWA
- **Speech Recognition**: Web Speech API (WebKit)
- **Text-to-Speech**: Web Speech Synthesis API
- **Backend**: n8n webhooks
- **Deployment**: Vercel
- **Caching**: Service Worker with aggressive caching strategy

### File Structure

```
voice-assistant/
├── index.html              # Main PWA entry point
├── manifest.json           # PWA configuration
├── sw.js                   # Service Worker
├── css/
│   └── styles.css         # Mobile-optimized styling
├── js/
│   ├── main.js            # App initialization and UI
│   ├── voice.js           # Speech processing
│   ├── n8n.js             # Webhook integration
│   ├── config.js          # Configuration management
│   ├── utils.js           # Helper functions
│   └── ios-optimizations.js # iOS-specific optimizations
└── icons/                 # PWA icons for iOS
```

### Browser Support

- **Primary**: iOS Safari (iPhone)
- **Requires**: Web Speech API support
- **Optimized for**: iPhone 15 Pro Max
- **PWA Features**: iOS Safari 11.3+

### Performance

- **Startup Time**: < 2 seconds (cached)
- **Voice Recognition**: Real-time with 2-second silence detection
- **Response Time**: Depends on n8n workflow performance
- **Offline**: Core app functions, n8n requests require internet

## 📝 n8n Workflow Examples

### Basic Email Workflow

```json
{
  "nodes": [
    {
      "parameters": {},
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300],
      "webhookId": "voice-assistant"
    },
    {
      "parameters": {
        "fromEmail": "your-email@gmail.com",
        "toEmail": "=recipient extracted from: {{$json.text}}",
        "subject": "=subject from: {{$json.text}}",
        "text": "=message from: {{$json.text}}"
      },
      "name": "Gmail",
      "type": "n8n-nodes-base.gmail",
      "position": [460, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\"text\": \"Email sent successfully!\"}"
      },
      "name": "Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [680, 300]
    }
  ]
}
```

### Note Taking Workflow

```json
{
  "nodes": [
    {
      "parameters": {},
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "parameters": {
        "database": "notes",
        "collection": "voice_notes",
        "fields": {
          "text": "={{$json.text}}",
          "timestamp": "={{$json.timestamp}}",
          "source": "voice"
        }
      },
      "name": "MongoDB",
      "type": "n8n-nodes-base.mongoDb"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\"text\": \"Note saved successfully\"}"
      },
      "name": "Response",
      "type": "n8n-nodes-base.respondToWebhook"
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

**Voice Recognition Not Working**
- Check microphone permissions in Safari settings
- Ensure you're using HTTPS (required for Web Speech API)
- Try refreshing the page and granting permissions again

**n8n Connection Failed**
- Verify your webhook URL is correct and accessible
- Check n8n webhook is active and properly configured
- Ensure CORS is properly configured if needed

**App Won't Install as PWA**
- Make sure you're using Safari on iOS
- Verify the app is served over HTTPS
- Check that manifest.json is accessible

**Voice Commands Not Processed**
- Speak clearly and wait for the processing indicator
- Check your internet connection for n8n requests
- Verify your n8n workflow is properly configured

**App Performance Issues**
- Clear Safari cache and reinstall PWA
- Check available device storage
- Close other resource-intensive apps

### Debug Mode

Double-tap the status indicator at the top to enable debug mode, which shows:
- Voice recognition events
- n8n request/response details
- Performance metrics
- Error logs

### Getting Help

1. Check the browser console for error messages
2. Enable debug mode to see detailed logs
3. Test your n8n webhook independently
4. Verify all permissions are granted

## 🔒 Privacy & Security

- **Local Processing**: Speech recognition happens on-device
- **No Data Storage**: No persistent storage of voice data
- **Secure Communications**: All n8n communications over HTTPS
- **No Third-Party Services**: Direct browser-to-n8n communication only

## 📊 Monitoring & Analytics

- **No Built-in Analytics**: Privacy-focused design
- **n8n Monitoring**: Use n8n's built-in execution monitoring
- **Browser DevTools**: Use for debugging and performance monitoring

## 🚀 Advanced Configuration

### Custom Wake Words
Currently not supported - uses continuous listening instead

### Multiple n8n Instances
Edit `js/config.js` to support multiple webhook endpoints

### Voice Command Preprocessing
Modify `js/voice.js` to add command preprocessing before sending to n8n

### Custom Response Handling
Update `js/n8n.js` to handle different response formats from your workflows

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome via GitHub issues.

---

**Note**: This PWA is designed for personal use and direct integration with your own n8n instance. Ensure your n8n webhooks are properly secured and only accessible to authorized users.