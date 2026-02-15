import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, FileText, Building2, DollarSign, TrendingUp, TrendingDown,
  Download, RotateCcw, Receipt, PieChart as PieChartIcon,
  ChevronRight, X as XIcon, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ReferenceDot
} from 'recharts';

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

// Custom X marker for expense dates
const ExpenseMarker = (props) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g>
      <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} stroke="#ef4444" strokeWidth={3} />
      <line x1={cx + 6} y1={cy - 6} x2={cx - 6} y2={cy + 6} stroke="#ef4444" strokeWidth={3} />
    </g>
  );
};

/**
 * GST-AWARE CALCULATION HELPER
 * 
 * CRITICAL BUSINESS LOGIC:
 * - Revenue share % is applied ONLY on Base Amount (excluding GST)
 * - GST is settled proportionately based on who collected it
 * - Profit = Our Base Share - Expenses (GST excluded from profit)
 * 
 * Settlement Logic:
 * 1. Calculate each party's expected BASE share from total base revenue
 * 2. Calculate each party's GST liability based on their base share
 * 3. Compare expected (base + GST) with actual collected (gross)
 * 4. Settlement = Expected Total - Actually Collected
 */
const calculateGSTAwareSettlement = (services, hotelSharePercent) => {
  // Step 1: Aggregate totals
  const totals = services.reduce((acc, s) => {
    acc.baseRevenue += s.base_price;
    acc.gstCollected += s.gst_amount;
    acc.grossRevenue += s.total_amount;
    
    // Track what each party actually collected (gross amounts)
    if (s.payment_received_by === 'hotel') {
      acc.hotelCollectedGross += s.total_amount;
    } else {
      acc.nirvaanaCollectedGross += s.total_amount;
    }
    return acc;
  }, { 
    baseRevenue: 0, 
    gstCollected: 0, 
    grossRevenue: 0, 
    hotelCollectedGross: 0, 
    nirvaanaCollectedGross: 0 
  });
  
  // Step 2: Calculate expected BASE shares (share % applied to BASE only)
  const hotelBaseShare = totals.baseRevenue * (hotelSharePercent / 100);
  const nirvaanaBaseShare = totals.baseRevenue * (1 - hotelSharePercent / 100);
  
  // Step 3: Calculate GST liability proportionate to base share
  // Each party's GST liability = Their Base Share × GST Rate (18%)
  const hotelGSTLiability = hotelBaseShare * 0.18;
  const nirvaanaGSTLiability = nirvaanaBaseShare * 0.18;
  
  // Step 4: Calculate expected TOTAL (Base + GST) for each party
  const hotelExpectedTotal = hotelBaseShare + hotelGSTLiability;
  const nirvaanaExpectedTotal = nirvaanaBaseShare + nirvaanaGSTLiability;
  
  // Step 5: Calculate settlement (Expected - Actually Collected)
  // Positive = They need to receive more (other party owes them)
  // Negative = They collected extra (they owe the other party)
  const hotelSettlement = hotelExpectedTotal - totals.hotelCollectedGross;
  const nirvaanaSettlement = nirvaanaExpectedTotal - totals.nirvaanaCollectedGross;
  
  return {
    // Base amounts
    baseRevenue: totals.baseRevenue,
    gstCollected: totals.gstCollected,
    grossRevenue: totals.grossRevenue,
    
    // Hotel breakdown
    hotelBaseShare,
    hotelGSTLiability,
    hotelExpectedTotal,
    hotelCollectedGross: totals.hotelCollectedGross,
    hotelSettlement, // Positive = Nirvaana owes Hotel
    
    // Nirvaana breakdown
    nirvaanaBaseShare,
    nirvaanaGSTLiability,
    nirvaanaExpectedTotal,
    nirvaanaCollectedGross: totals.nirvaanaCollectedGross,
    nirvaanaSettlement // Positive = Hotel owes Nirvaana
  };
};

