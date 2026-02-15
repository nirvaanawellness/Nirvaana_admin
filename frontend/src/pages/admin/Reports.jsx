import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, FileText, Building2, DollarSign, TrendingUp, TrendingDown,
  Download, Filter, X, RotateCcw, Receipt, PieChart as PieChartIcon,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
];

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Jan-Mar)', months: [1, 2, 3] },
  { value: 'Q2', label: 'Q2 (Apr-Jun)', months: [4, 5, 6] },
  { value: 'Q3', label: 'Q3 (Jul-Sep)', months: [7, 8, 9] },
  { value: 'Q4', label: 'Q4 (Oct-Dec)', months: [10, 11, 12] }
];

const AdminReports = ({ user, onLogout }) => {
  const [properties, setProperties] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedTherapists, setSelectedTherapists] = useState([]);
  
  // Report dialogs
  const [salesReportDialog, setSalesReportDialog] = useState(false);
  const [expenseReportDialog, setExpenseReportDialog] = useState(false);
  const [pnlReportDialog, setPnlReportDialog] = useState(false);
  
  // Report data
  const [salesReportData, setSalesReportData] = useState(null);
  const [expenseReportData, setExpenseReportData] = useState(null);
  const [pnlReportData, setPnlReportData] = useState(null);

  const years = useMemo(() => {
    const currentYear = now.getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchFilteredData();
  }, [selectedYear, selectedMonth, selectedQuarter, selectedProperties, selectedTherapists]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [propsRes, therapistsRes] = await Promise.all([
        axios.get(`${API}/properties`, { headers }),
        axios.get(`${API}/therapists`, { headers })
      ]);
      
      setProperties(propsRes.data);
      setTherapists(therapistsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const getDateRange = () => {
    const today = now.toISOString().split('T')[0];
    
    if (selectedQuarter) {
      const quarter = QUARTERS.find(q => q.value === selectedQuarter);
      const startMonth = quarter.months[0];
      const endMonth = quarter.months[2];
      const startDate = `${selectedYear}-${String(startMonth).padStart(2, '0')}-01`;
      
      // If quarter includes current month and year, limit to today
      if (selectedYear === now.getFullYear() && quarter.months.includes(now.getMonth() + 1)) {
        return { from: startDate, to: today };
      }
      
      const lastDay = new Date(selectedYear, endMonth, 0).getDate();
      return { from: startDate, to: `${selectedYear}-${String(endMonth).padStart(2, '0')}-${lastDay}` };
    }
    
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    
    // If current month and year, limit to today
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) {
      return { from: startDate, to: today };
    }
    
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return { from: startDate, to: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}` };
  };

  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const { from, to } = getDateRange();
      
      const params = new URLSearchParams();
      params.append('date_from', from);
      params.append('date_to', to);
      
      if (selectedProperties.length > 0) {
        selectedProperties.forEach(p => params.append('property_id', p));
      }
      if (selectedTherapists.length > 0) {
        selectedTherapists.forEach(t => params.append('therapist_id', t));
      }
      
      const [servicesRes, expensesRes] = await Promise.all([
        axios.get(`${API}/services?${params.toString()}`, { headers }),
        axios.get(`${API}/expenses?${params.toString()}`, { headers })
      ]);
      
      setServices(servicesRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setSelectedQuarter('');
    setSelectedProperties([]);
    setSelectedTherapists([]);
  };

  const toggleProperty = (propertyName) => {
    setSelectedProperties(prev => 
      prev.includes(propertyName) ? prev.filter(p => p !== propertyName) : [...prev, propertyName]
    );
  };

  const toggleTherapist = (therapistId) => {
    setSelectedTherapists(prev => 
      prev.includes(therapistId) ? prev.filter(t => t !== therapistId) : [...prev, therapistId]
    );
  };

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalRevenue = services.reduce((sum, s) => sum + s.total_amount, 0);
    const totalBase = services.reduce((sum, s) => sum + s.base_price, 0);
    const totalGst = services.reduce((sum, s) => sum + s.gst_amount, 0);
    const hotelReceived = services.filter(s => s.payment_received_by === 'hotel').reduce((sum, s) => sum + s.total_amount, 0);
    const nirvaanaReceived = services.filter(s => s.payment_received_by === 'nirvaana').reduce((sum, s) => sum + s.total_amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalBase - totalExpenses;
    
    return { totalRevenue, totalBase, totalGst, hotelReceived, nirvaanaReceived, totalExpenses, netProfit };
  }, [services, expenses]);

  // Generate Sales Report
  const generateSalesReport = () => {
    const propertyData = {};
    
    services.forEach(service => {
      const propId = service.property_id;
      if (!propertyData[propId]) {
        const prop = properties.find(p => p.hotel_name === propId);
        propertyData[propId] = {
          property_name: prop?.hotel_name || propId,
          revenue_share: prop?.revenue_share_percentage || 50,
          total_revenue: 0,
          total_base: 0,
          total_gst: 0,
          hotel_received: 0,
          nirvaana_received: 0
        };
      }
      
      propertyData[propId].total_revenue += service.total_amount;
      propertyData[propId].total_base += service.base_price;
      propertyData[propId].total_gst += service.gst_amount;
      
      if (service.payment_received_by === 'hotel') {
        propertyData[propId].hotel_received += service.total_amount;
      } else {
        propertyData[propId].nirvaana_received += service.total_amount;
      }
    });
    
    // Calculate expected shares and outstanding
    Object.values(propertyData).forEach(prop => {
      const sharePercent = prop.revenue_share / 100;
      prop.hotel_expected = prop.total_base * sharePercent;
      prop.nirvaana_expected = prop.total_base * (1 - sharePercent);
      prop.hotel_outstanding = prop.hotel_expected - prop.hotel_received;
      prop.nirvaana_outstanding = prop.nirvaana_expected - prop.nirvaana_received;
    });
    
    setSalesReportData(Object.values(propertyData));
    setSalesReportDialog(true);
  };

  // Generate Expense Report
  const generateExpenseReport = () => {
    const recurring = { salary: 0, living_cost: 0, total: 0 };
    const adhoc = { marketing: 0, disposables: 0, oil_aromatics: 0, essentials: 0, bill_books: 0, other: 0, total: 0 };
    
    expenses.forEach(exp => {
      if (exp.category === 'recurring') {
        if (recurring[exp.expense_type] !== undefined) {
          recurring[exp.expense_type] += exp.amount;
        }
        recurring.total += exp.amount;
      } else {
        if (adhoc[exp.expense_type] !== undefined) {
          adhoc[exp.expense_type] += exp.amount;
        }
        adhoc.total += exp.amount;
      }
    });
    
    setExpenseReportData({ recurring, adhoc, grandTotal: recurring.total + adhoc.total, expenses });
    setExpenseReportDialog(true);
  };

  // Generate P&L Report
  const generatePnlReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all-time data for cumulative
      const [allServicesRes, allExpensesRes] = await Promise.all([
        axios.get(`${API}/services`, { headers }),
        axios.get(`${API}/expenses`, { headers })
      ]);
      
      const allServices = allServicesRes.data;
      const allExpenses = allExpensesRes.data;
      
      const cumulativeRevenue = allServices.reduce((sum, s) => sum + s.base_price, 0);
      const cumulativeExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
      const cumulativeProfit = cumulativeRevenue - cumulativeExpenses;
      
      // Current period
      const periodRevenue = summary.totalBase;
      const periodExpenses = summary.totalExpenses;
      const periodProfit = periodRevenue - periodExpenses;
      
      setPnlReportData({
        period: { revenue: periodRevenue, expenses: periodExpenses, profit: periodProfit },
        cumulative: { revenue: cumulativeRevenue, expenses: cumulativeExpenses, profit: cumulativeProfit }
      });
      setPnlReportDialog(true);
    } catch (error) {
      toast.error('Failed to generate P&L report');
    }
  };

  // Download functions
  const downloadSalesReport = () => {
    const headers = ['Property', 'Revenue Share %', 'Total Revenue', 'Base Sales', 'GST', 'Hotel Expected', 'Hotel Received', 'Hotel Outstanding', 'Nirvaana Expected', 'Nirvaana Received', 'Nirvaana Outstanding'];
    const rows = salesReportData.map(p => [
      p.property_name, p.revenue_share, p.total_revenue, p.total_base, p.total_gst,
      p.hotel_expected.toFixed(2), p.hotel_received.toFixed(2), p.hotel_outstanding.toFixed(2),
      p.nirvaana_expected.toFixed(2), p.nirvaana_received.toFixed(2), p.nirvaana_outstanding.toFixed(2)
    ]);
    
    downloadCSV(headers, rows, 'sales-report');
  };

  const downloadExpenseReport = () => {
    const headers = ['Date', 'Property', 'Category', 'Type', 'Amount', 'Description'];
    const rows = expenseReportData.expenses.map(e => [
      e.date, e.property_id, e.category, e.expense_type, e.amount, e.description || ''
    ]);
    
    downloadCSV(headers, rows, 'expense-report');
  };

  const downloadPnlReport = () => {
    const headers = ['Metric', 'Current Period', 'Cumulative (All Time)'];
    const rows = [
      ['Total Revenue', pnlReportData.period.revenue, pnlReportData.cumulative.revenue],
      ['Total Expenses', pnlReportData.period.expenses, pnlReportData.cumulative.expenses],
      ['Net Profit/Loss', pnlReportData.period.profit, pnlReportData.cumulative.profit]
    ];
    
    downloadCSV(headers, rows, 'profit-loss-report');
  };

  const downloadCSV = (headers, rows, filename) => {
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nirvaana-${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Report downloaded!');
  };

  // Chart data
  const chartData = useMemo(() => {
    const byProperty = {};
    services.forEach(s => {
      if (!byProperty[s.property_id]) {
        byProperty[s.property_id] = { name: s.property_id, revenue: 0, expenses: 0 };
      }
      byProperty[s.property_id].revenue += s.base_price;
    });
    expenses.forEach(e => {
      if (byProperty[e.property_id]) {
        byProperty[e.property_id].expenses += e.amount;
      }
    });
    return Object.values(byProperty);
  }, [services, expenses]);

  const dateRange = getDateRange();
  const hasActiveFilters = selectedProperties.length > 0 || selectedTherapists.length > 0;

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
            <h1 className="text-2xl font-serif text-foreground">Reports</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="reset-filters-button">
            <RotateCcw className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Reset
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="glass rounded-2xl p-6" data-testid="report-filters">
          <h3 className="text-lg font-serif text-foreground mb-4">Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label className="mb-2 block text-sm">Year</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger data-testid="year-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block text-sm">Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => { setSelectedMonth(Number(v)); setSelectedQuarter(''); }}>
                <SelectTrigger data-testid="month-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block text-sm">Quarter</Label>
              <Select value={selectedQuarter} onValueChange={(v) => setSelectedQuarter(v)}>
                <SelectTrigger data-testid="quarter-select">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {QUARTERS.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 md:col-span-1">
              <Label className="mb-2 block text-sm">Properties</Label>
              <div className="border border-border rounded-lg p-2 max-h-24 overflow-y-auto">
                {properties.map(p => (
                  <div key={p.id} className="flex items-center space-x-2 py-1">
                    <Checkbox checked={selectedProperties.includes(p.hotel_name)} onCheckedChange={() => toggleProperty(p.hotel_name)} />
                    <span className="text-xs">{p.hotel_name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="col-span-2 md:col-span-1">
              <Label className="mb-2 block text-sm">Therapists</Label>
              <div className="border border-border rounded-lg p-2 max-h-24 overflow-y-auto">
                {therapists.map(t => (
                  <div key={t.user_id} className="flex items-center space-x-2 py-1">
                    <Checkbox checked={selectedTherapists.includes(t.user_id)} onCheckedChange={() => toggleTherapist(t.user_id)} />
                    <span className="text-xs">{t.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Showing: <span className="font-medium text-foreground">{dateRange.from} to {dateRange.to}</span>
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-medium">₹{summary.totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-5 h-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Expenses</span>
            </div>
            <p className="text-2xl font-medium">₹{summary.totalExpenses.toLocaleString()}</p>
          </div>
          
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              {summary.netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-muted-foreground">Net Profit</span>
            </div>
            <p className={`text-2xl font-medium ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{Math.abs(summary.netProfit).toLocaleString()}
            </p>
          </div>
          
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Transactions</span>
            </div>
            <p className="text-2xl font-medium">{services.length}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-serif text-foreground mb-4">Revenue vs Expenses by Property</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#B89D62" />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Report Boxes */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4">Downloadable Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Report 1: Sales */}
            <div 
              className="border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
              onClick={generateSalesReport}
              data-testid="sales-report-box"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground mb-1">Sales Report</h4>
              <p className="text-xs text-muted-foreground">Revenue breakdown, settlements & outstanding balances</p>
            </div>
            
            {/* Report 2: Expenses */}
            <div 
              className="border border-border rounded-xl p-5 hover:border-red-500/50 hover:bg-red-50 cursor-pointer transition-all"
              onClick={generateExpenseReport}
              data-testid="expense-report-box"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground mb-1">Expense Report</h4>
              <p className="text-xs text-muted-foreground">Fixed & variable costs breakdown</p>
            </div>
            
            {/* Report 3: P&L */}
            <div 
              className="border border-border rounded-xl p-5 hover:border-green-500/50 hover:bg-green-50 cursor-pointer transition-all"
              onClick={generatePnlReport}
              data-testid="pnl-report-box"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <PieChartIcon className="w-5 h-5 text-green-600" />
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground mb-1">Profit & Loss</h4>
              <p className="text-xs text-muted-foreground">Monthly & cumulative P&L statement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Report Dialog */}
      <Dialog open={salesReportDialog} onOpenChange={setSalesReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Sales Report</DialogTitle>
          </DialogHeader>
          
          {salesReportData && (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Property</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Hotel Expected</th>
                      <th className="text-right py-2">Hotel Received</th>
                      <th className="text-right py-2">Hotel Outstanding</th>
                      <th className="text-right py-2">Nirvaana Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReportData.map((p, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{p.property_name}</td>
                        <td className="py-2 text-right">₹{p.total_revenue.toLocaleString()}</td>
                        <td className="py-2 text-right">₹{p.hotel_expected.toFixed(0)}</td>
                        <td className="py-2 text-right">₹{p.hotel_received.toFixed(0)}</td>
                        <td className={`py-2 text-right font-medium ${p.hotel_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{Math.abs(p.hotel_outstanding).toFixed(0)}
                        </td>
                        <td className={`py-2 text-right font-medium ${p.nirvaana_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{Math.abs(p.nirvaana_outstanding).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <DialogFooter>
                <Button onClick={downloadSalesReport}>
                  <Download className="w-4 h-4 mr-2" /> Download Excel
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expense Report Dialog */}
      <Dialog open={expenseReportDialog} onOpenChange={setExpenseReportDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Expense Report</DialogTitle>
          </DialogHeader>
          
          {expenseReportData && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Recurring Costs</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Salary</span><span>₹{expenseReportData.recurring.salary.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Living Cost</span><span>₹{expenseReportData.recurring.living_cost.toLocaleString()}</span></div>
                    <div className="flex justify-between font-medium border-t pt-2"><span>Total</span><span>₹{expenseReportData.recurring.total.toLocaleString()}</span></div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Ad-hoc Costs</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Marketing</span><span>₹{expenseReportData.adhoc.marketing.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Disposables</span><span>₹{expenseReportData.adhoc.disposables.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Oil & Aromatics</span><span>₹{expenseReportData.adhoc.oil_aromatics.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Essentials</span><span>₹{expenseReportData.adhoc.essentials.toLocaleString()}</span></div>
                    <div className="flex justify-between font-medium border-t pt-2"><span>Total</span><span>₹{expenseReportData.adhoc.total.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-3xl font-medium">₹{expenseReportData.grandTotal.toLocaleString()}</p>
              </div>
              
              <DialogFooter>
                <Button onClick={downloadExpenseReport}>
                  <Download className="w-4 h-4 mr-2" /> Download Excel
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* P&L Report Dialog */}
      <Dialog open={pnlReportDialog} onOpenChange={setPnlReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Profit & Loss Report</DialogTitle>
          </DialogHeader>
          
          {pnlReportData && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="border rounded-lg p-5">
                  <h4 className="font-medium text-muted-foreground mb-4">Current Period</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span>Revenue</span><span className="font-medium">₹{pnlReportData.period.revenue.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Expenses</span><span className="font-medium text-red-600">₹{pnlReportData.period.expenses.toLocaleString()}</span></div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="font-medium">Net P&L</span>
                      <span className={`font-bold text-lg ${pnlReportData.period.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlReportData.period.profit >= 0 ? '+' : '-'}₹{Math.abs(pnlReportData.period.profit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border-2 border-primary/30 rounded-lg p-5 bg-primary/5">
                  <h4 className="font-medium text-primary mb-4">Cumulative (All Time)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span>Total Revenue</span><span className="font-medium">₹{pnlReportData.cumulative.revenue.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Expenses</span><span className="font-medium text-red-600">₹{pnlReportData.cumulative.expenses.toLocaleString()}</span></div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="font-medium">Net P&L</span>
                      <span className={`font-bold text-xl ${pnlReportData.cumulative.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlReportData.cumulative.profit >= 0 ? '+' : '-'}₹{Math.abs(pnlReportData.cumulative.profit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={downloadPnlReport}>
                  <Download className="w-4 h-4 mr-2" /> Download Excel
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReports;
