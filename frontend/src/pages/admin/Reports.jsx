import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Building2, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminReports = ({ user, onLogout }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [revenueReport, setRevenueReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

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

  const fetchRevenueReport = async (propertyId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/revenue/property/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRevenueReport(response.data);
    } catch (error) {
      toast.error('Failed to load revenue report');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (value) => {
    setSelectedProperty(value);
    if (value) {
      fetchRevenueReport(value);
    } else {
      setRevenueReport(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="outline" size="sm" data-testid="back-button">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </Link>
            <h1 className="text-2xl font-serif text-foreground">Revenue Reports</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-6">
          <Label htmlFor="property-select">Select Property</Label>
          <Select value={selectedProperty} onValueChange={handlePropertyChange}>
            <SelectTrigger className="mt-2 h-12" data-testid="property-select">
              <SelectValue placeholder="Choose a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  {prop.hotel_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Loading report...</p>
          </div>
        )}

        {!loading && revenueReport && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-6 h-6 text-primary" strokeWidth={1.5} />
                <div>
                  <h2 className="text-xl font-serif text-foreground">{revenueReport.property_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Report for {new Date(revenueReport.year, revenueReport.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Base Sales</p>
                  <p className="text-2xl font-medium text-foreground">₹{revenueReport.total_base_sales.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">GST Collected</p>
                  <p className="text-2xl font-medium text-foreground">₹{revenueReport.total_gst.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-serif text-foreground mb-4">Revenue Share ({revenueReport.revenue_share_percentage}%)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Hotel Share</p>
                  </div>
                  <p className="text-3xl font-medium text-primary">₹{revenueReport.hotel_share.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Received: ₹{revenueReport.hotel_received.toLocaleString()}</p>
                </div>

                <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-accent" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Nirvaana Share</p>
                  </div>
                  <p className="text-3xl font-medium text-accent">₹{revenueReport.nirvaana_share.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Received: ₹{revenueReport.nirvaana_received.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-serif text-foreground mb-4">Settlement Status</h3>
              <div className={`rounded-xl p-6 border-2 ${
                revenueReport.settlement_balance > 0 
                  ? 'bg-destructive/10 border-destructive/20' 
                  : revenueReport.settlement_balance < 0
                  ? 'bg-accent/10 border-accent/20'
                  : 'bg-muted/30 border-border'
              }`}>
                <p className="text-sm text-muted-foreground mb-2">Balance</p>
                <p className="text-4xl font-medium text-foreground mb-3">
                  ₹{Math.abs(revenueReport.settlement_balance).toLocaleString()}
                </p>
                <p className="text-sm text-foreground">
                  {revenueReport.settlement_balance > 0 
                    ? 'Nirvaana owes Hotel' 
                    : revenueReport.settlement_balance < 0
                    ? 'Hotel owes Nirvaana'
                    : 'Settled'}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !revenueReport && selectedProperty === '' && (
          <div className="glass rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-muted-foreground">Select a property to view revenue report</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;