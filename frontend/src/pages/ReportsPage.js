import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/utils/api';
import { Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchReport();
  }, []);

  const getDateRange = () => {
    const now = new Date();
    let startDate = null;
    let endDate = now.toISOString();

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate).toISOString() : null;
        endDate = customEndDate ? new Date(customEndDate).toISOString() : endDate;
        break;
      default:
        startDate = null;
    }

    return { startDate, endDate };
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await api.get(`/dashboard?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!stats) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Mother Homes PG Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryY = 48;
    doc.text(`Total Flats: ${stats.total_flats}`, 14, summaryY);
    doc.text(`Total Tenants: ${stats.total_tenants}`, 14, summaryY + 6);
    doc.text(`Total Income: ₹${stats.total_income.toFixed(2)}`, 14, summaryY + 12);
    doc.text(`Total Expenses: ₹${stats.total_expenses.toFixed(2)}`, 14, summaryY + 18);
    doc.text(`Total Profit: ₹${stats.total_profit.toFixed(2)}`, 14, summaryY + 24);
    doc.text(`Average Profit %: ${stats.average_profit_percentage.toFixed(2)}%`, 14, summaryY + 30);

    // Flats Details Table
    const tableData = stats.flats_summary.map((fs) => [
      fs.flat.name,
      fs.tenant_count.toString(),
      `₹${fs.total_income.toFixed(2)}`,
      `₹${fs.total_expenses.toFixed(2)}`,
      `₹${fs.profit.toFixed(2)}`,
      `${fs.profit_percentage.toFixed(2)}%`,
    ]);

    doc.autoTable({
      startY: summaryY + 40,
      head: [['Flat Name', 'Tenants', 'Income', 'Expenses', 'Profit', 'Profit %']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [20, 83, 45], textColor: 255 },
      styles: { fontSize: 9 },
    });

    // Save PDF
    doc.save(`mother-homes-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report generated successfully!');
  };

  if (loading && !stats) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const chartData = stats?.flats_summary.map((fs) => ({
    name: fs.flat.name,
    income: fs.total_income,
    expenses: fs.total_expenses,
    profit: fs.profit,
  })) || [];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold text-slate-900">Reports & Analytics</h1>
        <Button
          onClick={handleGeneratePDF}
          disabled={!stats || stats.total_flats === 0}
          className="bg-primary hover:bg-primary/90"
          data-testid="download-pdf-button"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-heading font-semibold text-slate-900 mb-4">Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="date-range">Period</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="mt-1" data-testid="date-range-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === 'custom' && (
            <>
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="mt-1"
                  data-testid="start-date-input"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="mt-1"
                  data-testid="end-date-input"
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <Button
              onClick={fetchReport}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
              data-testid="apply-filter-button"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? 'Loading...' : 'Apply Filter'}
            </Button>
          </div>
        </div>
      </div>

      {stats && stats.total_flats > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm text-slate-600 mb-2">Total Income</h3>
              <p className="text-3xl font-mono font-bold text-blue-600">
                ₹{stats.total_income.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm text-slate-600 mb-2">Total Expenses</h3>
              <p className="text-3xl font-mono font-bold text-red-600">
                ₹{stats.total_expenses.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm text-slate-600 mb-2">Net Profit</h3>
              <p
                className={`text-3xl font-mono font-bold ${
                  stats.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ₹{stats.total_profit.toFixed(2)}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {stats.average_profit_percentage.toFixed(2)}% profit margin
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-4">
                Income vs Expenses
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#3b82f6" name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-heading font-semibold text-slate-900 mb-4">
                Profit Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-heading font-semibold text-slate-900">
                Detailed Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Flat Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Tenants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Income
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Expenses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                      Profit %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.flats_summary.map((fs) => (
                    <tr key={fs.flat.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{fs.flat.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{fs.flat.address}</td>
                      <td className="px-6 py-4 text-sm">{fs.tenant_count}</td>
                      <td className="px-6 py-4 font-mono text-sm">₹{fs.total_income.toFixed(2)}</td>
                      <td className="px-6 py-4 font-mono text-sm">₹{fs.total_expenses.toFixed(2)}</td>
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-green-600">
                        ₹{fs.profit.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-semibold">
                        <span
                          className={`${
                            fs.profit_percentage > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {fs.profit_percentage.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <p className="text-slate-600">No data available for the selected period</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
