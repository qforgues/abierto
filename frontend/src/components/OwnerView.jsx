import React, { useState, useEffect } from 'react';
import '../styles/OwnerView.css';

const OwnerView = () => {
    const [status, setStatus] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const statusOptions = ['Open', 'Closed', 'Opening Late', 'Back Soon', 'Sold Out'];

    // Fetch current status on component mount
    useEffect(() => {
        fetchCurrentStatus();
    }, []);

    const fetchCurrentStatus = async () => {
        try {
            const response = await fetch('/api/status');
            if (response.ok) {
                const data = await response.json();
                setStatus(data.status || '');
                setNote(data.note || '');
            }
        } catch (err) {
            console.error('Error fetching status:', err);
        }
    };

    const handleStatusChange = (newStatus) => {
        setStatus(newStatus);
        setError('');
        setSuccess('');
    };

    const handleNoteChange = (e) => {
        setNote(e.target.value);
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validate that a status is selected
        if (!status) {
            setError('Please select a status.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status,
                    note: note || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle error response from API
                setError(data.error || 'Failed to update status.');
                setLoading(false);
                return;
            }

            // Success
            setSuccess('Status updated successfully!');
            setLoading(false);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error updating status:', err);
            setError('An error occurred while updating the status.');
            setLoading(false);
        }
    };

    return (
        <div className="owner-view">
            <div className="owner-container">
                <h1>Update Business Status</h1>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="status-buttons">
                        {statusOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                className={`status-btn ${status === option ? 'active' : ''}`}
                                onClick={() => handleStatusChange(option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    <div className="note-section">
                        <label htmlFor="note">Additional Note (Optional)</label>
                        <textarea
                            id="note"
                            value={note}
                            onChange={handleNoteChange}
                            placeholder="e.g., Opening at 10 AM today"
                            rows="4"
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading || !status}
                    >
                        {loading ? 'Updating...' : 'Update Status'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OwnerView;
