import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api';

export default function StockOut() {
  const [items, setItems] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState({
    item_id: '', kitchen_id: '', quantity: '',
    dispatch_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/items/catalog').then(r => setItems(r.data));
    api.get('/kitchens').then(r => setKitchens(r.data));
  }, []);

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
    setLoading(true);
    try {
      await api.post('/stock-out', form);
      toast.success('✅ Stock dispatched successfully!');
      setForm({ item_id: '', kitchen_id: '', quantity: '', dispatch_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      setBalance(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record dispatch.');
    } finally {
      setLoading(false);
    }
  };

  const stockPct = balance ? Math.min(100, (parseFloat(balance.current_stock) / Math.max(parseFloat(balance.total_in || 1), 1)) * 100) : 0;
  const stockClass = balance ? (parseFloat(balance.current_stock) <= parseFloat(balance.min_stock_level) ? 'critical' : stockPct < 30 ? 'low' : 'ok') : 'ok';

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">📤 Dispatch Stock</div>
          <div className="topbar-subtitle">Record stock dispatched to kitchen with exact date</div>
        </div>
        <a href="/stock-out/history" className="btn btn-outline btn-sm">📑 View History</a>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">New Dispatch</div>
              {balance && (
                <span className={`badge ${parseFloat(balance.current_stock) <= 0 ? 'badge-red' : balance.is_low_stock ? 'badge-amber' : 'badge-green'}`}>
                  Stock: {parseFloat(balance.current_stock).toFixed(1)} {balance.unit}
                </span>
              )}
            </div>
            <div className="card-body">
              <form onSubmit={submit} className="form-grid">
                {/* Date */}
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

                {/* Stock level bar */}
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

                <button type="submit" className="btn btn-primary" disabled={loading || isInsufficient}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {loading ? '⏳ Recording...' : '📤 Record Dispatch'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
