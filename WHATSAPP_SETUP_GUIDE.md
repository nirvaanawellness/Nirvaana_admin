# WhatsApp Business API Setup Guide for Nirvaana Wellness

## Overview
This guide will help you set up WhatsApp Business API for automated customer feedback messages.

## Option 1: WhatsApp Business API (Official - Recommended)

### Prerequisites
- A Facebook Business Account
- A verified business
- A phone number dedicated to WhatsApp Business API (cannot be used with regular WhatsApp)

### Steps to Get Started

1. **Create Facebook Business Manager Account**
   - Go to https://business.facebook.com
   - Click "Create Account"
   - Follow the verification process

2. **Apply for WhatsApp Business API Access**
   - Visit: https://www.facebook.com/business/whatsapp
   - Click "Get Started"
   - Fill in your business details
   - Submit required documentation (business registration, etc.)

3. **Choose a Business Solution Provider (BSP)**
   
   Recommended BSP options:
   
   **a) Twilio (Most Popular)**
   - Website: https://www.twilio.com/whatsapp
   - Pricing: Pay-as-you-go (approx $0.005-0.02 per message)
   - Easy integration with REST API
   - Sign up at: https://www.twilio.com/try-twilio
   
   **b) MessageBird**
   - Website: https://www.messagebird.com/whatsapp-business-api
   - Competitive pricing
   - Good documentation
   
   **c) Gupshup**
   - Website: https://www.gupshup.io/whatsapp-business-api
   - India-focused
   - Good for Indian businesses

4. **Get Your Credentials**
   After approval, you'll receive:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Access Token
   - Webhook verification token

5. **Configure in Nirvaana Wellness ERP**
   - Contact your developer to integrate the credentials
   - Test message sending functionality
   - Set up webhook for delivery receipts

## Option 2: Quick Setup with Twilio (Step-by-Step)

### 1. Sign Up for Twilio
- Go to https://www.twilio.com/try-twilio
- Sign up for a free trial account
- Get $15 free credit

### 2. Activate WhatsApp Sandbox (For Testing)
- Log in to Twilio Console
- Go to Messaging > Try it Out > Send a WhatsApp Message
- Follow instructions to activate WhatsApp sandbox
- You'll get a test number like: +1 415 523 8886

### 3. Get Your Credentials
From Twilio Console:
- **Account SID**: Found in dashboard
- **Auth Token**: Found in dashboard
- **WhatsApp Number**: Your WhatsApp-enabled Twilio number

### 4. Test Message Sending
Use this curl command to test:
```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json \\
  --data-urlencode "From=whatsapp:+14155238886" \\
  --data-urlencode "Body=Test message from Nirvaana Wellness" \\
  --data-urlencode "To=whatsapp:+919876543210" \\
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

## Implementation in Your System

Once you have credentials, your developer will:

1. Create a WhatsApp service module
2. Integrate with service entry creation
3. Send automated feedback message with this format:

```
Thank you for choosing Nirvaana Wellness 🌿

We value your feedback. Please share your experience here:
https://www.nirvaanawellness.com/feedback

Team Nirvaana
```

4. Log message delivery status
5. Handle failures and retries

## Estimated Costs

### Twilio Pricing (India)
- Business-initiated message: ~₹0.40 per message
- Template messages: ~₹0.35 per message
- Monthly cost for 500 messages: ~₹175-200

### MessageBird Pricing
- Similar pricing to Twilio
- Volume discounts available

### WhatsApp Business API (Direct)
- Free for first 1,000 conversations/month
- After that: $0.005-0.02 per message based on country

## Current Status in Your Application

**Status: Placeholder Implemented**

The application currently has a placeholder for WhatsApp integration. When a service entry is created:
- The system marks `whatsapp_sent: false`
- No actual message is sent
- Ready for integration once you provide credentials

## Next Steps

1. ✅ Choose your preferred WhatsApp provider (Twilio recommended for quick start)
2. ⬜ Sign up and get credentials
3. ⬜ Share credentials with your developer
4. ⬜ Developer integrates and tests
5. ⬜ Go live with automated feedback messages

## File Upload Note

For therapist onboarding, when you upload:
- ID Proof
- Profile Photo

These files will be automatically sent to: **nirvaanabysunrise@gmail.com**

The email will contain:
- Therapist name
- Document type
- Structured information

This feature will be implemented once email integration (Resend/SendGrid) is configured.

## Support

For technical assistance:
- Contact your development team
- Or reach out to the platform support

---

**Document Version**: 1.0
**Last Updated**: January 2026
