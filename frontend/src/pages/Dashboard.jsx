import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {Number(p.value).toFixed(1)}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <div className="topbar"><div><div className="topbar-title">Dashboard</div><div className="topbar-subtitle">Warehouse overview</div></div></div>
      <div className="page-content"><div className="loading"><div className="spinner"/></div></div>
    </>
  );

  const s = data?.summary || {};

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">📊 Dashboard</div>
          <div className="topbar-subtitle">Real-time warehouse overview — {format(new Date(), 'EEEE, d MMMM yyyy')}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { setLoading(true); api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }); }}>
          🔄 Refresh
        </button>
      </div>
      <div className="page-content">

        {/* Stats */}
        <div className="stat-grid">
          {[
            { icon: '📦', label: 'Total Items', value: s.total_items || 0, sub: 'in catalog', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
            { icon: '⚠️', label: 'Low Stock', value: s.low_stock_count || 0, sub: 'items below minimum', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
            { icon: '📥', label: "Today's In", value: s.today_in || 0, sub: 'units received today', bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
            { icon: '📤', label: "Today's Out", value: s.today_out || 0, sub: 'units dispatched today', bg: 'rgba(139,92,246,0.15)', color: '#c4b5fd' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="stat-value" style={{ color: s.color }}>{Number(s.value).toLocaleString()}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* 30-day movement */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📈 30-Day Movement</div>
            </div>
            <div className="card-body" style={{ padding: '10px 8px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={(data?.daily_movement || []).map(d => ({
                  date: format(new Date(d.date_series), 'dd MMM'),
                  'Stock In': parseFloat(d.total_in),
                  'Stock Out': parseFloat(d.total_out),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval={6} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Stock In" stroke="#34d399" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Stock Out" stroke="#c4b5fd" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per kitchen dispatch this month */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🍳 Kitchen Dispatch (This Month)</div>
            </div>
            <div className="card-body" style={{ padding: '10px 8px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(data?.kitchen_totals || []).map(d => ({
                  name: d.kitchen_name.split('–')[0].trim(),
                  Dispatched: parseFloat(d.total_dispatched),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Dispatched" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Low stock + Recent activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Low stock */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⚠️ Low Stock Alerts</div>
              <span className="badge badge-amber">{data?.low_stock_items?.length || 0}</span>
            </div>
            <div className="table-wrapper">
              {!data?.low_stock_items?.length ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <div className="empty-icon">✅</div>
                  <p>All items are adequately stocked</p>
                </div>
              ) : (
                <table>
                  <thead><tr><th>Item</th><th>Curr.</th><th>Min</th><th>Unit</th></tr></thead>
                  <tbody>
                    {data.low_stock_items.map(item => (
                      <tr key={item.item_id} className="low-stock-row">
                        <td><strong>{item.item_name}</strong></td>
                        <td style={{ color: '#f87171' }}>{parseFloat(item.current_stock).toFixed(1)}</td>
                        <td style={{ color: '#94a3b8' }}>{parseFloat(item.min_stock_level).toFixed(1)}</td>
                        <td><span className="badge badge-amber">{item.unit}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🕐 Recent Activity</div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 280 }}>
              {[...(data?.recent_in || []).map(r => ({ ...r, type: 'in', date: r.received_date })),
                ...(data?.recent_out || []).map(r => ({ ...r, type: 'out', date: r.dispatch_date }))]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 12)
                .map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 18px', borderBottom: '1px solid rgba(148,163,184,0.06)'
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: r.type === 'in' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
                    }}>{r.type === 'in' ? '📥' : '📤'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.item_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {r.type === 'in'
                          ? `From: ${r.supplier_name || 'Unknown'}`
                          : `To: ${r.kitchen_name}`} • {format(new Date(r.date), 'dd MMM')}
                      </div>
                    </div>
                    <span className={`badge ${r.type === 'in' ? 'badge-green' : 'badge-purple'}`}>
                      {r.type === 'in' ? '+' : '-'}{parseFloat(r.quantity).toFixed(1)} {r.unit}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