const AdminReports = ({ user, onLogout }) => {
  const [properties, setProperties] = useState([]);
  const [services, setServices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedProperties, setSelectedProperties] = useState([]);
  
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
    if (properties.length > 0) {
      fetchFilteredData();
    }
  }, [selectedYear, selectedMonth, selectedQuarter, selectedProperties, properties]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const propsRes = await axios.get(`${API}/properties`, { headers });
      setProperties(propsRes.data);
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
      
      if (selectedYear === now.getFullYear() && quarter.months.includes(now.getMonth() + 1)) {
        return { from: startDate, to: today };
      }
      
      const lastDay = new Date(selectedYear, endMonth, 0).getDate();
      return { from: startDate, to: `${selectedYear}-${String(endMonth).padStart(2, '0')}-${lastDay}` };
    }
    
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    
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
  };

  const toggleProperty = (propertyName) => {
    setSelectedProperties(prev => 
      prev.includes(propertyName) ? prev.filter(p => p !== propertyName) : [...prev, propertyName]
    );
  };

  // Get property share percentage (Hotel's share of BASE revenue)
  const getPropertyShare = (propertyId) => {
    const prop = properties.find(p => p.hotel_name === propertyId || p.id === propertyId);
    return prop?.revenue_share_percentage || 50;
  };

  /**
   * CORRECTED SUMMARY CALCULATION
   * 
   * Key Changes:
   * - Revenue share % applied ONLY on Base Amount (excluding GST)
   * - GST is tracked separately and NOT included in profit calculation
   * - Profit = Our Base Share - Expenses
   */
  const summary = useMemo(() => {
    // Group services by property for accurate per-property calculations
    const propertyGroups = {};
    
    services.forEach(service => {
      const propId = service.property_id;
      if (!propertyGroups[propId]) {
        propertyGroups[propId] = [];
      }
      propertyGroups[propId].push(service);
    });
    
    // Calculate using GST-aware settlement logic per property
    let totalBaseRevenue = 0;
    let totalGstCollected = 0;
    let totalGrossRevenue = 0;
    let totalHotelBaseShare = 0;
    let totalNirvaanaBaseShare = 0;
    let totalExpenses = 0;
    
    Object.entries(propertyGroups).forEach(([propId, propServices]) => {
      const hotelSharePercent = getPropertyShare(propId);
      const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent);
      
      totalBaseRevenue += settlement.baseRevenue;
      totalGstCollected += settlement.gstCollected;
      totalGrossRevenue += settlement.grossRevenue;
      totalHotelBaseShare += settlement.hotelBaseShare;
      totalNirvaanaBaseShare += settlement.nirvaanaBaseShare;
    });
    
    // Sum expenses
    expenses.forEach(exp => {
      totalExpenses += exp.amount;
    });
    
    // PROFIT = Our Base Share - Expenses (GST excluded)
    const netProfit = totalNirvaanaBaseShare - totalExpenses;
    
    return { 
      baseRevenue: totalBaseRevenue,
      gstCollected: totalGstCollected,
      grossRevenue: totalGrossRevenue,
      hotelBaseShare: totalHotelBaseShare,
      nirvaanaBaseShare: totalNirvaanaBaseShare,
      totalExpenses,
      netProfit,
      transactionCount: services.length
    };
  }, [services, expenses, properties]);

  // Date-wise revenue data for line chart (using Our BASE Share)
  const dateWiseData = useMemo(() => {
    const dataByDate = {};
    const { from, to } = getDateRange();
    
    // Initialize all dates in range
    const startDate = new Date(from);
    const endDate = new Date(to);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dataByDate[dateStr] = { date: dateStr, ourBaseShare: 0, hasExpense: false };
    }
    
    // Calculate our BASE share per date (share % on base_price only, NOT gross)
    services.forEach(service => {
      const date = service.date;
      const hotelSharePercent = getPropertyShare(service.property_id);
      // Our Base Share = Base Price × (100% - Hotel Share %)
      const ourBaseShare = service.base_price * (1 - hotelSharePercent / 100);
      
      if (dataByDate[date]) {
        dataByDate[date].ourBaseShare += ourBaseShare;
      }
    });
    
    // Mark expense dates
    expenses.forEach(exp => {
      if (dataByDate[exp.date]) {
        dataByDate[exp.date].hasExpense = true;
      }
    });
    
    return Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [services, expenses, selectedYear, selectedMonth, selectedQuarter, selectedProperties]);

  // Property chart data with GST-aware calculations
  const chartData = useMemo(() => {
    const byProperty = {};
    
    // Group services by property
    services.forEach(s => {
      const propId = s.property_id;
      if (!byProperty[propId]) {
        byProperty[propId] = [];
      }
      byProperty[propId].push(s);
    });
    
    // Calculate GST-aware data per property
    const chartItems = Object.entries(byProperty).map(([propId, propServices]) => {
      const hotelSharePercent = getPropertyShare(propId);
      const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent);
      
      // Get expenses for this property
      const propExpenses = expenses.filter(e => e.property_id === propId)
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        name: propId,
        baseRevenue: settlement.baseRevenue,
        gstCollected: settlement.gstCollected,
        grossRevenue: settlement.grossRevenue,
        ourBaseShare: settlement.nirvaanaBaseShare,
        hotelBaseShare: settlement.hotelBaseShare,
        expenses: propExpenses,
        hotelSharePercent
      };
    });
    
    return chartItems;
  }, [services, expenses, properties]);

  /**
   * GENERATE SALES REPORT WITH FULL GST-AWARE BREAKDOWN
   * 
   * Shows per property:
   * 1. Base Revenue (Excl. GST)
   * 2. GST Collected
   * 3. Gross Revenue (Incl. GST)
   * 4. Share %
   * 5. Hotel Expected (Base)
   * 6. Hotel GST Liability
   * 7. Hotel Total Expected
   * 8. Hotel Received (Actual)
   * 9. Our Expected (Base)
   * 10. Our GST Liability
   * 11. Our Total Expected
   * 12. Our Received (Actual)
   * 13. Settlement Amount
   */
  const generateSalesReport = () => {
    // Group services by property
    const propertyGroups = {};
    
    services.forEach(service => {
      const propId = service.property_id;
      if (!propertyGroups[propId]) {
        propertyGroups[propId] = [];
      }
      propertyGroups[propId].push(service);
    });
    
    // Calculate full GST-aware breakdown per property
    const reportData = Object.entries(propertyGroups).map(([propId, propServices]) => {
      const prop = properties.find(p => p.hotel_name === propId);
      const hotelSharePercent = prop?.revenue_share_percentage || 50;
      
      const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent);
      
      return {
        property_name: prop?.hotel_name || propId,
        hotel_share_percent: hotelSharePercent,
        
        // Revenue breakdown
        base_revenue: settlement.baseRevenue,
        gst_collected: settlement.gstCollected,
        gross_revenue: settlement.grossRevenue,
        
        // Hotel breakdown
        hotel_base_expected: settlement.hotelBaseShare,
        hotel_gst_liability: settlement.hotelGSTLiability,
        hotel_total_expected: settlement.hotelExpectedTotal,
        hotel_received: settlement.hotelCollectedGross,
        
        // Nirvaana breakdown
        our_base_expected: settlement.nirvaanaBaseShare,
        our_gst_liability: settlement.nirvaanaGSTLiability,
        our_total_expected: settlement.nirvaanaExpectedTotal,
        our_received: settlement.nirvaanaCollectedGross,
        
        // Settlement
        hotel_settlement: settlement.hotelSettlement,
        our_settlement: settlement.nirvaanaSettlement
      };
    });
    
    setSalesReportData(reportData);
    setSalesReportDialog(true);
  };

  // Generate Expense Report
  const generateExpenseReport = () => {
    // Group by property
    const byProperty = {};
    
    expenses.forEach(exp => {
      const propId = exp.property_id;
      if (!byProperty[propId]) {
        byProperty[propId] = {
          property_name: propId,
          recurring: { salary: 0, living_cost: 0, total: 0 },
          adhoc: { marketing: 0, disposables: 0, oil_aromatics: 0, essentials: 0, bill_books: 0, other: 0, total: 0 }
        };
      }
      
      if (exp.category === 'recurring') {
        if (byProperty[propId].recurring[exp.expense_type] !== undefined) {
          byProperty[propId].recurring[exp.expense_type] += exp.amount;
        }
        byProperty[propId].recurring.total += exp.amount;
      } else {
        if (byProperty[propId].adhoc[exp.expense_type] !== undefined) {
          byProperty[propId].adhoc[exp.expense_type] += exp.amount;
        }
        byProperty[propId].adhoc.total += exp.amount;
      }
    });
    
    const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    setExpenseReportData({ byProperty: Object.values(byProperty), grandTotal, expenses });
    setExpenseReportDialog(true);
  };

  /**
   * GENERATE P&L REPORT WITH CORRECT GST-AWARE FORMULA
   * 
   * Profit = Our BASE Share - Expenses
   * GST is NOT included in profit calculation
   */
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
      
      // Calculate cumulative using GST-aware logic
      const cumulativeByProperty = {};
      
      allServices.forEach(service => {
        const propId = service.property_id;
        if (!cumulativeByProperty[propId]) {
          cumulativeByProperty[propId] = [];
        }
        cumulativeByProperty[propId].push(service);
      });
      
      let cumulativeBaseRevenue = 0;
      let cumulativeGstCollected = 0;
      let cumulativeGrossRevenue = 0;
      let cumulativeHotelBaseShare = 0;
      let cumulativeNirvaanaBaseShare = 0;
      let cumulativeExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      Object.entries(cumulativeByProperty).forEach(([propId, propServices]) => {
        const hotelSharePercent = getPropertyShare(propId);
        const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent);
        
        cumulativeBaseRevenue += settlement.baseRevenue;
        cumulativeGstCollected += settlement.gstCollected;
        cumulativeGrossRevenue += settlement.grossRevenue;
        cumulativeHotelBaseShare += settlement.hotelBaseShare;
        cumulativeNirvaanaBaseShare += settlement.nirvaanaBaseShare;
      });
      
      // Profit = Our Base Share - Expenses (GST excluded)
      const cumulativeProfit = cumulativeNirvaanaBaseShare - cumulativeExpenses;
      const periodProfit = summary.nirvaanaBaseShare - summary.totalExpenses;
      
      setPnlReportData({
        period: {
          baseRevenue: summary.baseRevenue,
          gstCollected: summary.gstCollected,
          grossRevenue: summary.grossRevenue,
          hotelBaseShare: summary.hotelBaseShare,
          ourBaseShare: summary.nirvaanaBaseShare,
          expenses: summary.totalExpenses,
          profit: periodProfit
        },
        cumulative: {
          baseRevenue: cumulativeBaseRevenue,
          gstCollected: cumulativeGstCollected,
          grossRevenue: cumulativeGrossRevenue,
          hotelBaseShare: cumulativeHotelBaseShare,
          ourBaseShare: cumulativeNirvaanaBaseShare,
          expenses: cumulativeExpenses,
          profit: cumulativeProfit
        }
      });
      setPnlReportDialog(true);
    } catch (error) {
      toast.error('Failed to generate P&L report');
    }
  };

  // Download Sales Report with full GST breakdown
  const downloadSalesReport = () => {
    const headers = [
      'Property', 'Share %', 
      'Base Revenue', 'GST Collected', 'Gross Revenue',
      'Hotel Base Expected', 'Hotel GST Liability', 'Hotel Total Expected', 'Hotel Received',
      'Our Base Expected', 'Our GST Liability', 'Our Total Expected', 'Our Received',
      'To Pay Hotel', 'To Pay Nirvaana'
    ];
    
    const rows = salesReportData.map(p => {
      // Settlement: Positive means they need to receive (other owes them)
      const toPayHotel = p.hotel_settlement > 0 ? p.hotel_settlement : 0;
      const toPayNirvaana = p.our_settlement > 0 ? p.our_settlement : 0;
      
      return [
        p.property_name, 
        p.hotel_share_percent, 
        p.base_revenue.toFixed(2),
        p.gst_collected.toFixed(2),
        p.gross_revenue.toFixed(2),
        p.hotel_base_expected.toFixed(2),
        p.hotel_gst_liability.toFixed(2),
        p.hotel_total_expected.toFixed(2),
        p.hotel_received.toFixed(2),
        p.our_base_expected.toFixed(2),
        p.our_gst_liability.toFixed(2),
        p.our_total_expected.toFixed(2),
        p.our_received.toFixed(2),
        toPayHotel > 0 ? toPayHotel.toFixed(2) : 'NA',
        toPayNirvaana > 0 ? toPayNirvaana.toFixed(2) : 'NA'
      ];
    });
    
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
      ['Base Revenue (Excl. GST)', pnlReportData.period.baseRevenue.toFixed(2), pnlReportData.cumulative.baseRevenue.toFixed(2)],
      ['GST Collected', pnlReportData.period.gstCollected.toFixed(2), pnlReportData.cumulative.gstCollected.toFixed(2)],
      ['Gross Revenue (Incl. GST)', pnlReportData.period.grossRevenue.toFixed(2), pnlReportData.cumulative.grossRevenue.toFixed(2)],
      ['Hotel Base Share', pnlReportData.period.hotelBaseShare.toFixed(2), pnlReportData.cumulative.hotelBaseShare.toFixed(2)],
      ['Our Base Share', pnlReportData.period.ourBaseShare.toFixed(2), pnlReportData.cumulative.ourBaseShare.toFixed(2)],
      ['Expenses', pnlReportData.period.expenses.toFixed(2), pnlReportData.cumulative.expenses.toFixed(2)],
      ['Net Profit (Our Base Share - Expenses)', pnlReportData.period.profit.toFixed(2), pnlReportData.cumulative.profit.toFixed(2)]
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

  const dateRange = getDateRange();
  const expenseDates = dateWiseData.filter(d => d.hasExpense);

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
        {/* Filters - Removed Therapists */}
        <div className="glass rounded-2xl p-6" data-testid="report-filters">
          <h3 className="text-lg font-serif text-foreground mb-4">Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Select value={selectedQuarter || "none"} onValueChange={(v) => setSelectedQuarter(v === "none" ? "" : v)}>
                <SelectTrigger data-testid="quarter-select">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {QUARTERS.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block text-sm">Properties</Label>
              <div className="border border-border rounded-lg p-2 max-h-28 overflow-y-auto">
                {properties.map(p => (
                  <div key={p.id} className="flex items-center space-x-2 py-1">
                    <Checkbox checked={selectedProperties.includes(p.hotel_name)} onCheckedChange={() => toggleProperty(p.hotel_name)} />
                    <span className="text-xs">{p.hotel_name} ({p.revenue_share_percentage}%)</span>
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

        {/* Summary Cards with GST-AWARE calculations */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Base Revenue</span>
            </div>
            <p className="text-xl font-medium">₹{summary.baseRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Excl. GST</p>
          </div>
          
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">GST Collected</span>
            </div>
            <p className="text-xl font-medium text-blue-600">₹{summary.gstCollected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">18% GST</p>
          </div>
          
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Gross Revenue</span>
            </div>
            <p className="text-xl font-medium">₹{summary.grossRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Incl. GST</p>
          </div>
          
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Hotel Base Share</span>
            </div>
            <p className="text-xl font-medium text-amber-600">₹{summary.hotelBaseShare.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Per contract %</p>
          </div>
          
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Our Base Share</span>
            </div>
            <p className="text-xl font-medium text-primary">₹{summary.nirvaanaBaseShare.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Pre-expense</p>
          </div>
          
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Expenses</span>
            </div>
            <p className="text-xl font-medium text-red-600">₹{summary.totalExpenses.toLocaleString()}</p>
          </div>
          
          <div className="glass rounded-2xl p-4 border-2 border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              {summary.netProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Net Profit</span>
            </div>
            <p className={`text-xl font-medium ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{Math.abs(summary.netProfit).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Base Share - Exp</p>
          </div>
        </div>
        
        {/* Profit Formula Explanation */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Calculation Logic</p>
            <p className="text-muted-foreground">
              Revenue share % is applied on <strong>Base Amount only</strong> (excluding GST). 
              Net Profit = Our Base Share − Expenses. GST is tracked separately and settled proportionately.
            </p>
          </div>
        </div>

        {/* Date-wise Revenue Line Chart with Expense Markers */}
        {dateWiseData.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-foreground">Date-wise Our Base Share</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-primary"></div> Our Base Share
                </span>
                <span className="flex items-center gap-1">
                  <XIcon className="w-3 h-3 text-red-500" /> Expense recorded
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dateWiseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(date) => new Date(date).getDate()}
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Our Base Share']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="ourBaseShare" 
                  stroke="#B89D62" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                {/* Expense markers */}
                {expenseDates.map((d, idx) => (
                  <ReferenceDot
                    key={idx}
                    x={d.date}
                    y={d.ourBaseShare}
                    shape={<ExpenseMarker />}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Property Bar Chart with consistent data */}
        {chartData.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-serif text-foreground mb-4">Our Revenue vs Expenses by Property</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(value, name) => [`₹${value.toLocaleString()}`, name]}
                  labelFormatter={(label) => `Property: ${label}`}
                />
                <Legend />
                <Bar dataKey="ourRevenue" name="Our Revenue" fill="#B89D62" />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Report Boxes */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-serif text-foreground mb-4">Downloadable Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-xs text-muted-foreground">Revenue split, settlements & outstanding</p>
            </div>
            
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
              <p className="text-xs text-muted-foreground">Fixed & variable costs by property</p>
            </div>
            
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
              <p className="text-xs text-muted-foreground">Period & cumulative P&L statement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Report Dialog */}
      <Dialog open={salesReportDialog} onOpenChange={setSalesReportDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Sales Report</DialogTitle>
          </DialogHeader>
          
          {salesReportData && (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-3 px-2">Property</th>
                      <th className="text-right py-3 px-2">Share %</th>
                      <th className="text-right py-3 px-2">Gross Revenue</th>
                      <th className="text-right py-3 px-2">Hotel Expected</th>
                      <th className="text-right py-3 px-2">Hotel Received</th>
                      <th className="text-right py-3 px-2">Our Expected</th>
                      <th className="text-right py-3 px-2">Our Received</th>
                      <th className="text-right py-3 px-2 bg-amber-50">To Pay Hotel</th>
                      <th className="text-right py-3 px-2 bg-primary/10">To Pay Nirvaana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReportData.map((p, i) => {
                      // Calculate what needs to be paid
                      // If Hotel received less than expected, Nirvaana owes Hotel
                      const toPayHotel = p.hotel_expected - p.hotel_received;
                      // If Nirvaana received less than expected, Hotel owes Nirvaana
                      const toPayNirvaana = p.our_revenue - p.nirvaana_received;
                      
                      return (
                        <tr key={i} className="border-b hover:bg-muted/20">
                          <td className="py-3 px-2 font-medium">{p.property_name}</td>
                          <td className="py-3 px-2 text-right">{p.hotel_share_percent}%</td>
                          <td className="py-3 px-2 text-right">₹{p.gross_revenue.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right">₹{p.hotel_expected.toFixed(0)}</td>
                          <td className="py-3 px-2 text-right">₹{p.hotel_received.toFixed(0)}</td>
                          <td className="py-3 px-2 text-right text-primary">₹{p.our_revenue.toFixed(0)}</td>
                          <td className="py-3 px-2 text-right">₹{p.nirvaana_received.toFixed(0)}</td>
                          <td className="py-3 px-2 text-right bg-amber-50/50 font-medium">
                            {toPayHotel > 0 ? (
                              <span className="text-amber-700">₹{toPayHotel.toFixed(0)}</span>
                            ) : (
                              <span className="text-muted-foreground">NA</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right bg-primary/5 font-medium">
                            {toPayNirvaana > 0 ? (
                              <span className="text-primary">₹{toPayNirvaana.toFixed(0)}</span>
                            ) : (
                              <span className="text-muted-foreground">NA</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/30 font-medium">
                      <td className="py-3 px-2">Total</td>
                      <td className="py-3 px-2"></td>
                      <td className="py-3 px-2 text-right">₹{salesReportData.reduce((sum, p) => sum + p.gross_revenue, 0).toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">₹{salesReportData.reduce((sum, p) => sum + p.hotel_expected, 0).toFixed(0)}</td>
                      <td className="py-3 px-2 text-right">₹{salesReportData.reduce((sum, p) => sum + p.hotel_received, 0).toFixed(0)}</td>
                      <td className="py-3 px-2 text-right text-primary">₹{salesReportData.reduce((sum, p) => sum + p.our_revenue, 0).toFixed(0)}</td>
                      <td className="py-3 px-2 text-right">₹{salesReportData.reduce((sum, p) => sum + p.nirvaana_received, 0).toFixed(0)}</td>
                      <td className="py-3 px-2 text-right bg-amber-50/50">
                        <span className="text-amber-700">
                          ₹{salesReportData.reduce((sum, p) => sum + Math.max(0, p.hotel_expected - p.hotel_received), 0).toFixed(0)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right bg-primary/5">
                        <span className="text-primary">
                          ₹{salesReportData.reduce((sum, p) => sum + Math.max(0, p.our_revenue - p.nirvaana_received), 0).toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                <p><strong>To Pay Hotel:</strong> Amount Nirvaana needs to pay to Hotel (when Hotel received less than expected)</p>
                <p><strong>To Pay Nirvaana:</strong> Amount Hotel needs to pay to Nirvaana (when Nirvaana received less than expected)</p>
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
              {expenseReportData.byProperty.map((prop, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{prop.property_name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-2">Recurring</p>
                      <div className="space-y-1">
                        <div className="flex justify-between"><span>Salary</span><span>₹{prop.recurring.salary.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Living Cost</span><span>₹{prop.recurring.living_cost.toLocaleString()}</span></div>
                        <div className="flex justify-between font-medium border-t pt-1"><span>Subtotal</span><span>₹{prop.recurring.total.toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-2">Ad-hoc</p>
                      <div className="space-y-1">
                        <div className="flex justify-between"><span>Marketing</span><span>₹{prop.adhoc.marketing.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Disposables</span><span>₹{prop.adhoc.disposables.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Oil & Aromatics</span><span>₹{prop.adhoc.oil_aromatics.toLocaleString()}</span></div>
                        <div className="flex justify-between font-medium border-t pt-1"><span>Subtotal</span><span>₹{prop.adhoc.total.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-3xl font-medium text-red-600">₹{expenseReportData.grandTotal.toLocaleString()}</p>
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

      {/* P&L Report Dialog with correct formula */}
      <Dialog open={pnlReportDialog} onOpenChange={setPnlReportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Profit & Loss Report</DialogTitle>
          </DialogHeader>
          
          {pnlReportData && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="border rounded-lg p-5">
                  <h4 className="font-medium text-muted-foreground mb-4">Current Period</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Revenue</span>
                      <span className="font-medium">₹{pnlReportData.period.grossRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>– Hotel Share</span>
                      <span className="font-medium">₹{pnlReportData.period.hotelShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-primary border-t pt-2">
                      <span className="font-medium">= Our Revenue</span>
                      <span className="font-medium">₹{pnlReportData.period.ourRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>– Expenses</span>
                      <span className="font-medium">₹{pnlReportData.period.expenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="font-bold">= Net Profit</span>
                      <span className={`font-bold text-lg ${pnlReportData.period.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlReportData.period.profit >= 0 ? '+' : '-'}₹{Math.abs(pnlReportData.period.profit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border-2 border-primary/30 rounded-lg p-5 bg-primary/5">
                  <h4 className="font-medium text-primary mb-4">Cumulative (All Time)</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Revenue</span>
                      <span className="font-medium">₹{pnlReportData.cumulative.grossRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>– Hotel Share</span>
                      <span className="font-medium">₹{pnlReportData.cumulative.hotelShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-primary border-t pt-2">
                      <span className="font-medium">= Our Revenue</span>
                      <span className="font-medium">₹{pnlReportData.cumulative.ourRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>– Expenses</span>
                      <span className="font-medium">₹{pnlReportData.cumulative.expenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="font-bold">= Net Profit</span>
                      <span className={`font-bold text-xl ${pnlReportData.cumulative.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlReportData.cumulative.profit >= 0 ? '+' : '-'}₹{Math.abs(pnlReportData.cumulative.profit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Calculation Formula:</p>
                <p>Net Profit = (Gross Revenue × Our Share %) – Expenses</p>
                <p>Share percentages are property-specific and calculated per property before aggregation.</p>
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
