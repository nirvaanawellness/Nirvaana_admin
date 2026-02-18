import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, User, Phone, Mail, Sparkles, DollarSign, Clock, CreditCard, Building2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const therapyTypes = [
  // 30 Minutes
  'Head, Neck & Shoulder Therapy',
  'Foot Reflexology',
  'Champi Head Massage',
  // 60 Minutes
  'Swedish Massage',
  'Aromatherapy Massage',
  'Deep Tissue Massage',
  'Balinese Massage',
  'Shirodhara Therapy',
  // 90 Minutes
  'Royal Hot Stone Therapy',
  'Signature Abhyanga Ritual',
  'Couples Harmony Massage',
  // Custom
  'Custom Massage'
];

const TherapistServiceEntry = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    therapy_type: '',
    therapy_duration: '',
    base_price: '',
    payment_received_by: '',
    payment_mode: ''
  });

  const [calculatedAmounts, setCalculatedAmounts] = useState({
    gst: 0,
    total: 0
  });

  // Fetch property info to check if it's owned
  useEffect(() => {
    const fetchPropertyInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/properties`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Find the property assigned to this therapist
        const assignedProperty = response.data.find(
          p => p.hotel_name === user.assigned_property_id
        );
        
        if (assignedProperty) {
          setPropertyInfo(assignedProperty);
          
          // If property is "our_property", auto-set payment to nirvaana
          if (assignedProperty.ownership_type === 'our_property') {
            setFormData(prev => ({
              ...prev,
              payment_received_by: 'nirvaana'
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch property info:', error);
      }
    };
    
    if (user?.assigned_property_id) {
      fetchPropertyInfo();
    }
  }, [user]);

  const isOwnedProperty = propertyInfo?.ownership_type === 'our_property';

  const handleBasePrice = (value) => {
    const price = parseFloat(value) || 0;
    const gst = price * 0.05;
    const total = price + gst;
    setCalculatedAmounts({ gst: gst.toFixed(2), total: total.toFixed(2) });
    setFormData({ ...formData, base_price: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        base_price: parseFloat(formData.base_price),
        customer_email: formData.customer_email || null,
        // For owned properties, always set to nirvaana
        payment_received_by: isOwnedProperty ? 'nirvaana' : formData.payment_received_by
      };

      const response = await axios.post(`${API}/services`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.feedback_email_status === 'sent') {
        toast.success('Service entry created! Feedback email sent to customer.');
      } else if (formData.customer_email) {
        toast.success('Service entry created! (Email delivery pending)');
      } else {
        toast.success('Service entry created successfully!');
      }
      navigate('/therapist');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create service entry');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-serif text-foreground">Add Service</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Property Info Banner */}
        {propertyInfo && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-3 ${
            isOwnedProperty 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-amber-50 border border-amber-200'
          }`}>
            {isOwnedProperty ? (
              <Home className="w-5 h-5 text-green-600" />
            ) : (
              <Building2 className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <p className={`text-sm font-medium ${isOwnedProperty ? 'text-green-700' : 'text-amber-700'}`}>
                {propertyInfo.hotel_name}
              </p>
              <p className={`text-xs ${isOwnedProperty ? 'text-green-600' : 'text-amber-600'}`}>
                {isOwnedProperty ? 'Owned Property - Payment to Nirvaana' : 'Partner Property'}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6" data-testid="service-entry-form">
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer_name">Customer Name</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  id="customer_name"
                  placeholder="Enter customer name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="pl-11 h-12"
                  required
                  data-testid="customer-name-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customer_phone">Customer Phone</Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  id="customer_phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="pl-11 h-12"
                  required
                  data-testid="customer-phone-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customer_email">Customer Email (for feedback)</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  id="customer_email"
                  type="email"
                  placeholder="customer@email.com (optional)"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="pl-11 h-12"
                  data-testid="customer-email-input"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Feedback link will be sent to this email</p>
            </div>

            <div>
              <Label htmlFor="therapy_type">Therapy Type</Label>
              <Select
                value={formData.therapy_type}
                onValueChange={(value) => setFormData({ ...formData, therapy_type: value })}
                required
              >
                <SelectTrigger className="h-12 mt-2" data-testid="therapy-type-select">
                  <SelectValue placeholder="Select therapy" />
                </SelectTrigger>
                <SelectContent>
                  {therapyTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="therapy_duration">Therapy Duration</Label>
              <div className="relative mt-2">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  id="therapy_duration"
                  placeholder="e.g., 60 minutes"
                  value={formData.therapy_duration}
                  onChange={(e) => setFormData({ ...formData, therapy_duration: e.target.value })}
                  className="pl-11 h-12"
                  required
                  data-testid="therapy-duration-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="base_price">Base Price (Excluding GST)</Label>
              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={formData.base_price}
                  onChange={(e) => handleBasePrice(e.target.value)}
                  className="pl-11 h-12"
                  required
                  data-testid="base-price-input"
                />
              </div>
            </div>

            {formData.base_price && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Price</span>
                  <span className="text-foreground font-medium">₹{parseFloat(formData.base_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (5%)</span>
                  <span className="text-foreground font-medium">₹{calculatedAmounts.gst}</span>
                </div>
                <div className="flex justify-between text-base border-t border-border pt-2">
                  <span className="text-foreground font-medium">Total Amount</span>
                  <span className="text-primary font-medium text-lg">₹{calculatedAmounts.total}</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="payment_received_by">Payment Received By</Label>
              {isOwnedProperty ? (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 font-medium">Nirvaana Wellness</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    This is an owned property - all payments go to Nirvaana
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.payment_received_by}
                  onValueChange={(value) => setFormData({ ...formData, payment_received_by: value })}
                  required
                >
                  <SelectTrigger className="h-12 mt-2" data-testid="payment-receiver-select">
                    <SelectValue placeholder="Select who received payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="nirvaana">Nirvaana Wellness</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="payment_mode">Payment Mode (Optional)</Label>
              <Select
                value={formData.payment_mode}
                onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
              >
                <SelectTrigger className="h-12 mt-2" data-testid="payment-mode-select">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-full"
            disabled={loading}
            data-testid="submit-service-button"
          >
            {loading ? 'Submitting...' : 'Submit Service Entry'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TherapistServiceEntry;