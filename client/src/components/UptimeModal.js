import React, { useState, useEffect } from 'react';
import api from '../services/api';

function UptimeModal({ monitor, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    type: 'tcp',
    interval: '5',
    path: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (monitor) {
      setFormData({
        name: monitor.name,
        host: monitor.host,
        port: monitor.port.toString(),
        type: monitor.type,
        interval: monitor.interval.toString(),
        path: monitor.path || '',
      });
    }
  }, [monitor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.host || !formData.port || !formData.interval) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate port
    const port = parseInt(formData.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError('Port must be between 1 and 65535');
      return;
    }

    // Validate interval
    const interval = parseInt(formData.interval);
    if (isNaN(interval) || interval < 1 || interval > 1440) {
      setError('Interval must be between 1 and 1440 minutes');
      return;
    }

    // Validate path for HTTP/HTTPS
    if ((formData.type === 'http' || formData.type === 'https') && formData.path && !formData.path.startsWith('/')) {
      setError('Path must start with /');
      return;
    }

    setLoading(true);

    try {
      if (monitor) {
        await api.put(`/api/uptime/${monitor.id}`, formData);
      } else {
        await api.post('/api/uptime', formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{monitor ? 'Edit Monitor' : 'New Monitor'}</h2>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Webserver"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Host / IP Address *</label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleChange}
                placeholder="example.com or 192.168.1.100"
              />
            </div>

            <div className="form-group">
              <label>Port *</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                placeholder="80"
                min="1"
                max="65535"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Protocol *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="tcp">TCP</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>

            <div className="form-group">
              <label>Check Interval (Minutes) *</label>
              <input
                type="number"
                name="interval"
                value={formData.interval}
                onChange={handleChange}
                placeholder="5"
                min="1"
                max="1440"
              />
            </div>
          </div>

          {(formData.type === 'http' || formData.type === 'https') && (
            <div className="form-group">
              <label>Path (optional)</label>
              <input
                type="text"
                name="path"
                value={formData.path}
                onChange={handleChange}
                placeholder="/api/health"
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                e.g. /api/health or /status
              </small>
            </div>
          )}

          <div className="form-info">
            <small style={{ color: '#888' }}>
              {formData.type === 'tcp' && 'TCP check only verifies if the port is reachable'}
              {formData.type === 'http' && 'HTTP check expects 2xx or 3xx status code'}
              {formData.type === 'https' && 'HTTPS check expects 2xx or 3xx status code'}
            </small>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UptimeModal;
