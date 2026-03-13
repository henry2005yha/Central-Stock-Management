import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { downloadCsv } from '../api';

export default function Audit() {
  const [stockItems, setStockItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ item_id: '', actual_qty: '', notes: '', audit_date: format(new Date(), 'yyyy-MM-dd') });
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/items').then(r => setStockItems(r.data));
    api.get('/audits').then(r => setHistory(r.data));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onItemChange = async (id) => {
    set('item_id', id);
    if (id) {
      const item = stockItems.find(i => i.item_id === parseInt(id));
      setSelectedBalance(item || null);
    } else setSelectedBalance(null);
  };

  const diff = selectedBalance && form.actual_qty !== ''
    ? parseFloat(form.actual_qty) - parseFloat(selectedBalance.current_stock)
    : null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/audits', form);
      toast.success('✅ Audit recorded successfully!');
      const [items, audits] = await Promise.all([api.get('/items'), api.get('/audits')]);
      setStockItems(items.data);
      setHistory(audits.data);
      setForm({ item_id: '', actual_qty: '', notes: '', audit_date: format(new Date(), 'yyyy-MM-dd') });
      setSelectedBalance(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record audit.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      await downloadCsv('/export/audits', {}, 'audits.csv');
    } catch {
      toast.error('Failed to export CSV.');
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">🔍 Stock Audit</div>
          <div className="topbar-subtitle">Compare physical count vs system quantity and log discrepancies</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportCsv}>📥 Export CSV</button>
      </div>
      <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Form */}
        <div className="card">
          <div className="card-header"><div className="card-title">New Audit Entry</div></div>
          <div className="card-body">
            <form onSubmit={submit} className="form-grid">
              <div className="form-group">
                <label className="form-label form-required" style={{ color: 'var(--accent-cyan)' }}>📅 Audit Date</label>
                <input type="date" className="form-control"
                  value={form.audit_date} onChange={e => set('audit_date', e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')} required
                  style={{ fontSize: 15, borderColor: 'rgba(6,182,212,0.3)' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label form-required">Select Item</label>
                <select className="form-control" value={form.item_id} onChange={e => onItemChange(e.target.value)} required>
                  <option value="">— Select item to audit —</option>
                  {stockItems.map(i => (
                    <option key={i.item_id} value={i.item_id}>
                      {i.item_name} ({parseFloat(i.current_stock).toFixed(2)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBalance && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>System expects:</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-blue)' }}>
                    {parseFloat(selectedBalance.current_stock).toFixed(3)} {selectedBalance.unit}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedBalance.item_name}</div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label form-required">Physical Count (Actual Qty)</label>
                <input type="number" className="form-control" placeholder="Enter actual physical count"
                  min="0" step="0.001" value={form.actual_qty}
                  onChange={e => set('actual_qty', e.target.value)} required
                  style={{ fontSize: 16 }}
                />
              </div>

              {diff !== null && (
                <div className={`alert ${diff === 0 ? 'alert-info' : diff > 0 ? 'alert-info' : 'alert-error'}`}>
                  <div>
                    <strong>Difference: {diff > 0 ? '+' : ''}{diff.toFixed(3)}</strong>
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      {diff === 0 ? '✅ Perfect match' : diff > 0 ? '📈 Surplus — more than expected' : '📉 Shortage — less than expected'}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" placeholder="Reason for discrepancy, observations..."
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                {loading ? '⏳ Saving...' : '🔍 Record Audit'}
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Audit History</div>
            <span className="badge badge-blue">{history.length}</span>
          </div>
          {history.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔍</div><p>No audits recorded yet</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Date</th><th>Item</th><th>Expected</th><th>Actual</th><th>Difference</th><th>Audited By</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong style={{ color: 'var(--accent-cyan)' }}>
                          {r.audit_date
                            ? format(new Date(r.audit_date), 'dd MMM yyyy')
                            : '—'}
                        </strong>
                      </td>
                      <td><strong>{r.item_name}</strong><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.unit}</span></td>
                      <td>{parseFloat(r.expected_qty).toFixed(3)}</td>
                      <td>{parseFloat(r.actual_qty).toFixed(3)}</td>
                      <td>
                        <span className={`badge ${parseFloat(r.difference) === 0 ? 'badge-green' : parseFloat(r.difference) > 0 ? 'badge-blue' : 'badge-red'}`}>
                          {parseFloat(r.difference) > 0 ? '+' : ''}{parseFloat(r.difference).toFixed(3)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{r.audited_by_name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160 }}>{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
