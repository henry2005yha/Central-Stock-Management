import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import api from '../api';

const today = format(new Date(), 'yyyy-MM-dd');
const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

export default function StockOutHistory() {
  const [rows, setRows] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ from: monthAgo, to: today, kitchen_id: '', item_id: '', q: '' });
  const [loading, setLoading] = useState(true);

  const f = (k, v) => {
    if (k !== 'q') setLoading(true);
    setFilters(prev => ({ ...prev, [k]: v }));
  };

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q'));
    api.get('/stock-out', { params }).then(r => { setRows(r.data); setLoading(false); }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.kitchen_id, filters.item_id]);

  useEffect(() => {
    api.get('/kitchens').then(r => setKitchens(r.data));
    api.get('/items/catalog').then(r => setItems(r.data));
  }, []);

  const filtered = filters.q ? rows.filter(r =>
    r.item_name.toLowerCase().includes(filters.q.toLowerCase()) ||
    r.kitchen_name.toLowerCase().includes(filters.q.toLowerCase())
  ) : rows;

  const exportCsv = () => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q')));
    window.open(`http://localhost:3001/api/export/stock-out?${params}`, '_blank');
  };

  const totalQty = filtered.reduce((a, r) => a + parseFloat(r.quantity), 0);

  // Kitchen breakdown
  const kitchenBreakdown = kitchens.map(k => ({
    ...k,
    total: filtered.filter(r => r.kitchen_id === k.id).reduce((a, r) => a + parseFloat(r.quantity), 0)
  })).filter(k => k.total > 0).sort((a, b) => b.total - a.total);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">📑 Dispatch History</div>
          <div className="topbar-subtitle">Full audit log of all stock dispatched to kitchens</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>📥 Export CSV</button>
          <a href="/stock-out" className="btn btn-primary btn-sm">+ New Dispatch</a>
        </div>
      </div>
      <div className="filter-bar">
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
        <div className="form-group search-box">
          <label className="form-label">Search</label>
          <span className="search-icon">🔍</span>
          <input type="text" className="form-control" placeholder="Item or kitchen..."
            value={filters.q} onChange={e => f('q', e.target.value)} />
        </div>
      </div>
      <div className="page-content" style={{ display: 'grid', gap: 20 }}>
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
              {loading ? 'Loading...' : `${filtered.length} records — Total dispatched: ${totalQty.toFixed(2)} units`}
            </div>
          </div>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
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
                  {filtered.map(r => (
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
    </>
  );
}
