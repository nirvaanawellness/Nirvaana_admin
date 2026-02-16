import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import TherapistDashboard from './pages/therapist/Dashboard';
import TherapistAttendance from './pages/therapist/Attendance';
import TherapistServiceEntry from './pages/therapist/ServiceEntry';
import TherapistPerformance from './pages/therapist/Performance';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProperties from './pages/admin/Properties';
import AdminTherapists from './pages/admin/Therapists';
import AdminServices from './pages/admin/Services';
import AdminReports from './pages/admin/Reports';
import AdminIncentives from './pages/admin/Incentives';
import AdminExpenses from './pages/admin/Expenses';
import AdminSettings from './pages/admin/Settings';
import AdminAttendance from './pages/admin/Attendance';
import AdminCustomers from './pages/admin/Customers';
import AdminAnalytics from './pages/admin/Analytics';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={user.role === 'super_admin' ? '/admin' : '/therapist'} />}
          />
          
          {/* Therapist Routes */}
          <Route
            path="/therapist"
            element={user?.role === 'therapist' ? <TherapistDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/therapist/attendance"
            element={user?.role === 'therapist' ? <TherapistAttendance user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/therapist/service-entry"
            element={user?.role === 'therapist' ? <TherapistServiceEntry user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/therapist/performance"
            element={user?.role === 'therapist' ? <TherapistPerformance user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={user?.role === 'super_admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/properties"
            element={user?.role === 'super_admin' ? <AdminProperties user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/therapists"
            element={user?.role === 'super_admin' ? <AdminTherapists user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/services"
            element={user?.role === 'super_admin' ? <AdminServices user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/reports"
            element={user?.role === 'super_admin' ? <AdminReports user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/incentives"
            element={user?.role === 'super_admin' ? <AdminIncentives user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/expenses"
            element={user?.role === 'super_admin' ? <AdminExpenses user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/settings"
            element={user?.role === 'super_admin' ? <AdminSettings user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/attendance"
            element={user?.role === 'super_admin' ? <AdminAttendance user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/customers"
            element={user?.role === 'super_admin' ? <AdminCustomers user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/analytics"
            element={user?.role === 'super_admin' ? <AdminAnalytics user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;