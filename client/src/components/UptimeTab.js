import React, { useState, useEffect } from 'react';
import api from '../services/api';
import UptimeModal from './UptimeModal';

function UptimeTab() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [monitorHistory, setMonitorHistory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);

  useEffect(() => {
    loadMonitors();
    // Reload every 30 seconds
    const interval = setInterval(loadMonitors, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMonitors = async () => {
    try {
      const response = await api.get('/api/uptime');
      setMonitors(response.data);
      setLoading(false);
      
      // Reload history for selected monitor if any
      if (selectedMonitor) {
        loadMonitorHistory(selectedMonitor.id);
      }
    } catch (error) {
      console.error('Error loading monitors:', error);
      setLoading(false);
    }
  };

  const loadMonitorHistory = async (monitorId) => {
    try {
      const response = await api.get(`/api/uptime/${monitorId}/history?hours=24`);
      setMonitorHistory(response.data);
    } catch (error) {
      console.error('Error loading monitor history:', error);
    }
  };

  const handleMonitorClick = (monitor) => {
    if (selectedMonitor?.id === monitor.id) {
      setSelectedMonitor(null);
      setMonitorHistory(null);
    } else {
      setSelectedMonitor(monitor);
      loadMonitorHistory(monitor.id);
    }
  };

  const handleAddMonitor = () => {
    setEditingMonitor(null);
    setShowModal(true);
  };

  const handleEditMonitor = (monitor, e) => {
    e.stopPropagation();
    setEditingMonitor(monitor);
    setShowModal(true);
  };

  const handleDeleteMonitor = async (monitorId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Do you really want to delete this monitor?')) {
      return;
    }

    try {
      await api.delete(`/api/uptime/${monitorId}`);
      loadMonitors();
      if (selectedMonitor?.id === monitorId) {
        setSelectedMonitor(null);
        setMonitorHistory(null);
      }
    } catch (error) {
      console.error('Error deleting monitor:', error);
      alert('Error deleting monitor');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingMonitor(null);
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditingMonitor(null);
    loadMonitors();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'up':
        return '#4ade80';
      case 'down':
        return '#ff6b6b';
      default:
        return '#888';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'up':
        return 'Online';
      case 'down':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US');
  };

  const getUptimeColor = (percentage) => {
    if (percentage >= 99) return '#4ade80';
    if (percentage >= 95) return '#fbbf24';
    return '#ff6b6b';
  };

  const renderUptimeChart = (history) => {
    if (!history || history.length === 0) return null;

    // Group by hour for better visualization
    const hourlyData = {};
    history.forEach(entry => {
      const hour = new Date(entry.timestamp).toISOString().slice(0, 13);
      if (!hourlyData[hour]) {
        hourlyData[hour] = { up: 0, down: 0 };
      }
      hourlyData[hour][entry.status]++;
    });

    const hours = Object.keys(hourlyData).sort();
    const maxChecks = Math.max(...hours.map(h => hourlyData[h].up + hourlyData[h].down));

    return (
      <div className="uptime-chart">
        {hours.map((hour, index) => {
          const data = hourlyData[hour];
          const total = data.up + data.down;
          const upPercentage = (data.up / total) * 100;
          const height = (total / maxChecks) * 100;

          return (
            <div 
              key={index} 
              className="chart-bar"
              style={{
                height: `${height}%`,
                backgroundColor: upPercentage >= 50 ? '#4ade80' : '#ff6b6b',
                opacity: 0.3 + (upPercentage / 100) * 0.7
              }}
              title={`${new Date(hour).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })}: ${upPercentage.toFixed(1)}% online`}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="uptime-tab">
      <div className="uptime-header">
        <div>
          <h2>Uptime Monitoring</h2>
          <div className="uptime-stats">
            <div className="stat">
              <span className="stat-value" style={{ color: '#4ade80' }}>
                {monitors.filter(m => m.currentStatus.status === 'up').length}
              </span>
              <span className="stat-label">Online</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: '#ff6b6b' }}>
                {monitors.filter(m => m.currentStatus.status === 'down').length}
              </span>
              <span className="stat-label">Offline</span>
            </div>
            <div className="stat">
              <span className="stat-value">{monitors.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>
        <button className="add-button" onClick={handleAddMonitor}>
          + Add Monitor
        </button>
      </div>

      {monitors.length === 0 ? (
        <div className="empty-state">
          <p>No uptime monitors configured</p>
          <button className="add-button" onClick={handleAddMonitor}>
            + Add First Monitor
          </button>
        </div>
      ) : (
        <div className="monitors-list">
          {monitors.map((monitor) => (
            <div key={monitor.id} className="monitor-card">
              <div 
                className="monitor-main"
                onClick={() => handleMonitorClick(monitor)}
                style={{ cursor: 'pointer' }}
              >
                <div className="monitor-info">
                  <div className="monitor-header">
                    <h3 className="monitor-name">{monitor.name}</h3>
                    <div className="monitor-actions">
                      <button 
                        className="action-button edit"
                        onClick={(e) => handleEditMonitor(monitor, e)}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={(e) => handleDeleteMonitor(monitor.id, e)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="monitor-details">
                    <span className="monitor-endpoint">
                      {monitor.type.toUpperCase()}: {monitor.host}:{monitor.port}
                      {monitor.path && ` ${monitor.path}`}
                    </span>
                    <span className="monitor-interval">
                      Check every {monitor.interval} min.
                    </span>
                  </div>
                </div>
                <div className="monitor-status">
                  <div className="status-indicator-wrapper">
                    <span 
                      className="status-indicator pulse"
                      style={{ 
                        backgroundColor: getStatusColor(monitor.currentStatus.status),
                      }}
                    ></span>
                    <span style={{ color: getStatusColor(monitor.currentStatus.status) }}>
                      {getStatusText(monitor.currentStatus.status)}
                    </span>
                  </div>
                  {monitor.currentStatus.responseTime && (
                    <div className="response-time">
                      {monitor.currentStatus.responseTime}ms
                    </div>
                  )}
                  {monitor.currentStatus.lastCheck && (
                    <div className="last-check">
                      {formatTimestamp(monitor.currentStatus.lastCheck)}
                    </div>
                  )}
                </div>
              </div>

              {selectedMonitor?.id === monitor.id && monitorHistory && (
                <div className="monitor-history">
                  <div className="history-stats">
                    <div className="stat-item">
                      <span 
                        className="stat-value" 
                        style={{ color: getUptimeColor(monitorHistory.stats.uptimePercentage) }}
                      >
                        {monitorHistory.stats.uptimePercentage.toFixed(2)}%
                      </span>
                      <span className="stat-label">Uptime (24h)</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value" style={{ color: '#4ade80' }}>
                        {monitorHistory.stats.upChecks}
                      </span>
                      <span className="stat-label">Online</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value" style={{ color: '#ff6b6b' }}>
                        {monitorHistory.stats.downChecks}
                      </span>
                      <span className="stat-label">Offline</span>
                    </div>
                    {monitorHistory.stats.avgResponseTime && (
                      <div className="stat-item">
                        <span className="stat-value">
                          {monitorHistory.stats.avgResponseTime}ms
                        </span>
                        <span className="stat-label">Ø Response</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="history-chart-container">
                    <h4>History (24 Hours)</h4>
                    {renderUptimeChart(monitorHistory.history)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <UptimeModal
          monitor={editingMonitor}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

export default UptimeTab;
