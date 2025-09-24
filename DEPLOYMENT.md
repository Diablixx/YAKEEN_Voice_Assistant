# Deployment Guide - Voice Assistant PWA

This guide covers deploying your Voice Assistant PWA to Vercel for public access on your iPhone.

## 🚀 Vercel Deployment

### Prerequisites

- GitHub account
- Vercel account (free tier works fine)
- Your completed Voice Assistant PWA code
- n8n instance with webhook URL ready

### Step 1: Prepare Repository

1. **Create GitHub Repository**
   ```bash
   # If you haven't already, initialize git in your project
   git init
   git add .
   git commit -m "Initial commit: Voice Assistant PWA"

   # Push to GitHub
   git branch -M main
   git remote add origin https://github.com/yourusername/voice-assistant-pwa.git
   git push -u origin main
   ```

2. **Verify File Structure**
   ```
   your-repo/
   ├── index.html
   ├── manifest.json
   ├── sw.js
   ├── css/styles.css
   ├── js/
   │   ├── main.js
   │   ├── voice.js
   │   ├── n8n.js
   │   ├── config.js
   │   ├── utils.js
   │   └── ios-optimizations.js
   ├── icons/
   │   ├── favicon-16x16.png
   │   ├── favicon-32x32.png
   │   ├── apple-touch-icon.png
   │   ├── icon-192.png
   │   └── icon-512.png
   ├── README.md
   └── DEPLOYMENT.md
   ```

### Step 2: Deploy to Vercel

1. **Connect GitHub to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your Voice Assistant repository

2. **Configure Deployment Settings**
   - **Framework Preset**: Other
   - **Root Directory**: `./` (default)
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: Leave empty (static site)
   - **Install Command**: Leave empty (no dependencies)

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (~1-2 minutes)
   - Your app will be available at `https://your-repo-name.vercel.app`

### Step 3: Configure Custom Domain (Optional)

1. **Add Custom Domain**
   - Go to your project settings in Vercel
   - Navigate to "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update PWA Settings**
   - Update `start_url` in `manifest.json` if using custom domain
   - Redeploy if changes are made

### Step 4: Verify Deployment

1. **Test Basic Functionality**
   - Open your deployed URL in Safari on iPhone
   - Check that the PWA loads correctly
   - Verify service worker registration in DevTools

2. **Test PWA Installation**
   - Tap Share button in Safari
   - Confirm "Add to Home Screen" appears
   - Install and test the standalone app

3. **Test Voice Features**
   - Grant microphone permissions
   - Test voice recognition
   - Configure n8n webhook URL in settings

## 🔧 Vercel Configuration

### vercel.json Configuration

Create `vercel.json` in your root directory for advanced configuration:

```json
{
  "version": 2,
  "public": true,
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Environment Variables

If you need environment variables:

1. **In Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add variables (e.g., `N8N_WEBHOOK_URL`)
   - Redeploy to apply changes

2. **In Code**
   ```javascript
   // Access in client-side code (public variables only)
   const webhookUrl = process.env.NEXT_PUBLIC_N8N_URL;
   ```

## 📱 iOS Setup Guide

### Install PWA on iPhone

1. **Open in Safari**
   - Go to your deployed URL
   - **Important**: Must use Safari, not Chrome or other browsers

2. **Add to Home Screen**
   - Tap the Share button (box with up arrow)
   - Scroll down and tap "Add to Home Screen"
   - Customize name if desired
   - Tap "Add"

3. **Verify Installation**
   - App appears on home screen
   - Opens without Safari UI when launched
   - Status bar shows it's running in standalone mode

### Configure iOS Shortcuts (Action Button)

1. **Create Shortcut**
   - Open Shortcuts app
   - Tap "+" to create new shortcut
   - Add "Open App" action
   - Select your Voice Assistant PWA
   - Name it "Voice Assistant"

2. **Assign to Action Button** (iPhone 15 Pro/Pro Max)
   - Settings → Action Button
   - Select "Shortcut"
   - Choose your Voice Assistant shortcut

3. **Alternative: Control Center**
   - Add shortcut to Control Center for quick access
   - Settings → Control Center → Add shortcut

## 🛠 Troubleshooting Deployment

### Common Issues

**PWA Won't Install**
- Ensure manifest.json is accessible at `/manifest.json`
- Check all required icons are present
- Verify HTTPS is enabled (Vercel provides this by default)
- Test in Safari, not other browsers

**Service Worker Issues**
- Check service worker registration in DevTools
- Verify `/sw.js` is accessible and returns correct headers
- Clear Safari cache and try reinstalling

**Voice Recognition Not Working**
- Ensure site is served over HTTPS (required for microphone access)
- Check microphone permissions in Safari settings
- Test on actual iOS device (simulators may not work)

**n8n Connection Issues**
- Verify n8n webhook URL is accessible from public internet
- Check CORS settings if n8n is on different domain
- Test webhook independently with curl or Postman

### Performance Optimization

**Minimize Bundle Size**
```bash
# Check what's being deployed
ls -la

# Remove unnecessary files before deployment
echo "*.md\nnode_modules/\n.git/" > .vercelignore
```

**Optimize Images**
- Compress icon files
- Use WebP format for larger images
- Implement lazy loading for non-critical assets

**CDN Optimization**
- Vercel automatically provides CDN
- Use cache headers appropriately
- Minimize external dependencies

## 🔒 Security Considerations

### Production Security

1. **HTTPS Only**
   - Vercel provides HTTPS by default
   - Ensure all resources load over HTTPS
   - Test mixed content warnings

2. **Content Security Policy**
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="default-src 'self';
                  connect-src 'self' https://your-n8n-instance.com;
                  media-src 'self';
                  script-src 'self' 'unsafe-inline';">
   ```

3. **n8n Security**
   - Use authentication for n8n webhooks
   - Implement rate limiting
   - Monitor webhook access logs

### Privacy Protection

- No analytics or tracking
- No external CDNs for core functionality
- Voice data processed locally only
- Minimal data sent to n8n (just text commands)

## 🔄 Updates and Maintenance

### Automatic Deployments

Vercel automatically deploys when you push to your main branch:

```bash
# Make changes
git add .
git commit -m "Update voice processing"
git push origin main
# Vercel automatically deploys
```

### Manual Deployments

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy manually
vercel --prod
```

### Rollback Procedures

1. **Via Vercel Dashboard**
   - Go to deployments tab
   - Find previous working deployment
   - Click "Promote to Production"

2. **Via Git**
   ```bash
   git revert HEAD
   git push origin main
   ```

## 📊 Monitoring

### Vercel Analytics

Enable Vercel Analytics for basic metrics:
- Add to your Vercel project settings
- View page loads, performance metrics
- Monitor error rates

### Custom Monitoring

Add basic error tracking:

```javascript
window.addEventListener('error', (e) => {
  // Log errors to your monitoring service
  console.error('App error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
```

---

## 🎯 Deployment Checklist

Before going live:

- [ ] Test all voice features work correctly
- [ ] Verify PWA installs properly on iPhone
- [ ] Confirm n8n webhook integration works
- [ ] Test offline functionality
- [ ] Verify all icons display correctly
- [ ] Check performance on target device
- [ ] Test microphone permissions flow
- [ ] Validate service worker caching
- [ ] Confirm settings persistence works
- [ ] Test error handling and recovery

Your Voice Assistant PWA should now be live and accessible from your iPhone! 🎉