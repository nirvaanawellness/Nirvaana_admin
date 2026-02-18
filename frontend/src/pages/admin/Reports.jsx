import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  FileText, Building2, DollarSign, TrendingUp, TrendingDown,
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
import AppHeader from '@/components/shared/AppHeader';

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
 * - For "Our Property" (owned): 100% revenue to Nirvaana, no split
 * 
 * Settlement Logic:
 * 1. Calculate each party's expected BASE share from total base revenue
 * 2. Calculate each party's GST liability based on their base share
 * 3. Compare expected (base + GST) with actual collected (gross)
 * 4. Settlement = Expected Total - Actually Collected
 */
const calculateGSTAwareSettlement = (services, hotelSharePercent, isOurProperty = false) => {
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
  
  // For "Our Property" - 100% goes to Nirvaana
  if (isOurProperty) {
    return {
      baseRevenue: totals.baseRevenue,
      gstCollected: totals.gstCollected,
      grossRevenue: totals.grossRevenue,
      
      // Hotel gets nothing
      hotelBaseShare: 0,
      hotelGSTLiability: 0,
      hotelExpectedTotal: 0,
      hotelCollectedGross: totals.hotelCollectedGross,
      hotelSettlement: null, // N/A
      
      // Nirvaana gets everything
      nirvaanaBaseShare: totals.baseRevenue,
      nirvaanaGSTLiability: totals.gstCollected,
      nirvaanaExpectedTotal: totals.grossRevenue,
      nirvaanaCollectedGross: totals.nirvaanaCollectedGross,
      nirvaanaSettlement: null, // N/A
      
      isOurProperty: true
    };
  }
  
  // Step 2: Calculate expected BASE shares (share % applied to BASE only)
  const hotelBaseShare = totals.baseRevenue * (hotelSharePercent / 100);
  const nirvaanaBaseShare = totals.baseRevenue * (1 - hotelSharePercent / 100);
  
  // Step 3: Calculate GST liability proportionate to base share
  // Each party's GST liability = Their Base Share × GST Rate (5%)
  const hotelGSTLiability = hotelBaseShare * 0.05;
  const nirvaanaGSTLiability = nirvaanaBaseShare * 0.05;
  
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

  // Check if property is "Our Property" (100% owned)
  const isPropertyOwned = (propertyId) => {
    const prop = properties.find(p => p.hotel_name === propertyId || p.id === propertyId);
    return prop?.ownership_type === 'our_property';
  };

  // Get count of active properties for expense distribution
  const activePropertiesCount = useMemo(() => {
    return properties.filter(p => p.status !== 'archived').length;
  }, [properties]);

  /**
   * CORRECTED SUMMARY CALCULATION
   * 
   * Key Changes:
   * - Revenue share % applied ONLY on Base Amount (excluding GST)
   * - GST is tracked separately and NOT included in profit calculation
   * - Profit = Our Base Share - Expenses
   * - "Other" expenses are distributed equally across all active properties
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
      const isOwned = isPropertyOwned(propId);
      const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent, isOwned);
      
      totalBaseRevenue += settlement.baseRevenue;
      totalGstCollected += settlement.gstCollected;
      totalGrossRevenue += settlement.grossRevenue;
      totalHotelBaseShare += settlement.hotelBaseShare;
      totalNirvaanaBaseShare += settlement.nirvaanaBaseShare;
    });
    
    // Sum expenses (including distributed "Other" expenses)
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
      const isOwned = isPropertyOwned(service.property_id);
      const hotelSharePercent = isOwned ? 0 : getPropertyShare(service.property_id);
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
  }, [services, expenses, selectedYear, selectedMonth, selectedQuarter, selectedProperties, properties]);

  // Property chart data with GST-aware calculations
  // Also calculates distributed "Other" expenses
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
    
    // Calculate total SHARED expenses (expenses without property_id) for distribution
    // These are expenses like "Website Development" that benefit all properties equally
    const sharedExpensesTotal = expenses
      .filter(e => !e.property_id || e.property_id === '' || e.property_id === 'SHARED')
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate distributed shared expense per active property
    const distributedSharedExpense = activePropertiesCount > 0 
      ? sharedExpensesTotal / activePropertiesCount 
      : 0;
    
    // Calculate GST-aware data per property
    const chartItems = Object.entries(byProperty).map(([propId, propServices]) => {
      const isOwned = isPropertyOwned(propId);
      const hotelSharePercent = isOwned ? 0 : getPropertyShare(propId);
      const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent, isOwned);
      
      // Get expenses directly linked to this property
      const propExpenses = expenses
        .filter(e => e.property_id === propId)
        .reduce((sum, e) => sum + e.amount, 0);
      
      // Total expenses for this property = direct expenses + distributed shared expenses
      const totalPropertyExpenses = propExpenses + distributedSharedExpense;
      
      return {
        name: propId,
        baseRevenue: settlement.baseRevenue,
        gstCollected: settlement.gstCollected,
        grossRevenue: settlement.grossRevenue,
        ourBaseShare: settlement.nirvaanaBaseShare,
        hotelBaseShare: settlement.hotelBaseShare,
        expenses: totalPropertyExpenses,
        directExpenses: propExpenses,
        distributedExpenses: distributedSharedExpense,
        hotelSharePercent,
        isOurProperty: isOwned
      };
    });
    
    return chartItems;
  }, [services, expenses, properties, activePropertiesCount]);

  /**
   * GENERATE SALES REPORT WITH FULL GST-AWARE BREAKDOWN
   * 
   * Shows per property:
   * 1. Base Revenue (Excl. GST)
   * 2. GST Collected
   * 3. Gross Revenue (Incl. GST)
   * 4. Share % (N/A for Our Property)
   * 5. Hotel Expected (Base) - N/A for Our Property
   * 6. Hotel GST Liability - N/A for Our Property
   * 7. Hotel Total Expected - N/A for Our Property
   * 8. Hotel Received (Actual)
   * 9. Our Expected (Base)
   * 10. Our GST Liability
   * 11. Our Total Expected
   * 12. Our Received (Actual)
   * 13. Settlement Amount - N/A for Our Property
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
      const isOwned = prop?.ownership_type === 'our_property';
      const hotelSharePercent = isOwned ? 0 : (prop?.revenue_share_percentage || 50);
      
      const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent, isOwned);
      
      return {
        property_name: prop?.hotel_name || propId,
        ownership_type: isOwned ? 'our_property' : 'outside_property',
        hotel_share_percent: hotelSharePercent,
        
        // Revenue breakdown
        base_revenue: settlement.baseRevenue,
        gst_collected: settlement.gstCollected,
        gross_revenue: settlement.grossRevenue,
        
        // Hotel breakdown (N/A for owned properties)
        hotel_base_expected: isOwned ? null : settlement.hotelBaseShare,
        hotel_gst_liability: isOwned ? null : settlement.hotelGSTLiability,
        hotel_total_expected: isOwned ? null : settlement.hotelExpectedTotal,
        hotel_received: settlement.hotelCollectedGross,
        
        // Nirvaana breakdown
        our_base_expected: settlement.nirvaanaBaseShare,
        our_gst_liability: settlement.nirvaanaGSTLiability,
        our_total_expected: settlement.nirvaanaExpectedTotal,
        our_received: settlement.nirvaanaCollectedGross,
        
        // Settlement (N/A for owned properties)
        hotel_settlement: isOwned ? null : settlement.hotelSettlement,
        our_settlement: isOwned ? null : settlement.nirvaanaSettlement,
        
        isOurProperty: isOwned
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
   * GENERATE P&L REPORT WITH THREE SEGMENTS:
   * 1. Selection Based - Based on current filters (Year, Month, Quarter, Property)
   * 2. Current Period - Current month only (1st to today)
   * 3. All Time - Cumulative since business started
   * 
   * Profit = Our BASE Share - Expenses (GST excluded)
   */
  const generatePnlReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Get current month date range
      const today = new Date();
      const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const currentMonthEnd = today.toISOString().split('T')[0];
      
      // Fetch all data
      const [allServicesRes, allExpensesRes, currentMonthServicesRes, currentMonthExpensesRes] = await Promise.all([
        axios.get(`${API}/services`, { headers }),
        axios.get(`${API}/expenses`, { headers }),
        axios.get(`${API}/services?date_from=${currentMonthStart}&date_to=${currentMonthEnd}`, { headers }),
        axios.get(`${API}/expenses?date_from=${currentMonthStart}&date_to=${currentMonthEnd}`, { headers })
      ]);
      
      const allServices = allServicesRes.data;
      const allExpenses = allExpensesRes.data;
      const currentMonthServices = currentMonthServicesRes.data;
      const currentMonthExpenses = currentMonthExpensesRes.data;
      
      // Helper function to calculate P&L for a set of services/expenses
      const calculatePnL = (servicesData, expensesData) => {
        const byProperty = {};
        
        servicesData.forEach(service => {
          const propId = service.property_id;
          if (!byProperty[propId]) {
            byProperty[propId] = [];
          }
          byProperty[propId].push(service);
        });
        
        let baseRevenue = 0;
        let gstCollected = 0;
        let grossRevenue = 0;
        let hotelBaseShare = 0;
        let nirvaanaBaseShare = 0;
        
        Object.entries(byProperty).forEach(([propId, propServices]) => {
          const isOwned = isPropertyOwned(propId);
          const hotelSharePercent = isOwned ? 0 : getPropertyShare(propId);
          const settlement = calculateGSTAwareSettlement(propServices, hotelSharePercent, isOwned);
          
          baseRevenue += settlement.baseRevenue;
          gstCollected += settlement.gstCollected;
          grossRevenue += settlement.grossRevenue;
          hotelBaseShare += settlement.hotelBaseShare;
          nirvaanaBaseShare += settlement.nirvaanaBaseShare;
        });
        
        const totalExpenses = expensesData.reduce((sum, e) => sum + e.amount, 0);
        const profit = nirvaanaBaseShare - totalExpenses;
        
        return {
          baseRevenue,
          gstCollected,
          grossRevenue,
          hotelBaseShare,
          ourBaseShare: nirvaanaBaseShare,
          expenses: totalExpenses,
          profit,
          serviceCount: servicesData.length
        };
      };
      
      // Calculate for all three segments
      const selectionPnL = {
        baseRevenue: summary.baseRevenue,
        gstCollected: summary.gstCollected,
        grossRevenue: summary.grossRevenue,
        hotelBaseShare: summary.hotelBaseShare,
        ourBaseShare: summary.nirvaanaBaseShare,
        expenses: summary.totalExpenses,
        profit: summary.nirvaanaBaseShare - summary.totalExpenses,
        serviceCount: summary.transactionCount
      };
      
      const currentPeriodPnL = calculatePnL(currentMonthServices, currentMonthExpenses);
      const allTimePnL = calculatePnL(allServices, allExpenses);
      
      // Get the date range label for selection
      const { from, to } = getDateRange();
      const selectionLabel = selectedQuarter 
        ? `${selectedQuarter} ${selectedYear}`
        : `${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
      
      setPnlReportData({
        selection: {
          ...selectionPnL,
          label: selectionLabel,
          dateRange: `${from} to ${to}`,
          properties: selectedProperties.length > 0 ? selectedProperties.join(', ') : 'All Properties'
        },
        currentPeriod: {
          ...currentPeriodPnL,
          label: `${MONTHS.find(m => m.value === today.getMonth() + 1)?.label} ${today.getFullYear()}`,
          dateRange: `${currentMonthStart} to ${currentMonthEnd}`
        },
        allTime: {
          ...allTimePnL,
          label: 'All Time',
          dateRange: 'Since business started'
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
      'Property', 'Ownership Type', 'Share %', 
      'Base Revenue', 'GST Collected', 'Gross Revenue',
      'Hotel Base Expected', 'Hotel GST Liability', 'Hotel Total Expected', 'Hotel Received',
      'Our Base Expected', 'Our GST Liability', 'Our Total Expected', 'Our Received',
      'To Pay Hotel', 'To Pay Nirvaana'
    ];
    
    const rows = salesReportData.map(p => {
      const isOwned = p.isOurProperty;
      // Settlement: Positive means they need to receive (other owes them)
      const toPayHotel = !isOwned && p.hotel_settlement > 0 ? p.hotel_settlement : 0;
      const toPayNirvaana = !isOwned && p.our_settlement > 0 ? p.our_settlement : 0;
      
      return [
        p.property_name, 
        isOwned ? 'Owned (100%)' : 'Split Model',
        isOwned ? '100%' : `${p.hotel_share_percent}%`, 
        p.base_revenue.toFixed(2),
        p.gst_collected.toFixed(2),
        p.gross_revenue.toFixed(2),
        isOwned ? 'N/A' : (p.hotel_base_expected || 0).toFixed(2),
        isOwned ? 'N/A' : (p.hotel_gst_liability || 0).toFixed(2),
        isOwned ? 'N/A' : (p.hotel_total_expected || 0).toFixed(2),
        p.hotel_received.toFixed(2),
        p.our_base_expected.toFixed(2),
        p.our_gst_liability.toFixed(2),
        p.our_total_expected.toFixed(2),
        p.our_received.toFixed(2),
        isOwned ? 'N/A' : (toPayHotel > 0 ? toPayHotel.toFixed(2) : 'NA'),
        isOwned ? 'N/A' : (toPayNirvaana > 0 ? toPayNirvaana.toFixed(2) : 'NA')
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
    const headers = ['Metric', 'Selection Based', 'Current Period', 'All Time'];
    const rows = [
      ['Period', pnlReportData.selection.label, pnlReportData.currentPeriod.label, pnlReportData.allTime.label],
      ['Date Range', pnlReportData.selection.dateRange, pnlReportData.currentPeriod.dateRange, pnlReportData.allTime.dateRange],
      ['Properties', pnlReportData.selection.properties, 'All Properties', 'All Properties'],
      ['Transactions', pnlReportData.selection.serviceCount, pnlReportData.currentPeriod.serviceCount, pnlReportData.allTime.serviceCount],
      ['Base Revenue (Excl. GST)', pnlReportData.selection.baseRevenue.toFixed(2), pnlReportData.currentPeriod.baseRevenue.toFixed(2), pnlReportData.allTime.baseRevenue.toFixed(2)],
      ['GST Collected', pnlReportData.selection.gstCollected.toFixed(2), pnlReportData.currentPeriod.gstCollected.toFixed(2), pnlReportData.allTime.gstCollected.toFixed(2)],
      ['Gross Revenue (Incl. GST)', pnlReportData.selection.grossRevenue.toFixed(2), pnlReportData.currentPeriod.grossRevenue.toFixed(2), pnlReportData.allTime.grossRevenue.toFixed(2)],
      ['Hotel Base Share', pnlReportData.selection.hotelBaseShare.toFixed(2), pnlReportData.currentPeriod.hotelBaseShare.toFixed(2), pnlReportData.allTime.hotelBaseShare.toFixed(2)],
      ['Our Base Share', pnlReportData.selection.ourBaseShare.toFixed(2), pnlReportData.currentPeriod.ourBaseShare.toFixed(2), pnlReportData.allTime.ourBaseShare.toFixed(2)],
      ['Expenses', pnlReportData.selection.expenses.toFixed(2), pnlReportData.currentPeriod.expenses.toFixed(2), pnlReportData.allTime.expenses.toFixed(2)],
      ['Net Profit (Our Base Share - Expenses)', pnlReportData.selection.profit.toFixed(2), pnlReportData.currentPeriod.profit.toFixed(2), pnlReportData.allTime.profit.toFixed(2)]
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

  const headerRightContent = (
    <Button variant="ghost" size="sm" onClick={handleReset} className="text-[#B89D62]/80 hover:text-[#B89D62] hover:bg-[#B89D62]/10" data-testid="reset-filters-button">
      <RotateCcw className="w-4 h-4 mr-2" strokeWidth={1.5} />
      Reset
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} showBack={true} backTo="/admin" title="Reports" rightContent={headerRightContent} />

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
            <p className="text-xs text-muted-foreground mt-1">5% GST</p>
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

        {/* Property Bar Chart with GST-aware data - Improved Grouped Bar Chart */}
        {chartData.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-foreground">Our Base Share vs Expenses by Property</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#B89D62]"></div> Base Share
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#ef4444]"></div> Expenses
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barCategoryGap="20%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value, name) => [`₹${value.toLocaleString()}`, name]}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.name === label);
                    return item?.isOurProperty ? `${label} (Owned)` : label;
                  }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Bar 
                  dataKey="ourBaseShare" 
                  name="Our Base Share" 
                  fill="#B89D62" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Bar 
                  dataKey="expenses" 
                  name="Expenses" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
            {/* Show distributed expense note if applicable */}
            {chartData.some(d => d.distributedExpenses > 0) && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                * "Other" expenses (₹{chartData[0]?.distributedExpenses?.toFixed(0) || 0}) distributed equally across all active properties
              </p>
            )}
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

      {/* Sales Report Dialog - Full GST-Aware Breakdown */}
      <Dialog open={salesReportDialog} onOpenChange={setSalesReportDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Sales Report - GST-Separated Settlement</DialogTitle>
          </DialogHeader>
          
          {salesReportData && (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-1.5 font-semibold" rowSpan={2}>Property</th>
                      <th className="text-center py-2 px-1.5 font-semibold" rowSpan={2}>Share %</th>
                      <th className="text-center py-2 px-1.5 bg-gray-100 font-semibold" colSpan={3}>Revenue Breakdown</th>
                      <th className="text-center py-2 px-1.5 bg-amber-50 font-semibold" colSpan={4}>Hotel</th>
                      <th className="text-center py-2 px-1.5 bg-primary/10 font-semibold" colSpan={4}>Nirvaana</th>
                      <th className="text-center py-2 px-1.5 bg-green-50 font-semibold" rowSpan={2}>Settlement</th>
                    </tr>
                    <tr className="border-b bg-muted/20 text-[10px]">
                      <th className="text-right py-1.5 px-1.5 bg-gray-50">Base</th>
                      <th className="text-right py-1.5 px-1.5 bg-gray-50">GST</th>
                      <th className="text-right py-1.5 px-1.5 bg-gray-50">Gross</th>
                      <th className="text-right py-1.5 px-1.5 bg-amber-50/50">Base Exp</th>
                      <th className="text-right py-1.5 px-1.5 bg-amber-50/50">GST Liab</th>
                      <th className="text-right py-1.5 px-1.5 bg-amber-50/50">Total Exp</th>
                      <th className="text-right py-1.5 px-1.5 bg-amber-50/50">Received</th>
                      <th className="text-right py-1.5 px-1.5 bg-primary/5">Base Exp</th>
                      <th className="text-right py-1.5 px-1.5 bg-primary/5">GST Liab</th>
                      <th className="text-right py-1.5 px-1.5 bg-primary/5">Total Exp</th>
                      <th className="text-right py-1.5 px-1.5 bg-primary/5">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReportData.map((p, i) => {
                      // Settlement: Positive hotel_settlement = Nirvaana owes Hotel
                      // Positive our_settlement = Hotel owes Nirvaana
                      const isOwned = p.isOurProperty;
                      const settlementAmount = p.hotel_settlement !== null ? Math.abs(p.hotel_settlement) : 0;
                      const settlementDirection = !isOwned && p.hotel_settlement > 0.5 ? 'pay_hotel' : !isOwned && p.hotel_settlement < -0.5 ? 'pay_nirvaana' : isOwned ? 'owned' : 'settled';
                      
                      return (
                        <tr key={i} className={`border-b hover:bg-muted/20 ${isOwned ? 'bg-green-50/30' : ''}`}>
                          <td className="py-2 px-1.5 font-medium">
                            <div className="flex items-center gap-2">
                              {p.property_name}
                              {isOwned && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-green-100 text-green-700">Owned</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1.5 text-center">
                            {isOwned ? (
                              <span className="text-green-600 text-[10px]">100%</span>
                            ) : (
                              `${p.hotel_share_percent}%`
                            )}
                          </td>
                          
                          {/* Revenue Breakdown */}
                          <td className="py-2 px-1.5 text-right bg-gray-50/50">₹{p.base_revenue.toFixed(0)}</td>
                          <td className="py-2 px-1.5 text-right bg-gray-50/50 text-blue-600">₹{p.gst_collected.toFixed(0)}</td>
                          <td className="py-2 px-1.5 text-right bg-gray-50/50 font-medium">₹{p.gross_revenue.toFixed(0)}</td>
                          
                          {/* Hotel Columns - N/A for owned properties */}
                          <td className="py-2 px-1.5 text-right bg-amber-50/30">
                            {isOwned ? <span className="text-muted-foreground text-[10px]">N/A</span> : `₹${p.hotel_base_expected?.toFixed(0) || 0}`}
                          </td>
                          <td className="py-2 px-1.5 text-right bg-amber-50/30 text-blue-600">
                            {isOwned ? <span className="text-muted-foreground text-[10px]">N/A</span> : `₹${p.hotel_gst_liability?.toFixed(0) || 0}`}
                          </td>
                          <td className="py-2 px-1.5 text-right bg-amber-50/30 font-medium">
                            {isOwned ? <span className="text-muted-foreground text-[10px]">N/A</span> : `₹${p.hotel_total_expected?.toFixed(0) || 0}`}
                          </td>
                          <td className="py-2 px-1.5 text-right bg-amber-50/30">₹{p.hotel_received.toFixed(0)}</td>
                          
                          {/* Nirvaana Columns */}
                          <td className="py-2 px-1.5 text-right bg-primary/5">₹{p.our_base_expected.toFixed(0)}</td>
                          <td className="py-2 px-1.5 text-right bg-primary/5 text-blue-600">₹{p.our_gst_liability.toFixed(0)}</td>
                          <td className="py-2 px-1.5 text-right bg-primary/5 font-medium">₹{p.our_total_expected.toFixed(0)}</td>
                          <td className="py-2 px-1.5 text-right bg-primary/5">₹{p.our_received.toFixed(0)}</td>
                          
                          {/* Settlement - N/A for owned properties */}
                          <td className="py-2 px-1.5 text-right bg-green-50/50 font-medium">
                            {isOwned ? (
                              <span className="text-green-600 text-[10px]">N/A</span>
                            ) : settlementDirection === 'pay_hotel' ? (
                              <span className="text-amber-700">→ Hotel ₹{settlementAmount.toFixed(0)}</span>
                            ) : settlementDirection === 'pay_nirvaana' ? (
                              <span className="text-primary">→ Us ₹{settlementAmount.toFixed(0)}</span>
                            ) : (
                              <span className="text-green-600">Settled</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/30 font-medium text-xs">
                      <td className="py-2 px-1.5">Total</td>
                      <td className="py-2 px-1.5"></td>
                      <td className="py-2 px-1.5 text-right bg-gray-100">₹{salesReportData.reduce((sum, p) => sum + p.base_revenue, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-gray-100 text-blue-600">₹{salesReportData.reduce((sum, p) => sum + p.gst_collected, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-gray-100 font-bold">₹{salesReportData.reduce((sum, p) => sum + p.gross_revenue, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-amber-100/50">₹{salesReportData.reduce((sum, p) => sum + (p.hotel_base_expected || 0), 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-amber-100/50 text-blue-600">₹{salesReportData.reduce((sum, p) => sum + (p.hotel_gst_liability || 0), 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-amber-100/50 font-bold">₹{salesReportData.reduce((sum, p) => sum + (p.hotel_total_expected || 0), 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-amber-100/50">₹{salesReportData.reduce((sum, p) => sum + p.hotel_received, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-primary/10">₹{salesReportData.reduce((sum, p) => sum + p.our_base_expected, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-primary/10 text-blue-600">₹{salesReportData.reduce((sum, p) => sum + p.our_gst_liability, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-primary/10 font-bold">₹{salesReportData.reduce((sum, p) => sum + p.our_total_expected, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-primary/10">₹{salesReportData.reduce((sum, p) => sum + p.our_received, 0).toFixed(0)}</td>
                      <td className="py-2 px-1.5 text-right bg-green-100/50"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Legend & Explanation */}
              <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Settlement Explanation:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Base Exp:</strong> Expected share of BASE revenue (Share % applied on Base Amount only)</li>
                  <li><strong>GST Liab:</strong> GST liability proportionate to base share (Base Share × 5%)</li>
                  <li><strong>Total Exp:</strong> Expected TOTAL = Base Expected + GST Liability</li>
                  <li><strong>Received:</strong> Actual GROSS amount collected by each party</li>
                  <li><strong>Settlement:</strong> Difference between Expected Total and Received</li>
                  <li><strong className="text-green-600">Owned Properties:</strong> 100% revenue to Nirvaana - No hotel share or settlement applicable</li>
                </ul>
                <p className="pt-2 border-t border-border/50">
                  <strong>→ Hotel:</strong> Nirvaana needs to pay Hotel • <strong>→ Us:</strong> Hotel needs to pay Nirvaana • <strong className="text-green-600">N/A:</strong> Not applicable (owned property)
                </p>
              </div>
              
              <DialogFooter>
                <Button onClick={downloadSalesReport} data-testid="download-sales-report">
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

      {/* P&L Report Dialog - Three Segments: Selection, Current Period, All Time */}
      <Dialog open={pnlReportDialog} onOpenChange={setPnlReportDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Profit & Loss Report - GST Separated</DialogTitle>
          </DialogHeader>
          
          {pnlReportData && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Segment 1: Selection Based */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
                  <div className="mb-3">
                    <h4 className="font-semibold text-blue-700">Selection Based</h4>
                    <p className="text-xs text-muted-foreground">{pnlReportData.selection.label}</p>
                    <p className="text-[10px] text-muted-foreground">{pnlReportData.selection.dateRange}</p>
                    <p className="text-[10px] text-muted-foreground">{pnlReportData.selection.properties}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Revenue</span>
                      <span className="font-medium">₹{pnlReportData.selection.baseRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>GST (5%)</span>
                      <span className="font-medium">₹{pnlReportData.selection.gstCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Gross Revenue</span>
                      <span className="font-medium">₹{pnlReportData.selection.grossRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 border-t pt-1">
                      <span>Hotel Share</span>
                      <span className="font-medium">₹{pnlReportData.selection.hotelBaseShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Our Share</span>
                      <span className="font-medium">₹{pnlReportData.selection.ourBaseShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600 border-t pt-1">
                      <span>− Expenses</span>
                      <span className="font-medium">₹{pnlReportData.selection.expenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t-2 pt-2">
                      <span className="font-bold">Net Profit</span>
                      <span className={`font-bold text-lg ${pnlReportData.selection.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlReportData.selection.profit >= 0 ? '+' : '-'}₹{Math.abs(pnlReportData.selection.profit).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      {pnlReportData.selection.serviceCount} transactions
                    </div>
                  </div>
                </div>
                
                {/* Segment 2: Current Period (This Month) */}
                <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50/30">
                  <div className="mb-3">
                    <h4 className="font-semibold text-amber-700">Current Period</h4>
                    <p className="text-xs text-muted-foreground">{pnlReportData.currentPeriod.label}</p>
                    <p className="text-[10px] text-muted-foreground">{pnlReportData.currentPeriod.dateRange}</p>
                    <p className="text-[10px] text-muted-foreground">All Properties</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Revenue</span>
                      <span className="font-medium">₹{pnlReportData.currentPeriod.baseRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>GST (5%)</span>
                      <span className="font-medium">₹{pnlReportData.currentPeriod.gstCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Gross Revenue</span>
                      <span className="font-medium">₹{pnlReportData.currentPeriod.grossRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 border-t pt-1">
                      <span>Hotel Share</span>
                      <span className="font-medium">₹{pnlReportData.currentPeriod.hotelBaseShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Our Share</span>
                      <span className="font-medium">₹{pnlReportData.currentPeriod.ourBaseShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600 border-t pt-1">
                      <span>− Expenses</span>
                      <span className="font-medium">₹{pnlReportData.currentPeriod.expenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t-2 pt-2">
                      <span className="font-bold">Net Profit</span>
                      <span className={`font-bold text-lg ${pnlReportData.currentPeriod.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlReportData.currentPeriod.profit >= 0 ? '+' : '-'}₹{Math.abs(pnlReportData.currentPeriod.profit).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      {pnlReportData.currentPeriod.serviceCount} transactions
                    </div>
                  </div>
                </div>
                
                {/* Segment 3: All Time */}
                <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5">
                  <div className="mb-3">
                    <h4 className="font-semibold text-primary">All Time</h4>
                    <p className="text-xs text-muted-foreground">{pnlReportData.allTime.label}</p>
                    <p className="text-[10px] text-muted-foreground">{pnlReportData.allTime.dateRange}</p>
                    <p className="text-[10px] text-muted-foreground">All Properties</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Revenue</span>
                      <span className="font-medium">₹{pnlReportData.allTime.baseRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>GST (5%)</span>
                      <span className="font-medium">₹{pnlReportData.allTime.gstCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Gross Revenue</span>
                      <span className="font-medium">₹{pnlReportData.allTime.grossRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 border-t pt-1">
                      <span>Hotel Share</span>
                      <span className="font-medium">₹{pnlReportData.allTime.hotelBaseShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Our Share</span>
                      <span className="font-medium">₹{pnlReportData.allTime.ourBaseShare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600 border-t pt-1">
                      <span>− Expenses</span>
                      <span className="font-medium">₹{pnlReportData.allTime.expenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t-2 pt-2">
                      <span className="font-bold">Net Profit</span>
                      <span className={`font-bold text-xl ${pnlReportData.allTime.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlReportData.allTime.profit >= 0 ? '+' : '-'}₹{Math.abs(pnlReportData.allTime.profit).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      {pnlReportData.allTime.serviceCount} transactions
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground">
                <p className="font-medium mb-2 text-foreground">Calculation Formula (GST-Aware):</p>
                <div className="space-y-1">
                  <p>1. <strong>Hotel Base Share</strong> = Base Revenue × Hotel Share %</p>
                  <p>2. <strong>Our Base Share</strong> = Base Revenue × (100% − Hotel Share %)</p>
                  <p>3. <strong>Net Profit</strong> = Our Base Share − Expenses</p>
                </div>
                <p className="mt-2 pt-2 border-t border-border/50 text-amber-700">
                  <strong>Important:</strong> GST is NOT included in profit calculation. Revenue share % is applied only on Base Amount.
                </p>
              </div>
              
              <DialogFooter>
                <Button onClick={downloadPnlReport} data-testid="download-pnl-report">
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
