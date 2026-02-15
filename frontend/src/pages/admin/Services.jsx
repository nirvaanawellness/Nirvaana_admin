import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Package, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminServices = ({ user, onLogout }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const response = await axios.get(`${API}/services?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setLoading(true);
    fetchServices();
  };

  const totalRevenue = services.reduce((sum, s) => sum + s.total_amount, 0);
  const totalBase = services.reduce((sum, s) => sum + s.base_price, 0);
  const totalGST = services.reduce((sum, s) => sum + s.gst_amount, 0);

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
            <h1 className="text-2xl font-serif text-foreground">Service Entries</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-lg font-serif text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date_from">From Date</Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                data-testid="date-from-input"
              />
            </div>
            <div>
              <Label htmlFor="date_to">To Date</Label>
              <Input
                id="date_to"
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                data-testid="date-to-input"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} className="w-full" data-testid="apply-filter-button">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Services</p>
            <p className="text-3xl font-medium text-foreground">{services.length}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-3xl font-medium text-primary">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-1">GST Collected</p>
            <p className="text-3xl font-medium text-accent">₹{totalGST.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4">All Service Entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-medium">Therapy</th>
                  <th className="text-right py-3 px-4 text-sm text-muted-foreground font-medium">Base</th>
                  <th className="text-right py-3 px-4 text-sm text-muted-foreground font-medium">GST</th>
                  <th className="text-right py-3 px-4 text-sm text-muted-foreground font-medium">Total</th>
                  <th className="text-left py-3 px-4 text-sm text-muted-foreground font-medium">Paid To</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-muted-foreground">Loading...</td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-muted-foreground">No services found</td>
                  </tr>
                ) : (
                  services.map((service, index) => (
                    <tr key={index} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm text-foreground">{service.date}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{service.customer_name}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{service.therapy_type}</td>
                      <td className="py-3 px-4 text-sm text-foreground text-right">₹{service.base_price}</td>
                      <td className="py-3 px-4 text-sm text-foreground text-right">₹{service.gst_amount}</td>
                      <td className="py-3 px-4 text-sm text-primary font-medium text-right">₹{service.total_amount}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                          service.payment_received_by === 'hotel' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-accent/20 text-accent'
                        }`}>
                          {service.payment_received_by === 'hotel' ? 'Hotel' : 'Nirvaana'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminServices;