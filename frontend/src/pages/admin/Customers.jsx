import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Users, Phone, Mail, Calendar, IndianRupee, Download, Search, Building2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppHeader from '@/components/shared/AppHeader';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminCustomers = ({ user, onLogout }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.customers);
      setFilteredCustomers(response.data.customers);
      setTotalCustomers(response.data.total_unique_customers);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = customers.filter(c => 
      c.customer_name?.toLowerCase().includes(term) ||
      c.phone?.includes(term) ||
      c.customer_email?.toLowerCase().includes(term)
    );
    setFilteredCustomers(filtered);
  };

  const exportToExcel = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No customers to export');
      return;
    }

    // Prepare data for Excel
    const excelData = filteredCustomers.map((customer, index) => ({
      'S.No': index + 1,
      'Customer Name': customer.customer_name || '-',
      'Phone': customer.phone || '-',
      'Email': customer.customer_email || '-',
      'Total Visits': customer.total_services || 0,
      'Total Spent (₹)': customer.total_spent || 0,
      'Base Amount (₹)': customer.total_base || 0,
      'GST (₹)': customer.total_gst || 0,
      'First Visit': customer.first_visit || '-',
      'Last Visit': customer.last_visit || '-',
      'Services Availed': customer.therapies?.join(', ') || '-',
      'Properties Visited': customer.properties_visited?.join(', ') || '-'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 25 },  // Name
      { wch: 15 },  // Phone
      { wch: 30 },  // Email
      { wch: 12 },  // Visits
      { wch: 15 },  // Total Spent
      { wch: 15 },  // Base
      { wch: 12 },  // GST
      { wch: 12 },  // First Visit
      { wch: 12 },  // Last Visit
      { wch: 35 },  // Services
      { wch: 25 },  // Properties
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `Nirvaana_Customers_${date}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${filteredCustomers.length} customers to Excel`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate totals
  const totalRevenue = filteredCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const totalVisits = filteredCustomers.reduce((sum, c) => sum + (c.total_services || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} showBack={true} backTo="/admin" title="Customers" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4" data-testid="summary-total-customers">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Customers</span>
            </div>
            <p className="text-2xl font-semibold">{totalCustomers}</p>
          </div>
          
          <div className="glass rounded-xl p-4" data-testid="summary-filtered">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Showing</span>
            </div>
            <p className="text-2xl font-semibold">{filteredCustomers.length}</p>
          </div>
          
          <div className="glass rounded-xl p-4" data-testid="summary-visits">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Visits</span>
            </div>
            <p className="text-2xl font-semibold">{totalVisits}</p>
          </div>
          
          <div className="glass rounded-xl p-4" data-testid="summary-revenue">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        {/* Search and Export */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11"
              data-testid="search-input"
            />
          </div>
          
          <Button 
            onClick={exportToExcel}
            className="w-full md:w-auto"
            data-testid="export-excel-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* Customers Table */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Customer Directory
          </h3>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Visits</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead>First Visit</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Properties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer, index) => (
                    <TableRow key={customer.phone} data-testid={`customer-row-${index}`}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{customer.customer_name}</div>
                        {customer.therapies && customer.therapies.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {customer.therapies.slice(0, 2).join(', ')}
                            {customer.therapies.length > 2 && ` +${customer.therapies.length - 2} more`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {customer.phone}
                        </div>
                        {customer.customer_email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Mail className="w-3 h-3" />
                            {customer.customer_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {customer.total_services}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-green-700">{formatCurrency(customer.total_spent)}</div>
                        <div className="text-xs text-muted-foreground">
                          Base: {formatCurrency(customer.total_base)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(customer.first_visit)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-green-600" />
                          {formatDate(customer.last_visit)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.properties_visited?.map((prop, i) => (
                            <span 
                              key={i}
                              className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                            >
                              {prop}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{searchTerm ? 'No customers match your search' : 'No customers found'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCustomers;
