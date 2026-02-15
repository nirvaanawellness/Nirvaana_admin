import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, LogIn, LogOut as LogOutIcon, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TherapistAttendance = ({ user, onLogout }) => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/attendance/my-attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = response.data.find(a => a.date === today);
      setTodayAttendance(todayRecord || null);
      setAttendanceHistory(response.data);
    } catch (error) {
      toast.error('Failed to load attendance');
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/attendance/check-in`,
        { gps_location: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Checked in successfully!');
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/attendance/check-out`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Checked out successfully!');
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/therapist">
              <Button variant="outline" size="sm" data-testid="back-button">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </Link>
            <h1 className="text-2xl font-serif text-foreground">Attendance</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-6" data-testid="attendance-card">
          <h2 className="text-xl font-serif text-foreground mb-6">Today's Attendance</h2>

          {todayAttendance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-accent/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LogIn className="w-5 h-5 text-accent" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Check-in</p>
                  </div>
                  <p className="text-2xl font-medium text-foreground">{formatTime(todayAttendance.check_in_time)}</p>
                </div>

                <div className="bg-destructive/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LogOutIcon className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Check-out</p>
                  </div>
                  <p className="text-2xl font-medium text-foreground">{formatTime(todayAttendance.check_out_time)}</p>
                </div>
              </div>

              {!todayAttendance.check_out_time && (
                <Button
                  className="w-full h-12 rounded-full"
                  onClick={handleCheckOut}
                  disabled={loading}
                  data-testid="checkout-button"
                >
                  {loading ? 'Processing...' : 'Check Out'}
                </Button>
              )}
            </div>
          ) : (
            <Button
              className="w-full h-12 rounded-full"
              onClick={handleCheckIn}
              disabled={loading}
              data-testid="checkin-button"
            >
              {loading ? 'Processing...' : 'Check In'}
            </Button>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4">Attendance History</h3>
          <div className="space-y-3">
            {attendanceHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
            ) : (
              attendanceHistory.slice(0, 10).map((record, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{record.date}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-muted-foreground">In: {formatTime(record.check_in_time)}</p>
                        {record.check_out_time && (
                          <p className="text-xs text-muted-foreground">Out: {formatTime(record.check_out_time)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {record.check_out_time ? (
                    <div className="px-3 py-1 bg-accent/20 text-accent text-xs rounded-full">Complete</div>
                  ) : (
                    <div className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">Active</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistAttendance;