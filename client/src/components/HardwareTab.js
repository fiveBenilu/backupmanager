import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function HardwareTab() {
  const [hardwareData, setHardwareData] = useState(null);
  const [history, setHistory] = useState({
    cpu: [],
    memory: [],
    disk: [],
    network: []
  });
  const [loading, setLoading] = useState(true);
  const maxDataPoints = 60; // 10 minutes at 10-second intervals

  useEffect(() => {
    loadHardwareData();
    const interval = setInterval(loadHardwareData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadHardwareData = async () => {
    try {
      const response = await api.get('/api/hardware');
      const data = response.data;
      
      setHardwareData(data);
      
      // Update history
      setHistory(prev => ({
        cpu: [...prev.cpu.slice(-(maxDataPoints - 1)), { 
          value: data.cpu.usage, 
          timestamp: Date.now() 
        }],
        memory: [...prev.memory.slice(-(maxDataPoints - 1)), { 
          value: (data.memory.used / data.memory.total) * 100, 
          timestamp: Date.now() 
        }],
        disk: [...prev.disk.slice(-(maxDataPoints - 1)), { 
          value: (data.disk.used / data.disk.total) * 100, 
          timestamp: Date.now() 
        }],
        network: [...prev.network.slice(-(maxDataPoints - 1)), { 
          rx: data.network.rx_bytes_per_sec || 0,
          tx: data.network.tx_bytes_per_sec || 0,
          timestamp: Date.now() 
        }]
      }));
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading hardware data:', error);
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatBytesPerSec = (bytesPerSec) => {
    return formatBytes(bytesPerSec) + '/s';
  };

  const MiniChart = ({ data, color, label, unit }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
      if (!canvasRef.current || !data || data.length === 0) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw data
      if (data.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = width / (maxDataPoints - 1);
        const startIndex = Math.max(0, maxDataPoints - data.length);

        data.forEach((point, index) => {
          const x = (startIndex + index) * stepX;
          const value = typeof point === 'number' ? point : point.value;
          const y = height - (value / 100) * height;

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();
      }
    }, [data, color]);

    return (
      <div className="mini-chart">
        <div className="chart-label">{label}</div>
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={80}
          style={{ width: '100%', height: '80px' }}
        />
      </div>
    );
  };

  const NetworkChart = ({ data, colorRx, colorTx }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
      if (!canvasRef.current || !data || data.length === 0) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Find max value for scaling
      const maxValue = Math.max(
        ...data.map(d => Math.max(d.rx || 0, d.tx || 0)),
        1
      );

      // Draw grid
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const drawLine = (values, color) => {
        if (values.length > 1) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();

          const stepX = width / (maxDataPoints - 1);
          const startIndex = Math.max(0, maxDataPoints - values.length);

          values.forEach((value, index) => {
            const x = (startIndex + index) * stepX;
            const y = height - (value / maxValue) * height;

            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });

          ctx.stroke();
        }
      };

      // Draw RX and TX
      drawLine(data.map(d => d.rx || 0), colorRx);
      drawLine(data.map(d => d.tx || 0), colorTx);

    }, [data, colorRx, colorTx]);

    return (
      <div className="mini-chart">
        <div className="chart-label">
          Netzwerk 
          <span style={{ marginLeft: '12px', fontSize: '12px' }}>
            <span style={{ color: colorRx }}>▲ RX</span>
            {' '}
            <span style={{ color: colorTx }}>▼ TX</span>
          </span>
        </div>
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={80}
          style={{ width: '100%', height: '80px' }}
        />
      </div>
    );
  };

  if (loading || !hardwareData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="hardware-tab">
      <div className="hardware-header">
        <h2>Hardware-Monitoring</h2>
      </div>

      <div className="hardware-grid">
        <div className="hardware-card">
          <div className="hardware-card-header">
            <h3>CPU</h3>
            <div className="hardware-value">
              {hardwareData.cpu.usage.toFixed(1)}%
            </div>
          </div>
          <div className="hardware-details">
            <div className="detail-row">
              <span>Kerne:</span>
              <span>{hardwareData.cpu.cores}</span>
            </div>
            <div className="detail-row">
              <span>Modell:</span>
              <span>{hardwareData.cpu.model}</span>
            </div>
          </div>
          <MiniChart 
            data={history.cpu} 
            color="#4ade80" 
            label="Auslastung (10 Min)"
            unit="%"
          />
        </div>

        <div className="hardware-card">
          <div className="hardware-card-header">
            <h3>RAM</h3>
            <div className="hardware-value">
              {formatBytes(hardwareData.memory.used)} / {formatBytes(hardwareData.memory.total)}
            </div>
          </div>
          <div className="hardware-details">
            <div className="detail-row">
              <span>Verfügbar:</span>
              <span>{formatBytes(hardwareData.memory.available)}</span>
            </div>
            <div className="detail-row">
              <span>Auslastung:</span>
              <span>{((hardwareData.memory.used / hardwareData.memory.total) * 100).toFixed(1)}%</span>
            </div>
          </div>
          <MiniChart 
            data={history.memory} 
            color="#60a5fa" 
            label="Auslastung (10 Min)"
            unit="%"
          />
        </div>

        <div className="hardware-card">
          <div className="hardware-card-header">
            <h3>Festplatte</h3>
            <div className="hardware-value">
              {formatBytes(hardwareData.disk.used)} / {formatBytes(hardwareData.disk.total)}
            </div>
          </div>
          <div className="hardware-details">
            <div className="detail-row">
              <span>Verfügbar:</span>
              <span>{formatBytes(hardwareData.disk.available)}</span>
            </div>
            <div className="detail-row">
              <span>Auslastung:</span>
              <span>{((hardwareData.disk.used / hardwareData.disk.total) * 100).toFixed(1)}%</span>
            </div>
          </div>
          <MiniChart 
            data={history.disk} 
            color="#f59e0b" 
            label="Auslastung (10 Min)"
            unit="%"
          />
        </div>

        <div className="hardware-card">
          <div className="hardware-card-header">
            <h3>Netzwerk</h3>
            <div className="hardware-value" style={{ fontSize: '14px' }}>
              ↓ {formatBytesPerSec(hardwareData.network.rx_bytes_per_sec || 0)}
              {' '}
              ↑ {formatBytesPerSec(hardwareData.network.tx_bytes_per_sec || 0)}
            </div>
          </div>
          <div className="hardware-details">
            <div className="detail-row">
              <span>Empfangen:</span>
              <span>{formatBytes(hardwareData.network.rx_bytes || 0)}</span>
            </div>
            <div className="detail-row">
              <span>Gesendet:</span>
              <span>{formatBytes(hardwareData.network.tx_bytes || 0)}</span>
            </div>
          </div>
          <NetworkChart 
            data={history.network}
            colorRx="#a78bfa"
            colorTx="#ec4899"
          />
        </div>
      </div>
    </div>
  );
}

export default HardwareTab;
