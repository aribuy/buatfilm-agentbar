# VS Code Transition Guide

## Project Status
- **Repository**: https://github.com/aribuy/buatfilm-agentbar
- **Domain**: buatfilm.agentbar.ai
- **Server**: srv941062.hstgr.cloud
- **Build**: Production ready in `frontend/dist/`

## Immediate Tasks for VS Code

### 1. Deploy to Server
```bash
# Upload production files
scp -r frontend/dist/* agentbar@srv941062.hstgr.cloud:/var/www/buatfilm/

# Or use rsync
rsync -avz --delete frontend/dist/ agentbar@srv941062.hstgr.cloud:/var/www/buatfilm/
```

### 2. Backend Setup
- Deploy Node.js API to api.agentbar.ai
- Configure Xendit/Midtrans payment gateways
- Setup webhook endpoints for payment confirmation

### 3. Testing
- Test complete payment flow
- Verify order system functionality
- Validate mobile responsiveness

## Key Files
- **Main App**: `frontend/dist/index.html`
- **Assets**: `frontend/dist/assets/` (CSS/JS minified)
- **Source**: All React components in `frontend/src/`

## Payment System
- Order ID format: DDMMYYXXXXXX
- Unique discount codes (3 digits)
- Complete status tracking
- Eye-catching confirmation pages

## Development Environment
- Continue in VS Code with Amazon Q
- Use integrated SSH capabilities
- Leverage terminal for deployment

## Next Phase
Focus on Xendit/Midtrans integration and production testing.