"""
Email Service for sending therapist credentials and notifications
Supports Resend (recommended) and SendGrid
"""

import os
import httpx
import logging
import secrets
import string

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.provider = os.getenv("EMAIL_PROVIDER", "resend")
        self.enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
        
        # Resend credentials (recommended - easiest to setup)
        self.resend_api_key = os.getenv("RESEND_API_KEY")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@nirvaanawellness.com")
        
        # SendGrid credentials (alternative)
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        
        # Portal URL
        self.portal_url = os.getenv("PORTAL_URL", "https://wellness-reporting.preview.emergentagent.com")
        
    def generate_secure_password(self, length=10):
        """Generate a secure random password"""
        characters = string.ascii_letters + string.digits + "!@#$%"
        password = ''.join(secrets.choice(characters) for _ in range(length))
        # Ensure at least one of each type
        if not any(c.islower() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_lowercase)
        if not any(c.isupper() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_uppercase)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + secrets.choice(string.digits)
        return password
    
    async def send_therapist_credentials(
        self,
        therapist_email: str,
        therapist_name: str,
        password: str,
        property_name: str
    ) -> dict:
        """
        Send welcome email with login credentials to newly onboarded therapist
        
        Args:
            therapist_email: Therapist's personal email
            therapist_name: Therapist's full name
            password: Generated password
            property_name: Assigned property name
            
        Returns:
            dict with success status and message_id
        """
        
        if not self.enabled:
            logger.info("Email service is disabled. Credentials not sent.")
            return {
                "success": False,
                "message": "Email service disabled",
                "password": password  # Return password for manual sharing
            }
        
        subject = "Welcome to Nirvaana Wellness - Your Login Credentials"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Arial', sans-serif; line-height: 1.6; color: #2C2420; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2C2420 0%, #B89D62 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .logo {{ font-size: 28px; font-weight: bold; margin-bottom: 10px; }}
        .content {{ background: #F9F8F6; padding: 30px; border-radius: 0 0 10px 10px; }}
        .credentials {{ background: white; padding: 20px; border-left: 4px solid #B89D62; margin: 20px 0; }}
        .button {{ display: inline-block; background: #B89D62; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #6B5E55; font-size: 12px; }}
        .important {{ color: #C76B6B; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">NIRVAANA WELLNESS</div>
            <p>Welcome to Our Team!</p>
        </div>
        
        <div class="content">
            <h2>Hello {therapist_name},</h2>
            
            <p>Welcome to Nirvaana Wellness! We're excited to have you join our team at <strong>{property_name}</strong>.</p>
            
            <p>Your account has been created in our Internal Operations Portal. Here are your login credentials:</p>
            
            <div class="credentials">
                <p><strong>Portal URL:</strong><br>
                <a href="{self.portal_url}">{self.portal_url}</a></p>
                
                <p><strong>Email:</strong><br>
                {therapist_email}</p>
                
                <p><strong>Password:</strong><br>
                <span style="font-size: 18px; letter-spacing: 2px; font-weight: bold;">{password}</span></p>
            </div>
            
            <p class="important">⚠️ Important: Please change your password after first login for security.</p>
            
            <a href="{self.portal_url}/login" class="button">Login to Portal</a>
            
            <h3>What you can do in the portal:</h3>
            <ul>
                <li>✅ Mark attendance (Check-in/Check-out)</li>
                <li>✅ Add service entries after customer sessions</li>
                <li>✅ Track your monthly target progress</li>
                <li>✅ View your earned incentives</li>
                <li>✅ See your performance history</li>
            </ul>
            
            <p>If you have any questions or face any issues logging in, please contact your property manager or reach out to us at <strong>+91-9520034538</strong>.</p>
            
            <p>We look forward to working with you!</p>
            
            <p><strong>Best regards,</strong><br>
            Team Nirvaana Wellness<br>
            <em>A Premium Spa Brand by Sunrise Wellness</em></p>
        </div>
        
        <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>© 2026 Nirvaana Wellness. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
Welcome to Nirvaana Wellness!

Hello {therapist_name},

We're excited to have you join our team at {property_name}.

Your login credentials for the Internal Operations Portal:

Portal URL: {self.portal_url}
Email: {therapist_email}
Password: {password}

IMPORTANT: Please change your password after first login.

What you can do in the portal:
- Mark attendance (Check-in/Check-out)
- Add service entries
- Track monthly targets
- View earned incentives
- See performance history

For support, contact: +91-9520034538

Best regards,
Team Nirvaana Wellness
A Premium Spa Brand by Sunrise Wellness
"""
        
        if self.provider == "resend":
            return await self._send_via_resend(therapist_email, subject, html_content, text_content)
        elif self.provider == "sendgrid":
            return await self._send_via_sendgrid(therapist_email, subject, html_content, text_content)
        else:
            logger.error(f"Unknown email provider: {self.provider}")
            return {
                "success": False,
                "message": f"Unknown provider: {self.provider}",
                "password": password
            }
    
    async def _send_via_resend(self, to_email: str, subject: str, html_content: str, text_content: str) -> dict:
        """Send email via Resend API"""
        
        if not self.resend_api_key:
            logger.error("Resend API key not configured")
            return {
                "success": False,
                "message": "Resend API key missing"
            }
        
        try:
            url = "https://api.resend.com/emails"
            
            headers = {
                "Authorization": f"Bearer {self.resend_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Email sent successfully via Resend. ID: {data.get('id')}")
                    return {
                        "success": True,
                        "message_id": data.get("id"),
                        "provider": "resend"
                    }
                else:
                    logger.error(f"Resend API error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "message": f"Resend error: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Error sending email via Resend: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }
    
    async def _send_via_sendgrid(self, to_email: str, subject: str, html_content: str, text_content: str) -> dict:
        """Send email via SendGrid API"""
        
        if not self.sendgrid_api_key:
            logger.error("SendGrid API key not configured")
            return {
                "success": False,
                "message": "SendGrid API key missing"
            }
        
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "subject": subject
                }],
                "from": {"email": self.from_email, "name": "Nirvaana Wellness"},
                "content": [
                    {"type": "text/plain", "value": text_content},
                    {"type": "text/html", "value": html_content}
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 202:
                    logger.info(f"Email sent successfully via SendGrid to {to_email}")
                    return {
                        "success": True,
                        "message_id": response.headers.get("X-Message-Id"),
                        "provider": "sendgrid"
                    }
                else:
                    logger.error(f"SendGrid API error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "message": f"SendGrid error: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Error sending email via SendGrid: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }


# Global instance
email_service = EmailService()
