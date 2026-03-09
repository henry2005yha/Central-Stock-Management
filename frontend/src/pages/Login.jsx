import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (email, password) => setForm({ email, password });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.08) 0%, transparent 50%), var(--bg-primary)',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, background: 'var(--gradient-primary)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(59,130,246,0.4)'
          }}>🏪</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Warehouse Stock System</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sign in to manage your inventory</p>
        </div>

        {/* Form */}
        <div className="card">
          <div className="card-body">
            <form onSubmit={submit} className="form-grid">
              <div className="form-group">
                <label className="form-label form-required">Email Address</label>
                <input
                  type="email" className="form-control"
                  placeholder="you@warehouse.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label form-required">Password</label>
                <input
                  type="password" className="form-control"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {loading ? '⏳ Signing in...' : '🔐 Sign In'}
              </button>
            </form>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body" style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Accounts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { role: 'Admin', email: 'admin@warehouse.com', password: 'admin123', color: 'var(--accent-purple)' },
                { role: 'Manager', email: 'manager@warehouse.com', password: 'manager123', color: 'var(--accent-blue)' },
                { role: 'Staff', email: 'staff@warehouse.com', password: 'staff123', color: 'var(--accent-cyan)' },
              ].map(d => (
                <button key={d.role} type="button" className="btn btn-outline btn-sm"
                  style={{ justifyContent: 'space-between' }}
                  onClick={() => demoLogin(d.email, d.password)}>
                  <span style={{ color: d.color, fontWeight: 700 }}>{d.role}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
