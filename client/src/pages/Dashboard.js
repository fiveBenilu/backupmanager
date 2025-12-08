import React, { useState, useEffect } from 'react';
import api from '../services/api';
import InstanceModal from '../components/InstanceModal';

function Dashboard({ onLogout }) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [backupLoading, setBackupLoading] = useState({});

  useEffect(() => {
    loadInstances();
    // Reload instances every 30 seconds
    const interval = setInterval(loadInstances, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInstances = async () => {
    try {
      const response = await api.get('/api/instances');
      setInstances(response.data);
    } catch (error) {
      console.error('Error loading instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstance = () => {
    setSelectedInstance(null);
    setModalOpen(true);
  };

  const handleEditInstance = (instance) => {
    setSelectedInstance(instance);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedInstance(null);
  };

  const handleModalSave = async () => {
    await loadInstances();
    handleModalClose();
  };

  const handleBackup = async (instanceId) => {
    setBackupLoading({ ...backupLoading, [instanceId]: true });
    try {
      await api.post(`/api/instances/${instanceId}/backup`);
      await loadInstances();
    } catch (error) {
      console.error('Error performing backup:', error);
      alert('Backup fehlgeschlagen: ' + (error.response?.data?.error || error.message));
    } finally {
      setBackupLoading({ ...backupLoading, [instanceId]: false });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Noch nie';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>MC Backup Manager</h1>
        <button onClick={onLogout} className="btn-logout">
          Abmelden
        </button>
      </div>

      <div className="dashboard-content">
        <div className="instances-header">
          <h2>Backup-Instanzen</h2>
          <button onClick={handleAddInstance} className="btn-add" title="Neue Instanz">
            +
          </button>
        </div>

        {instances.length === 0 ? (
          <div className="empty-state">
            <p>Keine Backup-Instanzen vorhanden</p>
            <p style={{ fontSize: '14px' }}>Klicken Sie auf + um eine neue Instanz anzulegen</p>
          </div>
        ) : (
          <div className="instances-grid">
            {instances.map((instance) => (
              <div key={instance.id} className="instance-card">
                <div className="instance-header">
                  <h3>{instance.name}</h3>
                  <button
                    onClick={() => handleEditInstance(instance)}
                    className="btn-settings"
                    title="Einstellungen"
                  >
                    ⚙
                  </button>
                </div>

                <div className="instance-info">
                  <div className="info-row">
                    <span className="info-label">Instanz-ID:</span>
                    <span className="info-value">{instance.id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Verzeichnis:</span>
                    <span className="info-value" title={instance.sourcePath}>
                      {instance.sourcePath.length > 25
                        ? '...' + instance.sourcePath.slice(-25)
                        : instance.sourcePath}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Letztes Backup:</span>
                    <span className="info-value">{formatDate(instance.lastBackup)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Größe:</span>
                    <span className="info-value">{formatBytes(instance.size)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Intervall:</span>
                    <span className="info-value">{instance.interval}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Backups:</span>
                    <span className="info-value">
                      {instance.backups?.length || 0} / {instance.maxBackups}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleBackup(instance.id)}
                  className="btn-backup"
                  disabled={backupLoading[instance.id]}
                >
                  {backupLoading[instance.id] ? 'Backup läuft...' : 'Backup jetzt starten'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <InstanceModal
          instance={selectedInstance}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

export default Dashboard;
