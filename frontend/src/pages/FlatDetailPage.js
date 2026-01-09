import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/utils/api';
import { ArrowLeft, Plus, Pencil, Trash2, Users, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EXPENSE_CATEGORIES = [
  'rent',
  'maintenance',
  'maid',
  'food',
  'cleaning',
  'repairs',
  'other',
];

const FlatDetailPage = () => {
  const { flatId } = useParams();
  const navigate = useNavigate();
  const [flat, setFlat] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [tenantForm, setTenantForm] = useState({ name: '', rent_amount: '' });
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [flatId]);

  const fetchData = async () => {
    try {
      const [flatRes, tenantsRes, expensesRes] = await Promise.all([
        api.get(`/flats/${flatId}`),
        api.get(`/tenants?flat_id=${flatId}`),
        api.get(`/expenses?flat_id=${flatId}`),
      ]);
      setFlat(flatRes.data);
      setTenants(tenantsRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      toast.error('Failed to load flat details');
      navigate('/flats');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...tenantForm,
        rent_amount: parseFloat(tenantForm.rent_amount),
        flat_id: flatId,
      };
      if (editingTenant) {
        await api.put(`/tenants/${editingTenant.id}`, payload);
        toast.success('Tenant updated');
      } else {
        await api.post('/tenants', payload);
        toast.success('Tenant added');
      }
      setTenantDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        flat_id: flatId,
        date: new Date(expenseForm.date).toISOString(),
      };
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense added');
      }
      setExpenseDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (!window.confirm('Delete this tenant?')) return;
    try {
      await api.delete(`/tenants/${tenantId}`);
      toast.success('Tenant deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete tenant');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const openTenantDialog = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setTenantForm({ name: tenant.name, rent_amount: tenant.rent_amount });
    } else {
      setEditingTenant(null);
      setTenantForm({ name: '', rent_amount: '' });
    }
    setTenantDialogOpen(true);
  };

  const openExpenseDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: new Date(expense.date).toISOString().split('T')[0],
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setExpenseDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const totalIncome = tenants.reduce((sum, t) => sum + t.rent_amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalIncome - totalExpenses;
  const profitPercentage = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  return (
    <div className="space-y-6" data-testid="flat-detail-page">
      {/* Header */}
      <div>
        <Button
          onClick={() => navigate('/flats')}
          variant="outline"
          className="mb-4"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Flats
        </Button>
        <h1 className="text-3xl font-heading font-bold text-slate-900">{flat.name}</h1>
        <p className="text-slate-600 mt-1">{flat.address}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Tenants</p>
          <p className="text-2xl font-heading font-bold text-slate-900">{tenants.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Total Income</p>
          <p className="text-2xl font-mono font-bold text-blue-600">₹{totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Total Expenses</p>
          <p className="text-2xl font-mono font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Profit ({profitPercentage.toFixed(1)}%)</p>
          <p className={`text-2xl font-mono font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{profit.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tenants" className="w-full">
        <TabsList>
          <TabsTrigger value="tenants" data-testid="tenants-tab">Tenants</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="expenses-tab">Expenses</TabsTrigger>
        </TabsList>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-heading font-semibold">Tenants ({tenants.length})</h2>
            <Button
              onClick={() => openTenantDialog()}
              className="bg-primary hover:bg-primary/90"
              data-testid="add-tenant-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Tenant
            </Button>
          </div>

          {tenants.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No tenants added yet</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Rent Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} data-testid={`tenant-row-${tenant.id}`}>
                      <td className="px-6 py-4">{tenant.name}</td>
                      <td className="px-6 py-4 font-mono">₹{tenant.rent_amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openTenantDialog(tenant)}
                            variant="outline"
                            size="sm"
                            data-testid={`edit-tenant-${tenant.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            data-testid={`delete-tenant-${tenant.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-heading font-semibold">Expenses ({expenses.length})</h2>
            <Button
              onClick={() => openExpenseDialog()}
              className="bg-primary hover:bg-primary/90"
              data-testid="add-expense-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {expenses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <IndianRupee className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {expenses.map((expense) => (
                    <tr key={expense.id} data-testid={`expense-row-${expense.id}`}>
                      <td className="px-6 py-4 text-sm">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 capitalize">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{expense.description}</td>
                      <td className="px-6 py-4 font-mono">₹{expense.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openExpenseDialog(expense)}
                            variant="outline"
                            size="sm"
                            data-testid={`edit-expense-${expense.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteExpense(expense.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            data-testid={`delete-expense-${expense.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Tenant Dialog */}
      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent data-testid="tenant-dialog">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTenantSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="tenant-name">Name</Label>
                <Input
                  id="tenant-name"
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  required
                  data-testid="tenant-name-input"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tenant-rent">Monthly Rent</Label>
                <Input
                  id="tenant-rent"
                  type="number"
                  step="0.01"
                  value={tenantForm.rent_amount}
                  onChange={(e) => setTenantForm({ ...tenantForm, rent_amount: e.target.value })}
                  required
                  data-testid="tenant-rent-input"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTenantDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="save-tenant-button">
                {editingTenant ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent data-testid="expense-dialog">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="expense-category">Category</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                  required
                >
                  <SelectTrigger className="mt-1" data-testid="expense-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense-description">Description</Label>
                <Input
                  id="expense-description"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                  data-testid="expense-description-input"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                  data-testid="expense-amount-input"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  required
                  data-testid="expense-date-input"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="save-expense-button">
                {editingExpense ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlatDetailPage;
