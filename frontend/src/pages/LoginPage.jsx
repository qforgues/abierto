import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('owner'); // 'owner' | 'admin'
  const [code, setCode] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'owner') navigate('/owner');
    if (user?.role === 'admin') navigate('/admin');
  }, [user]);

  const handleOwnerLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/business/login', { code: code.toUpperCase(), password: ownerPassword || undefined });
      login(data.token);
      navigate('/owner');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/admin/login', { username, password });
      login(data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page page-narrow" style={{ paddingTop: 40 }}>
        <div className="text-center" style={{ marginBottom: 28 }}>
          <h1 className="brand" style={{ fontSize: '2rem' }}>Abierto</h1>
          <p className="text-muted mt-2">Sign in to manage your business</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            className={`btn ${mode === 'owner' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('owner'); setError(''); }}
          >
            Business Owner
          </button>
          <button
            className={`btn ${mode === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('admin'); setError(''); }}
          >
            Admin
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {mode === 'owner' ? (
          <div className="card card-body">
            <h2 style={{ marginBottom: 16 }}>Enter your business code</h2>
            <form onSubmit={handleOwnerLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Business Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="e.g. A12"
                  maxLength={3}
                  style={{ fontSize: '2rem', textAlign: 'center', letterSpacing: '0.4em', fontFamily: 'monospace', fontWeight: 700 }}
                  autoFocus
                />
                <span className="text-sm text-muted">3-character code given when you registered</span>
              </div>
              <div className="field">
                <label>Password <span className="text-muted" style={{ fontWeight: 400 }}>(if you set one)</span></label>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={e => setOwnerPassword(e.target.value)}
                  placeholder="Leave blank if no password"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading || code.length !== 3}>
                {loading ? 'Checking...' : 'Login →'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card card-body">
            <h2 style={{ marginBottom: 16 }}>Admin Login</h2>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
