import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
//test development
//testing
const EMPTY = { name: '', location: '', manager_name: '' };

export default function Kitchens() {
  const [kitchens, setKitchens] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/kitchens');
        setKitchens(res.data);
      } catch (err) {
        toast.error('Failed to load kitchens');
      }
    };

    load();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (k) => { setForm({ name: k.name, location: k.location || '', manager_name: k.manager_name || '' }); setEditId(k.id); setModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) await api.put(`/kitchens/${editId}`, form);
      else await api.post('/kitchens', form);
      toast.success(editId ? 'Kitchen updated.' : 'Kitchen added.');
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
    finally { setLoading(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this kitchen?')) return;
    try { await api.delete(`/kitchens/${id}`); toast.success('Deleted.'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Cannot delete.'); }
  };

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">🍳 Kitchens</div><div className="topbar-subtitle">Manage the 5 delivery destination kitchens</div></div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Kitchen</button>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {kitchens.map((k, idx) => (
            <div key={k.id} className="card" style={{ cursor: 'default' }}>
              <div style={{ padding: '20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: ['rgba(59,130,246,0.15)', 'rgba(16,185,129,0.15)', 'rgba(139,92,246,0.15)', 'rgba(245,158,11,0.15)', 'rgba(6,182,212,0.15)'][idx % 5],
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                }}>🍳</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>📍 {k.location || 'No location'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👤 {k.manager_name || 'No manager'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(k)}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(k.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
          {kitchens.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">🍳</div><p>No kitchens yet</p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Edit Kitchen' : 'Add Kitchen'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-grid" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label form-required">Kitchen Name</label>
                    <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Kitchen A – Main Branch" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="form-control" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Ground Floor, Building A" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manager Name</label>
                    <input className="form-control" value={form.manager_name} onChange={e => set('manager_name', e.target.value)} placeholder="e.g. Aung Ko Ko" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '⏳' : editId ? 'Save' : 'Add Kitchen'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
