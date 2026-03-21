import React, { useState, useEffect } from 'react';
import '../styles/PublicView.css';

const PublicView = () => {
    const [businessName, setBusinessName] = useState('My Business');
    const [status, setStatus] = useState('');
    const [note, setNote] = useState('');
    const [updatedAt, setUpdatedAt] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch status on component mount and set up polling
    useEffect(() => {
        fetchStatus();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/status');
            if (response.ok) {
                const data = await response.json();
                setBusinessName(data.business_name || 'My Business');
                setStatus(data.status || '');
                setNote(data.note || '');
                setUpdatedAt(data.updated_at || '');
                setError('');
            } else {
                setError('Unable to load status.');
            }
        } catch (err) {
            console.error('Error fetching status:', err);
            setError('Unable to load status.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open':
                return 'status-open';
            case 'Closed':
                return 'status-closed';
            case 'Opening Late':
                return 'status-opening-late';
            case 'Back Soon':
                return 'status-back-soon';
            case 'Sold Out':
                return 'status-sold-out';
            default:
                return 'status-unknown';
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div className="public-view">
                <div className="public-container">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="public-view">
                <div className="public-container">
                    <p className="error-message">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="public-view">
            <div className="public-container">
                <h1>{businessName}</h1>

                <div className={`status-display ${getStatusColor(status)}`}>
                    <div className="status-text">{status || 'No status set'}</div>
                </div>

                {note && (
                    <div className="note-display">
                        <p>{note}</p>
                    </div>
                )}

                {updatedAt && (
                    <div className="timestamp">
                        <small>Last updated: {formatTime(updatedAt)}</small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicView;
