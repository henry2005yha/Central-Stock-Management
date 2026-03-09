import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

const EMPTY = { name: '', contact: '', phone: '', address: '' };

export default function Suppliers() {

  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data || []);
    } catch {
      toast.error('Failed to load suppliers');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setForm(EMPTY);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setForm({
      name: s.name || '',
      contact: s.contact || '',
      phone: s.phone || '',
      address: s.address || ''
    });
    setEditId(s.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(EMPTY);
    setEditId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {

      if (editId) {
        await api.put(`/suppliers/${editId}`, form);
        toast.success('Supplier updated.');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier added.');
      }

      closeModal();
      load();

    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const del = async (id) => {

    if (!window.confirm('Delete this supplier?')) return;

    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete supplier.');
    }
  };

  const filtered = suppliers.filter(s => {
    const name = (s.name || '').toLowerCase();
    const contact = (s.contact || '').toLowerCase();
    const q = search.toLowerCase();

    return name.includes(q) || contact.includes(q);
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">🏭 Suppliers</div>
          <div className="topbar-subtitle">Manage supplier directory</div>
        </div>

        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          + Add Supplier
        </button>
      </div>

      <div className="filter-bar" style={{ padding: '12px 22px' }}>
        <div className="form-group search-box" style={{ minWidth: 280 }}>
          <label className="form-label">Search</label>
          <span className="search-icon">🔍</span>

          <input
            className="form-control"
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="page-content">

        <div className="card">

          <div className="card-header">
            <div className="card-title">{filtered.length} suppliers</div>
          </div>

          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>#</th>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {filtered.map((s, idx) => (

                  <tr key={s.id}>

                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {idx + 1}
                    </td>

                    <td><strong>{s.name}</strong></td>

                    <td>{s.contact || '—'}</td>

                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {s.phone || '—'}
                    </td>

                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>
                      {s.address || '—'}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>

                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEdit(s)}
                        >
                          ✏️
                        </button>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => del(s.id)}
                        >
                          🗑️
                        </button>

                      </div>
                    </td>

                  </tr>

                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon">🏭</div>
                        <p>No suppliers found</p>
                      </div>
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {modalOpen && (

        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && closeModal()}
        >

          <div className="modal">

            <div className="modal-header">
              <h3>{editId ? 'Edit Supplier' : 'Add Supplier'}</h3>

              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={submit}>

              <div className="modal-body">

                <div className="form-grid" style={{ gap: 14 }}>

                  <div className="form-group">
                    <label className="form-label form-required">
                      Supplier Name
                    </label>

                    <input
                      className="form-control"
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Person</label>

                    <input
                      className="form-control"
                      value={form.contact}
                      onChange={e => set('contact', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>

                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="+95 9 xxx xxx xxx"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Address</label>

                    <textarea
                      className="form-control"
                      value={form.address}
                      onChange={e => set('address', e.target.value)}
                      style={{ minHeight: 60 }}
                    />
                  </div>

                </div>

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '⏳ Saving...' : editId ? 'Save Changes' : 'Add Supplier'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>
  );
}

