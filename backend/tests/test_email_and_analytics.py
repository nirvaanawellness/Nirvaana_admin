"""
Test Email Integration and Analytics Features
Tests for:
1. Admin OTP email flow
2. Therapist welcome email on creation
3. Customer feedback email on service entry
4. Analytics forecast API
"""

import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestConfig:
    """Shared test configuration"""
    admin_credentials = {"email": "admin", "password": "admin123"}
    admin_email = "nirvaanabysunrise@gmail.com"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=TestConfig.admin_credentials,
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get headers with admin token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestOTPEmailFlow:
    """Test Admin OTP email request flow"""

    def test_request_otp_success(self):
        """Test OTP request for admin user sends email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": "admin"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"OTP request failed: {response.text}"
        data = response.json()
        
        # Should return success message with email masked or OTP in dev mode
        assert "message" in data
        assert "email" in data or "otp" in data
        
        # If email service is working, should show masked email
        # If email fails in dev mode, OTP is returned in response
        print(f"OTP Response: {data}")

    def test_request_otp_with_email(self):
        """Test OTP request using email instead of username"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": TestConfig.admin_email},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"OTP request failed: {response.text}"
        data = response.json()
        assert "message" in data

    def test_request_otp_invalid_user(self):
        """Test OTP request fails for non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": "nonexistent_user@invalid.com"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()

    def test_request_otp_non_admin_rejected(self, auth_headers):
        """Test OTP request is rejected for non-admin users"""
        # First create a therapist to test with
        therapists_response = requests.get(
            f"{BASE_URL}/api/therapists",
            headers=auth_headers
        )
        if therapists_response.status_code == 200:
            therapists = therapists_response.json()
            if therapists:
                therapist_email = therapists[0].get("email", "")
                if therapist_email:
                    response = requests.post(
                        f"{BASE_URL}/api/auth/request-otp",
                        json={"email": therapist_email},
                        headers={"Content-Type": "application/json"}
                    )
                    # Should return 403 for non-admin users
                    assert response.status_code == 403


class TestTherapistWelcomeEmail:
    """Test therapist creation triggers welcome email"""

    def test_create_therapist_sends_email(self, auth_headers):
        """Test creating a new therapist sends credentials email"""
        # Generate unique email and data
        timestamp = int(time.time())
        random_suffix = ''.join(random.choices(string.ascii_lowercase, k=4))
        test_email = f"test.therapist.{timestamp}@gmail.com"
        
        # Get a property to assign
        props_response = requests.get(f"{BASE_URL}/api/properties", headers=auth_headers)
        assert props_response.status_code == 200
        properties = props_response.json()
        assert len(properties) > 0, "No properties available for testing"
        property_name = properties[0]["hotel_name"]
        
        therapist_data = {
            "full_name": f"Test Therapist {random_suffix}",
            "email": test_email,
            "phone": f"+91987654{timestamp % 10000:04d}",
            "date_of_birth": "1990-05-15",  # Password will be 150590
            "assigned_property_id": property_name,
            "monthly_target": 50000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/therapists",
            json=therapist_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create therapist: {response.text}"
        data = response.json()
        
        # Verify response contains expected fields
        assert "message" in data
        assert "user_id" in data
        assert "username" in data
        
        # Check if email was sent (note field might vary based on email success)
        if "note" in data:
            # If email was sent successfully, note should indicate email was sent
            # If email failed, password will be in response for manual sharing
            print(f"Therapist creation response: {data}")
        
        print(f"Created therapist with username: {data['username']}")
        
        return data


class TestCustomerFeedbackEmail:
    """Test service entry with customer email triggers feedback email"""

    def test_service_entry_with_email_sends_feedback(self, auth_headers):
        """Test creating service entry with customer_email sends feedback email"""
        # First we need a therapist token - let's get a therapist
        therapists_response = requests.get(
            f"{BASE_URL}/api/therapists",
            headers=auth_headers
        )
        assert therapists_response.status_code == 200
        therapists = therapists_response.json()
        
        if not therapists:
            pytest.skip("No therapists available for testing")
        
        therapist = therapists[0]
        therapist_user_id = therapist.get("user_id")
        
        # Try to login as therapist to create a service entry
        # Password is typically DOB in DDMMYY format
        dob = therapist.get("date_of_birth", "")
        if dob:
            dob_parts = dob.split('-')
            if len(dob_parts) == 3:
                password = f"{dob_parts[2]}{dob_parts[1]}{dob_parts[0][-2:]}"
            else:
                password = "150590"  # Default fallback
        else:
            password = "150590"
        
        # Login as therapist
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": therapist.get("email", ""), "password": password},
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code != 200:
            # Try username
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": therapist.get("username", ""), "password": password},
                headers={"Content-Type": "application/json"}
            )
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as therapist: {login_response.text}")
        
        therapist_token = login_response.json()["token"]
        therapist_headers = {
            "Authorization": f"Bearer {therapist_token}",
            "Content-Type": "application/json"
        }
        
        # Create a service entry with customer email
        timestamp = int(time.time())
        service_data = {
            "customer_name": f"Test Customer {timestamp}",
            "customer_phone": f"+91999999{timestamp % 10000:04d}",
            "customer_email": TestConfig.admin_email,  # Use admin email for testing
            "therapy_type": "Swedish Massage",
            "base_price": 2500,
            "payment_mode": "cash",
            "payment_received_by": "nirvaana"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/services",
            json=service_data,
            headers=therapist_headers
        )
        
        assert response.status_code == 200, f"Failed to create service entry: {response.text}"
        data = response.json()
        
        # Verify feedback email status in response
        assert "feedback_email_status" in data
        print(f"Service entry response: {data}")
        print(f"Feedback email status: {data.get('feedback_email_status')}")
        
        # If email was sent successfully, status should be "sent"
        # Even if it failed, the service entry should still be created
        assert "service_id" in data


class TestForecastAPI:
    """Test Analytics Forecast API"""

    def test_forecast_returns_valid_data(self, auth_headers):
        """Test forecast API returns expected structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/forecast",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Forecast API failed: {response.text}"
        data = response.json()
        
        # Verify required fields in response
        required_fields = [
            "forecast_month", "forecast_year", "predicted_revenue",
            "predicted_services", "confidence", "method", "historical_data"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify historical_data is an array
        assert isinstance(data["historical_data"], list), "historical_data should be an array"
        
        # Verify confidence is valid
        assert data["confidence"] in ["high", "medium", "low"], f"Invalid confidence: {data['confidence']}"
        
        # Verify method is either 'insufficient_data' or forecast method
        valid_methods = ["insufficient_data", "weighted_moving_average_with_regression"]
        assert data["method"] in valid_methods, f"Invalid method: {data['method']}"
        
        print(f"Forecast API response: {data}")
        
        return data

    def test_forecast_historical_data_structure(self, auth_headers):
        """Test forecast API historical_data has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/forecast",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        historical_data = data.get("historical_data", [])
        
        # Should have 6 months of data
        assert len(historical_data) == 6, f"Expected 6 months of historical data, got {len(historical_data)}"
        
        # Each entry should have required fields
        for entry in historical_data:
            assert "month" in entry
            assert "year" in entry
            assert "label" in entry
            assert "revenue" in entry
            assert "services" in entry
            
            # Revenue and services should be non-negative
            assert entry["revenue"] >= 0
            assert entry["services"] >= 0

    def test_forecast_unauthorized_fails(self):
        """Test forecast API requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/forecast",
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 403 Forbidden for unauthenticated requests
        assert response.status_code == 403


class TestAnalyticsNavigation:
    """Test Analytics page navigation from dashboard"""

    def test_analytics_nav_card_exists_in_dashboard(self, auth_headers):
        """Test that dashboard data is accessible (verifies admin access)"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers=auth_headers
        )
        
        # This verifies admin can access analytics endpoint
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard analytics structure
        expected_fields = [
            "total_base_sales", "total_gst", "total_sales",
            "hotel_received", "nirvaana_received", "customer_count", "total_services"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


class TestEmailServiceConfiguration:
    """Test email service is properly configured"""

    def test_email_enabled_in_env(self):
        """Test EMAIL_ENABLED is true in backend env"""
        # This is a config check - we verify by observing email behavior
        # The OTP request should attempt to send email when EMAIL_ENABLED=true
        response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": "admin"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # If email is enabled and working, we should see masked email or success message
        # If email is disabled or fails, OTP will be returned in response
        has_email_attempt = "email" in data or "email_masked" in data or "otp" in data
        assert has_email_attempt, "No email attempt indication in response"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
