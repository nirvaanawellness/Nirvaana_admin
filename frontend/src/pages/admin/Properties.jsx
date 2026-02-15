import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Plus, MapPin, Phone, Calendar, Percent, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      const response = await axios.get(`${API}/properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (propertyId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete property');
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
            <h1 className="text-2xl font-serif text-foreground">Properties</h1>
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
                  <Label htmlFor="revenue_share_percentage">Revenue Share %</Label>
                  <Input
                    id="revenue_share_percentage"
                    type="number"
                    step="0.01"
                    value={formData.revenue_share_percentage}
                    onChange={(e) => setFormData({ ...formData, revenue_share_percentage: e.target.value })}
                    required
                    data-testid="revenue-share-input"
                  />
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center text-muted-foreground py-8">Loading...</p>
          ) : properties.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">No properties yet</p>
          ) : (
            properties.map((property, index) => (
              <div key={index} className="glass rounded-2xl p-6" data-testid={`property-card-${index}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-foreground">{property.hotel_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" strokeWidth={1.5} />
                      <span>{property.location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-muted-foreground">Revenue Share:</span>
                    <span className="text-foreground font-medium">{property.revenue_share_percentage}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-muted-foreground">Contract Start:</span>
                    <span className="text-foreground font-medium">{property.contract_start_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-muted-foreground">{property.contact_person}</span>
                    <span className="text-foreground font-medium">{property.contact_number}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs ${
                    property.active ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                  }`}>
                    {property.active ? 'Active' : 'Inactive'}
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-testid={`delete-property-${index}`}
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Property</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{property.hotel_name}"? This action cannot be undone.
                          All therapists must be reassigned before deletion.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(property.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProperties;