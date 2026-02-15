import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  LayoutDashboard, Building2, Users, Package, FileText, Award, LogOut,
  DollarSign, TrendingUp, UserCheck, Calendar, Filter, X, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user, onLogout }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const revenueData = analytics ? [
    { name: 'Hotel', value: analytics.hotel_received, color: '#B89D62' },
    { name: 'Nirvaana', value: analytics.nirvaana_received, color: '#88856A' }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src="https://customer-assets.emergentagent.com/job_wellness-erp-core/artifacts/fny25i7a_Logo.png" 
            alt="Nirvaana Wellness"
            className="h-12 w-auto"
          />
          <Button variant="outline" size="sm" onClick={onLogout} data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-serif text-foreground mb-2">Welcome, {user.full_name}</h2>
          <p className="text-sm text-muted-foreground">Admin Portal - Operations Management</p>
        </div>

        {!loading && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-6" data-testid="total-sales-card">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Total Sales</p>
              </div>
              <p className="text-3xl font-medium text-foreground">₹{analytics.total_sales.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Base: ₹{analytics.total_base_sales.toLocaleString()}</p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-accent" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">GST Collected</p>
              </div>
              <p className="text-3xl font-medium text-foreground">₹{analytics.total_gst.toLocaleString()}</p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="w-6 h-6 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Customers</p>
              </div>
              <p className="text-3xl font-medium text-foreground">{analytics.customer_count}</p>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-accent" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Total Services</p>
              </div>
              <p className="text-3xl font-medium text-foreground">{analytics.total_services}</p>
            </div>
          </div>
        )}

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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;