import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/utils/api';
import { Building2, Users, TrendingUp, DollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:border-primary/50 transition-colors duration-200">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-${color}-50`}>
        <Icon className={`w-6 h-6 text-${color}-600`} style={{ color: color }} />
      </div>
      {trend && (
        <span className="text-sm text-green-600 font-medium">+{trend}%</span>
      )}
    </div>
    <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
    <p className="text-2xl font-heading font-bold text-slate-900">{value}</p>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats || stats.total_flats === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-heading font-semibold text-slate-900 mb-2">
          No Flats Added Yet
        </h2>
        <p className="text-slate-600 mb-6">Start by adding your first PG flat</p>
        <Button
          onClick={() => navigate('/flats')}
          className="bg-primary hover:bg-primary/90"
          data-testid="add-first-flat-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Flat
        </Button>
      </div>
    );
  }

  const chartData = stats.flats_summary.map((fs) => ({
    name: fs.flat.name,
    income: fs.total_income,
    expenses: fs.total_expenses,
    profit: fs.profit,
  }));

  const pieData = [
    { name: 'Income', value: stats.total_income, color: '#3b82f6' },
    { name: 'Expenses', value: stats.total_expenses, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Flats"
          value={stats.total_flats}
          icon={Building2}
          color="#3b82f6"
        />
        <StatCard
          title="Total Tenants"
          value={stats.total_tenants}
          icon={Users}
          color="#10b981"
        />
        <StatCard
          title="Total Profit"
          value={`₹${stats.total_profit.toFixed(2)}`}
          icon={TrendingUp}
          color="#10b981"
        />
        <StatCard
          title="Avg Profit %"
          value={`${stats.average_profit_percentage.toFixed(2)}%`}
          icon={DollarSign}
          color="#f59e0b"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-heading font-semibold text-slate-900 mb-4">
            Income vs Expenses by Flat
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

        {/* Pie Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-heading font-semibold text-slate-900 mb-4">
            Overall Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ₹${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Flats Summary Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-heading font-semibold text-slate-900">
            Flats Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Flat Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Tenants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Income
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Profit %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stats.flats_summary.map((fs) => (
                <tr
                  key={fs.flat.id}
                  className="hover:bg-slate-50 transition-colors"
                  data-testid={`flat-row-${fs.flat.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{fs.flat.name}</div>
                    <div className="text-sm text-slate-500">{fs.flat.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {fs.tenant_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                    ₹{fs.total_income.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                    ₹{fs.total_expenses.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-green-600">
                    ₹{fs.profit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold">
                    <span
                      className={`${
                        fs.profit_percentage > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {fs.profit_percentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      onClick={() => navigate(`/flats/${fs.flat.id}`)}
                      variant="outline"
                      size="sm"
                      data-testid={`view-flat-${fs.flat.id}`}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
