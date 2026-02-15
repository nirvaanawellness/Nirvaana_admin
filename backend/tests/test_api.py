"""
Backend API Tests for Nirvaana Wellness ERP
Tests cover: Authentication, Properties, Therapists, Services, Expenses, and Reports
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for testing
ADMIN_EMAIL = "admin@nirvaana.com"
ADMIN_PASSWORD = "admin123"

class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Admin login successful for {ADMIN_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestPropertiesEndpoints:
    """Property CRUD endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_properties_authenticated(self, auth_token):
        """Test fetching properties with valid auth"""
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Retrieved {len(data)} properties")
        
        # Check property structure if any exist
        if len(data) > 0:
            prop = data[0]
            assert "hotel_name" in prop, "Property should have hotel_name"
            assert "location" in prop, "Property should have location"
            print(f"✓ First property: {prop.get('hotel_name')} in {prop.get('location')}")
    
    def test_get_properties_unauthenticated(self):
        """Test properties endpoint without auth token"""
        response = requests.get(f"{BASE_URL}/api/properties")
        # Should require auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Properties endpoint correctly requires authentication")


class TestTherapistsEndpoints:
    """Therapist CRUD endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_therapists(self, auth_token):
        """Test fetching all therapists"""
        response = requests.get(
            f"{BASE_URL}/api/therapists",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Retrieved {len(data)} therapists")


class TestServicesEndpoints:
    """Service entry endpoint tests - Critical for dashboard"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_services_with_date_filter(self, auth_token):
        """Test fetching services with date range filter (used by dashboard)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/services",
            params={"date_from": today, "date_to": today},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Retrieved {len(data)} services for today ({today})")
    
    def test_get_services_with_month_filter(self, auth_token):
        """Test fetching services for current month (Reports page)"""
        now = datetime.now()
        date_from = f"{now.year}-{now.month:02d}-01"
        date_to = now.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/services",
            params={"date_from": date_from, "date_to": date_to},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Retrieved {len(data)} services for month {now.month}/{now.year}")


class TestExpensesEndpoints:
    """Expense management endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def test_property(self, auth_token):
        """Get first property for testing"""
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]
        pytest.skip("No properties available for testing")
    
    def test_get_expenses(self, auth_token):
        """Test fetching all expenses"""
        response = requests.get(
            f"{BASE_URL}/api/expenses",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Retrieved {len(data)} expenses")
    
    def test_get_expenses_with_date_filter(self, auth_token):
        """Test fetching expenses with date filters (Reports page)"""
        now = datetime.now()
        date_from = f"{now.year}-{now.month:02d}-01"
        date_to = now.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/expenses",
            params={"date_from": date_from, "date_to": date_to},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Retrieved {len(data)} expenses for month {now.month}/{now.year}")
    
    def test_get_expense_summary(self, auth_token):
        """Test expense summary endpoint (used by Expense page)"""
        response = requests.get(
            f"{BASE_URL}/api/expenses/summary/by-property",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "recurring" in data, "Summary should have recurring category"
        assert "adhoc" in data, "Summary should have adhoc category"
        assert "grand_total" in data, "Summary should have grand_total"
        print(f"✓ Expense summary: Grand total = {data.get('grand_total')}")
    
    def test_create_expense_and_verify(self, auth_token, test_property):
        """Test creating a new expense - CRUD create"""
        today = datetime.now().strftime("%Y-%m-%d")
        expense_payload = {
            "property_id": test_property["hotel_name"],
            "expense_type": "marketing",
            "category": "adhoc",
            "amount": 500.0,
            "description": "TEST_Marketing expense for testing",
            "date": today
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/expenses",
            json=expense_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code == 200, f"Expected 200, got {create_response.status_code}: {create_response.text}"
        
        created_data = create_response.json()
        assert "expense_id" in created_data, "Should return expense_id"
        expense_id = created_data["expense_id"]
        print(f"✓ Created expense with ID: {expense_id}")
        
        # GET to verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/expenses/{expense_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        
        fetched_expense = get_response.json()
        assert fetched_expense["property_id"] == expense_payload["property_id"]
        assert fetched_expense["amount"] == expense_payload["amount"]
        print(f"✓ Verified expense exists in database")
        
        # Cleanup - delete the test expense
        delete_response = requests.delete(
            f"{BASE_URL}/api/expenses/{expense_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200 for delete, got {delete_response.status_code}"
        print(f"✓ Cleaned up test expense")
    
    def test_delete_expense_not_found(self, auth_token):
        """Test deleting non-existent expense"""
        fake_id = "000000000000000000000000"
        response = requests.delete(
            f"{BASE_URL}/api/expenses/{fake_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent expense returns 404")


class TestDashboardAnalytics:
    """Dashboard analytics endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_dashboard_analytics(self, auth_token):
        """Test dashboard analytics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify expected fields
        expected_fields = ["total_base_sales", "total_gst", "total_sales", 
                          "hotel_received", "nirvaana_received", "customer_count"]
        for field in expected_fields:
            assert field in data, f"Dashboard should contain {field}"
        
        print(f"✓ Dashboard analytics: Sales={data.get('total_sales')}, Customers={data.get('customer_count')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
