import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import api, { downloadCsv } from '../api';

const today = format(new Date(), 'yyyy-MM-dd');
const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

export default function StockIn() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // --- New Receipt State ---
  const [form, setForm] = useState({
    item_id: '', supplier_id: '', quantity: '',
    unit_price: '', received_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // --- History State ---
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters] = useState({ from: monthAgo, to: today, supplier_id: '', item_id: '', q: '' });

  // Initial data load 
  useEffect(() => {
    api.get('/items/catalog').then(r => setItems(r.data));
    api.get('/suppliers').then(r => setSuppliers(r.data));
  }, []);

  // --- History Effect ---
  // Fetch history initially and whenever filters change
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.supplier_id, filters.item_id]);

  const fetchHistory = () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q'));
    setHistoryLoading(true);
    api.get('/stock-in', { params })
      .then(r => { setHistoryRows(r.data); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  };

  const f = (k, v) => {
    if (k !== 'q') setHistoryLoading(true);
    setFilters(prev => ({ ...prev, [k]: v }));
  };

  const filteredHistory = filters.q ? historyRows.filter(r =>
    r.item_name.toLowerCase().includes(filters.q.toLowerCase()) ||
    (r.supplier_name || '').toLowerCase().includes(filters.q.toLowerCase())
  ) : historyRows;

  const totalQty = filteredHistory.reduce((a, r) => a + parseFloat(r.quantity), 0);

  const exportCsv = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q'));
    try {
      await downloadCsv('/export/stock-in', params, 'stock-in.csv');
    } catch {
      toast.error('Failed to export CSV. No data or server error.');
    }
  };

  // --- New Receipt Actions ---
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onItemChange = (id) => {
    set('item_id', id);
    const item = items.find(i => i.id === parseInt(id));
    setSelectedItem(item || null);
    if (item?.supplier_id) set('supplier_id', String(item.supplier_id));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.item_id || !form.quantity || !form.received_date) {
      return toast.error('Please fill all required fields.');
    }
    setSaving(true);
    try {
      await api.post('/stock-in', form);
      toast.success('✅ Stock received successfully!');
      setForm({ item_id: '', supplier_id: '', quantity: '', unit_price: '', received_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      setSelectedItem(null);
      setIsModalOpen(false); // Close the modal
      fetchHistory(); // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record stock in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">📥 Receive Stock</div>
          <div className="topbar-subtitle">Record and view history of goods received</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>📥 Export CSV</button>
          <button className="btn btn-success btn-sm" onClick={() => setIsModalOpen(true)}>+ New Receipt</button>
        </div>
      </div>

      <div className="page-content" style={{ paddingTop: '16px' }}>
        <div className="filter-bar" style={{ marginTop: '0', paddingLeft: 0, paddingRight: 0, borderBottom: 'none' }}>
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input type="date" className="form-control" value={filters.from} onChange={e => f('from', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input type="date" className="form-control" value={filters.to} onChange={e => f('to', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier</label>
            <select className="form-control" value={filters.supplier_id} onChange={e => f('supplier_id', e.target.value)}>
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Item</label>
            <select className="form-control" value={filters.item_id} onChange={e => f('item_id', e.target.value)}>
              <option value="">All Items</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flexGrow: 1 }}>
            <label className="form-label">Search</label>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input type="text" className="form-control" placeholder="Search item or supplier..." value={filters.q} onChange={e => f('q', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {historyLoading ? 'Loading...' : `${filteredHistory.length} records — Total: ${totalQty.toFixed(2)} units`}
            </div>
          </div>
          {historyLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><p>No records found</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date Received</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Supplier</th>
                    <th>Received By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong style={{ color: 'var(--accent-cyan)' }}>
                          {r.received_date && !isNaN(new Date(r.received_date))
                            ? format(new Date(r.received_date), 'dd MMM yyyy')
                            : '—'}
                        </strong>
                      </td>
                      <td><strong>{r.item_name}</strong></td>
                      <td><span className="badge badge-green">{parseFloat(r.quantity).toFixed(3)} {r.unit}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.unit_price > 0 ? `MMK ${Number(r.unit_price).toLocaleString()}` : '—'}</td>
                      <td>{r.unit_price > 0 ? `MMK ${(r.quantity * r.unit_price).toLocaleString()}` : '—'}</td>
                      <td>{r.supplier_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.received_by_name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL OVERLAY FOR NEW RECEIPT */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Goods Receipt</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit} className="form-grid">
                {/* Date — first and prominent */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label form-required" style={{ fontSize: 13, color: 'var(--accent-cyan)' }}>
                    📅 Received Date
                  </label>
                  <input type="date" className="form-control"
                    style={{ fontSize: 16, padding: '12px 14px', borderColor: 'rgba(6,182,212,0.3)' }}
                    value={form.received_date}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={e => set('received_date', e.target.value)}
                    required
                  />
                  <span className="form-hint">Set the actual date of receipt (can be backdated for accuracy)</span>
                </div>

                <div className="form-grid form-grid-2" style={{ display: 'contents' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label form-required">Stock Item</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select className="form-control" value={form.item_id} onChange={e => onItemChange(e.target.value)} required>
                        <option value="">— Select item —</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      {selectedItem && (
                        <span className="badge badge-blue" style={{ padding: '0 12px', height: '40px' }}>{selectedItem.unit}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label form-required">
                      Quantity {selectedItem && <span style={{ color: 'var(--text-muted)' }}>({selectedItem.unit})</span>}
                    </label>
                    <input type="number" className="form-control" placeholder="0.00"
                      min="0.001" step="0.001" value={form.quantity}
                      onChange={e => set('quantity', e.target.value)} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (MMK)</label>
                    <input type="number" className="form-control" placeholder="0"
                      min="0" step="1" value={form.unit_price}
                      onChange={e => set('unit_price', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Supplier</label>
                    <select className="form-control" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}>
                      <option value="">— No supplier / Walk-in —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" placeholder="e.g. Delivery note number, batch, condition..."
                      value={form.notes} onChange={e => set('notes', e.target.value)} />
                  </div>
                </div>

                {/* Summary */}
                {selectedItem && form.quantity && (
                  <div className="alert alert-info" style={{ flexDirection: 'column', gap: 4 }}>
                    <strong>Receipt Summary</strong>
                    <p>{form.quantity} {selectedItem.unit} of <strong>{selectedItem.name}</strong>{form.unit_price ? ` @ MMK ${Number(form.unit_price).toLocaleString()} = MMK ${(form.quantity * form.unit_price).toLocaleString()}` : ''}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? '⏳ Recording...' : '📥 Record Stock In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
