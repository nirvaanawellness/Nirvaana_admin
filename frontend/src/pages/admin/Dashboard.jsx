import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Building2, Users, Package, FileText, Award,
  DollarSign, TrendingUp, UserCheck, Filter, X, Download, Receipt,
  ChevronLeft, ChevronRight, RotateCcw, ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AppHeader from '@/components/shared/AppHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Generate months for timeline (past 12 months + current)
const generateMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      shortLabel: date.toLocaleDateString('en-US', { month: 'short' }) + " '" + String(date.getFullYear()).slice(2),
      isCurrent: i === 0
    });
  }
  return months;
};

const AdminDashboard = ({ user, onLogout }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [allServices, setAllServices] = useState([]);
  
  // Timeline state
  const months = useMemo(() => generateMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(null); // null = today only
  const [timelineOffset, setTimelineOffset] = useState(Math.max(0, months.length - 6)); // Start showing current month on right
  
  // Filters
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedTherapists, setSelectedTherapists] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog for detailed view
  const [detailDialog, setDetailDialog] = useState({ open: false, type: '', data: [] });

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (!selectedMonth) {
      // Default: Today only
      return { from: today, to: today, label: `Today (${today})` };
    }
    
    const { year, month, isCurrent } = selectedMonth;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    
    if (isCurrent) {
      // Current month: 1st to today
      return { from: firstDay, to: today, label: `${selectedMonth.label} (1st to Today)` };
    } else {
      // Past month: Full month
      const lastDay = new Date(year, month, 0).getDate();
      const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from: firstDay, to: lastDayStr, label: `${selectedMonth.label} (Full Month)` };
    }
  };

  const dateRange = useMemo(() => getDateRange(), [selectedMonth]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (properties.length > 0 || therapists.length > 0) {
      fetchFilteredData();
    }
  }, [selectedMonth, selectedProperties, selectedTherapists]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [propsRes, therapistsRes] = await Promise.all([
        axios.get(`${API}/properties`, { headers }),
        axios.get(`${API}/therapists`, { headers })
      ]);
      
      setProperties(propsRes.data);
      setTherapists(therapistsRes.data);
      fetchFilteredData();
    } catch (error) {
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Apply date range
      const { from, to } = getDateRange();
      params.append('date_from', from);
      params.append('date_to', to);
      
      // Apply property/therapist filters
      if (selectedProperties.length > 0) {
        selectedProperties.forEach(p => params.append('property_id', p));
      }
      if (selectedTherapists.length > 0) {
        selectedTherapists.forEach(t => params.append('therapist_id', t));
      }
      
      const servicesRes = await axios.get(`${API}/services?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const services = servicesRes.data;
      setAllServices(services);
      
      // Calculate analytics
      const total_base_sales = services.reduce((sum, s) => sum + s.base_price, 0);
      const total_gst = services.reduce((sum, s) => sum + s.gst_amount, 0);
      const total_sales = services.reduce((sum, s) => sum + s.total_amount, 0);
      const hotel_received = services.filter(s => s.payment_received_by === 'hotel').reduce((sum, s) => sum + s.total_amount, 0);
      const nirvaana_received = services.filter(s => s.payment_received_by === 'nirvaana').reduce((sum, s) => sum + s.total_amount, 0);
      const customer_count = new Set(services.map(s => s.customer_phone)).size;
      
      setAnalytics({
        total_base_sales,
        total_gst,
        total_sales,
        hotel_received,
        nirvaana_received,
        customer_count,
        total_services: services.length
      });
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToToday = () => {
    setSelectedMonth(null);
    setSelectedProperties([]);
    setSelectedTherapists([]);
  };

  const handleMonthSelect = (month) => {
    if (selectedMonth?.year === month.year && selectedMonth?.month === month.month) {
      // Clicking same month again -> deselect (back to today)
      setSelectedMonth(null);
    } else {
      setSelectedMonth(month);
    }
  };

  const toggleProperty = (propertyId) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(p => p !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleTherapist = (therapistId) => {
    setSelectedTherapists(prev => 
      prev.includes(therapistId) 
        ? prev.filter(t => t !== therapistId)
        : [...prev, therapistId]
    );
  };

  const openDetailDialog = (type) => {
    setDetailDialog({ open: true, type, data: allServices });
  };

  const downloadExcel = () => {
    const headers = ['Date', 'Therapist Name', 'Customer Name', 'Customer Phone', 'Amount (No GST)', 'GST', 'Hotel Name', 'City', 'Therapy Name', 'Amount Paid To', 'Payment Mode'];
    
    const rows = allServices.map(service => {
      const therapist = therapists.find(t => t.user_id === service.therapist_id);
      const property = properties.find(p => p.hotel_name === service.property_id || p.id === service.property_id);
      
      return [
        service.date,
        therapist?.full_name || 'N/A',
        service.customer_name,
        service.customer_phone,
        service.base_price,
        service.gst_amount,
        property?.hotel_name || service.property_id,
        property?.location || 'N/A',
        service.therapy_type,
        service.payment_received_by === 'hotel' ? 'Hotel' : 'Nirvaana',
        service.payment_mode || 'N/A'
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nirvaana-sales-${dateRange.from}-to-${dateRange.to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Report downloaded!');
  };

  const revenueData = analytics ? [
    { name: 'Paid to Hotel', value: analytics.hotel_received, color: '#B89D62' },
    { name: 'Paid to Nirvaana', value: analytics.nirvaana_received, color: '#88856A' }
  ].filter(d => d.value > 0) : [];

  const hasActiveFilters = selectedProperties.length > 0 || selectedTherapists.length > 0 || selectedMonth !== null;
  const visibleMonths = months.slice(Math.max(0, timelineOffset), timelineOffset + 6);

  const headerRightContent = (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setShowFilters(!showFilters)}
        className="text-[#B89D62]/80 hover:text-[#B89D62] hover:bg-[#B89D62]/10"
        data-testid="toggle-filters-button"
      >
        <Filter className="w-4 h-4 mr-2" strokeWidth={1.5} />
        Filters
        {(selectedProperties.length > 0 || selectedTherapists.length > 0) && 
          <span className="ml-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {selectedProperties.length + selectedTherapists.length}
          </span>
        }
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={downloadExcel}
        disabled={allServices.length === 0}
        className="text-[#B89D62]/80 hover:text-[#B89D62] hover:bg-[#B89D62]/10"
        data-testid="download-excel-button"
      >
        <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
        Excel
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} rightContent={headerRightContent} />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome + Month Timeline */}
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif text-foreground mb-1">Welcome, {user.full_name}</h2>
              <p className="text-sm text-muted-foreground">Admin Portal - Operations Management</p>
            </div>
            
            {/* Month Timeline Scroller */}
            <div className="flex items-center gap-2" data-testid="month-timeline">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTimelineOffset(Math.max(0, timelineOffset - 1))}
                disabled={timelineOffset === 0}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex gap-1 overflow-hidden">
                {visibleMonths.map((m) => (
                  <button
                    key={`${m.year}-${m.month}`}
                    onClick={() => handleMonthSelect(m)}
                    data-testid={`month-${m.year}-${m.month}`}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      selectedMonth?.year === m.year && selectedMonth?.month === m.month
                        ? 'bg-primary text-white'
                        : m.isCurrent
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {m.shortLabel}
                    {m.isCurrent && <span className="ml-1">●</span>}
                  </button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTimelineOffset(Math.min(months.length - 6, timelineOffset + 1))}
                disabled={timelineOffset >= months.length - 6}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToToday}
                  data-testid="reset-to-today-button"
                  className="ml-2"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
          
          {/* Date Range Indicator */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Showing data for: <span className="font-medium text-foreground">{dateRange.label}</span>
            </p>
          </div>
        </div>

        {/* Property/Therapist Filters Panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-6" data-testid="filters-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-foreground">Additional Filters</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block">Properties</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {properties.map((property) => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`property-${property.id}`}
                        checked={selectedProperties.includes(property.hotel_name)}
                        onCheckedChange={() => toggleProperty(property.hotel_name)}
                      />
                      <label htmlFor={`property-${property.id}`} className="text-sm cursor-pointer">
                        {property.hotel_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Therapists</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {therapists.map((therapist) => (
                    <div key={therapist.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`therapist-${therapist.user_id}`}
                        checked={selectedTherapists.includes(therapist.user_id)}
                        onCheckedChange={() => toggleTherapist(therapist.user_id)}
                      />
                      <label htmlFor={`therapist-${therapist.user_id}`} className="text-sm cursor-pointer">
                        {therapist.full_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clickable Stat Cards */}
        {!loading && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              className="glass rounded-2xl p-6 cursor-pointer hover:shadow-float transition-all" 
              onClick={() => openDetailDialog('sales')}
              data-testid="total-sales-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Total Sales</p>
              </div>
              <p className="text-3xl font-medium text-foreground">₹{analytics.total_sales.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Base: ₹{analytics.total_base_sales.toLocaleString()}</p>
              <p className="text-xs text-primary mt-2">Click for details →</p>
            </div>

            <div 
              className="glass rounded-2xl p-6 cursor-pointer hover:shadow-float transition-all"
              onClick={() => openDetailDialog('gst')}
              data-testid="gst-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-accent" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">GST Collected</p>
              </div>
              <p className="text-3xl font-medium text-foreground">₹{analytics.total_gst.toLocaleString()}</p>
              <p className="text-xs text-primary mt-2">Click for details →</p>
            </div>

            <div 
              className="glass rounded-2xl p-6 cursor-pointer hover:shadow-float transition-all"
              onClick={() => openDetailDialog('customers')}
              data-testid="customers-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="w-6 h-6 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Customers</p>
              </div>
              <p className="text-3xl font-medium text-foreground">{analytics.customer_count}</p>
              <p className="text-xs text-primary mt-2">Click for details →</p>
            </div>

            <div 
              className="glass rounded-2xl p-6 cursor-pointer hover:shadow-float transition-all"
              onClick={() => openDetailDialog('services')}
              data-testid="services-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-accent" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Total Services</p>
              </div>
              <p className="text-3xl font-medium text-foreground">{analytics.total_services}</p>
              <p className="text-xs text-primary mt-2">Click for details →</p>
            </div>
          </div>
        )}

        {/* Revenue Distribution Pie Chart */}
        {!loading && analytics && revenueData.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-foreground">Revenue Distribution</h3>
              <p className="text-sm text-muted-foreground">{dateRange.label}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={revenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `₹${value.toLocaleString()}`}
                  >
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="flex flex-col justify-center space-y-4">
                <div className="bg-[#B89D62]/10 rounded-xl p-4 border border-[#B89D62]/30">
                  <p className="text-sm text-muted-foreground mb-1">Paid to Hotel</p>
                  <p className="text-2xl font-medium text-[#B89D62]">₹{analytics.hotel_received.toLocaleString()}</p>
                </div>
                <div className="bg-[#88856A]/10 rounded-xl p-4 border border-[#88856A]/30">
                  <p className="text-sm text-muted-foreground mb-1">Paid to Nirvaana</p>
                  <p className="text-2xl font-medium text-[#88856A]">₹{analytics.nirvaana_received.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-medium text-foreground">₹{analytics.total_sales.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && analytics && analytics.total_services === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-muted-foreground">No services found for {dateRange.label}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleResetToToday}>
              Reset to Today
            </Button>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/admin/properties">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="properties-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Properties</h3>
                  <p className="text-sm text-muted-foreground">Manage hotels</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin/therapists">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="therapists-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Therapists</h3>
                  <p className="text-sm text-muted-foreground">Manage staff</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin/services">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="services-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Package className="w-6 h-6 text-secondary-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Services</h3>
                  <p className="text-sm text-muted-foreground">View entries</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin/reports">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="reports-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Reports</h3>
                  <p className="text-sm text-muted-foreground">Financial analytics</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin/expenses">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="expenses-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-red-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Expenses</h3>
                  <p className="text-sm text-muted-foreground">Track costs</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin/incentives">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="incentives-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Incentives</h3>
                  <p className="text-sm text-muted-foreground">Manage payouts</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {detailDialog.type === 'sales' && 'Sales Details'}
              {detailDialog.type === 'gst' && 'GST Details'}
              {detailDialog.type === 'customers' && 'Customer Details'}
              {detailDialog.type === 'services' && 'Service Details'}
              <span className="text-sm font-normal text-muted-foreground ml-2">({dateRange.label})</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Therapist</th>
                    <th className="text-left py-2 px-2">Customer</th>
                    <th className="text-left py-2 px-2">Phone</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-right py-2 px-2">GST</th>
                    <th className="text-left py-2 px-2">Hotel</th>
                    <th className="text-left py-2 px-2">Therapy</th>
                    <th className="text-left py-2 px-2">Paid To</th>
                    <th className="text-left py-2 px-2">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {detailDialog.data.map((service, idx) => {
                    const therapist = therapists.find(t => t.user_id === service.therapist_id);
                    const property = properties.find(p => p.hotel_name === service.property_id || p.id === service.property_id);
                    
                    return (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2">{service.date}</td>
                        <td className="py-2 px-2">{therapist?.full_name || 'N/A'}</td>
                        <td className="py-2 px-2">{service.customer_name}</td>
                        <td className="py-2 px-2">{service.customer_phone}</td>
                        <td className="py-2 px-2 text-right">₹{service.base_price}</td>
                        <td className="py-2 px-2 text-right">₹{service.gst_amount}</td>
                        <td className="py-2 px-2">{property?.hotel_name || service.property_id}</td>
                        <td className="py-2 px-2">{service.therapy_type}</td>
                        <td className="py-2 px-2">{service.payment_received_by === 'hotel' ? 'Hotel' : 'Nirvaana'}</td>
                        <td className="py-2 px-2">{service.payment_mode || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
