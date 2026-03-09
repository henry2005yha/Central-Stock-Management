import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import api from '../api';

const today = format(new Date(), 'yyyy-MM-dd');
const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

export default function StockInHistory() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ from: monthAgo, to: today, supplier_id: '', item_id: '', q: '' });
  const [loading, setLoading] = useState(true);

  const f = (k, v) => {
    if (k !== 'q') setLoading(true);
    setFilters(prev => ({ ...prev, [k]: v }));
  };

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q'));
    api.get('/stock-in', { params }).then(r => { setRows(r.data); setLoading(false); }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.supplier_id, filters.item_id]);

  useEffect(() => {
    api.get('/suppliers').then(r => setSuppliers(r.data));
    api.get('/items/catalog').then(r => setItems(r.data));
  }, []);

  const filtered = filters.q ? rows.filter(r =>
    r.item_name.toLowerCase().includes(filters.q.toLowerCase()) ||
    (r.supplier_name || '').toLowerCase().includes(filters.q.toLowerCase())
  ) : rows;

  const exportCsv = () => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q')));
    window.open(`http://localhost:3001/api/export/stock-in?${params}`, '_blank');
  };

  const totalQty = filtered.reduce((a, r) => a + parseFloat(r.quantity), 0);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">📋 Stock Received History</div>
          <div className="topbar-subtitle">Full audit log of all goods received from suppliers</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>📥 Export CSV</button>
          <a href="/stock-in" className="btn btn-success btn-sm">+ New Receipt</a>
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
        <div className="form-group search-box">
          <label className="form-label">Search</label>
          <span className="search-icon">🔍</span>
          <input type="text" className="form-control" placeholder="Item or supplier..." value={filters.q} onChange={e => f('q', e.target.value)} />
        </div>
      </div>
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {loading ? 'Loading...' : `${filtered.length} records — Total: ${totalQty.toFixed(2)} units`}
            </div>
          </div>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
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
                  {filtered.map(r => (
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
    </>
  );
}
