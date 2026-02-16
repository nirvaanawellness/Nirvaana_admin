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
        self.portal_url = os.getenv("PORTAL_URL", "https://wellness-ops-dev.preview.emergentagent.com")
        
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
        username: str,
        password: str,
        property_name: str
    ) -> dict:
        """
        Send welcome email with login credentials to newly onboarded therapist
        
        Args:
            therapist_email: Therapist's personal email
            therapist_name: Therapist's full name
            username: Generated username (e.g., anita427)
            password: Generated password (DOB in DDMMYY)
            property_name: Assigned property name
            
        Returns:
            dict with success status and message_id
        """
        
        if not self.enabled:
            logger.info("Email service is disabled. Credentials not sent.")
            return {
                "success": False,
                "message": "Email service disabled",
                "username": username,
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
                
                <p><strong>Username:</strong><br>
                <span style="font-size: 18px; font-weight: bold; color: #B89D62;">{username}</span></p>
                
                <p><strong>Password:</strong><br>
                <span style="font-size: 18px; letter-spacing: 2px; font-weight: bold;">{password}</span></p>
                
                <p style="font-size: 12px; color: #666;">(You can also login using your email: {therapist_email})</p>
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
Username: {username}
Password: {password}

(You can also login using your email: {therapist_email})

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

    async def send_otp_email(self, email: str, otp: str, user_name: str) -> dict:
        """Send OTP email for password reset"""
        
        if not self.enabled:
            logger.info("Email service is disabled. OTP not sent via email.")
            return {"success": False, "message": "Email service disabled"}
        
        subject = "Nirvaana Wellness - Password Reset OTP"
        
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
        .otp-box {{ background: white; padding: 30px; text-align: center; margin: 20px 0; border-radius: 10px; border: 2px dashed #B89D62; }}
        .otp {{ font-size: 36px; font-weight: bold; color: #B89D62; letter-spacing: 8px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #6B5E55; font-size: 12px; }}
        .warning {{ background: #FFF3CD; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">NIRVAANA WELLNESS</div>
            <p>Password Reset Request</p>
        </div>
        
        <div class="content">
            <h2>Hello {user_name},</h2>
            
            <p>You have requested to reset your password for the Nirvaana Wellness Admin Portal.</p>
            
            <p>Your One-Time Password (OTP) is:</p>
            
            <div class="otp-box">
                <div class="otp">{otp}</div>
                <p style="margin-top: 15px; color: #6B5E55;">Valid for 10 minutes</p>
            </div>
            
            <div class="warning">
                ⚠️ <strong>Security Notice:</strong> Never share this OTP with anyone. Nirvaana Wellness staff will never ask for your OTP.
            </div>
            
            <p>If you did not request this password reset, please ignore this email or contact support immediately.</p>
            
            <p><strong>Best regards,</strong><br>
            Team Nirvaana Wellness</p>
        </div>
        
        <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>© 2026 Nirvaana Wellness. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
Nirvaana Wellness - Password Reset OTP

Hello {user_name},

You have requested to reset your password.

Your OTP is: {otp}

This OTP is valid for 10 minutes.

WARNING: Never share this OTP with anyone.

If you did not request this, please ignore this email.

Best regards,
Team Nirvaana Wellness
"""
        
        if self.provider == "resend":
            return await self._send_via_resend(email, subject, html_content, text_content)
        elif self.provider == "sendgrid":
            return await self._send_via_sendgrid(email, subject, html_content, text_content)
        else:
            return {"success": False, "message": f"Unknown provider: {self.provider}"}

    async def send_feedback_email(
        self,
        customer_email: str,
        customer_name: str,
        therapy_type: str,
        therapist_name: str,
        property_name: str,
        service_date: str
    ) -> dict:
        """
        Send feedback request email to customer after service completion
        
        Args:
            customer_email: Customer's email address
            customer_name: Customer's name
            therapy_type: Type of therapy received
            therapist_name: Name of the therapist
            property_name: Property/hotel name
            service_date: Date of service
            
        Returns:
            dict with success status
        """
        
        if not self.enabled:
            logger.info("Email service is disabled. Feedback email not sent.")
            return {"success": False, "message": "Email service disabled"}
        
        if not customer_email:
            logger.info("No customer email provided. Feedback email not sent.")
            return {"success": False, "message": "No customer email provided"}
        
        # Google Form feedback link (you can replace with your own form)
        feedback_url = f"https://forms.gle/nirvaana-feedback"  # Replace with actual form
        
        subject = f"Thank You for Visiting Nirvaana Wellness at {property_name}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Georgia', serif; line-height: 1.8; color: #2C2420; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; }}
        .header {{ background: linear-gradient(135deg, #2C2420 0%, #3d3329 50%, #B89D62 100%); color: white; padding: 40px 30px; text-align: center; }}
        .logo {{ font-size: 32px; font-weight: bold; letter-spacing: 3px; margin-bottom: 5px; color: #B89D62; }}
        .tagline {{ font-size: 12px; letter-spacing: 2px; opacity: 0.9; }}
        .content {{ background: #FFFEF9; padding: 40px 30px; }}
        .greeting {{ font-size: 24px; color: #2C2420; margin-bottom: 20px; }}
        .service-card {{ background: white; padding: 25px; border-radius: 10px; margin: 25px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #B89D62; }}
        .service-detail {{ display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #f0ede8; }}
        .service-label {{ color: #6B5E55; font-size: 14px; }}
        .service-value {{ color: #2C2420; font-weight: 600; }}
        .feedback-section {{ text-align: center; padding: 30px 0; }}
        .feedback-text {{ font-size: 16px; color: #6B5E55; margin-bottom: 20px; }}
        .feedback-button {{ display: inline-block; background: linear-gradient(135deg, #B89D62 0%, #9A8354 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: 600; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(184, 157, 98, 0.3); }}
        .feedback-button:hover {{ background: linear-gradient(135deg, #9A8354 0%, #B89D62 100%); }}
        .stars {{ font-size: 28px; margin: 15px 0; }}
        .footer {{ background: #2C2420; color: #B89D62; padding: 30px; text-align: center; }}
        .social {{ margin: 15px 0; }}
        .social a {{ color: #B89D62; text-decoration: none; margin: 0 10px; }}
        .copyright {{ font-size: 11px; color: #6B5E55; margin-top: 15px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">NIRVAANA</div>
            <div class="tagline">WELLNESS & SPA</div>
            <p style="margin-top: 15px; font-style: italic;">A Premium Spa Brand by Sunrise Wellness</p>
        </div>
        
        <div class="content">
            <div class="greeting">Namaste {customer_name},</div>
            
            <p>Thank you for choosing <strong>Nirvaana Wellness</strong> for your wellness journey. We hope your experience with us was rejuvenating and memorable.</p>
            
            <div class="service-card">
                <h3 style="margin-top: 0; color: #B89D62;">Your Session Details</h3>
                <div class="service-detail">
                    <span class="service-label">Service</span>
                    <span class="service-value">{therapy_type}</span>
                </div>
                <div class="service-detail">
                    <span class="service-label">Therapist</span>
                    <span class="service-value">{therapist_name}</span>
                </div>
                <div class="service-detail">
                    <span class="service-label">Location</span>
                    <span class="service-value">{property_name}</span>
                </div>
                <div class="service-detail" style="border-bottom: none;">
                    <span class="service-label">Date</span>
                    <span class="service-value">{service_date}</span>
                </div>
            </div>
            
            <div class="feedback-section">
                <p class="feedback-text">Your feedback helps us serve you better.<br>We'd love to hear about your experience!</p>
                
                <div class="stars">⭐ ⭐ ⭐ ⭐ ⭐</div>
                
                <a href="{feedback_url}" class="feedback-button">Share Your Feedback</a>
                
                <p style="font-size: 12px; color: #999; margin-top: 20px;">Takes only 2 minutes</p>
            </div>
            
            <p style="text-align: center; color: #6B5E55;">
                We look forward to welcoming you again soon.<br>
                <strong style="color: #B89D62;">Stay Relaxed. Stay Healthy.</strong>
            </p>
        </div>
        
        <div class="footer">
            <div class="logo" style="font-size: 20px;">NIRVAANA WELLNESS</div>
            <div class="social">
                <a href="#">Instagram</a> |
                <a href="#">Facebook</a> |
                <a href="tel:+919520034538">+91-9520034538</a>
            </div>
            <div class="copyright">
                © 2026 Nirvaana Wellness by Sunrise Wellness. All rights reserved.<br>
                This is an automated email. Please do not reply.
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
NIRVAANA WELLNESS & SPA
A Premium Spa Brand by Sunrise Wellness

Namaste {customer_name},

Thank you for choosing Nirvaana Wellness for your wellness journey.

Your Session Details:
- Service: {therapy_type}
- Therapist: {therapist_name}
- Location: {property_name}
- Date: {service_date}

We'd love to hear about your experience!
Share your feedback: {feedback_url}

We look forward to welcoming you again soon.
Stay Relaxed. Stay Healthy.

Contact: +91-9520034538

© 2026 Nirvaana Wellness. All rights reserved.
"""
        
        if self.provider == "resend":
            return await self._send_via_resend(customer_email, subject, html_content, text_content)
        elif self.provider == "sendgrid":
            return await self._send_via_sendgrid(customer_email, subject, html_content, text_content)
        else:
            return {"success": False, "message": f"Unknown provider: {self.provider}"}


# Global instance
email_service = EmailService()
