# 🚀 WhatsApp API Setup Guide - Quick Start (5 Minutes)

## ✅ Easiest Method: Twilio WhatsApp (Recommended for Quick Testing)

### Step 1: Sign Up for Twilio (2 minutes)
1. Go to https://www.twilio.com/try-twilio
2. Sign up with your email
3. Verify your phone number
4. **You get $15 free credit!**

### Step 2: Activate WhatsApp Sandbox (1 minute)
1. Log in to Twilio Console: https://console.twilio.com
2. Go to **Messaging** → **Try it Out** → **Send a WhatsApp Message**
3. You'll see a sandbox number like: `+1 415 523 8886`
4. Follow instructions to activate (send a code via WhatsApp to their number)

### Step 3: Get Your Credentials (1 minute)
In the Twilio Console dashboard, you'll find:
- **Account SID**: Looks like `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token**: Click "Show" to reveal it

### Step 4: Configure Your App (1 minute)
Add these lines to `/app/backend/.env`:

```bash
# WhatsApp Configuration
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=twilio

# Twilio Credentials
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Feedback URL
FEEDBACK_URL=https://www.nirvaanawellness.com/feedback
```

### Step 5: Restart Backend
```bash
sudo supervisorctl restart backend
```

### Step 6: Test It! 🎉
1. Login as therapist
2. Add a service entry
3. **Use your own phone number** (with country code like +919876543210)
4. You'll receive a WhatsApp message with feedback link!

---

## 📱 Testing with Twilio Sandbox

**Important**: In sandbox mode, you need to:
1. Add test numbers by sending the join code to Twilio's WhatsApp number
2. Each person who wants to receive messages must send the join code first

Example: Send `join <your-sandbox-code>` to `+1 415 523 8886` from WhatsApp

---

## 💡 Message Format

When a customer receives a message, it looks like this:

```
Dear Vikram Singh,

Thank you for choosing Nirvaana Wellness at Taj Palace Mumbai 🌿

We hope you enjoyed your Shirodhara session.

We value your feedback and would love to hear about your experience:
https://www.nirvaanawellness.com/feedback

Your feedback helps us serve you better.

Warm regards,
Team Nirvaana Wellness
A Premium Spa Brand by Sunrise Wellness
```

---

## 🏢 Production Setup (For Real Usage)

### Option 1: Twilio Production Number
**Cost**: ~₹0.40 per message
1. Buy a Twilio phone number ($1/month)
2. Enable WhatsApp on it
3. Replace sandbox number with your production number
4. **No join code needed** - works for any customer!

### Option 2: WhatsApp Business API (Official)
**Cost**: Free for first 1,000 messages/month, then $0.005-0.02 per message

1. **Apply for WhatsApp Business API**
   - Go to https://business.facebook.com/
   - Create/login to Facebook Business Manager
   - Apply for WhatsApp Business API access

2. **Get Approved** (takes 1-3 days)
   - Submit business documents
   - Verify your business

3. **Get Credentials**
   - Phone Number ID
   - Access Token
   - WhatsApp Business Account ID

4. **Configure in .env**:
```bash
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=whatsapp_business_api
WHATSAPP_API_TOKEN=your_token_here
WHATSAPP_PHONE_ID=your_phone_id_here
FEEDBACK_URL=https://www.nirvaanawellness.com/feedback
```

---

## 🔍 How to Check if It's Working

### Method 1: Check Database
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/test_database

# Check service entries
db.services.find().sort({created_at: -1}).limit(1).pretty()

# Look for these fields:
# - whatsapp_sent: true/false
# - whatsapp_status: "sent" or "disabled"
# - whatsapp_message_id: "SMxxxx..." (if sent via Twilio)
```

### Method 2: Check Backend Logs
```bash
tail -f /var/log/supervisor/backend.*.log
```

Look for messages like:
- `WhatsApp message sent successfully. SID: SMxxx...`
- `WhatsApp service is disabled. Skipping message.`

---

## ❓ Troubleshooting

### Message not received?
1. **Check if WhatsApp is enabled**
   ```bash
   grep WHATSAPP_ENABLED /app/backend/.env
   ```
   Should show: `WHATSAPP_ENABLED=true`

2. **Check credentials are correct**
   ```bash
   grep TWILIO /app/backend/.env
   ```

3. **Restart backend after changes**
   ```bash
   sudo supervisorctl restart backend
   ```

4. **For Sandbox: Did customer send join code?**
   Customer must text `join <code>` to Twilio WhatsApp number first

5. **Check phone number format**
   Must include country code: `+919876543210` ✅
   Not: `9876543210` ❌

---

## 💰 Pricing Comparison

| Provider | Setup Cost | Message Cost | Free Tier |
|----------|-----------|--------------|-----------|
| **Twilio Sandbox** | Free | Free | $15 credit |
| **Twilio Production** | $1/month | ₹0.40/msg | $15 credit |
| **WhatsApp Business API** | Free | $0.005-0.02/msg | 1,000 free/month |

---

## 📊 Expected Volume & Cost

For 500 services per month:
- **Twilio**: ₹200/month (~$2.50)
- **WhatsApp Business API**: Free (under 1,000/month)

For 2,000 services per month:
- **Twilio**: ₹800/month (~$10)
- **WhatsApp Business API**: ₹500-1,000/month (~$7-15)

---

## 🎯 Quick Test Command

Test WhatsApp without creating a service:

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  --data-urlencode "From=whatsapp:+14155238886" \
  --data-urlencode "To=whatsapp:+919876543210" \
  --data-urlencode "Body=Test from Nirvaana Wellness" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

Replace:
- `YOUR_ACCOUNT_SID`
- `YOUR_AUTH_TOKEN`
- `+919876543210` (your phone number)

---

## ✅ Current Status in Your App

**✅ WhatsApp service is FULLY IMPLEMENTED**

When you add credentials to `.env`:
1. System automatically sends messages after each service
2. Tracks delivery status in database
3. Logs all attempts
4. Continues working even if WhatsApp fails

**⚠️ Currently**: Messages are NOT sent because `WHATSAPP_ENABLED=false` (default for safety)

**To Activate**: Set `WHATSAPP_ENABLED=true` in `/app/backend/.env` and add your Twilio credentials

---

## 🆘 Need Help?

1. **Twilio Support**: https://support.twilio.com
2. **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
3. **Check logs**: `tail -f /var/log/supervisor/backend.*.log`

---

**🎉 You're all set! Start with Twilio Sandbox for free testing, then upgrade to production when ready.**
