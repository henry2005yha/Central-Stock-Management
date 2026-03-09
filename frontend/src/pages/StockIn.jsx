import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api';

export default function StockIn() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({
    item_id: '', supplier_id: '', quantity: '',
    unit_price: '', received_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    api.get('/items/catalog').then(r => setItems(r.data));
    api.get('/suppliers').then(r => setSuppliers(r.data));
  }, []);

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
    setLoading(true);
    try {
      await api.post('/stock-in', form);
      toast.success('✅ Stock received successfully!');
      setForm({ item_id: '', supplier_id: '', quantity: '', unit_price: '', received_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      setSelectedItem(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record stock in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">📥 Receive Stock</div>
          <div className="topbar-subtitle">Record goods received from supplier with exact date</div>
        </div>
        <a href="/stock-in/history" className="btn btn-outline btn-sm">📋 View History</a>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">New Goods Receipt</div>
              {selectedItem && (
                <span className="badge badge-blue">{selectedItem.unit}</span>
              )}
            </div>
            <div className="card-body">
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
                    <select className="form-control" value={form.item_id} onChange={e => onItemChange(e.target.value)} required>
                      <option value="">— Select item —</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
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

                <button type="submit" className="btn btn-success" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {loading ? '⏳ Recording...' : '📥 Record Stock In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
