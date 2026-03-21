import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function NotFoundPage() {
  return (
    <>
      <Navbar />
      <div className="page text-center" style={{ paddingTop: 60 }}>
        <p style={{ fontSize: '4rem' }}>🌊</p>
        <h1 style={{ marginBottom: 8 }}>Page not found</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>Drifted off the map.</p>
        <Link to="/" className="btn btn-primary">Back to Abierto</Link>
      </div>
    </>
  );
}
