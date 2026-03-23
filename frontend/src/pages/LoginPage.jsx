import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function LoginPage() {
  const [mode, setMode] = useState('owner');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const { login, user } = useAuth();
  const { t } = useLang();
  const lp = t.loginPage;
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
      const data = await api.post('/auth/business/login', { code: code.toUpperCase() });
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

  const handleContact = async (e) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    setContactLoading(true);
    try {
      await api.post('/contact', { businessName: contactName, message: contactMsg });
      setContactSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page page-narrow" style={{ paddingTop: 40 }}>
        <div className="text-center" style={{ marginBottom: 28 }}>
          <img src="/logo-solo.png" alt="Abierto?" style={{ height: 80, marginBottom: 8 }} />
          <p className="text-muted mt-2">{lp.subtitle}</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            className={`btn ${mode === 'owner' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('owner'); setError(''); setShowContact(false); }}
          >
            {lp.ownerTab}
          </button>
          <button
            className={`btn ${mode === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('admin'); setError(''); setShowContact(false); }}
          >
            {lp.adminTab}
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {mode === 'owner' && !showContact && (
          <div className="card card-body">
            <h2 style={{ marginBottom: 16 }}>{lp.codeTitle}</h2>
            <form onSubmit={handleOwnerLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>{lp.codeLabel}</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="e.g. A12"
                  maxLength={3}
                  style={{ fontSize: '2rem', textAlign: 'center', letterSpacing: '0.4em', fontFamily: 'monospace', fontWeight: 700 }}
                  autoFocus
                />
                <span className="text-sm text-muted">{lp.codeHint}</span>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading || code.length !== 3}>
                {loading ? lp.checking : lp.loginBtn}
              </button>
            </form>
            <button
              onClick={() => { setShowContact(true); setError(''); }}
              style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--mid)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {lp.forgotCode}
            </button>
          </div>
        )}

        {mode === 'owner' && showContact && (
          <div className="card card-body">
            {contactSent ? (
              <div className="text-center" style={{ padding: '12px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                <h2 style={{ marginBottom: 8 }}>{lp.sentTitle}</h2>
                <p className="text-muted text-sm">{lp.sentBody}</p>
                <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={() => { setShowContact(false); setContactSent(false); setContactName(''); setContactMsg(''); }}>
                  {lp.backToLogin}
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ marginBottom: 4 }}>{lp.forgotTitle}</h2>
                <p className="text-sm text-muted" style={{ marginBottom: 16 }}>{lp.forgotSubtitle}</p>
                <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label>{lp.bizNameLabel}</label>
                    <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Playa Snacks" autoFocus />
                  </div>
                  <div className="field">
                    <label>{lp.msgLabel} <span className="text-muted" style={{ fontWeight: 400 }}>{lp.msgOptional}</span></label>
                    <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)} placeholder={lp.msgPlaceholder} rows={3} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={contactLoading || !contactName.trim()}>
                    {contactLoading ? lp.sending : lp.sendBtn}
                  </button>
                </form>
                <button onClick={() => { setShowContact(false); setError(''); }} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--mid)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  {lp.backToLogin}
                </button>
              </>
            )}
          </div>
        )}

        {mode === 'admin' && (
          <div className="card card-body">
            <h2 style={{ marginBottom: 16 }}>{lp.adminTitle}</h2>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>{lp.usernameLabel}</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>{lp.passwordLabel}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? lp.signingIn : lp.signInBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
