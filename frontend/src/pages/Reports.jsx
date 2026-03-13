import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import api, { downloadCsv } from '../api';

const safeDate = (d) =>
  d && !isNaN(new Date(d)) ? format(new Date(d), 'dd MMM yyyy') : '—';

const safeShortDate = (d) =>
  d && !isNaN(new Date(d)) ? format(new Date(d), 'dd MMM') : '—';

const num = (v) => parseFloat(v || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px'
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>
        {label}
      </p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {num(p.value).toFixed(1)}
        </p>
      ))}
    </div>
  );
};

export default function Reports() {

  const [stockBalance, setStockBalance] = useState([]);
  const [dashData, setDashData] = useState(null);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    Promise.all([
      api.get('/items'),
      api.get('/dashboard'),
      api.get('/audits')
    ])
      .then(([items, dash, aud]) => {
        setStockBalance(items.data);
        setDashData(dash.data);
        setAudits(aud.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <div className="topbar">
          <div><div className="topbar-title">Reports</div></div>
        </div>

        <div className="page-content">
          <div className="loading">
            <div className="spinner" />
          </div>
        </div>
      </>
    );
  }

  // Top moving items
  const itemData = [...stockBalance]
    .sort((a, b) => num(b.total_in) - num(a.total_in))
    .slice(0, 12)
    .map(i => ({
      name: (i.item_name || '').split(' ').slice(0, 2).join(' '),
      In: num(i.total_in),
      Out: num(i.total_out),
      Balance: num(i.current_stock)
    }));

  const discrepancies = audits.filter(a => num(a.difference) !== 0);

  const exportBalance = async () => {
    try {
      await downloadCsv('/export/stock-balance', {}, 'stock-balance.csv');
    } catch {
      toast.error('Failed to export CSV.');
    }
  };

  const exportAudits = async () => {
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
          <div className="topbar-title">📈 Reports</div>
          <div className="topbar-subtitle">
            Analytics and audit reports — last 30 days
          </div>
        </div>

        <div className="topbar-actions">
          <button className="btn btn-outline btn-sm" onClick={exportAudits}>
            📥 Audit CSV
          </button>
        </div>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Daily movement */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Daily Movement — Last 30 Days</div>
          </div>

          <div className="card-body" style={{ padding: '10px 8px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={(dashData?.daily_movement || []).map(d => ({
                  date: safeShortDate(d.date_series),
                  'Stock In': num(d.total_in),
                  'Stock Out': num(d.total_out)
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  interval={4}
                />

                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />

                <Tooltip content={<CustomTooltip />} />

                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />

                <Line
                  type="monotone"
                  dataKey="Stock In"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="Stock Out"
                  stroke="#c4b5fd"
                  strokeWidth={2}
                  dot={false}
                />

              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>

          {/* Item chart */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📦 Stock Balance by Item</div>
            </div>

            <div className="card-body" style={{ padding: '10px 8px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={itemData} margin={{ left: -10 }}>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={40}
                  />

                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />

                  <Tooltip content={<CustomTooltip />} />

                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />

                  <Bar dataKey="In" fill="#34d399" radius={[3, 3, 0, 0]} />

                  <Bar dataKey="Out" fill="#c4b5fd" radius={[3, 3, 0, 0]} />

                  <Bar dataKey="Balance" fill="#3b82f6" radius={[3, 3, 0, 0]} />

                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kitchen totals */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🍳 Kitchen Dispatch (This Month)</div>
            </div>

            <div className="card-body" style={{ padding: '10px 8px' }}>
              <ResponsiveContainer width="100%" height={240}>

                <BarChart
                  layout="vertical"
                  data={(dashData?.kitchen_totals || []).map(d => ({
                    name: (d.kitchen_name || '').split('–')[0].trim(),
                    Dispatched: num(d.total_dispatched)
                  }))}
                >

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />

                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    width={70}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <Bar dataKey="Dispatched" fill="#f59e0b" radius={[0, 4, 4, 0]} />

                </BarChart>

              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Stock table */}
        <div className="card">

          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="card-title">📦 Current Stock Levels</div>
              <span className="badge badge-amber">
                {stockBalance.filter(i => i.is_low_stock).length} low
              </span>
            </div>

            <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={exportBalance}>
              📥 Export CSV
            </button>
          </div>

          <div className="table-wrapper">

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Total In</th>
                  <th>Total Out</th>
                  <th>Adjustments</th>
                  <th>Current Stock</th>
                  <th>Min Level</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {stockBalance.map(i => (
                  <tr key={i.item_id} className={i.is_low_stock ? 'low-stock-row' : ''}>

                    <td><strong>{i.item_name}</strong></td>

                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {i.category || '—'}
                    </td>

                    <td>
                      <span className="badge badge-blue">{i.unit}</span>
                    </td>

                    <td style={{ color: '#34d399' }}>{num(i.total_in).toFixed(2)}</td>

                    <td style={{ color: '#c4b5fd' }}>{num(i.total_out).toFixed(2)}</td>

                    <td style={{ color: num(i.total_adjustment) >= 0 ? '#34d399' : '#f87171' }}>
                      {num(i.total_adjustment) >= 0 ? '+' : ''}
                      {num(i.total_adjustment).toFixed(2)}
                    </td>

                    <td>
                      <strong style={{
                        fontSize: 15,
                        color: i.is_low_stock ? '#fbbf24' : 'var(--text-primary)'
                      }}>
                        {num(i.current_stock).toFixed(3)}
                      </strong>
                    </td>

                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {num(i.min_stock_level).toFixed(1)}
                    </td>

                    <td>
                      {num(i.current_stock) <= 0
                        ? <span className="badge badge-red">Out of Stock</span>
                        : i.is_low_stock
                          ? <span className="badge badge-amber">Low Stock</span>
                          : <span className="badge badge-green">OK</span>
                      }
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>

          </div>
        </div>

        {/* Audit discrepancies */}
        {discrepancies.length > 0 && (

          <div className="card">

            <div className="card-header">
              <div className="card-title">⚠️ Audit Discrepancies</div>
              <span className="badge badge-red">{discrepancies.length}</span>
            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Difference</th>
                    <th>Notes</th>
                  </tr>
                </thead>

                <tbody>

                  {discrepancies.map(r => (

                    <tr key={r.id}>

                      <td>{safeDate(r.audit_date)}</td>

                      <td><strong>{r.item_name}</strong></td>

                      <td>{num(r.expected_qty).toFixed(3)}</td>

                      <td>{num(r.actual_qty).toFixed(3)}</td>

                      <td>
                        <span className={`badge ${num(r.difference) > 0 ? 'badge-blue' : 'badge-red'}`}>
                          {num(r.difference) > 0 ? '+' : ''}
                          {num(r.difference).toFixed(3)}
                        </span>
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {r.notes || '—'}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>
    </>
  );
}