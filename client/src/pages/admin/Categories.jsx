import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../services/categories';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function AdminCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', icon: 'wrench', description: '' });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try {
      const data = await listCategories();
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCategory(editingId, form);
        toast('Category updated');
      } else {
        await createCategory(form);
        toast('Category created');
      }
      setForm({ name: '', icon: 'wrench', description: '' });
      setEditingId(null);
      await load();
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setForm({
      name: cat.name,
      icon: cat.icon || 'wrench',
      description: cat.description || '',
    });
  };

  const remove = async (id) => {
    if (!confirm('Delete category?')) return;
    await deleteCategory(id);
    toast('Category deleted', 'info');
    await load();
  };

  return (
    <div>
      <form onSubmit={submit} className="surface mb-5 grid gap-3 rounded-2xl p-4 md:grid-cols-2">
        <Input
          label="Category name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Icon key"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
        />
        <Input
          className="md:col-span-2"
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">{editingId ? 'Update category' : 'Add category'}</Button>
          {editingId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setForm({ name: '', icon: 'wrench', description: '' });
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {loading && <p className="text-sm text-ink-soft">Loading categories…</p>}
        {!loading && !categories.length && (
          <p className="text-sm text-ink-soft">No categories yet. Add one above.</p>
        )}
        {categories.map((cat) => (
          <div key={cat._id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <p className="font-bold">{cat.name}</p>
              <p className="text-sm text-ink-soft">
                {cat.slug} · {cat.description || 'No description'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="!py-2 !text-sm" onClick={() => startEdit(cat)}>
                Edit
              </Button>
              <Button variant="ghost" className="!py-2 !text-sm" onClick={() => remove(cat._id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
