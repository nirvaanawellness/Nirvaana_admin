import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  LayoutDashboard, Building2, Users, Package, FileText, Award, LogOut,
  DollarSign, TrendingUp, UserCheck, Calendar, Filter, X, Download, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user, onLogout }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [allServices, setAllServices] = useState([]);
  
  // Filters
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedTherapists, setSelectedTherapists] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog for detailed view
  const [detailDialog, setDetailDialog] = useState({ open: false, type: '', data: [] });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (properties.length > 0 || therapists.length > 0) {
      fetchFilteredData();
    }
  }, [selectedProperties, selectedTherapists, dateFrom, dateTo]);

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
      
      if (selectedProperties.length > 0) {
        selectedProperties.forEach(p => params.append('property_id', p));
      }
      if (selectedTherapists.length > 0) {
        selectedTherapists.forEach(t => params.append('therapist_id', t));
      }
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
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

  const handleResetFilters = () => {
    setSelectedProperties([]);
    setSelectedTherapists([]);
    setDateFrom('');
    setDateTo('');
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
    // Prepare CSV data
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
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `nirvaana-sales-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Excel report downloaded!');
  };

  const revenueData = analytics ? [
    { name: 'Hotel', value: analytics.hotel_received, color: '#B89D62' },
    { name: 'Nirvaana', value: analytics.nirvaana_received, color: '#88856A' }
  ] : [];

  const hasActiveFilters = selectedProperties.length > 0 || selectedTherapists.length > 0 || dateFrom || dateTo;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src="https://customer-assets.emergentagent.com/job_wellness-erp-core/artifacts/fny25i7a_Logo.png" 
            alt="Nirvaana Wellness"
            className="h-12 w-auto"
          />
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              data-testid="toggle-filters-button"
            >
              <Filter className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Filters
              {hasActiveFilters && <span className="ml-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {(selectedProperties.length || 0) + (selectedTherapists.length || 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
              </span>}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadExcel}
              disabled={allServices.length === 0}
              data-testid="download-excel-button"
            >
              <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} data-testid="logout-button">
              <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-serif text-foreground mb-2">Welcome, {user.full_name}</h2>
          <p className="text-sm text-muted-foreground">Admin Portal - Operations Management</p>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-6" data-testid="filters-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-foreground">Filters</h3>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters} data-testid="reset-filters-button">
                    <X className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Reset All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Property Filter */}
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
                      <label
                        htmlFor={`property-${property.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {property.hotel_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Therapist Filter */}
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
                      <label
                        htmlFor={`therapist-${therapist.user_id}`}
                        className="text-sm cursor-pointer"
                      >
                        {therapist.full_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <Label htmlFor="date-from" className="mb-2 block">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="date-from-input"
                />
              </div>

              <div>
                <Label htmlFor="date-to" className="mb-2 block">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="date-to-input"
                />
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

        {/* Revenue Chart */}
        {!loading && analytics && revenueData.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-serif text-foreground mb-6">Revenue Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ₹${entry.value.toLocaleString()}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
                  <p className="text-sm text-muted-foreground">Revenue & Analytics</p>
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
