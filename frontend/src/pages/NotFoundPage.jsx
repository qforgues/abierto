import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLang } from '../context/LangContext';

export default function NotFoundPage() {
  const { t } = useLang();
  const nf = t.notFound;
  return (
    <>
      <Navbar />
      <div className="page text-center" style={{ paddingTop: 60 }}>
        <p style={{ fontSize: '4rem' }}>🌊</p>
        <h1 style={{ marginBottom: 8 }}>{nf.title}</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>{nf.subtitle}</p>
        <Link to="/" className="btn btn-primary">{nf.back}</Link>
      </div>
    </>
  );
}
