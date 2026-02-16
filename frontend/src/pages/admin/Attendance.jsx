import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, Clock, LogIn, LogOut as LogOutIcon, Users, Building2, ChevronLeft, ChevronRight, UserCheck, UserX, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppHeader from '@/components/shared/AppHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminAttendance = ({ user, onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchTherapists();
  }, []);

  useEffect(() => {
    fetchDailyAttendance();
  }, [selectedDate, selectedProperty]);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      toast.error('Failed to load properties');
    }
  };

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/therapists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTherapists(response.data);
    } catch (error) {
      toast.error('Failed to load therapists');
    }
  };

  const fetchDailyAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/attendance/admin/daily?date=${selectedDate}`;
      if (selectedProperty !== 'all') {
        url += `&property_id=${selectedProperty}`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDailyData(response.data);
    } catch (error) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapistHistory = async (therapistId, therapistName) => {
    setSelectedTherapist({ id: therapistId, name: therapistName });
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/attendance/admin/history/${therapistId}`;
      const params = [];
      if (historyDateFrom) params.push(`date_from=${historyDateFrom}`);
      if (historyDateTo) params.push(`date_to=${historyDateTo}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load attendance history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const navigateDate = (direction) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + direction);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const calculateHoursWorked = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  };

  const getCompletionStats = () => {
    if (!dailyData) return { completedCount: 0, totalHours: 0, avgCompletion: 0 };
    
    let completedCount = 0;
    let totalHours = 0;
    const totalTherapists = dailyData.total_checked_in + dailyData.total_not_checked_in;
    
    dailyData.checked_in?.forEach(record => {
      if (record.check_in_time && record.check_out_time) {
        const hours = calculateHoursWorked(record.check_in_time, record.check_out_time);
        totalHours += hours;
        if (hours >= 9) {
          completedCount++;
        }
      }
    });
    
    const avgCompletion = totalTherapists > 0 
      ? Math.round((completedCount / totalTherapists) * 100) 
      : 0;
    
    return { completedCount, totalHours, avgCompletion };
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (record) => {
    if (!record.check_in_time) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Not Signed In</span>;
    }
    if (!record.check_out_time) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Working</span>;
    }
    const hoursWorked = calculateHoursWorked(record.check_in_time, record.check_out_time);
    if (hoursWorked >= 9) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Complete (9+ hrs)</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">{hoursWorked.toFixed(1)} hrs</span>;
  };

  const completionStats = getCompletionStats();

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} showBack={true} backTo="/admin" title="Attendance Tracking" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header with Date Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigateDate(-1)}
              data-testid="prev-date-btn"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
                data-testid="date-picker"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigateDate(1)}
              disabled={isToday}
              data-testid="next-date-btn"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            {!isToday && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                data-testid="today-btn"
              >
                Today
              </Button>
            )}
          </div>

          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]" data-testid="property-filter">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(prop => (
                <SelectItem key={prop.id} value={prop.hotel_name}>{prop.hotel_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Display */}
        <div className="text-center">
          <h2 className="text-2xl font-serif text-foreground">{formatDate(selectedDate)}</h2>
          {isToday && <p className="text-sm text-primary mt-1">Today</p>}
        </div>

        {/* Summary Cards */}
        {dailyData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4" data-testid="summary-total">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Therapists</span>
              </div>
              <p className="text-2xl font-semibold">{dailyData.total_checked_in + dailyData.total_not_checked_in}</p>
            </div>
            
            <div className="glass rounded-xl p-4 border-l-4 border-green-500" data-testid="summary-checked-in">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Signed In</span>
              </div>
              <p className="text-2xl font-semibold text-green-600">{dailyData.total_checked_in}</p>
            </div>
            
            <div className="glass rounded-xl p-4 border-l-4 border-red-500" data-testid="summary-not-checked-in">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-5 h-5 text-red-600" />
                <span className="text-sm text-muted-foreground">Not Signed In</span>
              </div>
              <p className="text-2xl font-semibold text-red-600">{dailyData.total_not_checked_in}</p>
            </div>
            
            <div className="glass rounded-xl p-4" data-testid="summary-completion">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-muted-foreground">Completion (9+ hrs)</span>
              </div>
              <p className="text-2xl font-semibold">{completionStats.avgCompletion}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {completionStats.completedCount} of {dailyData.total_checked_in + dailyData.total_not_checked_in} completed
              </p>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            Daily Attendance Log
          </h3>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : dailyData?.checked_in?.length > 0 || dailyData?.not_checked_in?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Therapist</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Sign In</TableHead>
                    <TableHead>Sign Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Checked in therapists */}
                  {dailyData.checked_in.map((record, index) => {
                    const hoursWorked = calculateHoursWorked(record.check_in_time, record.check_out_time);
                    return (
                    <TableRow key={`in-${index}`} data-testid={`attendance-row-${record.therapist_id}`}>
                      <TableCell className="font-medium">{record.therapist_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {record.property_id || record.assigned_property}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-green-600">
                          <LogIn className="w-4 h-4" />
                          {formatTime(record.check_in_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.check_out_time ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <LogOutIcon className="w-4 h-4" />
                            {formatTime(record.check_out_time)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.check_out_time ? (
                          <span className={`font-medium ${hoursWorked >= 9 ? 'text-green-600' : 'text-amber-600'}`}>
                            {hoursWorked.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(record)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchTherapistHistory(record.therapist_id, record.therapist_name)}
                          data-testid={`history-btn-${record.therapist_id}`}
                        >
                          <History className="w-4 h-4 mr-1" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  
                  {/* Not checked in therapists */}
                  {dailyData.not_checked_in.map((therapist, index) => (
                    <TableRow key={`notIn-${index}`} className="bg-red-50/50" data-testid={`attendance-row-${therapist.therapist_id}`}>
                      <TableCell className="font-medium text-red-700">{therapist.therapist_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {therapist.assigned_property}
                        </div>
                      </TableCell>
                      <TableCell colSpan={2} className="text-center text-red-600">
                        Not signed in today
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Absent</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchTherapistHistory(therapist.therapist_id, therapist.therapist_name)}
                          data-testid={`history-btn-${therapist.therapist_id}`}
                        >
                          <History className="w-4 h-4 mr-1" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No attendance records for this date</p>
            </div>
          )}
        </div>
      </div>

      {/* Therapist History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Attendance History - {selectedTherapist?.name}
            </DialogTitle>
            <DialogDescription>
              View historical attendance records for this therapist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Date Range Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={historyDateFrom}
                  onChange={(e) => setHistoryDateFrom(e.target.value)}
                  data-testid="history-date-from"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={historyDateTo}
                  onChange={(e) => setHistoryDateTo(e.target.value)}
                  data-testid="history-date-to"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => selectedTherapist && fetchTherapistHistory(selectedTherapist.id, selectedTherapist.name)}
                  disabled={historyLoading}
                  data-testid="apply-history-filter"
                >
                  Apply Filter
                </Button>
              </div>
            </div>

            {/* History Records */}
            {historyLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : historyData ? (
              <div>
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Property: <span className="font-medium text-foreground">{historyData.assigned_property}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total Records: <span className="font-medium text-foreground">{historyData.total_records}</span>
                  </p>
                </div>

                {historyData.attendance_records?.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {historyData.attendance_records.map((record, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                        data-testid={`history-record-${record.date}`}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{record.date}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1 text-green-600">
                            <LogIn className="w-4 h-4" />
                            <span className="text-sm">{formatTime(record.check_in_time)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <LogOutIcon className="w-4 h-4" />
                            <span className="text-sm">{formatTime(record.check_out_time)}</span>
                          </div>
                          {getStatusBadge(record)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found for this therapist
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAttendance;
