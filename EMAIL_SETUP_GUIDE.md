# 📧 Email Service Setup Guide - Auto-Send Therapist Credentials

## ✅ Resend Setup (Recommended - 5 Minutes)

### Why Resend?
- **FREE**: 3,000 emails/month
- **Easy Setup**: 5 minutes
- **Reliable**: 99.9% delivery
- **No Credit Card**: For free tier

---

## 🚀 Step 1: Sign Up for Resend (2 minutes)

1. Go to https://resend.com/signup
2. Sign up with your email
3. Verify your email
4. **Done!** You're in.

---

## 🔑 Step 2: Get API Key (1 minute)

1. Go to **API Keys** in dashboard
2. Click **Create API Key**
3. Name it: "Nirvaana ERP"
4. Copy the API key (looks like: `re_123abc...`)

---

## 📧 Step 3: Verify Domain (Optional but Recommended)

**Option A: Use Resend's Free Domain (Quick)**
- Emails will come from: `onboarding@resend.dev`
- Works immediately
- Good for testing

**Option B: Use Your Domain (Professional)**
If you own `nirvaanawellness.com`:
1. Go to **Domains** in Resend dashboard
2. Add domain: `nirvaanawellness.com`
3. Add DNS records (shown in dashboard)
4. Wait 10-15 minutes for verification
5. Emails will come from: `noreply@nirvaanawellness.com`

---

## ⚙️ Step 4: Configure Your App (1 minute)

Add to `/app/backend/.env`:

```bash
# Email Configuration
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@resend.dev
PORTAL_URL=https://wellness-reporting.preview.emergentagent.com
```

If you verified your own domain:
```bash
FROM_EMAIL=noreply@nirvaanawellness.com
```

---

## 🔄 Step 5: Restart Backend

```bash
sudo supervisorctl restart backend
```

---

## 🎉 Step 6: Test It!

1. Login as admin
2. Go to Therapists
3. Click "Add Therapist"
4. Fill in details
5. **Leave password field empty** (will auto-generate)
6. Click submit

**What happens:**
- ✅ Secure password auto-generated (10 chars, mixed)
- ✅ Email sent to therapist with:
  - Welcome message
  - Login URL
  - Email & password
  - Instructions
- ✅ Therapist can login immediately!

---

## 📧 Email Template Preview

The therapist receives a beautiful HTML email with:
- ✅ Welcome message with their name
- ✅ Property name they're assigned to
- ✅ Login URL (clickable button)
- ✅ Their email & password (easy to copy)
- ✅ What they can do in portal
- ✅ Contact number for support
- ✅ Professional branding

---

## 💡 Alternative: SendGrid

If you prefer SendGrid:

### Setup:
1. Sign up at https://sendgrid.com
2. Get API key
3. Verify sender email

### Configure:
```bash
EMAIL_ENABLED=true
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@nirvaanawellness.com
PORTAL_URL=https://wellness-reporting.preview.emergentagent.com
```

---

## 🔍 How to Verify It's Working

### Method 1: Check Response
When you create therapist, response will show:
```json
{
  "message": "Therapist created successfully",
  "user_id": "...",
  "note": "Login credentials sent to therapist@email.com"
}
```

### Method 2: Check Backend Logs
```bash
tail -f /var/log/supervisor/backend.err.log
```
Look for:
- `Email sent successfully via Resend`
- `Email sent to therapist@email.com`

### Method 3: Check Resend Dashboard
- Go to **Logs** in Resend dashboard
- See email delivery status
- View email content

---

## ⚠️ Troubleshooting

### Email Not Received?

**1. Check Spam Folder**
- Resend emails might go to spam initially
- Mark as "Not Spam"

**2. Verify API Key**
```bash
grep RESEND_API_KEY /app/backend/.env
```

**3. Check EMAIL_ENABLED**
```bash
grep EMAIL_ENABLED /app/backend/.env
```
Should be: `EMAIL_ENABLED=true`

**4. Restart Backend**
```bash
sudo supervisorctl restart backend
```

**5. Check Logs**
```bash
tail -n 50 /app/backend/server.log
```

---

## 💰 Pricing

### Resend (Recommended)
- **FREE**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails
- **Perfect for**: 200-300 therapists = ~300 emails/month

### SendGrid
- **FREE**: 100 emails/day (3,000/month)
- **Paid**: $20/month for 50,000 emails

**Recommendation**: Start with Resend free tier!

---

## 🎯 Current Implementation

**✅ FULLY IMPLEMENTED:**
1. Auto-generate secure passwords (10 chars)
2. Send beautiful HTML email with credentials
3. Include portal URL, instructions
4. Professional email template
5. Fallback to manual password if email disabled

**How it works:**
```
Admin Creates Therapist
    ↓
System Auto-Generates Password (if field empty)
    ↓
EMAIL_ENABLED=true? 
    ├─ YES → Send email with credentials ✅
    └─ NO  → Show password in response (manual sharing)
```

---

## 📝 What If Email Service is Disabled?

If `EMAIL_ENABLED=false`, the system will:
1. Still auto-generate secure password
2. Return password in API response
3. Show message: "Please share these credentials manually"
4. Admin can copy-paste and send via WhatsApp/SMS

---

## 🚀 Benefits of Email System

**For Admin:**
- ✅ No manual password creation
- ✅ No manual sharing via WhatsApp
- ✅ Instant onboarding
- ✅ Professional first impression

**For Therapist:**
- ✅ Receives welcome email
- ✅ Has credentials saved in email
- ✅ One-click login button
- ✅ Clear instructions

**For Business:**
- ✅ Secure random passwords
- ✅ Automated workflow
- ✅ Professional branding
- ✅ Better security

---

## ✅ Next Steps After Setup

1. **Test with your email first**
2. **Onboard 1-2 therapists**
3. **Check if they receive emails**
4. **Ask them to login**
5. **Roll out to all therapists**

---

**Total Time**: 5 minutes
**Cost**: FREE (Resend 3,000 emails/month)
**Benefit**: Automated, professional therapist onboarding!
