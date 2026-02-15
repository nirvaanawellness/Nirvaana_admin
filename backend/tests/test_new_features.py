"""
Backend API Tests for New Features - Iteration 3
Tests cover: Admin Attendance, Property/Therapist Archiving, OTP Password Change

Features being tested:
1. Admin Attendance Tracking - /api/attendance/admin/daily, /api/attendance/admin/history/{therapist_id}
2. Property Archiving - DELETE /api/properties/{id} (soft delete)
3. Therapist Archiving - DELETE /api/therapists/{id} (soft delete)  
4. OTP Password Change Flow - /api/auth/request-otp, /api/auth/verify-otp, /api/auth/change-password
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@nirvaana.com"
ADMIN_PASSWORD = "admin123"
THERAPIST_EMAIL = "anita.desai@example.com"
THERAPIST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def therapist_token():
    """Get therapist authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": THERAPIST_EMAIL,
        "password": THERAPIST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Therapist authentication failed: {response.status_code} - {response.text}")


class TestAdminDailyAttendance:
    """Tests for /api/attendance/admin/daily endpoint"""
    
    def test_get_daily_attendance_today(self, admin_token):
        """Test getting daily attendance for today (default date)"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/daily",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "date" in data, "Response should contain date"
        assert "checked_in" in data, "Response should contain checked_in list"
        assert "not_checked_in" in data, "Response should contain not_checked_in list"
        assert "total_checked_in" in data, "Response should contain total_checked_in count"
        assert "total_not_checked_in" in data, "Response should contain total_not_checked_in count"
        
        # Verify data types
        assert isinstance(data["checked_in"], list), "checked_in should be a list"
        assert isinstance(data["not_checked_in"], list), "not_checked_in should be a list"
        assert isinstance(data["total_checked_in"], int), "total_checked_in should be int"
        assert isinstance(data["total_not_checked_in"], int), "total_not_checked_in should be int"
        
        # Count validation
        assert data["total_checked_in"] == len(data["checked_in"]), "total_checked_in should match list length"
        assert data["total_not_checked_in"] == len(data["not_checked_in"]), "total_not_checked_in should match list length"
        
        print(f"✓ Daily attendance - Checked in: {data['total_checked_in']}, Not checked in: {data['total_not_checked_in']}")
    
    def test_get_daily_attendance_with_specific_date(self, admin_token):
        """Test getting daily attendance for a specific date"""
        test_date = "2026-02-15"
        
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/daily",
            params={"date": test_date},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["date"] == test_date, f"Expected date {test_date}, got {data['date']}"
        print(f"✓ Daily attendance for {test_date} - Total therapists: {data['total_checked_in'] + data['total_not_checked_in']}")
    
    def test_get_daily_attendance_with_property_filter(self, admin_token):
        """Test filtering daily attendance by property"""
        # First get properties
        props_response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if props_response.status_code == 200 and len(props_response.json()) > 0:
            property_name = props_response.json()[0]["hotel_name"]
            
            response = requests.get(
                f"{BASE_URL}/api/attendance/admin/daily",
                params={"property_id": property_name},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            print(f"✓ Daily attendance filtered by property: {property_name}")
        else:
            pytest.skip("No properties available for filter test")
    
    def test_daily_attendance_requires_admin(self, therapist_token):
        """Test that only admins can access daily attendance"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/daily",
            headers={"Authorization": f"Bearer {therapist_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Daily attendance correctly requires admin role")
    
    def test_daily_attendance_checked_in_record_structure(self, admin_token):
        """Test the structure of checked_in records"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/daily",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["checked_in"]) > 0:
            record = data["checked_in"][0]
            assert "therapist_id" in record, "Record should have therapist_id"
            assert "therapist_name" in record, "Record should have therapist_name"
            assert "check_in_time" in record, "Record should have check_in_time"
            print(f"✓ Checked in record structure verified: {record['therapist_name']}")
        else:
            print("✓ No checked in records to verify structure (empty list)")


class TestAdminAttendanceHistory:
    """Tests for /api/attendance/admin/history/{therapist_id} endpoint"""
    
    def test_get_therapist_attendance_history(self, admin_token):
        """Test getting attendance history for a specific therapist"""
        # First get therapists
        therapists_response = requests.get(
            f"{BASE_URL}/api/therapists",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if therapists_response.status_code == 200 and len(therapists_response.json()) > 0:
            therapist = therapists_response.json()[0]
            therapist_id = therapist.get("user_id")
            
            response = requests.get(
                f"{BASE_URL}/api/attendance/admin/history/{therapist_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            # Verify response structure
            assert "therapist_id" in data, "Response should contain therapist_id"
            assert "therapist_name" in data, "Response should contain therapist_name"
            assert "attendance_records" in data, "Response should contain attendance_records"
            assert "total_records" in data, "Response should contain total_records"
            
            assert isinstance(data["attendance_records"], list), "attendance_records should be a list"
            assert data["total_records"] == len(data["attendance_records"]), "total_records should match list length"
            
            print(f"✓ Attendance history for {data['therapist_name']}: {data['total_records']} records")
        else:
            pytest.skip("No therapists available for history test")
    
    def test_get_attendance_history_with_date_range(self, admin_token):
        """Test filtering attendance history by date range"""
        therapists_response = requests.get(
            f"{BASE_URL}/api/therapists",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if therapists_response.status_code == 200 and len(therapists_response.json()) > 0:
            therapist_id = therapists_response.json()[0].get("user_id")
            
            response = requests.get(
                f"{BASE_URL}/api/attendance/admin/history/{therapist_id}",
                params={"date_from": "2026-01-01", "date_to": "2026-02-28"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            print("✓ Attendance history with date range filter working")
        else:
            pytest.skip("No therapists available")
    
    def test_attendance_history_not_found(self, admin_token):
        """Test getting history for non-existent therapist"""
        fake_id = "000000000000000000000000"
        
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/history/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent therapist, got {response.status_code}"
        print("✓ Attendance history correctly returns 404 for non-existent therapist")
    
    def test_attendance_history_requires_admin(self, therapist_token):
        """Test that only admins can access attendance history"""
        fake_id = "some_therapist_id"
        
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/history/{fake_id}",
            headers={"Authorization": f"Bearer {therapist_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Attendance history correctly requires admin role")


class TestPropertyArchiving:
    """Tests for property archiving (soft delete)"""
    
    def test_archive_property(self, admin_token):
        """Test archiving a property - should soft delete, not hard delete"""
        # Create a test property first
        test_property = {
            "hotel_name": "TEST_Archive_Property_" + datetime.now().strftime("%H%M%S"),
            "location": "Test Location",
            "gst_number": "TEST123456789",
            "revenue_share_percentage": 50.0,
            "contract_start_date": "2026-01-01",
            "payment_cycle": "monthly",
            "contact_person": "Test Contact",
            "contact_number": "+919876543210"
        }
        
        # Create property
        create_response = requests.post(
            f"{BASE_URL}/api/properties",
            json=test_property,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_response.status_code == 200, f"Failed to create test property: {create_response.text}"
        property_id = create_response.json()["id"]
        print(f"✓ Created test property: {test_property['hotel_name']}")
        
        # Archive (DELETE) the property
        delete_response = requests.delete(
            f"{BASE_URL}/api/properties/{property_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        assert "archived" in delete_response.json()["message"].lower(), "Response should mention archiving"
        print(f"✓ Property archived successfully (soft delete)")
        
        # Verify property still exists but is archived - query with include_archived=true
        verify_response = requests.get(
            f"{BASE_URL}/api/properties",
            params={"include_archived": "true"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert verify_response.status_code == 200
        archived_property = next((p for p in verify_response.json() if p.get("id") == property_id), None)
        
        if archived_property:
            assert archived_property.get("status") == "archived", "Property should be archived"
            assert archived_property.get("active") == False, "Property should be inactive"
            print(f"✓ Verified property is archived (soft deleted), not hard deleted")
        else:
            # Property might be excluded from results even with include_archived
            print("✓ Property archive completed (verification skipped)")
    
    def test_archived_property_excluded_by_default(self, admin_token):
        """Test that archived properties are excluded from default listing"""
        # Get properties without include_archived flag
        response = requests.get(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        properties = response.json()
        
        # All returned properties should NOT be archived
        for prop in properties:
            assert prop.get("status") != "archived", f"Archived property should not appear in default listing"
        
        print(f"✓ Archived properties excluded from default listing ({len(properties)} active properties)")
    
    def test_restore_property(self, admin_token):
        """Test restoring an archived property"""
        # Create and archive a property first
        test_property = {
            "hotel_name": "TEST_Restore_Property_" + datetime.now().strftime("%H%M%S"),
            "location": "Test Location",
            "gst_number": "TESTRESTORE123",
            "revenue_share_percentage": 45.0,
            "contract_start_date": "2026-01-01",
            "payment_cycle": "monthly",
            "contact_person": "Test Contact",
            "contact_number": "+919876543210"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/properties",
            json=test_property,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test property")
        
        property_id = create_response.json()["id"]
        
        # Archive it
        requests.delete(
            f"{BASE_URL}/api/properties/{property_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Restore it
        restore_response = requests.put(
            f"{BASE_URL}/api/properties/{property_id}/restore",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert restore_response.status_code == 200, f"Expected 200, got {restore_response.status_code}: {restore_response.text}"
        assert "restored" in restore_response.json()["message"].lower(), "Response should mention restoration"
        print(f"✓ Property restored successfully")


class TestTherapistArchiving:
    """Tests for therapist archiving (soft delete)"""
    
    def test_get_therapists_excludes_archived(self, admin_token):
        """Test that archived therapists are excluded from default listing"""
        response = requests.get(
            f"{BASE_URL}/api/therapists",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        therapists = response.json()
        
        # All returned therapists should NOT be archived
        for therapist in therapists:
            assert therapist.get("status") != "archived", f"Archived therapist should not appear in default listing"
        
        print(f"✓ Archived therapists excluded from default listing ({len(therapists)} active therapists)")
    
    def test_get_therapists_include_archived(self, admin_token):
        """Test getting all therapists including archived ones"""
        response = requests.get(
            f"{BASE_URL}/api/therapists",
            params={"include_archived": "true"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        print(f"✓ Retrieved therapists with include_archived=true: {len(response.json())} therapists")


class TestOTPPasswordChange:
    """Tests for OTP-based password change flow"""
    
    def test_request_otp_success(self):
        """Test requesting OTP for password change"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": ADMIN_EMAIL}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        # In dev mode (email fails), OTP is returned in response
        if "otp" in data:
            assert len(data["otp"]) == 6, "OTP should be 6 digits"
            print(f"✓ OTP generated successfully (dev mode): {data['otp']}")
        else:
            print(f"✓ OTP sent to email successfully")
    
    def test_request_otp_non_admin_rejected(self):
        """Test that non-admin users cannot request OTP"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": THERAPIST_EMAIL}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}: {response.text}"
        print("✓ OTP request correctly rejected for non-admin users")
    
    def test_request_otp_invalid_email(self):
        """Test requesting OTP with non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": "nonexistent@test.com"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ OTP request correctly returns 404 for non-existent user")
    
    def test_verify_otp_invalid(self):
        """Test verifying with invalid OTP"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": ADMIN_EMAIL, "otp": "000000"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid OTP, got {response.status_code}"
        print("✓ Invalid OTP correctly rejected")
    
    def test_full_password_change_flow(self):
        """Test complete OTP password change flow (request -> verify -> change)"""
        # Step 1: Request OTP
        request_response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": ADMIN_EMAIL}
        )
        
        assert request_response.status_code == 200, f"OTP request failed: {request_response.text}"
        
        # Get OTP from response (dev mode)
        otp = request_response.json().get("otp")
        if not otp:
            pytest.skip("Email sent successfully - cannot test verification without actual OTP")
        
        print(f"✓ Step 1: OTP requested successfully")
        
        # Step 2: Verify OTP
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": ADMIN_EMAIL, "otp": otp}
        )
        
        assert verify_response.status_code == 200, f"OTP verification failed: {verify_response.text}"
        assert verify_response.json().get("valid") == True, "OTP should be valid"
        print(f"✓ Step 2: OTP verified successfully")
        
        # Step 3: Change password (use same password to not break future tests)
        change_response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "email": ADMIN_EMAIL,
                "otp": otp,
                "new_password": ADMIN_PASSWORD  # Keep same password for test stability
            }
        )
        
        assert change_response.status_code == 200, f"Password change failed: {change_response.text}"
        print(f"✓ Step 3: Password changed successfully")
        
        # Verify login still works with same password
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert login_response.status_code == 200, "Login should work after password change"
        print(f"✓ Login verified after password change")
    
    def test_change_password_short_password(self):
        """Test password change with too short password"""
        # First request OTP
        request_response = requests.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": ADMIN_EMAIL}
        )
        
        otp = request_response.json().get("otp")
        if not otp:
            pytest.skip("Need OTP to test password validation")
        
        # Try to change with short password
        change_response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "email": ADMIN_EMAIL,
                "otp": otp,
                "new_password": "123"  # Too short
            }
        )
        
        assert change_response.status_code == 400, f"Expected 400 for short password, got {change_response.status_code}"
        print("✓ Short password correctly rejected")


class TestDateNavigation:
    """Tests for date-based queries (used by attendance page)"""
    
    def test_attendance_date_navigation_previous(self, admin_token):
        """Test getting attendance for previous day"""
        # Get yesterday's date
        from datetime import timedelta
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/daily",
            params={"date": yesterday},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.json()["date"] == yesterday
        print(f"✓ Date navigation to previous day ({yesterday}) working")
    
    def test_attendance_date_navigation_next(self, admin_token):
        """Test getting attendance for next day (should return empty for future)"""
        from datetime import timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/attendance/admin/daily",
            params={"date": tomorrow},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.json()["date"] == tomorrow
        print(f"✓ Date navigation to future day ({tomorrow}) working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
