import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { LayoutDashboard, Calendar, PlusCircle, TrendingUp, LogOut, Target, Award, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TherapistDashboard = ({ user, onLogout }) => {
  const [incentiveData, setIncentiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncentiveData();
  }, []);

  const fetchIncentiveData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/incentives/my-incentive`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIncentiveData(response.data);
    } catch (error) {
      toast.error('Failed to load incentive data');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-sm text-muted-foreground">Therapist Portal</p>
        </div>

        {!loading && incentiveData && (
          <div className="glass rounded-2xl p-6" data-testid="incentive-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-serif text-foreground">Monthly Target Progress</h3>
                <p className="text-sm text-muted-foreground">Track your performance and earnings</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm font-medium text-foreground">{incentiveData.progress_percentage}%</span>
                </div>
                <Progress value={incentiveData.progress_percentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Target</p>
                  <p className="text-xl font-medium text-foreground">₹{incentiveData.target.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Threshold (90%)</p>
                  <p className="text-xl font-medium text-foreground">₹{incentiveData.threshold.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Current Sales</p>
                  <p className="text-xl font-medium text-accent">₹{incentiveData.actual_sales.toLocaleString()}</p>
                </div>
                <div className="bg-primary/10 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Incentive Earned</p>
                  <p className="text-xl font-medium text-primary">₹{incentiveData.incentive_earned.toLocaleString()}</p>
                </div>
              </div>

              {incentiveData.excess_amount > 0 && (
                <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-accent" strokeWidth={1.5} />
                    <p className="text-sm text-foreground">
                      Congratulations! You've exceeded the threshold by ₹{incentiveData.excess_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/therapist/attendance">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="attendance-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Attendance</h3>
                  <p className="text-sm text-muted-foreground">Check-in & Check-out</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/therapist/service-entry">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="service-entry-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Add Service</h3>
                  <p className="text-sm text-muted-foreground">Record customer service</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/therapist/performance">
            <div className="glass rounded-2xl p-6 hover:shadow-float transition-all cursor-pointer" data-testid="performance-nav">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">My Performance</h3>
                  <p className="text-sm text-muted-foreground">View service history</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboard;