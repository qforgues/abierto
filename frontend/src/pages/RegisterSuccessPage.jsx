import React, { useState } from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function RegisterSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!location.state?.code) return <Navigate to="/register" replace />;

  const { code, businessId, name } = location.state;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.post('/auth/business/login', { code });
      login(data.token);
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
        <h1 style={{ marginBottom: 8 }}>You're on Abierto!</h1>
        <p className="text-muted" style={{ marginBottom: 32 }}>{name} is now listed. Here's your login code:</p>

        <div className="code-display" onClick={copyCode} title="Click to copy">
          {code}
        </div>
        <p className="text-sm text-muted mt-2">{copied ? '✅ Copied!' : 'Tap to copy'}</p>

        <div className="alert alert-error mt-6" style={{ textAlign: 'left' }}>
          <strong>⚠️ Save this code now.</strong><br />
          This is the only way to log in to your business. Screenshot it or write it down. It cannot be recovered if lost.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <button className="btn btn-primary btn-full" onClick={goToDashboard} disabled={loading} style={{ padding: '16px' }}>
            {loading ? 'Loading…' : 'Go to My Dashboard →'}
          </button>
          <Link to="/" className="btn btn-ghost btn-full">Back to Home</Link>
        </div>
      </div>
    </>
  );
}
