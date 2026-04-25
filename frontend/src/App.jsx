import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import IslandPickerPage from './pages/IslandPickerPage';
import HomePage from './pages/HomePage';
import BusinessPage from './pages/BusinessPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RegisterSuccessPage from './pages/RegisterSuccessPage';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piToken = params.get('pi_token');
    if (!piToken) return;

    // Strip the token from the URL immediately so it doesn't persist in history
    params.delete('pi_token');
    const cleanSearch = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (cleanSearch ? '?' + cleanSearch : ''));

    // Fire-and-forget: verify with backend (informational, never blocks the user)
    fetch('/api/integrity/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: piToken }),
    }).catch(() => {});
  }, []);

  return (
    <Routes>
      <Route path="/" element={<IslandPickerPage />} />
      <Route path="/vieques" element={<HomePage island="vieques" />} />
      <Route path="/culebra" element={<HomePage island="culebra" />} />
      <Route path="/business/:id" element={<BusinessPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/success" element={<RegisterSuccessPage />} />
      <Route path="/owner" element={
        <ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
