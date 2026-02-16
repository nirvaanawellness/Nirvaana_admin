import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Minus, BarChart3, Target,
  ArrowLeft, RefreshCw, Info, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend
} from 'recharts';
import AppHeader from '@/components/shared/AppHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatCurrency = (value) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isForecast = data.isForecast;
    
    return (
      <div className="glass rounded-lg p-4 shadow-lg border border-primary/10">
        <p className="font-medium text-foreground mb-2">
          {label} {isForecast && <span className="text-amber-600">(Forecast)</span>}
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            Revenue: <span className="text-foreground font-medium">
              ₹{data.revenue?.toLocaleString('en-IN')}
            </span>
          </p>
          <p className="text-muted-foreground">
            Services: <span className="text-foreground font-medium">
              {data.services}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const Analytics = ({ user, onLogout }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/forecast`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForecast(response.data);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError('Failed to load forecast data');
      toast.error('Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data from historical + forecast
  const chartData = forecast ? [
    ...(forecast.historical_data || []).map(d => ({
      month: d.label,
      revenue: d.revenue || 0,
      services: d.services || 0,
      isForecast: false
    })),
    ...(forecast.forecast_label ? [{
      month: forecast.forecast_label,
      revenue: forecast.predicted_revenue || 0,
      services: forecast.predicted_services || 0,
      isForecast: true
    }] : [])
  ] : [];

  // Check if we have meaningful data (method !== insufficient_data)
  const hasData = forecast && forecast.method !== 'insufficient_data';
  const forecastLabel = forecast?.forecast_label || 
    (forecast ? `${forecast.forecast_year}-${String(forecast.forecast_month).padStart(2, '0')}` : '');

  const getTrendIcon = () => {
    if (!forecast || !forecast.trend) return <Minus className="w-5 h-5" />;
    if (forecast.trend === 'growing') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (forecast.trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!forecast || !forecast.trend) return 'text-muted-foreground';
    if (forecast.trend === 'growing') return 'text-green-600';
    if (forecast.trend === 'declining') return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getConfidenceColor = () => {
    if (!forecast) return 'bg-gray-100 text-gray-600';
    if (forecast.confidence === 'high') return 'bg-green-100 text-green-700';
    if (forecast.confidence === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="min-h-screen bg-background" data-testid="analytics-page">
      <AppHeader user={user} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back Button & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-serif text-foreground">Revenue Analytics</h1>
              <p className="text-sm text-muted-foreground">Forecast & trend analysis</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchForecast} 
            disabled={loading}
            className="gap-2"
            data-testid="refresh-forecast-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading forecast data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="glass rounded-2xl p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <Info className="w-8 h-8 text-red-500" />
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchForecast} variant="outline">Try Again</Button>
            </div>
          </div>
        ) : forecast ? (
          <>
            {/* Insufficient Data Message */}
            {!hasData && (
              <div className="glass rounded-2xl p-6 border-l-4 border-amber-500 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Insufficient Data</h4>
                    <p className="text-sm text-muted-foreground">
                      There isn't enough historical sales data to generate an accurate forecast. 
                      The prediction below is based on limited data and may not be reliable.
                      Add more service entries to improve forecast accuracy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Forecast Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Next Month Forecast */}
              <div className="glass rounded-2xl p-6 md:col-span-2" data-testid="forecast-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Forecast for {new Date(forecast.forecast_year, forecast.forecast_month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <h2 className="text-3xl font-serif text-foreground">
                      ₹{(forecast.predicted_revenue || 0).toLocaleString('en-IN')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      ~{forecast.predicted_services || 0} services expected
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor()}`}>
                      {(forecast.confidence || 'unknown').toUpperCase()} confidence
                    </span>
                    {hasData && (
                      <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                        {getTrendIcon()}
                        <span className="text-sm font-medium">
                          {(forecast.growth_rate_percent || 0) > 0 ? '+' : ''}{forecast.growth_rate_percent || 0}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trend Card */}
              <div className="glass rounded-2xl p-6" data-testid="trend-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Trend</span>
                </div>
                <p className={`text-xl font-medium capitalize ${getTrendColor()}`}>
                  {forecast.trend || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on 6-month analysis
                </p>
              </div>

              {/* Method Card */}
              <div className="glass rounded-2xl p-6" data-testid="method-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">Method</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {hasData ? 'Weighted Moving Average' : 'Insufficient Data'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasData ? '+ Linear Regression' : 'Add more entries'}
                </p>
              </div>
            </div>

            {/* Revenue Forecast Chart */}
            <div className="glass rounded-2xl p-6" data-testid="forecast-chart">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Revenue Forecast</h3>
                  <p className="text-sm text-muted-foreground">
                    Historical data + next month prediction
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-muted-foreground">Historical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-muted-foreground">Forecast</span>
                  </div>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B89D62" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#B89D62" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#6B5E55', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e5e5' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6B5E55', fontSize: 12 }}
                      tickFormatter={formatCurrency}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e5e5' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {forecastLabel && (
                      <ReferenceLine 
                        x={forecastLabel} 
                        stroke="#f59e0b" 
                        strokeDasharray="5 5"
                        label={{ value: 'Forecast', fill: '#f59e0b', fontSize: 11 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#B89D62"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.isForecast) {
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={6} 
                              fill="#f59e0b" 
                              stroke="#fff" 
                              strokeWidth={2}
                            />
                          );
                        }
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill="#B89D62" 
                            stroke="#fff" 
                            strokeWidth={2}
                          />
                        );
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Data Table */}
            <div className="glass rounded-2xl p-6" data-testid="historical-data">
              <h3 className="text-lg font-medium text-foreground mb-4">Historical Data</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary/10">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Month</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Services</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg/Service</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(forecast.historical_data || []).map((data, idx) => (
                      <tr key={idx} className="border-b border-primary/5 hover:bg-primary/5 transition-colors">
                        <td className="py-3 px-4 text-foreground">{data.label}</td>
                        <td className="py-3 px-4 text-right text-foreground font-medium">
                          ₹{(data.revenue || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">{data.services || 0}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {data.services > 0 
                            ? `₹${Math.round(data.revenue / data.services).toLocaleString('en-IN')}`
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                    {/* Forecast Row */}
                    <tr className="bg-amber-50/50 font-medium">
                      <td className="py-3 px-4 text-amber-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {forecastLabel}
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Forecast
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-amber-700">
                        ₹{(forecast.predicted_revenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-600">~{forecast.predicted_services || 0}</td>
                      <td className="py-3 px-4 text-right text-amber-600">
                        {forecast.predicted_services > 0 
                          ? `₹${Math.round((forecast.predicted_revenue || 0) / forecast.predicted_services).toLocaleString('en-IN')}`
                          : '-'
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Methodology Info - Only show if we have meaningful data */}
            {hasData && (
              <div className="glass rounded-2xl p-6 border-l-4 border-primary/50" data-testid="methodology-info">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Forecast Methodology</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This forecast uses a <strong>Weighted Moving Average combined with Linear Regression</strong>. 
                      Recent months are weighted more heavily (60% regression, 40% weighted average). 
                      The confidence level is based on historical data consistency - lower variance means higher confidence.
                    </p>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="bg-primary/5 rounded-lg p-3">
                        <span className="text-muted-foreground">Weighted Avg Forecast</span>
                        <p className="text-foreground font-medium mt-1">
                          ₹{(forecast.weighted_avg_forecast || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-3">
                        <span className="text-muted-foreground">Regression Forecast</span>
                        <p className="text-foreground font-medium mt-1">
                          ₹{(forecast.regression_forecast || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-3">
                        <span className="text-muted-foreground">Combined (Final)</span>
                        <p className="text-foreground font-medium mt-1">
                          ₹{(forecast.predicted_revenue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
                      <p className="text-foreground font-medium mt-1">
                        ₹{forecast.regression_forecast.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-3">
                      <span className="text-muted-foreground">Combined (Final)</span>
                      <p className="text-foreground font-medium mt-1">
                        ₹{forecast.predicted_revenue.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="glass rounded-2xl p-12 flex items-center justify-center">
            <p className="text-muted-foreground">No forecast data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
