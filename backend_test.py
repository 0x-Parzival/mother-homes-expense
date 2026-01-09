import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class MotherHomesPGTester:
    def __init__(self, base_url="https://pg-expense-tracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_flats = []
        self.created_tenants = []
        self.created_expenses = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"   Status: {response.status_code}, Expected: {expected_status}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"   Exception: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        user_data = {
            "email": "test@motherhomes.com",
            "password": "TestPass123",
            "name": "Test User"
        }
        
        success, response = self.make_request('POST', 'auth/register', user_data, 200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            self.log_test("User Registration", True, f"- Token received, User ID: {self.user_data['id']}")
            return True
        else:
            self.log_test("User Registration", False, "- No token received")
            return False

    def test_user_login(self):
        """Test user login"""
        print("\n🔍 Testing User Login...")
        
        login_data = {
            "email": "test@motherhomes.com",
            "password": "TestPass123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            self.log_test("User Login", True, f"- Token received, User: {self.user_data['name']}")
            return True
        else:
            self.log_test("User Login", False, "- Login failed")
            return False

    def test_create_flats(self):
        """Test creating multiple flats"""
        print("\n🔍 Testing Flat Creation...")
        
        flats_data = [
            {"name": "Flat A", "address": "123 Main St", "rent_amount": 15000},
            {"name": "Flat B", "address": "456 Park Ave", "rent_amount": 18000},
            {"name": "Flat C", "address": "789 Lake View", "rent_amount": 20000}
        ]
        
        for flat_data in flats_data:
            success, response = self.make_request('POST', 'flats', flat_data, 200)
            
            if success and 'id' in response:
                self.created_flats.append(response)
                self.log_test(f"Create {flat_data['name']}", True, f"- ID: {response['id']}")
            else:
                self.log_test(f"Create {flat_data['name']}", False, "- Creation failed")
                return False
        
        return len(self.created_flats) == 3

    def test_get_flats(self):
        """Test retrieving all flats"""
        print("\n🔍 Testing Get All Flats...")
        
        success, response = self.make_request('GET', 'flats')
        
        if success and isinstance(response, list):
            self.log_test("Get All Flats", True, f"- Retrieved {len(response)} flats")
            return len(response) >= 3
        else:
            self.log_test("Get All Flats", False, "- Failed to retrieve flats")
            return False

    def test_update_flat(self):
        """Test updating flat rent"""
        print("\n🔍 Testing Flat Update...")
        
        if not self.created_flats:
            self.log_test("Update Flat", False, "- No flats to update")
            return False
        
        flat_a = self.created_flats[0]
        update_data = {
            "name": flat_a['name'],
            "address": flat_a['address'],
            "rent_amount": 16000
        }
        
        success, response = self.make_request('PUT', f'flats/{flat_a["id"]}', update_data, 200)
        
        if success and response.get('rent_amount') == 16000:
            self.log_test("Update Flat A Rent", True, f"- Updated to ₹16000")
            return True
        else:
            self.log_test("Update Flat A Rent", False, "- Update failed")
            return False

    def test_create_tenants(self):
        """Test creating tenants for flats"""
        print("\n🔍 Testing Tenant Creation...")
        
        if len(self.created_flats) < 2:
            self.log_test("Create Tenants", False, "- Insufficient flats")
            return False
        
        # Tenants for Flat A
        flat_a_tenants = [
            {"name": "John Doe", "rent_amount": 7000, "flat_id": self.created_flats[0]['id']},
            {"name": "Jane Smith", "rent_amount": 7500, "flat_id": self.created_flats[0]['id']},
            {"name": "Bob Wilson", "rent_amount": 8000, "flat_id": self.created_flats[0]['id']}
        ]
        
        # Tenants for Flat B
        flat_b_tenants = [
            {"name": "Alice Brown", "rent_amount": 8000, "flat_id": self.created_flats[1]['id']},
            {"name": "Charlie Davis", "rent_amount": 9000, "flat_id": self.created_flats[1]['id']}
        ]
        
        all_tenants = flat_a_tenants + flat_b_tenants
        
        for tenant_data in all_tenants:
            success, response = self.make_request('POST', 'tenants', tenant_data, 200)
            
            if success and 'id' in response:
                self.created_tenants.append(response)
                self.log_test(f"Create Tenant {tenant_data['name']}", True, f"- Rent: ₹{tenant_data['rent_amount']}")
            else:
                self.log_test(f"Create Tenant {tenant_data['name']}", False, "- Creation failed")
                return False
        
        return len(self.created_tenants) == 5

    def test_get_tenants(self):
        """Test retrieving tenants by flat"""
        print("\n🔍 Testing Get Tenants by Flat...")
        
        for flat in self.created_flats[:2]:  # Test first 2 flats
            success, response = self.make_request('GET', 'tenants', {'flat_id': flat['id']})
            
            if success and isinstance(response, list):
                expected_count = 3 if flat == self.created_flats[0] else 2
                if len(response) == expected_count:
                    self.log_test(f"Get Tenants for {flat['name']}", True, f"- Found {len(response)} tenants")
                else:
                    self.log_test(f"Get Tenants for {flat['name']}", False, f"- Expected {expected_count}, got {len(response)}")
                    return False
            else:
                self.log_test(f"Get Tenants for {flat['name']}", False, "- Failed to retrieve")
                return False
        
        return True

    def test_update_tenant(self):
        """Test updating tenant rent"""
        print("\n🔍 Testing Tenant Update...")
        
        if not self.created_tenants:
            self.log_test("Update Tenant", False, "- No tenants to update")
            return False
        
        tenant = self.created_tenants[0]
        update_data = {
            "name": tenant['name'],
            "rent_amount": 7200,
            "flat_id": tenant['flat_id']
        }
        
        success, response = self.make_request('PUT', f'tenants/{tenant["id"]}', update_data, 200)
        
        if success and response.get('rent_amount') == 7200:
            self.log_test("Update Tenant Rent", True, f"- Updated to ₹7200")
            return True
        else:
            self.log_test("Update Tenant Rent", False, "- Update failed")
            return False

    def test_delete_tenant(self):
        """Test deleting a tenant"""
        print("\n🔍 Testing Tenant Deletion...")
        
        if len(self.created_tenants) < 2:
            self.log_test("Delete Tenant", False, "- Insufficient tenants")
            return False
        
        tenant_to_delete = self.created_tenants[-1]  # Delete last tenant
        
        success, response = self.make_request('DELETE', f'tenants/{tenant_to_delete["id"]}', expected_status=200)
        
        if success:
            self.created_tenants.remove(tenant_to_delete)
            self.log_test("Delete Tenant", True, f"- Deleted {tenant_to_delete['name']}")
            return True
        else:
            self.log_test("Delete Tenant", False, "- Deletion failed")
            return False

    def test_create_expenses(self):
        """Test creating various expenses"""
        print("\n🔍 Testing Expense Creation...")
        
        if len(self.created_flats) < 2:
            self.log_test("Create Expenses", False, "- Insufficient flats")
            return False
        
        # Expenses for Flat A
        flat_a_expenses = [
            {"category": "rent", "description": "Monthly Rent", "amount": 15000, "flat_id": self.created_flats[0]['id']},
            {"category": "maintenance", "description": "Building Maintenance", "amount": 2000, "flat_id": self.created_flats[0]['id']},
            {"category": "maid", "description": "Cleaning Service", "amount": 3000, "flat_id": self.created_flats[0]['id']},
            {"category": "food", "description": "Rice", "amount": 500, "flat_id": self.created_flats[0]['id']},
            {"category": "cleaning", "description": "Cleaning Supplies", "amount": 1000, "flat_id": self.created_flats[0]['id']}
        ]
        
        # Expenses for Flat B
        flat_b_expenses = [
            {"category": "rent", "description": "Monthly Rent", "amount": 18000, "flat_id": self.created_flats[1]['id']},
            {"category": "maintenance", "description": "Repairs", "amount": 1500, "flat_id": self.created_flats[1]['id']},
            {"category": "maid", "description": "Cleaning Service", "amount": 2500, "flat_id": self.created_flats[1]['id']}
        ]
        
        all_expenses = flat_a_expenses + flat_b_expenses
        
        for expense_data in all_expenses:
            success, response = self.make_request('POST', 'expenses', expense_data, 200)
            
            if success and 'id' in response:
                self.created_expenses.append(response)
                self.log_test(f"Create Expense {expense_data['category']}", True, f"- Amount: ₹{expense_data['amount']}")
            else:
                self.log_test(f"Create Expense {expense_data['category']}", False, "- Creation failed")
                return False
        
        return len(self.created_expenses) == 8

    def test_get_expenses(self):
        """Test retrieving expenses by flat"""
        print("\n🔍 Testing Get Expenses by Flat...")
        
        for flat in self.created_flats[:2]:  # Test first 2 flats
            success, response = self.make_request('GET', 'expenses', {'flat_id': flat['id']})
            
            if success and isinstance(response, list):
                expected_count = 5 if flat == self.created_flats[0] else 3
                if len(response) == expected_count:
                    total_amount = sum(exp['amount'] for exp in response)
                    self.log_test(f"Get Expenses for {flat['name']}", True, f"- {len(response)} expenses, Total: ₹{total_amount}")
                else:
                    self.log_test(f"Get Expenses for {flat['name']}", False, f"- Expected {expected_count}, got {len(response)}")
                    return False
            else:
                self.log_test(f"Get Expenses for {flat['name']}", False, "- Failed to retrieve")
                return False
        
        return True

    def test_date_filtering(self):
        """Test expense date filtering"""
        print("\n🔍 Testing Date Filtering...")
        
        # Test weekly filter (last 7 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        
        success, response = self.make_request('GET', 'expenses', params)
        
        if success and isinstance(response, list):
            self.log_test("Weekly Date Filter", True, f"- Found {len(response)} expenses in last 7 days")
        else:
            self.log_test("Weekly Date Filter", False, "- Date filtering failed")
            return False
        
        # Test monthly filter (last 30 days)
        start_date = end_date - timedelta(days=30)
        params['start_date'] = start_date.isoformat()
        
        success, response = self.make_request('GET', 'expenses', params)
        
        if success and isinstance(response, list):
            self.log_test("Monthly Date Filter", True, f"- Found {len(response)} expenses in last 30 days")
            return True
        else:
            self.log_test("Monthly Date Filter", False, "- Monthly filtering failed")
            return False

    def test_dashboard_analytics(self):
        """Test dashboard endpoint and calculations"""
        print("\n🔍 Testing Dashboard Analytics...")
        
        # Test dashboard without filters
        success, response = self.make_request('GET', 'dashboard')
        
        if not success:
            self.log_test("Dashboard Analytics", False, "- Failed to retrieve dashboard")
            return False
        
        # Verify structure
        required_fields = ['total_flats', 'total_tenants', 'total_income', 'total_expenses', 'total_profit', 'average_profit_percentage', 'flats_summary']
        
        for field in required_fields:
            if field not in response:
                self.log_test("Dashboard Structure", False, f"- Missing field: {field}")
                return False
        
        # Verify calculations
        total_income = response['total_income']
        total_expenses = response['total_expenses']
        total_profit = response['total_profit']
        profit_percentage = response['average_profit_percentage']
        
        expected_profit = total_income - total_expenses
        expected_percentage = (expected_profit / total_income * 100) if total_income > 0 else 0
        
        if abs(total_profit - expected_profit) < 0.01:  # Allow small floating point differences
            self.log_test("Profit Calculation", True, f"- Profit: ₹{total_profit}")
        else:
            self.log_test("Profit Calculation", False, f"- Expected: ₹{expected_profit}, Got: ₹{total_profit}")
            return False
        
        if abs(profit_percentage - expected_percentage) < 0.01:
            self.log_test("Profit Percentage", True, f"- {profit_percentage:.2f}%")
        else:
            self.log_test("Profit Percentage", False, f"- Expected: {expected_percentage:.2f}%, Got: {profit_percentage:.2f}%")
            return False
        
        self.log_test("Dashboard Analytics", True, f"- Income: ₹{total_income}, Expenses: ₹{total_expenses}, Profit: ₹{total_profit}")
        
        return True

    def test_dashboard_with_filters(self):
        """Test dashboard with date range filters"""
        print("\n🔍 Testing Dashboard with Date Filters...")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        
        success, response = self.make_request('GET', 'dashboard', params)
        
        if success and 'total_income' in response:
            self.log_test("Dashboard Date Filter", True, f"- Filtered Income: ₹{response['total_income']}")
            return True
        else:
            self.log_test("Dashboard Date Filter", False, "- Date filtering failed")
            return False

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Mother Homes PG Management API Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        # Authentication Tests
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
        
        if not self.test_user_login():
            print("❌ Login failed, stopping tests")
            return False
        
        # Flats Management Tests
        if not self.test_create_flats():
            print("❌ Flat creation failed, stopping tests")
            return False
        
        if not self.test_get_flats():
            print("❌ Get flats failed")
            return False
        
        if not self.test_update_flat():
            print("❌ Flat update failed")
            return False
        
        # Tenants Management Tests
        if not self.test_create_tenants():
            print("❌ Tenant creation failed")
            return False
        
        if not self.test_get_tenants():
            print("❌ Get tenants failed")
            return False
        
        if not self.test_update_tenant():
            print("❌ Tenant update failed")
            return False
        
        if not self.test_delete_tenant():
            print("❌ Tenant deletion failed")
            return False
        
        # Expenses Management Tests
        if not self.test_create_expenses():
            print("❌ Expense creation failed")
            return False
        
        if not self.test_get_expenses():
            print("❌ Get expenses failed")
            return False
        
        if not self.test_date_filtering():
            print("❌ Date filtering failed")
            return False
        
        # Dashboard Analytics Tests
        if not self.test_dashboard_analytics():
            print("❌ Dashboard analytics failed")
            return False
        
        if not self.test_dashboard_with_filters():
            print("❌ Dashboard filtering failed")
            return False
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed!")
            return 1

def main():
    tester = MotherHomesPGTester()
    
    try:
        success = tester.run_all_tests()
        return tester.print_summary()
    except Exception as e:
        print(f"❌ Test suite failed with exception: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())