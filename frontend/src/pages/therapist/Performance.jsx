import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TherapistPerformance = ({ user, onLogout }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/services/my-services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const totalServices = services.length;
  const totalRevenue = services.reduce((sum, s) => sum + s.base_price, 0);

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
            <h1 className="text-2xl font-serif text-foreground">My Performance</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-primary" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Total Services</p>
            </div>
            <p className="text-3xl font-medium text-foreground">{totalServices}</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-accent" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Total Revenue (Base)</p>
            </div>
            <p className="text-3xl font-medium text-foreground">₹{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4">Service History</h3>
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : services.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No services recorded yet</p>
            ) : (
              services.map((service, index) => (
                <div key={index} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-foreground">{service.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{service.therapy_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-primary">₹{service.total_amount}</p>
                      <p className="text-xs text-muted-foreground">Base: ₹{service.base_price}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">{service.date} at {service.time}</p>
                    <p className="text-xs text-muted-foreground">{service.therapy_duration}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistPerformance;