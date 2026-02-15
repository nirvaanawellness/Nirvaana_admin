"""
WhatsApp Service for sending automated feedback messages to customers
Supports multiple providers: Twilio, WhatsApp Business API
"""

import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.provider = os.getenv("WHATSAPP_PROVIDER", "twilio")
        self.enabled = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
        
        # Twilio credentials
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
        
        # WhatsApp Business API credentials
        self.whatsapp_api_token = os.getenv("WHATSAPP_API_TOKEN")
        self.whatsapp_phone_id = os.getenv("WHATSAPP_PHONE_ID")
        
        # Feedback configuration
        self.feedback_url = os.getenv("FEEDBACK_URL", "https://www.nirvaanawellness.com/feedback")
        
    async def send_feedback_message(
        self, 
        customer_phone: str, 
        customer_name: str,
        therapy_type: str,
        property_name: str,
        therapist_name: str = None
    ) -> dict:
        """
        Send automated feedback message to customer after service
        
        Args:
            customer_phone: Customer's phone number (must include country code)
            customer_name: Customer's name
            therapy_type: Type of therapy received
            property_name: Hotel/Property name
            therapist_name: Name of the therapist who provided service
            
        Returns:
            dict with status and message_id (if successful)
        """
        
        if not self.enabled:
            logger.info("WhatsApp service is disabled. Trying SMS backup.")
            return await self._send_via_sms(customer_phone, customer_name, therapy_type, property_name, therapist_name)
        
        # Format phone number (ensure it starts with +)
        if not customer_phone.startswith("+"):
            customer_phone = f"+{customer_phone}"
        
        # Prepare message
        message_text = self._prepare_feedback_message(
            customer_name, 
            therapy_type, 
            property_name,
            therapist_name
        )
        
        # Send via appropriate provider
        result = None
        if self.provider == "twilio":
            result = await self._send_via_twilio(customer_phone, message_text)
        elif self.provider == "whatsapp_business_api":
            result = await self._send_via_whatsapp_business_api(customer_phone, message_text)
        else:
            logger.error(f"Unknown WhatsApp provider: {self.provider}")
            result = {
                "success": False,
                "message": f"Unknown provider: {self.provider}",
                "status": "error"
            }
        
        # If WhatsApp fails, try SMS
        if not result.get("success"):
            logger.info("WhatsApp failed, attempting SMS backup")
            return await self._send_via_sms(customer_phone, customer_name, therapy_type, property_name, therapist_name)
        
        return result
    
    def _prepare_feedback_message(
        self, 
        customer_name: str, 
        therapy_type: str,
        property_name: str
    ) -> str:
        """Prepare the feedback message text"""
        return f"""Dear {customer_name},

Thank you for choosing Nirvaana Wellness at {property_name} 🌿

We hope you enjoyed your {therapy_type} session.

We value your feedback and would love to hear about your experience:
{self.feedback_url}

Your feedback helps us serve you better.

Warm regards,
Team Nirvaana Wellness
A Premium Spa Brand by Sunrise Wellness"""
    
    async def _send_via_twilio(self, phone_number: str, message: str) -> dict:
        """Send message via Twilio WhatsApp API"""
        
        if not self.twilio_account_sid or not self.twilio_auth_token:
            logger.error("Twilio credentials not configured")
            return {
                "success": False,
                "message": "Twilio credentials missing",
                "status": "config_error"
            }
        
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_account_sid}/Messages.json"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    data={
                        "From": self.twilio_whatsapp_number,
                        "To": f"whatsapp:{phone_number}",
                        "Body": message
                    },
                    auth=(self.twilio_account_sid, self.twilio_auth_token),
                    timeout=10.0
                )
                
                if response.status_code == 201:
                    data = response.json()
                    logger.info(f"WhatsApp message sent successfully. SID: {data.get('sid')}")
                    return {
                        "success": True,
                        "message_id": data.get("sid"),
                        "status": "sent",
                        "provider": "twilio"
                    }
                else:
                    logger.error(f"Twilio API error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "message": f"Twilio error: {response.status_code}",
                        "status": "failed"
                    }
                    
        except Exception as e:
            logger.error(f"Error sending WhatsApp via Twilio: {str(e)}")
            return {
                "success": False,
                "message": str(e),
                "status": "exception"
            }
    
    async def _send_via_whatsapp_business_api(self, phone_number: str, message: str) -> dict:
        """Send message via WhatsApp Business API directly"""
        
        if not self.whatsapp_api_token or not self.whatsapp_phone_id:
            logger.error("WhatsApp Business API credentials not configured")
            return {
                "success": False,
                "message": "WhatsApp Business API credentials missing",
                "status": "config_error"
            }
        
        try:
            url = f"https://graph.facebook.com/v18.0/{self.whatsapp_phone_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.whatsapp_api_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": phone_number.replace("+", ""),
                "type": "text",
                "text": {
                    "body": message
                }
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
                    logger.info(f"WhatsApp message sent via Business API. ID: {data.get('messages', [{}])[0].get('id')}")
                    return {
                        "success": True,
                        "message_id": data.get("messages", [{}])[0].get("id"),
                        "status": "sent",
                        "provider": "whatsapp_business_api"
                    }
                else:
                    logger.error(f"WhatsApp Business API error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "message": f"API error: {response.status_code}",
                        "status": "failed"
                    }
                    
        except Exception as e:
            logger.error(f"Error sending WhatsApp via Business API: {str(e)}")
            return {
                "success": False,
                "message": str(e),
                "status": "exception"
            }


# Global instance
whatsapp_service = WhatsAppService()
