import React, { useState, useEffect } from 'react';
import api from '../services/api';

function InstanceModal({ instance, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    sourcePath: '',
    targetPath: '',
    interval: 'daily',
    maxBackups: 3,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (instance) {
      setFormData({
        name: instance.name,
        sourcePath: instance.sourcePath,
        targetPath: instance.targetPath,
        interval: instance.interval,
        maxBackups: instance.maxBackups,
      });
    }
  }, [instance]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.sourcePath || !formData.targetPath) {
      setError('Bitte alle Felder ausfüllen');
      return;
    }

    setLoading(true);

    try {
      if (instance) {
        await api.put(`/api/instances/${instance.id}`, formData);
      } else {
        await api.post('/api/instances', formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Speichern fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/api/instances/${instance.id}`);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Löschen fehlgeschlagen');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{instance ? 'Instanz bearbeiten' : 'Neue Instanz'}</h2>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Minecraft Server"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Quellpfad</label>
              <input
                type="text"
                name="sourcePath"
                value={formData.sourcePath}
                onChange={handleChange}
                placeholder="/opt/minecraft/world"
              />
              <div className="form-hint">Der Ordner, der gesichert werden soll</div>
            </div>

            <div className="form-group">
              <label>Zielpfad</label>
              <input
                type="text"
                name="targetPath"
                value={formData.targetPath}
                onChange={handleChange}
                placeholder="/opt/backups/minecraft"
              />
              <div className="form-hint">Wo die ZIP-Backups gespeichert werden</div>
            </div>

            <div className="form-group">
              <label>Intervall</label>
              <select name="interval" value={formData.interval} onChange={handleChange}>
                <option value="hourly">Stündlich</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
              </select>
              <div className="form-hint">Wie oft automatische Backups erstellt werden</div>
            </div>

            <div className="form-group">
              <label>Maximale Backup-Anzahl</label>
              <select
                name="maxBackups"
                value={formData.maxBackups}
                onChange={handleChange}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
              <div className="form-hint">
                Anzahl der aufbewahrten Backups, älteste werden automatisch gelöscht
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Abbrechen
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
            </div>

            {instance && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-danger"
                >
                  Instanz löschen
                </button>
              </div>
            )}
          </form>
        ) : (
          <div>
            <p style={{ color: '#e0e0e0', marginBottom: '24px' }}>
              Möchten Sie die Instanz "{instance.name}" wirklich löschen?
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button onClick={handleDelete} className="btn-danger" disabled={loading}>
                {loading ? 'Löschen...' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstanceModal;
