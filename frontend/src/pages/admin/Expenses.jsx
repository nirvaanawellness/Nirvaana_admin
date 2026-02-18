import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, Plus, Trash2, DollarSign, Calendar, Building2,
  Filter, X, Download, Receipt, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EXPENSE_TYPES = {
  recurring: [
    { value: 'salary', label: 'Therapist Salary' },
    { value: 'living_cost', label: 'Living Cost' }
  ],
  adhoc: [
    { value: 'marketing', label: 'Marketing' },
    { value: 'disposables', label: 'Disposables' },
    { value: 'oil_aromatics', label: 'Oil & Aromatics' },
    { value: 'essentials', label: 'Essentials' },
    { value: 'bill_books', label: 'Bill Books' },
    { value: 'other', label: 'Other' }
  ]
};

const AdminExpenses = ({ user, onLogout }) => {
  const [expenses, setExpenses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    property_id: '',
    expense_type: '',
    category: 'adhoc',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    therapist_id: ''
  });
  
  // Filter states
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (properties.length > 0) {
      fetchExpenses();
    }
  }, [selectedProperties, selectedTypes, dateFrom, dateTo]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [propsRes, therapistsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/properties`, { headers }),
        axios.get(`${API}/therapists`, { headers }),
        axios.get(`${API}/expenses/summary/by-property`, { headers })
      ]);
      
      setProperties(propsRes.data);
      setTherapists(therapistsRes.data);
      setSummary(summaryRes.data);
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (selectedProperties.length > 0) {
        selectedProperties.forEach(p => params.append('property_id', p));
      }
      if (selectedTypes.length > 0) {
        selectedTypes.forEach(t => params.append('expense_type', t));
      }
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const response = await axios.get(`${API}/expenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Property is optional now - empty means shared expense
    if (!formData.expense_type || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      // Send null/empty property_id for shared expenses
      const payload = {
        ...formData,
        property_id: formData.property_id === 'SHARED' ? null : formData.property_id || null
      };
      
      await axios.post(`${API}/expenses`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Expense recorded successfully');
      setShowAddDialog(false);
      setFormData({
        property_id: '',
        expense_type: '',
        category: 'adhoc',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        therapist_id: ''
      });
      fetchExpenses();
      fetchInitialData(); // Refresh summary
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record expense');
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/expenses/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Expense deleted');
      fetchExpenses();
      fetchInitialData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const handleResetFilters = () => {
    setSelectedProperties([]);
    setSelectedTypes([]);
    setDateFrom('');
    setDateTo('');
  };

  const toggleProperty = (propertyName) => {
    setSelectedProperties(prev => 
      prev.includes(propertyName) 
        ? prev.filter(p => p !== propertyName)
        : [...prev, propertyName]
    );
  };

  const toggleType = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const downloadReport = () => {
    const headers = ['Date', 'Property', 'Category', 'Type', 'Amount', 'Description'];
    
    const rows = expenses.map(exp => {
      const property = properties.find(p => p.hotel_name === exp.property_id);
      return [
        exp.date,
        property?.hotel_name || exp.property_id,
        exp.category,
        exp.expense_type,
        exp.amount,
        exp.description || ''
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nirvaana-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Expense report downloaded!');
  };

  const hasActiveFilters = selectedProperties.length > 0 || selectedTypes.length > 0 || dateFrom || dateTo;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-serif text-foreground">Expense Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              data-testid="toggle-expense-filters"
            >
              <Filter className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Filters
              {hasActiveFilters && <span className="ml-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {selectedProperties.length + selectedTypes.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
              </span>}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadReport}
              disabled={expenses.length === 0}
              data-testid="download-expense-report"
            >
              <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)} data-testid="add-expense-button">
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Record Expense
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-6" data-testid="recurring-total-card">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Recurring Costs</p>
              </div>
              <p className="text-2xl font-medium text-foreground">₹{summary.recurring?.total?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Salaries & Living</p>
            </div>
            
            <div className="glass rounded-2xl p-6" data-testid="adhoc-total-card">
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Ad-hoc Costs</p>
              </div>
              <p className="text-2xl font-medium text-foreground">₹{summary.adhoc?.total?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Materials & Misc</p>
            </div>
            
            <div className="glass rounded-2xl p-6" data-testid="grand-total-card">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Total Expenses</p>
              </div>
              <p className="text-2xl font-medium text-foreground">₹{summary.grand_total?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">This Month</p>
            </div>
            
            <div className="glass rounded-2xl p-6" data-testid="filtered-total-card">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Filtered Total</p>
              </div>
              <p className="text-2xl font-medium text-foreground">₹{totalExpenses.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{expenses.length} entries</p>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-6" data-testid="expense-filters-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-foreground">Filters</h3>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    <X className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Reset All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Label className="mb-2 block">Properties</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {properties.map((property) => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedProperties.includes(property.hotel_name)}
                        onCheckedChange={() => toggleProperty(property.hotel_name)}
                      />
                      <label className="text-sm cursor-pointer">{property.hotel_name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Expense Type</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {[...EXPENSE_TYPES.recurring, ...EXPENSE_TYPES.adhoc].map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={() => toggleType(type.value)}
                      />
                      <label className="text-sm cursor-pointer">{type.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="expense-date-from" className="mb-2 block">From Date</Label>
                <Input
                  id="expense-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="expense-date-to" className="mb-2 block">To Date</Label>
                <Input
                  id="expense-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4">Expense Records</h3>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No expenses recorded yet. Click "Record Expense" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="expenses-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Property</th>
                    <th className="text-left py-3 px-2">Category</th>
                    <th className="text-left py-3 px-2">Type</th>
                    <th className="text-right py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Description</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    const property = properties.find(p => p.hotel_name === expense.property_id);
                    const typeLabel = [...EXPENSE_TYPES.recurring, ...EXPENSE_TYPES.adhoc]
                      .find(t => t.value === expense.expense_type)?.label || expense.expense_type;
                    
                    return (
                      <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-2">{expense.date}</td>
                        <td className="py-3 px-2">{property?.hotel_name || expense.property_id}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            expense.category === 'recurring' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-3 px-2">{typeLabel}</td>
                        <td className="py-3 px-2 text-right font-medium">₹{expense.amount.toLocaleString()}</td>
                        <td className="py-3 px-2 max-w-xs truncate">{expense.description || '-'}</td>
                        <td className="py-3 px-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                            data-testid={`delete-expense-${expense.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Record New Expense</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="expense-form">
            <div>
              <Label htmlFor="expense-property">Property *</Label>
              <Select 
                value={formData.property_id} 
                onValueChange={(value) => setFormData({...formData, property_id: value})}
              >
                <SelectTrigger id="expense-property" data-testid="expense-property-select">
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
              <Label htmlFor="expense-category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({...formData, category: value, expense_type: ''})}
              >
                <SelectTrigger id="expense-category" data-testid="expense-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring (Fixed)</SelectItem>
                  <SelectItem value="adhoc">Ad-hoc (Variable)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expense-type">Expense Type *</Label>
              <Select 
                value={formData.expense_type} 
                onValueChange={(value) => setFormData({...formData, expense_type: value})}
              >
                <SelectTrigger id="expense-type" data-testid="expense-type-select">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES[formData.category]?.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.expense_type === 'salary' && (
              <div>
                <Label htmlFor="expense-therapist">Therapist</Label>
                <Select 
                  value={formData.therapist_id} 
                  onValueChange={(value) => setFormData({...formData, therapist_id: value})}
                >
                  <SelectTrigger id="expense-therapist" data-testid="expense-therapist-select">
                    <SelectValue placeholder="Select therapist (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {therapists.filter(t => t.assigned_property_id === formData.property_id).map((therapist) => (
                      <SelectItem key={therapist.user_id} value={therapist.user_id}>
                        {therapist.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="expense-amount">Amount (₹) *</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || ''})}
                placeholder="Enter amount"
                data-testid="expense-amount-input"
              />
            </div>

            <div>
              <Label htmlFor="expense-date">Date *</Label>
              <Input
                id="expense-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                data-testid="expense-date-input"
              />
            </div>

            <div>
              <Label htmlFor="expense-description">Description</Label>
              <Textarea
                id="expense-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Optional notes about this expense"
                rows={2}
                data-testid="expense-description-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="submit-expense-button">
                Record Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpenses;
