import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import api, { downloadCsv } from '../api';

const today = format(new Date(), 'yyyy-MM-dd');
const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

export default function StockOut() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [kitchens, setKitchens] = useState([]);

  // --- New Dispatch State ---
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState({
    item_id: '', kitchen_id: '', quantity: '',
    dispatch_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  const [saving, setSaving] = useState(false);

  // --- History State ---
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters] = useState({ from: monthAgo, to: today, kitchen_id: '', item_id: '', q: '' });

  // Initial load
  useEffect(() => {
    api.get('/items/catalog').then(r => setItems(r.data));
    api.get('/kitchens').then(r => setKitchens(r.data));
  }, []);

  // History Effect
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.kitchen_id, filters.item_id]);

  const fetchHistory = () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q'));
    setHistoryLoading(true);
    api.get('/stock-out', { params })
      .then(r => { setHistoryRows(r.data); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  };

  const f = (k, v) => {
    if (k !== 'q') setHistoryLoading(true);
    setFilters(prev => ({ ...prev, [k]: v }));
  };

  const filteredHistory = filters.q ? historyRows.filter(r =>
    r.item_name.toLowerCase().includes(filters.q.toLowerCase()) ||
    r.kitchen_name.toLowerCase().includes(filters.q.toLowerCase())
  ) : historyRows;

  const totalQty = filteredHistory.reduce((a, r) => a + parseFloat(r.quantity), 0);

  // Kitchen breakdown for history page
  const kitchenBreakdown = kitchens.map(k => ({
    ...k,
    total: filteredHistory.filter(r => r.kitchen_id === k.id).reduce((a, r) => a + parseFloat(r.quantity), 0)
  })).filter(k => k.total > 0).sort((a, b) => b.total - a.total);

  const exportCsv = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q'));
    try {
      await downloadCsv('/export/stock-out', params, 'stock-out.csv');
    } catch {
      toast.error('Failed to export CSV. No data or server error.');
    }
  };

  // --- New Dispatch Actions ---
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onItemChange = async (id) => {
    set('item_id', id);
    if (id) {
      try {
        const r = await api.get(`/items/${id}`);
        setBalance(r.data);
      } catch { setBalance(null); }
    } else setBalance(null);
  };

  const selectedItem = items.find(i => i.id === parseInt(form.item_id));
  const isInsufficient = balance && form.quantity && parseFloat(form.quantity) > parseFloat(balance.current_stock);

  const submit = async (e) => {
    e.preventDefault();
    if (isInsufficient) return toast.error(`Insufficient stock. Available: ${parseFloat(balance.current_stock).toFixed(3)} ${balance.unit}`);
    setSaving(true);
    try {
      await api.post('/stock-out', form);
      toast.success('✅ Stock dispatched successfully!');
      setForm({ item_id: '', kitchen_id: '', quantity: '', dispatch_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      setBalance(null);
      setIsModalOpen(false); // Close Modal
      fetchHistory(); // Refresh history
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record dispatch.');
    } finally {
      setSaving(false);
    }
  };

  const stockPct = balance ? Math.min(100, (parseFloat(balance.current_stock) / Math.max(parseFloat(balance.total_in || 1), 1)) * 100) : 0;
  const stockClass = balance ? (parseFloat(balance.current_stock) <= parseFloat(balance.min_stock_level) ? 'critical' : stockPct < 30 ? 'low' : 'ok') : 'ok';

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">📤 Dispatch Stock</div>
          <div className="topbar-subtitle">Record and view history of stock dispatched to kitchens</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>📥 Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>+ New Dispatch</button>
        </div>
      </div>

      <div className="page-content" style={{ display: 'grid', gap: 20, paddingTop: '16px' }}>
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
            <label className="form-label">Kitchen</label>
            <select className="form-control" value={filters.kitchen_id} onChange={e => f('kitchen_id', e.target.value)}>
              <option value="">All Kitchens</option>
              {kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
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
              <input type="text" className="form-control" placeholder="Search item or kitchen..." value={filters.q} onChange={e => f('q', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Kitchen breakdown mini-cards */}
        {kitchenBreakdown.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {kitchenBreakdown.map(k => (
              <div key={k.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center'
              }}>
                <span>🍳</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{k.name.split('–')[0].trim()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.total.toFixed(1)} units</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {historyLoading ? 'Loading...' : `${filteredHistory.length} records — Total dispatched: ${totalQty.toFixed(2)} units`}
            </div>
          </div>
          {historyLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📑</div><p>No records found</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Dispatch Date</th><th>Item</th><th>Quantity</th><th>Kitchen</th><th>Dispatched By</th><th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong style={{ color: 'var(--accent-purple)' }}>
                          {r.dispatch_date && !isNaN(new Date(r.dispatch_date))
                            ? format(new Date(r.dispatch_date), 'dd MMM yyyy')
                            : '—'}
                        </strong>
                      </td>
                      <td><strong>{r.item_name}</strong></td>
                      <td><span className="badge badge-purple">{parseFloat(r.quantity).toFixed(3)} {r.unit}</span></td>
                      <td>{r.kitchen_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.dispatched_by_name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL OVERLAY FOR NEW DISPATCH */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Dispatch</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit} className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label form-required" style={{ fontSize: 13, color: 'var(--accent-purple)' }}>
                    📅 Dispatch Date
                  </label>
                  <input type="date" className="form-control"
                    style={{ fontSize: 16, padding: '12px 14px', borderColor: 'rgba(139,92,246,0.3)' }}
                    value={form.dispatch_date}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={e => set('dispatch_date', e.target.value)}
                    required
                  />
                  <span className="form-hint">Set the actual date of dispatch (can be backdated for accuracy)</span>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label form-required">Stock Item</label>
                  <select className="form-control" value={form.item_id} onChange={e => onItemChange(e.target.value)} required>
                    <option value="">— Select item —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                </div>

                {balance && (
                  <div style={{ gridColumn: '1 / -1', padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>Current Stock</span>
                      <span style={{ fontWeight: 700 }}>{parseFloat(balance.current_stock).toFixed(3)} {balance.unit} (min: {parseFloat(balance.min_stock_level).toFixed(1)})</span>
                    </div>
                    <div className="stock-bar-wrap">
                      <div className={`stock-bar ${stockClass}`} style={{ width: `${stockPct}%` }} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label form-required">
                    Quantity {selectedItem && <span style={{ color: 'var(--text-muted)' }}>({selectedItem.unit})</span>}
                  </label>
                  <input type="number" className="form-control"
                    style={{ borderColor: isInsufficient ? 'var(--accent-red)' : undefined }}
                    placeholder="0.00" min="0.001" step="0.001"
                    value={form.quantity} onChange={e => set('quantity', e.target.value)} required
                  />
                  {isInsufficient && (
                    <span className="form-hint" style={{ color: 'var(--accent-red)' }}>
                      ⚠️ Exceeds available stock ({parseFloat(balance.current_stock).toFixed(3)} {balance.unit})
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label form-required">Destination Kitchen</label>
                  <select className="form-control" value={form.kitchen_id} onChange={e => set('kitchen_id', e.target.value)} required>
                    <option value="">— Select kitchen —</option>
                    {kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" placeholder="e.g. Requested by, purpose, delivery person..."
                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', gridColumn: '1 / -1' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving || isInsufficient} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? '⏳ Recording...' : '📤 Record Dispatch'}
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
