import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Users, Plus, Mail, Phone, Briefcase, Target, Building2, Archive, RotateCcw, CheckCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppHeader from '@/components/shared/AppHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminTherapists = ({ user, onLogout }) => {
  const [therapists, setTherapists] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
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
      // Fetch all therapists including archived
      const response = await axios.get(`${API}/therapists?include_archived=true`, {
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
      // Only fetch active properties for dropdown
      const response = await axios.get(`${API}/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      toast.error('Failed to load properties');
    }
  };

  // Separate active and archived therapists
  const { activeTherapists, archivedTherapists } = useMemo(() => {
    const active = therapists.filter(t => t.status !== 'archived');
    const archived = therapists.filter(t => t.status === 'archived');
    return { activeTherapists: active, archivedTherapists: archived };
  }, [therapists]);

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      password: '',
      experience_years: '',
      salary_expectation: '',
      address: '',
      bank_details: '',
      assigned_property_id: '',
      monthly_target: ''
    });
    setEditingTherapist(null);
  };

  const handleEdit = (therapist) => {
    setEditingTherapist(therapist);
    setFormData({
      full_name: therapist.full_name || '',
      phone: therapist.phone || '',
      email: therapist.email || '',
      date_of_birth: therapist.date_of_birth || '',
      password: '',
      experience_years: therapist.experience_years?.toString() || '',
      salary_expectation: therapist.salary_expectation?.toString() || '',
      address: therapist.address || '',
      bank_details: therapist.bank_details || '',
      assigned_property_id: therapist.assigned_property_id || '',
      monthly_target: therapist.monthly_target?.toString() || ''
    });
    setDialogOpen(true);
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
      
      if (editingTherapist) {
        // Update existing therapist
        await axios.put(`${API}/therapists/${editingTherapist.user_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Therapist updated successfully');
      } else {
        // Create new therapist
        const response = await axios.post(`${API}/therapists`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.username && response.data.password) {
          toast.success(
            `Therapist onboarded! Username: ${response.data.username}, Password: ${response.data.password}`,
            { duration: 10000 }
          );
        } else {
          toast.success('Therapist onboarded successfully! Credentials have been sent via email.');
        }
      }
      
      setDialogOpen(false);
      resetForm();
      fetchTherapists();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save therapist');
    }
  };

  const handleArchive = async (therapistId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/therapists/${therapistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Therapist archived successfully. Historical data preserved.');
      fetchTherapists();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to archive therapist');
    }
  };

  const handleRestore = async (therapistId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/therapists/${therapistId}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Therapist restored successfully');
      fetchTherapists();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to restore therapist');
    }
  };

  const TherapistCard = ({ therapist, isArchived = false }) => (
    <div 
      className={`glass rounded-2xl p-5 hover:shadow-lg transition-all ${isArchived ? 'opacity-60 bg-muted/30' : ''}`}
      data-testid={`therapist-card-${therapist.user_id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isArchived ? 'bg-muted' : 'bg-accent/30'}`}>
            <Users className={`w-5 h-5 ${isArchived ? 'text-muted-foreground' : 'text-accent-foreground'}`} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{therapist.full_name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              {therapist.assigned_property_id}
            </div>
          </div>
        </div>
        
        {isArchived ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRestore(therapist.user_id)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            data-testid={`restore-therapist-${therapist.user_id}`}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Restore
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => handleEdit(therapist)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" data-testid={`archive-therapist-${therapist.user_id}`}>
                  <Archive className="w-4 h-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive Therapist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive "{therapist.full_name}". Their login will be disabled, but historical data will be preserved for reports and settlements.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleArchive(therapist.user_id)} className="bg-amber-600 hover:bg-amber-700">
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span className="truncate">{therapist.email}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-4 h-4" />
          <span>{therapist.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <span>{therapist.experience_years} years exp</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="w-4 h-4" />
          <span>Target: ₹{therapist.monthly_target?.toLocaleString() || 0}</span>
        </div>
      </div>

      {isArchived && therapist.archived_at && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          Archived on: {new Date(therapist.archived_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} showBack={true} backTo="/admin" title="Therapists" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Therapists</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTherapists.length} Active • {archivedTherapists.length} Archived
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-therapist-button">
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Onboard Therapist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  {editingTherapist ? 'Edit Therapist' : 'Onboard New Therapist'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-therapist-form">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      data-testid="full-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      data-testid="phone-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={!!editingTherapist}
                      data-testid="email-input"
                    />
                    {editingTherapist && <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>}
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth {!editingTherapist && '*'}</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required={!editingTherapist}
                      data-testid="dob-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Used to generate password (DDMMYY format)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experience_years">Experience (Years)</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                      required
                      data-testid="experience-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary_expectation">Salary Expectation (Optional)</Label>
                    <Input
                      id="salary_expectation"
                      type="number"
                      value={formData.salary_expectation}
                      onChange={(e) => setFormData({ ...formData, salary_expectation: e.target.value })}
                      data-testid="salary-input"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="assigned_property_id">Assign to Property</Label>
                  <Select
                    value={formData.assigned_property_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_property_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="property-select">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.hotel_name}>
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
                    min="0"
                    value={formData.monthly_target}
                    onChange={(e) => setFormData({ ...formData, monthly_target: e.target.value })}
                    placeholder="0"
                    data-testid="target-input"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    data-testid="address-input"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_details">Bank Details (Optional)</Label>
                  <Input
                    id="bank_details"
                    value={formData.bank_details}
                    onChange={(e) => setFormData({ ...formData, bank_details: e.target.value })}
                    placeholder="Account Number / UPI ID"
                    data-testid="bank-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-therapist-button">
                  Onboard Therapist
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Active Therapists Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-medium text-foreground">Active Therapists</h2>
                <span className="text-sm text-muted-foreground">({activeTherapists.length})</span>
              </div>
              
              {activeTherapists.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
                  <h3 className="font-medium text-muted-foreground mb-2">No Active Therapists</h3>
                  <p className="text-sm text-muted-foreground">Onboard your first therapist to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTherapists.map((therapist) => (
                    <TherapistCard key={therapist.user_id} therapist={therapist} />
                  ))}
                </div>
              )}
            </section>

            {/* Separator */}
            {archivedTherapists.length > 0 && (
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    Archived Therapists
                  </span>
                </div>
              </div>
            )}

            {/* Archived Therapists Section */}
            {archivedTherapists.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Archive className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-medium text-muted-foreground">Past Therapists</h2>
                  <span className="text-sm text-muted-foreground">({archivedTherapists.length})</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedTherapists.map((therapist) => (
                    <TherapistCard key={therapist.user_id} therapist={therapist} isArchived={true} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminTherapists;
