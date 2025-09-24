# n8n Workflow Setup Guide

This guide helps you set up n8n workflows to work with your Voice Assistant PWA.

## 🔧 Prerequisites

- n8n instance (cloud or self-hosted)
- Access to create and manage workflows
- API credentials for services you want to integrate (Gmail, Slack, etc.)

## 📋 Quick Setup

### 1. Import Workflows

1. **Download the workflows file**: `n8n-workflows.json`
2. **In n8n interface**:
   - Go to Workflows
   - Click "Import from file"
   - Select `n8n-workflows.json`
   - Choose which workflows to import

### 2. Configure Credentials

You'll need to set up credentials for various services:

#### Gmail Integration
- Go to Credentials → Add Credential → Gmail OAuth2 API
- Follow Google OAuth setup process
- Assign to Gmail nodes in workflows

#### Slack Integration
- Go to Credentials → Add Credential → Slack OAuth2 API
- Create Slack app with necessary permissions
- Assign to Slack nodes in workflows

#### Google Calendar
- Go to Credentials → Add Credential → Google Calendar OAuth2 API
- Use same Google OAuth as Gmail or create separate
- Assign to Calendar nodes in workflows

#### Notion Integration (Optional)
- Go to Credentials → Add Credential → Notion API
- Create Notion integration and get API key
- Assign to Notion nodes in workflows

### 3. Activate Workflows

1. Open each imported workflow
2. Review and customize parsing logic as needed
3. Test with sample data
4. **Activate the workflow** (toggle switch)
5. Copy the webhook URL for your Voice Assistant

## 🎯 Available Workflows

### 1. Email Sender (`voice-email`)
**Purpose**: Send emails through voice commands

**Voice Examples**:
- "Send email to john about project update"
- "Send mail to sarah saying the meeting is moved"

**Webhook URL**: `https://your-n8n.com/webhook/voice-email`

**Configuration**:
- Update email domain in the parsing code
- Configure Gmail credentials
- Customize email templates if needed

### 2. Note Taker (`voice-notes`)
**Purpose**: Create and save notes from voice input

**Voice Examples**:
- "Create note about meeting ideas"
- "Make a note saying buy groceries"
- "Add note with hashtag #project about new features"

**Webhook URL**: `https://your-n8n.com/webhook/voice-notes`

**Configuration**:
- Choose between Google Docs, Notion, or both
- Set up appropriate credentials
- Customize note structure and tags

### 3. Message Sender (`voice-messages`)
**Purpose**: Send messages to various platforms

**Voice Examples**:
- "Send Slack message to team saying deployment is complete"
- "Send telegram message to john about lunch"

**Webhook URL**: `https://your-n8n.com/webhook/voice-messages`

**Configuration**:
- Set up Slack, Telegram, or other messaging credentials
- Configure channel/contact mapping
- Add more platforms as needed

### 4. Calendar Manager (`voice-calendar`)
**Purpose**: Create and check calendar events

**Voice Examples**:
- "Schedule meeting with sarah tomorrow at 2pm"
- "What's on my calendar for today"
- "Create appointment for dental checkup next Monday"

**Webhook URL**: `https://your-n8n.com/webhook/voice-calendar`

**Configuration**:
- Set up Google Calendar credentials
- Configure default calendar
- Customize event duration and details

### 5. Universal Handler (`voice-universal`)
**Purpose**: Single webhook that routes to appropriate handlers

**Voice Examples**:
- Any of the above commands
- "What time is it?"
- "Help" or "What can you do?"

**Webhook URL**: `https://your-n8n.com/webhook/voice-universal`

**Configuration**:
- Update internal webhook URLs to point to your n8n instance
- Customize command classification logic
- Add new command types as needed

## 🔗 Voice Assistant Configuration

After setting up n8n workflows:

1. **Choose your approach**:
   - **Single webhook**: Use `voice-universal` for all commands
   - **Multiple webhooks**: Use specific webhooks for different functions

2. **Configure Voice Assistant**:
   - Open your deployed Voice Assistant PWA
   - Go to Settings
   - Enter your chosen webhook URL
   - Test the connection

## 🛠 Customization Guide

### Adding New Command Types

1. **Extend the Universal Handler**:
   ```javascript
   // In the classification node, add new command types:
   const commands = {
     email: ['send email', 'send mail', 'email'],
     note: ['create note', 'make note', 'add note'],
     // Add your new command:
     weather: ['weather', 'temperature', 'forecast'],
     // ... other commands
   };
   ```

2. **Create Handler Logic**:
   - Add new routing conditions
   - Create nodes to handle the new command type
   - Connect to appropriate APIs or services

### Improving Voice Command Parsing

1. **Enhanced Pattern Matching**:
   ```javascript
   // More sophisticated regex patterns
   const emailPattern = /send\s+(?:email|mail)\s+to\s+([^\s]+)(?:\s+about\s+(.+?))?(?:\s+saying\s+(.+))?/i;
   ```

2. **Natural Language Processing**:
   - Integrate with NLP services (OpenAI, Google Cloud NLP)
   - Use intent classification models
   - Implement entity extraction

3. **Context Awareness**:
   - Store conversation context
   - Reference previous commands
   - Maintain user preferences

### Adding AI Integration

Example AI-enhanced email workflow:

```javascript
// Add OpenAI node to improve email content
{
  "parameters": {
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "Improve this email content: {{ $json.originalText }}"
      }
    ]
  },
  "name": "Enhance with AI",
  "type": "n8n-nodes-base.openAi"
}
```

## 🔍 Testing Workflows

### Manual Testing
1. **Use n8n Test Webhook**:
   ```json
   {
     "text": "Send email to john about project update",
     "timestamp": "2024-01-01T12:00:00.000Z",
     "source": "voice-assistant"
   }
   ```

2. **Check Execution Logs**:
   - Monitor workflow executions
   - Debug parsing issues
   - Verify API integrations

### Voice Assistant Testing
1. **Start with simple commands**
2. **Check browser console for errors**
3. **Use debug mode in Voice Assistant**
4. **Verify webhook responses**

## 🔒 Security Best Practices

### Webhook Security
1. **Use HTTPS only**
2. **Implement authentication**:
   ```javascript
   // Add authentication check
   const authHeader = $input.first().headers.authorization;
   if (authHeader !== 'Bearer your-secret-token') {
     throw new Error('Unauthorized');
   }
   ```

3. **Rate limiting**:
   - Configure n8n rate limits
   - Implement request validation
   - Log suspicious activity

### Data Privacy
1. **Minimize data storage**
2. **Encrypt sensitive information**
3. **Regular cleanup of logs**
4. **GDPR compliance considerations**

## 📊 Monitoring and Logging

### Built-in Monitoring
- Use n8n's execution history
- Set up error notifications
- Monitor webhook response times

### Custom Logging
```javascript
// Add logging to workflows
const logEntry = {
  timestamp: new Date().toISOString(),
  command: $json.originalText,
  user: 'voice-assistant',
  success: true
};

// Send to logging service or database
```

## 🚨 Troubleshooting

### Common Issues

**Webhook Not Found (404)**
- Check webhook URL in Voice Assistant settings
- Verify workflow is activated
- Confirm webhook path matches

**Authentication Errors**
- Refresh OAuth credentials
- Check API permissions
- Verify credential assignment to nodes

**Parsing Failures**
- Test with simpler commands
- Check regex patterns
- Add fallback parsing logic

**API Rate Limits**
- Implement request queuing
- Add retry logic with delays
- Consider upgrading API plans

### Debug Steps
1. **Test webhook directly** with curl or Postman
2. **Check n8n execution logs**
3. **Verify credentials are working**
4. **Test individual nodes**
5. **Check API service status**

## 📈 Scaling Considerations

### Performance
- Use HTTP Request nodes for external workflows
- Implement caching for frequent requests
- Consider database storage for complex data

### Reliability
- Add error handling and retry logic
- Implement fallback responses
- Set up monitoring and alerts

### Extensibility
- Design modular workflows
- Use sub-workflows for common functionality
- Document custom nodes and configurations

---

## 🎉 Ready to Use!

Once you have your workflows configured:

1. **Test each workflow individually**
2. **Configure your Voice Assistant with webhook URL(s)**
3. **Start speaking naturally to your assistant**
4. **Monitor and iterate based on usage**

Your voice-controlled n8n assistant is now ready to handle your automation needs! 🚀