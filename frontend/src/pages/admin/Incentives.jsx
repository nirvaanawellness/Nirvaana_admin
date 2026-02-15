import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Award, Target, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminIncentives = ({ user, onLogout }) => {
  const [therapists, setTherapists] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTherapistsWithIncentives();
  }, []);

  const fetchTherapistsWithIncentives = async () => {
    try {
      const token = localStorage.getItem('token');
      const therapistsRes = await axios.get(`${API}/therapists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const therapistData = therapistsRes.data;
      const incentivePromises = therapistData.map(async (therapist) => {
        try {
          const userRes = await axios.post(
            `${API}/auth/login`,
            { email: therapist.email, password: 'temp' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return null;
        } catch (error) {
          return null;
        }
      });

      setTherapists(therapistData);
      setIncentives([]);
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
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="outline" size="sm" data-testid="back-button">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </Link>
            <h1 className="text-2xl font-serif text-foreground">Incentive Management</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <div>
              <h2 className="text-xl font-serif text-foreground">Monthly Incentive Overview</h2>
              <p className="text-sm text-muted-foreground">
                Current Month: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : therapists.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No therapists found</p>
            ) : (
              therapists.map((therapist, index) => (
                <div key={index} className="bg-muted/30 rounded-xl p-6" data-testid={`incentive-card-${index}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{therapist.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{therapist.assigned_property_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="text-lg font-medium text-foreground">₹{therapist.monthly_target?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Threshold (90%)</p>
                      <p className="text-base font-medium text-foreground">
                        ₹{((therapist.monthly_target || 0) * 0.9).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Sales</p>
                      <p className="text-base font-medium text-accent">₹0</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Incentive Earned</p>
                      <p className="text-base font-medium text-primary">₹0</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4">Incentive Calculation Logic</h3>
          <div className="space-y-3 text-sm text-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <p>Threshold = 90% of Monthly Target</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <p>If Actual Sales {'>'} Threshold, calculate excess amount</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <p>Incentive = 5% of Excess Amount (above threshold)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">4</span>
              </div>
              <p>Incentive calculated on Base Amount only (excluding GST)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIncentives;