import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/utils/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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

const FlatsPage = () => {
  const navigate = useNavigate();
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    rent_amount: '',
  });

  useEffect(() => {
    fetchFlats();
  }, []);

  const fetchFlats = async () => {
    try {
      const response = await api.get('/flats');
      setFlats(response.data);
    } catch (error) {
      toast.error('Failed to load flats');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (flat = null) => {
    if (flat) {
      setEditingFlat(flat);
      setFormData({
        name: flat.name,
        address: flat.address,
        rent_amount: flat.rent_amount,
      });
    } else {
      setEditingFlat(null);
      setFormData({ name: '', address: '', rent_amount: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFlat) {
        await api.put(`/flats/${editingFlat.id}`, {
          ...formData,
          rent_amount: parseFloat(formData.rent_amount),
        });
        toast.success('Flat updated successfully');
      } else {
        await api.post('/flats', {
          ...formData,
          rent_amount: parseFloat(formData.rent_amount),
        });
        toast.success('Flat added successfully');
      }
      setDialogOpen(false);
      fetchFlats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (flatId) => {
    if (!window.confirm('Are you sure you want to delete this flat? All tenants and expenses will be removed.')) {
      return;
    }
    try {
      await api.delete(`/flats/${flatId}`);
      toast.success('Flat deleted successfully');
      fetchFlats();
    } catch (error) {
      toast.error('Failed to delete flat');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6" data-testid="flats-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold text-slate-900">Flats Management</h1>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-primary hover:bg-primary/90"
          data-testid="add-flat-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Flat
        </Button>
      </div>

      {flats.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <h2 className="text-xl font-heading font-semibold text-slate-900 mb-2">
            No Flats Yet
          </h2>
          <p className="text-slate-600 mb-6">Add your first flat to get started</p>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-primary hover:bg-primary/90"
            data-testid="add-first-flat-empty"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Flat
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flats.map((flat) => (
            <div
              key={flat.id}
              className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:border-primary/50 transition-colors duration-200"
              data-testid={`flat-card-${flat.id}`}
            >
              <h3 className="text-xl font-heading font-semibold text-slate-900 mb-2">
                {flat.name}
              </h3>
              <p className="text-sm text-slate-600 mb-4">{flat.address}</p>
              <div className="mb-4">
                <span className="text-sm text-slate-600">Rent Amount:</span>
                <p className="text-lg font-mono font-semibold text-slate-900">
                  ₹{flat.rent_amount.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/flats/${flat.id}`)}
                  variant="outline"
                  className="flex-1"
                  data-testid={`view-flat-${flat.id}`}
                >
                  View Details
                </Button>
                <Button
                  onClick={() => handleOpenDialog(flat)}
                  variant="outline"
                  size="icon"
                  data-testid={`edit-flat-${flat.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(flat.id)}
                  variant="outline"
                  size="icon"
                  className="text-red-600 hover:bg-red-50"
                  data-testid={`delete-flat-${flat.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="flat-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingFlat ? 'Edit Flat' : 'Add New Flat'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Flat Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Flat A, Green Villa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="flat-name-input"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main St, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  data-testid="flat-address-input"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rent_amount">Monthly Rent Amount</Label>
                <Input
                  id="rent_amount"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 15000"
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                  required
                  data-testid="flat-rent-input"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-testid="cancel-flat-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                data-testid="save-flat-button"
              >
                {editingFlat ? 'Update' : 'Add'} Flat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlatsPage;
