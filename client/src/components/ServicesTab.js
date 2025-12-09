import React, { useState, useEffect } from 'react';
import api from '../services/api';

function ServicesTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceHistory, setServiceHistory] = useState([]);

  useEffect(() => {
    loadServices();
    // Reload every 10 seconds
    const interval = setInterval(loadServices, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadServices = async () => {
    try {
      const response = await api.get('/api/services');
      setServices(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading services:', error);
      setLoading(false);
    }
  };

  const loadServiceHistory = async (serviceName) => {
    try {
      const response = await api.get(`/api/services/${serviceName}/history`);
      setServiceHistory(response.data);
    } catch (error) {
      console.error('Error loading service history:', error);
    }
  };

  const handleServiceClick = (service) => {
    if (selectedService?.name === service.name) {
      setSelectedService(null);
      setServiceHistory([]);
    } else {
      setSelectedService(service);
      loadServiceHistory(service.name);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4ade80';
      case 'inactive':
        return '#666';
      case 'failed':
        return '#ff6b6b';
      default:
        return '#888';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'inactive':
        return 'Inaktiv';
      case 'failed':
        return 'Fehler';
      default:
        return status;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="services-tab">
      <div className="services-header">
        <h2>System-Services</h2>
        <div className="services-stats">
          <div className="stat">
            <span className="stat-value" style={{ color: '#4ade80' }}>
              {services.filter(s => s.status === 'active').length}
            </span>
            <span className="stat-label">Aktiv</span>
          </div>
          <div className="stat">
            <span className="stat-value" style={{ color: '#ff6b6b' }}>
              {services.filter(s => s.status === 'failed').length}
            </span>
            <span className="stat-label">Fehler</span>
          </div>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="empty-state">
          <p>Keine benutzerdefinierten Services gefunden</p>
        </div>
      ) : (
        <div className="services-list">
          {services.map((service) => (
            <div key={service.name} className="service-card">
              <div 
                className="service-main"
                onClick={() => handleServiceClick(service)}
                style={{ cursor: 'pointer' }}
              >
                <div className="service-info">
                  <div className="service-name">{service.name}</div>
                  <div className="service-description">{service.description || 'Keine Beschreibung'}</div>
                </div>
                <div className="service-status">
                  <span 
                    className="status-indicator"
                    style={{ 
                      backgroundColor: getStatusColor(service.status),
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      display: 'inline-block',
                      marginRight: '8px'
                    }}
                  ></span>
                  <span style={{ color: getStatusColor(service.status) }}>
                    {getStatusText(service.status)}
                  </span>
                </div>
              </div>

              {selectedService?.name === service.name && (
                <div className="service-history">
                  <h4>Status-Verlauf</h4>
                  {serviceHistory.length === 0 ? (
                    <p style={{ color: '#666', fontSize: '14px' }}>Keine Verlaufsdaten verfügbar</p>
                  ) : (
                    <div className="history-timeline">
                      {serviceHistory.map((entry, index) => (
                        <div key={index} className="history-entry">
                          <span 
                            className="history-status"
                            style={{ color: getStatusColor(entry.status) }}
                          >
                            {getStatusText(entry.status)}
                          </span>
                          <span className="history-timestamp">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServicesTab;
