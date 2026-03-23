import React, { useState } from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';

export default function RegisterSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLang();
  const s = t.success;

  if (!location.state?.code) return <Navigate to="/register" replace />;

  const { code, name } = location.state;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.post('/auth/business/login', { code });
      login(data.user);
      navigate('/owner');
    } catch {
      navigate('/login');
    }
  };

  return (
    <>
      <Navbar />
      <div className="page page-narrow text-center" style={{ paddingTop: 48 }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
        <h1 style={{ marginBottom: 8 }}>{s.title}</h1>
        <p className="text-muted" style={{ marginBottom: 32 }}><strong>{name}</strong> {s.subtitle}</p>

        <div className="code-display" onClick={copyCode} title={s.tapCopy}>
          {code}
        </div>
        <p className="text-sm text-muted mt-2">{copied ? s.copied : s.tapCopy}</p>

        <div className="alert alert-error mt-6" style={{ textAlign: 'left' }}>
          <strong>{s.warning}</strong><br />
          {s.warningBody}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <button className="btn btn-primary btn-full" onClick={goToDashboard} disabled={loading} style={{ padding: '16px' }}>
            {loading ? s.btnLoading : s.btnDashboard}
          </button>
          <Link to="/" className="btn btn-ghost btn-full">{s.btnHome}</Link>
        </div>
      </div>
    </>
  );
}
