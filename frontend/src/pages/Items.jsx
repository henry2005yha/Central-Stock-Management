import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, { downloadCsv } from '../api';

const UNITS = ['kg', 'g', 'litre', 'ml', 'pcs', 'bottle', 'can', 'box', 'bag', 'pack'];
const CATEGORIES = ['Grain', 'Meat', 'Seafood', 'Vegetable', 'Fruit', 'Oil', 'Dairy', 'Condiment', 'Spice', 'Beverage', 'Other'];

const EMPTY = { name: '', category: '', unit: 'kg', min_stock_level: '', supplier_id: '' };

export default function Items() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/items').then(r => setItems(r.data));
    api.get('/suppliers').then(r => setSuppliers(r.data));
  };
  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal('add'); };
  const openEdit = (item) => {
    setForm({ name: item.item_name, category: item.category || '', unit: item.unit, min_stock_level: item.min_stock_level, supplier_id: item.supplier_id || '' });
    setEditId(item.item_id);
    setModal('edit');
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) await api.put(`/items/${editId}`, form);
      else await api.post('/items', form);
      toast.success(editId ? 'Item updated.' : 'Item added.');
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
    finally { setLoading(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try { await api.delete(`/items/${id}`); toast.success('Deleted.'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Cannot delete.'); }
  };

  const exportCsv = async () => {
    try {
      await downloadCsv('/export/stock-balance', {}, 'stock-balance.csv');
    } catch {
      toast.error('Failed to export CSV.');
    }
  };

  const filtered = items.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()) || (i.category || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">📦 Items Catalog</div><div className="topbar-subtitle">Manage stock items and view real-time balances</div></div>
        <div className="topbar-actions">
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>📥 Export</button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Item</button>
        </div>
      </div>
      <div className="filter-bar" style={{ padding: '12px 22px' }}>
        <div className="form-group" style={{ minWidth: 280 }}>
          <label className="form-label">Search</label>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input className="form-control" placeholder="Search by name or category..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="card-title">{filtered.length} items</div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Unit</th><th>Total In</th><th>Total Out</th><th>Current Stock</th><th>Min Level</th><th>Supplier</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.item_id} className={i.is_low_stock ? 'low-stock-row' : ''}>
                    <td><strong>{i.item_name}</strong></td>
                    <td><span className="badge badge-blue">{i.category || '—'}</span></td>
                    <td>{i.unit}</td>
                    <td style={{ color: '#34d399' }}>{parseFloat(i.total_in || 0).toFixed(2)}</td>
                    <td style={{ color: '#c4b5fd' }}>{parseFloat(i.total_out || 0).toFixed(2)}</td>
                    <td><strong style={{ fontSize: 15, color: i.is_low_stock ? '#fbbf24' : 'var(--text-primary)' }}>{parseFloat(i.current_stock).toFixed(3)}</strong></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{parseFloat(i.min_stock_level).toFixed(1)}</td>
                    <td style={{ fontSize: 12 }}>{i.supplier_name || '—'}</td>
                    <td>{i.is_low_stock ? <span className="badge badge-amber">Low</span> : <span className="badge badge-green">OK</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(i)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(i.item_id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add New Item' : 'Edit Item'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label form-required">Item Name</label>
                    <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                      <option value="">— None —</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label form-required">Unit</label>
                    <select className="form-control" value={form.unit} onChange={e => set('unit', e.target.value)} required>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Stock Level</label>
                    <input type="number" className="form-control" min="0" step="0.001" value={form.min_stock_level} onChange={e => set('min_stock_level', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Supplier</label>
                    <select className="form-control" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                      <option value="">— None —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '⏳' : modal === 'add' ? 'Add Item' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
