import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Users, Plus, Mail, Phone, Briefcase, Target, Building2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminTherapists = ({ user, onLogout }) => {
  const [therapists, setTherapists] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    experience_years: '',
    salary_expectation: '',
    address: '',
    bank_details: '',
    assigned_property_id: '',
    monthly_target: ''
  });

  useEffect(() => {
    fetchTherapists();
    fetchProperties();
  }, []);

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/therapists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTherapists(response.data);
    } catch (error) {
      toast.error('Failed to load therapists');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        experience_years: parseFloat(formData.experience_years),
        salary_expectation: formData.salary_expectation ? parseFloat(formData.salary_expectation) : null,
        monthly_target: parseFloat(formData.monthly_target || 0)
      };
      await axios.post(`${API}/therapists`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Therapist onboarded successfully');
      setDialogOpen(false);
      fetchTherapists();
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        password: '',
        experience_years: '',
        salary_expectation: '',
        address: '',
        bank_details: '',
        assigned_property_id: '',
        monthly_target: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to onboard therapist');
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
            <h1 className="text-2xl font-serif text-foreground">Therapists</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-therapist-button">
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Therapist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Onboard New Therapist</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-therapist-form">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    data-testid="therapist-name-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      data-testid="therapist-phone-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="therapist-email-input"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="therapist-password-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experience_years">Experience (Years)</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      step="0.5"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                      required
                      data-testid="therapist-experience-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary_expectation">Salary Expectation</Label>
                    <Input
                      id="salary_expectation"
                      type="number"
                      value={formData.salary_expectation}
                      onChange={(e) => setFormData({ ...formData, salary_expectation: e.target.value })}
                      data-testid="therapist-salary-input"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="assigned_property_id">Assign Property</Label>
                  <Select
                    value={formData.assigned_property_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_property_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="therapist-property-select">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((prop, idx) => (
                        <SelectItem key={idx} value={prop.hotel_name}>
                          {prop.hotel_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="monthly_target">Monthly Target (₹)</Label>
                  <Input
                    id="monthly_target"
                    type="number"
                    value={formData.monthly_target}
                    onChange={(e) => setFormData({ ...formData, monthly_target: e.target.value })}
                    data-testid="therapist-target-input"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    data-testid="therapist-address-input"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_details">Bank Details</Label>
                  <Input
                    id="bank_details"
                    value={formData.bank_details}
                    onChange={(e) => setFormData({ ...formData, bank_details: e.target.value })}
                    placeholder="Account number, IFSC, etc."
                    data-testid="therapist-bank-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-therapist-button">
                  Onboard Therapist
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center text-muted-foreground py-8">Loading...</p>
          ) : therapists.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">No therapists yet</p>
          ) : (
            therapists.map((therapist, index) => (
              <div key={index} className="glass rounded-2xl p-6" data-testid={`therapist-card-${index}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-accent" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-foreground">{therapist.full_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Briefcase className="w-4 h-4" strokeWidth={1.5} />
                      <span>{therapist.experience_years} years</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-foreground">{therapist.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-foreground">{therapist.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-foreground">{therapist.assigned_property_id}</span>
                  </div>
                  {therapist.monthly_target > 0 && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-foreground">Target: ₹{therapist.monthly_target.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTherapists;