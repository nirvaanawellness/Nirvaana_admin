import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Building2, Plus, MapPin, Phone, Calendar, Percent, Trash2, RotateCcw, Archive, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppHeader from '@/components/shared/AppHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminProperties = ({ user, onLogout }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    hotel_name: '',
    location: '',
    gst_number: '',
    revenue_share_percentage: '',
    contract_start_date: '',
    payment_cycle: 'monthly',
    contact_person: '',
    contact_number: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch all properties including archived
      const response = await axios.get(`${API}/properties?include_archived=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  // Separate active and archived properties
  const { activeProperties, archivedProperties } = useMemo(() => {
    const active = properties.filter(p => p.status !== 'archived');
    const archived = properties.filter(p => p.status === 'archived');
    return { activeProperties: active, archivedProperties: archived };
  }, [properties]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        revenue_share_percentage: parseFloat(formData.revenue_share_percentage)
      };
      await axios.post(`${API}/properties`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Property added successfully');
      setDialogOpen(false);
      fetchProperties();
      setFormData({
        hotel_name: '',
        location: '',
        gst_number: '',
        revenue_share_percentage: '',
        contract_start_date: '',
        payment_cycle: 'monthly',
        contact_person: '',
        contact_number: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add property');
    }
  };

  const handleArchive = async (propertyId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Property archived successfully. Historical data preserved.');
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to archive property');
    }
  };

  const handleRestore = async (propertyId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/properties/${propertyId}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Property restored successfully');
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to restore property');
    }
  };

  const PropertyCard = ({ property, isArchived = false }) => (
    <div 
      className={`glass rounded-2xl p-5 hover:shadow-lg transition-all ${isArchived ? 'opacity-60 bg-muted/30' : ''}`}
      data-testid={`property-card-${property.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isArchived ? 'bg-muted' : 'bg-primary/10'}`}>
            <Building2 className={`w-5 h-5 ${isArchived ? 'text-muted-foreground' : 'text-primary'}`} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{property.hotel_name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {property.location}
            </div>
          </div>
        </div>
        
        {isArchived ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRestore(property.id)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            data-testid={`restore-property-${property.id}`}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Restore
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" data-testid={`archive-property-${property.id}`}>
                <Archive className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive Property?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive "{property.hotel_name}". Historical data will be preserved for reports.
                  Any therapists assigned to this property will also be archived.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleArchive(property.id)} className="bg-amber-600 hover:bg-amber-700">
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Percent className="w-4 h-4" />
          <span>Hotel Share: {property.revenue_share_percentage}%</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{property.payment_cycle}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
          <Phone className="w-4 h-4" />
          <span>{property.contact_person} - {property.contact_number}</span>
        </div>
      </div>

      {isArchived && property.archived_at && (
        <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          Archived on: {new Date(property.archived_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} showBack={true} backTo="/admin" title="Properties" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeProperties.length} Active • {archivedProperties.length} Archived
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-property-button">
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Add New Property</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-property-form">
                <div>
                  <Label htmlFor="hotel_name">Hotel Name</Label>
                  <Input
                    id="hotel_name"
                    value={formData.hotel_name}
                    onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                    required
                    data-testid="hotel-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    data-testid="location-input"
                  />
                </div>
                <div>
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    required
                    data-testid="gst-number-input"
                  />
                </div>
                <div>
                  <Label htmlFor="revenue_share_percentage">Hotel's Revenue Share %</Label>
                  <Input
                    id="revenue_share_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.revenue_share_percentage}
                    onChange={(e) => setFormData({ ...formData, revenue_share_percentage: e.target.value })}
                    required
                    data-testid="revenue-share-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Percentage of BASE revenue (excl. GST) that goes to hotel</p>
                </div>
                <div>
                  <Label htmlFor="contract_start_date">Contract Start Date</Label>
                  <Input
                    id="contract_start_date"
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                    required
                    data-testid="contract-date-input"
                  />
                </div>
                <div>
                  <Label htmlFor="payment_cycle">Payment Cycle</Label>
                  <Select
                    value={formData.payment_cycle}
                    onValueChange={(value) => setFormData({ ...formData, payment_cycle: value })}
                  >
                    <SelectTrigger data-testid="payment-cycle-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    required
                    data-testid="contact-person-input"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    required
                    data-testid="contact-number-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-property-button">
                  Add Property
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
            {/* Active Properties Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-medium text-foreground">Active Properties</h2>
                <span className="text-sm text-muted-foreground">({activeProperties.length})</span>
              </div>
              
              {activeProperties.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
                  <h3 className="font-medium text-muted-foreground mb-2">No Active Properties</h3>
                  <p className="text-sm text-muted-foreground">Add your first property to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}
            </section>

            {/* Separator */}
            {archivedProperties.length > 0 && (
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    Archived Properties
                  </span>
                </div>
              </div>
            )}

            {/* Archived Properties Section */}
            {archivedProperties.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Archive className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-medium text-muted-foreground">Past Properties</h2>
                  <span className="text-sm text-muted-foreground">({archivedProperties.length})</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} isArchived={true} />
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

export default AdminProperties;
