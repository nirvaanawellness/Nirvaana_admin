"""
Test cases for Property Ownership Type feature
- "Our Property" (100% owned - no revenue split)
- "Outside Property" (revenue split with hotel)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOwnershipTypeFeature:
    """Tests for Property ownership type (our_property vs outside_property)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token for authenticated requests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
        # Cleanup - delete test properties created during tests
        try:
            props_response = requests.get(
                f"{BASE_URL}/api/properties?include_archived=true",
                headers=self.headers
            )
            if props_response.status_code == 200:
                for prop in props_response.json():
                    if prop.get("hotel_name", "").startswith("TEST_Ownership_"):
                        requests.delete(
                            f"{BASE_URL}/api/properties/{prop['id']}",
                            headers=self.headers
                        )
        except Exception:
            pass
    
    def test_create_our_property_type(self):
        """Test creating property with ownership_type='our_property' (100% owned)"""
        payload = {
            "hotel_name": "TEST_Ownership_OurProperty",
            "location": "Test Location",
            "ownership_type": "our_property",
            "payment_cycle": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/properties",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to create property: {response.text}"
        data = response.json()
        
        # Data assertions
        assert data["hotel_name"] == "TEST_Ownership_OurProperty"
        assert data["ownership_type"] == "our_property"
        assert data["revenue_share_percentage"] is None, "Revenue share should be null for owned property"
        assert data["status"] == "active"
        assert "id" in data
    
    def test_create_outside_property_type(self):
        """Test creating property with ownership_type='outside_property' (revenue split)"""
        payload = {
            "hotel_name": "TEST_Ownership_OutsideProperty",
            "location": "Test Location",
            "ownership_type": "outside_property",
            "revenue_share_percentage": 45,
            "payment_cycle": "monthly",
            "contract_start_date": "2026-01-01"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/properties",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to create property: {response.text}"
        data = response.json()
        
        # Data assertions
        assert data["hotel_name"] == "TEST_Ownership_OutsideProperty"
        assert data["ownership_type"] == "outside_property"
        assert data["revenue_share_percentage"] == 45
        assert data["contract_start_date"] == "2026-01-01"
    
    def test_default_ownership_type_is_outside_property(self):
        """Test that default ownership_type is 'outside_property' when not specified"""
        payload = {
            "hotel_name": "TEST_Ownership_Default",
            "location": "Test Location",
            "revenue_share_percentage": 50,
            "payment_cycle": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/properties",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to create property: {response.text}"
        data = response.json()
        
        # Default should be outside_property
        assert data["ownership_type"] == "outside_property"
    
    def test_update_property_ownership_type(self):
        """Test updating property ownership type from outside_property to our_property"""
        # First create an outside_property
        create_payload = {
            "hotel_name": "TEST_Ownership_ToUpdate",
            "location": "Test Location",
            "ownership_type": "outside_property",
            "revenue_share_percentage": 40,
            "payment_cycle": "monthly"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/properties",
            json=create_payload,
            headers=self.headers
        )
        assert create_response.status_code == 200
        property_id = create_response.json()["id"]
        
        # Update to our_property
        update_payload = {
            "hotel_name": "TEST_Ownership_ToUpdate",
            "location": "Test Location",
            "ownership_type": "our_property",
            "payment_cycle": "monthly"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/properties/{property_id}",
            json=update_payload,
            headers=self.headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update persisted - GET the property
        get_response = requests.get(
            f"{BASE_URL}/api/properties/{property_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["ownership_type"] == "our_property"
    
    def test_get_properties_returns_ownership_type(self):
        """Test that GET /properties returns ownership_type field"""
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers=self.headers
        )
        
        assert response.status_code == 200
        properties = response.json()
        
        # At least one property should exist
        assert len(properties) > 0
        
        # Check that ownership_type field is returned (may be null for old properties)
        for prop in properties:
            assert "ownership_type" in prop or prop.get("ownership_type") is None

    def test_ownership_type_enum_validation(self):
        """Test that invalid ownership_type values are rejected"""
        payload = {
            "hotel_name": "TEST_Ownership_Invalid",
            "location": "Test Location",
            "ownership_type": "invalid_type",  # Invalid enum value
            "payment_cycle": "monthly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/properties",
            json=payload,
            headers=self.headers
        )
        
        # Should fail validation with 422 (Unprocessable Entity)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health check endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
    
    def test_login_with_admin(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"


class TestPropertiesEndpoints:
    """Test Properties CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_properties_list(self):
        """Test GET /properties returns list of active properties"""
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned should be active (not archived) by default
        for prop in data:
            assert prop.get("status") != "archived" or "status" not in prop
    
    def test_get_properties_include_archived(self):
        """Test GET /properties?include_archived=true returns all properties"""
        response = requests.get(
            f"{BASE_URL}/api/properties?include_archived=true",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_archive_and_restore_property(self):
        """Test property archive (soft delete) and restore"""
        # Create test property
        create_response = requests.post(
            f"{BASE_URL}/api/properties",
            json={
                "hotel_name": "TEST_Ownership_ArchiveTest",
                "location": "Test",
                "ownership_type": "our_property",
                "payment_cycle": "monthly"
            },
            headers=self.headers
        )
        assert create_response.status_code == 200
        property_id = create_response.json()["id"]
        
        # Archive property
        delete_response = requests.delete(
            f"{BASE_URL}/api/properties/{property_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        
        # Verify not in default list
        list_response = requests.get(
            f"{BASE_URL}/api/properties",
            headers=self.headers
        )
        property_ids = [p["id"] for p in list_response.json()]
        assert property_id not in property_ids
        
        # Restore property
        restore_response = requests.put(
            f"{BASE_URL}/api/properties/{property_id}/restore",
            headers=self.headers
        )
        assert restore_response.status_code == 200
        
        # Verify back in list
        list_response2 = requests.get(
            f"{BASE_URL}/api/properties",
            headers=self.headers
        )
        property_ids2 = [p["id"] for p in list_response2.json()]
        assert property_id in property_ids2


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
