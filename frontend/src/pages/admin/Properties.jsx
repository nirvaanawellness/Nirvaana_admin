import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Building2, Plus, MapPin, Phone, Calendar, Percent, RotateCcw, Archive, CheckCircle, Pencil, Home, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AppHeader from '@/components/shared/AppHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminProperties = ({ user, onLogout }) => {
  const [properties, setProperties] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState({
    hotel_name: '',
    location: '',
    gst_number: '',
    ownership_type: 'outside_property',
    revenue_share_percentage: '',
    contract_start_date: '',
    payment_cycle: 'monthly',
    contact_person: '',
    contact_number: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [propsRes, therapistsRes] = await Promise.all([
        axios.get(`${API}/properties?include_archived=true`, { headers }),
        axios.get(`${API}/therapists`, { headers })
      ]);
      setProperties(propsRes.data);
      setTherapists(therapistsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const { activeProperties, archivedProperties } = useMemo(() => {
    const active = properties.filter(p => p.status !== 'archived');
    const archived = properties.filter(p => p.status === 'archived');
    return { activeProperties: active, archivedProperties: archived };
  }, [properties]);

  const getAssignedTherapists = (propertyName) => {
    return therapists.filter(t => t.assigned_property_id === propertyName && t.status !== 'archived');
  };

  const resetForm = () => {
    setFormData({
      hotel_name: '',
      location: '',
      gst_number: '',
      ownership_type: 'outside_property',
      revenue_share_percentage: '',
      contract_start_date: '',
      payment_cycle: 'monthly',
      contact_person: '',
      contact_number: ''
    });
    setEditingProperty(null);
  };

  const [ownershipChangeDialog, setOwnershipChangeDialog] = useState(false);
  const [pendingOwnershipChange, setPendingOwnershipChange] = useState(null);

  const handleEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      hotel_name: property.hotel_name || '',
      location: property.location || '',
      gst_number: property.gst_number || '',
      ownership_type: property.ownership_type || 'outside_property',
      revenue_share_percentage: property.revenue_share_percentage?.toString() || '',
      contract_start_date: property.contract_start_date || '',
      payment_cycle: property.payment_cycle || 'monthly',
      contact_person: property.contact_person || '',
      contact_number: property.contact_number || ''
    });
    setDialogOpen(true);
  };

  const handleOwnershipChange = (newValue) => {
    // If editing and ownership type is changing, show confirmation
    if (editingProperty && editingProperty.ownership_type !== newValue) {
      setPendingOwnershipChange(newValue);
      setOwnershipChangeDialog(true);
    } else {
      setFormData({ ...formData, ownership_type: newValue });
    }
  };

  const confirmOwnershipChange = () => {
    setFormData({ ...formData, ownership_type: pendingOwnershipChange });
    setOwnershipChangeDialog(false);
    setPendingOwnershipChange(null);
  };

  const cancelOwnershipChange = () => {
    setOwnershipChangeDialog(false);
    setPendingOwnershipChange(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        revenue_share_percentage: formData.ownership_type === 'our_property' 
          ? null 
          : parseFloat(formData.revenue_share_percentage) || 0
      };
      
      if (editingProperty) {
        await axios.put(`${API}/properties/${editingProperty.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Property updated successfully');
      } else {
        await axios.post(`${API}/properties`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Property added successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save property');
    }
  };

  const handleArchive = async (property) => {
    const assignedTherapists = getAssignedTherapists(property.hotel_name);
    if (assignedTherapists.length > 0) {
      toast.error(`Cannot archive: ${assignedTherapists.length} therapist(s) are still assigned to this property. Please reassign or archive them first.`);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/properties/${property.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Property archived successfully');
      fetchData();
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
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to restore property');
    }
  };

  const getOwnershipBadge = (property) => {
    if (property.ownership_type === 'our_property') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1">
          <Home className="w-3 h-3" />
          Owned
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
        <Handshake className="w-3 h-3" />
        Split Model
      </span>
    );
  };

  const PropertyCard = ({ property, isArchived = false }) => {
    const assignedTherapists = getAssignedTherapists(property.hotel_name);
    const isOurProperty = property.ownership_type === 'our_property';
    
    return (
      <div 
        className={`glass rounded-2xl p-5 hover:shadow-lg transition-all ${isArchived ? 'opacity-60 bg-muted/30' : ''}`}
        data-testid={`property-card-${property.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isArchived ? 'bg-muted' : isOurProperty ? 'bg-green-100' : 'bg-primary/10'}`}>
              <Building2 className={`w-5 h-5 ${isArchived ? 'text-muted-foreground' : isOurProperty ? 'text-green-600' : 'text-primary'}`} strokeWidth={1.5} />
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
                onClick={() => handleEdit(property)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                    <Archive className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Property?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {assignedTherapists.length > 0 ? (
                        <span className="text-red-600">
                          Cannot archive: {assignedTherapists.length} therapist(s) are assigned to this property.
                          Please reassign or archive them first.
                        </span>
                      ) : (
                        <>This will archive "{property.hotel_name}". Historical data will be preserved for reports.</>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleArchive(property)} 
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={assignedTherapists.length > 0}
                    >
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Ownership Badge */}
        <div className="mb-3">
          {getOwnershipBadge(property)}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {!isOurProperty && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="w-4 h-4" />
              <span>Hotel Share: {property.revenue_share_percentage || 0}%</span>
            </div>
          )}
          {isOurProperty && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>100% Nirvaana</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{property.payment_cycle || 'monthly'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <Phone className="w-4 h-4" />
            <span>{property.contact_person || 'N/A'} - {property.contact_number || 'N/A'}</span>
          </div>
        </div>

        {!isArchived && assignedTherapists.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            {assignedTherapists.length} therapist(s) assigned
          </div>
        )}

        {isArchived && property.archived_at && (
          <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            Archived on: {new Date(property.archived_at).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  const isOurProperty = formData.ownership_type === 'our_property';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} showBack={true} backTo="/admin" title="Properties" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeProperties.length} Active • {archivedProperties.length} Archived
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-property-button">
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  {editingProperty ? 'Edit Property' : 'Add New Property'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Ownership Type - Radio Buttons */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <Label className="text-base font-medium mb-3 block">Ownership Type *</Label>
                  <RadioGroup
                    value={formData.ownership_type}
                    onValueChange={editingProperty ? handleOwnershipChange : (value) => setFormData({ ...formData, ownership_type: value })}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="our_property" id="our_property" />
                      <Label htmlFor="our_property" className="flex items-center gap-2 cursor-pointer">
                        <Home className="w-4 h-4 text-green-600" />
                        <span>Our Property</span>
                        <span className="text-xs text-muted-foreground">(100% owned)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="outside_property" id="outside_property" />
                      <Label htmlFor="outside_property" className="flex items-center gap-2 cursor-pointer">
                        <Handshake className="w-4 h-4 text-amber-600" />
                        <span>Outside Property</span>
                        <span className="text-xs text-muted-foreground">(Revenue split)</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="hotel_name">Hotel Name *</Label>
                  <Input
                    id="hotel_name"
                    value={formData.hotel_name}
                    onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                
                {/* Revenue Share - Only for Outside Property */}
                <div className={isOurProperty ? 'opacity-50' : ''}>
                  <Label htmlFor="revenue_share_percentage">
                    Hotel's Revenue Share % {!isOurProperty && '*'}
                  </Label>
                  <Input
                    id="revenue_share_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.revenue_share_percentage}
                    onChange={(e) => setFormData({ ...formData, revenue_share_percentage: e.target.value })}
                    required={!isOurProperty}
                    disabled={isOurProperty}
                    placeholder={isOurProperty ? 'Not applicable for owned properties' : 'Enter percentage'}
                  />
                  {!isOurProperty && (
                    <p className="text-xs text-muted-foreground mt-1">Percentage of BASE revenue (excl. GST) that goes to hotel</p>
                  )}
                  {isOurProperty && (
                    <p className="text-xs text-green-600 mt-1">100% revenue belongs to Nirvaana</p>
                  )}
                </div>

                <div className={isOurProperty ? 'opacity-50' : ''}>
                  <Label htmlFor="contract_start_date">Contract Start Date</Label>
                  <Input
                    id="contract_start_date"
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                    disabled={isOurProperty}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_cycle">Payment Cycle</Label>
                  <Select
                    value={formData.payment_cycle}
                    onValueChange={(value) => setFormData({ ...formData, payment_cycle: value })}
                  >
                    <SelectTrigger>
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
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingProperty ? 'Update Property' : 'Add Property'}
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

            {archivedProperties.length > 0 && (
              <>
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
              </>
            )}
          </>
        )}
      </div>

      {/* Ownership Change Confirmation Dialog */}
      <AlertDialog open={ownershipChangeDialog} onOpenChange={setOwnershipChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-500" />
              Change Ownership Type?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are changing the ownership type from{' '}
                <strong>
                  {editingProperty?.ownership_type === 'our_property' ? 'Owned (100%)' : 'Split Model'}
                </strong>{' '}
                to{' '}
                <strong>
                  {pendingOwnershipChange === 'our_property' ? 'Owned (100%)' : 'Split Model'}
                </strong>.
              </p>
              <p className="text-amber-600 font-medium">
                This will affect how all historical and future reports calculate revenue sharing 
                and settlements for this property.
              </p>
              <p>
                • Reports are calculated dynamically based on current ownership type<br/>
                • No historical data will be lost - it will be recalculated automatically
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelOwnershipChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOwnershipChange} className="bg-amber-600 hover:bg-amber-700">
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProperties;
