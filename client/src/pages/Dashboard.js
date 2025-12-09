import React, { useState, useEffect } from 'react';
import api from '../services/api';
import InstanceModal from '../components/InstanceModal';
import ServicesTab from '../components/ServicesTab';
import HardwareTab from '../components/HardwareTab';

function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('backups');
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [backupLoading, setBackupLoading] = useState({});
  const [expandedInstance, setExpandedInstance] = useState(null);

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

  const toggleBackupList = (instanceId) => {
    setExpandedInstance(expandedInstance === instanceId ? null : instanceId);
  };

  const handleDownload = async (instanceId, backupIndex, fileName) => {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REACT_APP_API_URL || '';
    const url = `${baseUrl}/api/instances/${instanceId}/backups/${backupIndex}/download?token=${encodeURIComponent(token)}`;
    
    // Use window.open for large file downloads
    window.open(url, '_blank');
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
        <h1>Server Management</h1>
        <button onClick={onLogout} className="btn-logout">
          Abmelden
        </button>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'backups' ? 'active' : ''}`}
          onClick={() => setActiveTab('backups')}
        >
          Backups
        </button>
        <button 
          className={`tab ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          Services
        </button>
        <button 
          className={`tab ${activeTab === 'hardware' ? 'active' : ''}`}
          onClick={() => setActiveTab('hardware')}
        >
          Hardware
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'backups' && (
          <>
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

                {instance.backups && instance.backups.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleBackupList(instance.id)}
                      className="btn-toggle-backups"
                    >
                      {expandedInstance === instance.id ? '▲ Backups ausblenden' : '▼ Backups anzeigen'}
                    </button>

                    {expandedInstance === instance.id && (
                      <div className="backup-list">
                        {instance.backups.map((backup, index) => (
                          <div key={index} className="backup-item">
                            <div className="backup-info">
                              <span className="backup-date">{formatDate(backup.timestamp)}</span>
                              <span className="backup-size">{formatBytes(backup.size)}</span>
                            </div>
                            <button
                              onClick={() => handleDownload(instance.id, index, backup.fileName)}
                              className="btn-download"
                              title="Backup herunterladen"
                            >
                              ⬇
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {activeTab === 'services' && <ServicesTab />}

        {activeTab === 'hardware' && <HardwareTab />}
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
