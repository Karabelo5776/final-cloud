import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DeveloperDashboard.css';

const DeveloperDashboard = () => {
  const [systemData, setSystemData] = useState({
    products: [],
    sales: [],
    queries: [],
    backups: [] // Removed incomeStatements from initial state
  });
  const [loading, setLoading] = useState({
    products: true,
    sales: true,
    queries: true,
    backups: true
  });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  // Fetch data from available endpoints
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Only include endpoints that exist in your backend
        const endpoints = [
          { key: 'products', url: '/products' },
          { key: 'sales', url: '/sales' },
          { key: 'queries', url: '/queries' }
          // Removed income-statements endpoint
        ];

        const requests = endpoints.map(endpoint => 
          axios.get(`http://localhost:5000${endpoint.url}`, { headers })
            .then(res => ({ key: endpoint.key, data: res.data }))
            .catch(err => {
              console.warn(`Failed to fetch ${endpoint.key}:`, err);
              return { key: endpoint.key, data: [] };
            })
        );

        const results = await Promise.all(requests);
        
        const newData = {};
        results.forEach(result => {
          newData[result.key] = result.data;
        });

        setSystemData(prev => ({
          ...prev,
          ...newData,
          // Mock backups since endpoint doesn't exist
          backups: [
            { id: 1, created_at: new Date(), type: 'manual', size: '2.4MB', status: 'completed' },
            { id: 2, created_at: new Date(Date.now() - 86400000), type: 'auto', size: '1.8MB', status: 'completed' }
          ]
        }));

        setLoading({
          products: false,
          sales: false,
          queries: false,
          backups: false
        });
      } catch (err) {
        setError('Failed to load system data. Please refresh.');
        console.error('Dashboard error:', err);
      }
    };

    fetchData();
  }, []);

  // Mock API functions for endpoints that don't exist yet
  const createBackup = async () => {
    try {
      setLoading(prev => ({ ...prev, backups: true }));
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newBackup = {
        id: Math.floor(Math.random() * 1000),
        created_at: new Date(),
        type: 'manual',
        size: `${(Math.random() * 3 + 1).toFixed(1)}MB`,
        status: 'completed'
      };

      setSystemData(prev => ({
        ...prev,
        backups: [newBackup, ...prev.backups]
      }));
    } catch (err) {
      setError('Backup simulation failed');
    } finally {
      setLoading(prev => ({ ...prev, backups: false }));
    }
  };

  const restartService = async (service) => {
    if (!window.confirm(`Simulate restart of ${service} service?`)) return;
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`${service} service restart simulated successfully`);
    } catch (err) {
      setError('Service restart simulation failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Data processing for charts
  const monthlySalesData = systemData.sales.reduce((acc, sale) => {
    const month = new Date(sale.sale_date).toLocaleString('default', { month: 'short' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.sales += sale.total_price;
    } else {
      acc.push({ month, sales: sale.total_price });
    }
    return acc;
  }, []);

  const queryStatusData = [
    { name: 'Pending', value: systemData.queries.filter(q => q.status === 'pending').length },
    { name: 'Completed', value: systemData.queries.filter(q => q.status === 'complete').length }
  ];

  return (
    <div className="developer-dashboard">
      <header className="dashboard-header">
        <h1>IWB Developer Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          System Overview
        </button>
        <button 
          className={activeTab === 'database' ? 'active' : ''}
          onClick={() => setActiveTab('database')}
        >
          Database
        </button>
        <button 
          className={activeTab === 'monitoring' ? 'active' : ''}
          onClick={() => setActiveTab('monitoring')}
        >
          Monitoring
        </button>
      </nav>

      {error && <div className="error-banner">{error}</div>}

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="status-card">
              <h3>System Status</h3>
              <ul>
                {['database', 'authService', 'apiService'].map(service => (
                  <li key={service}>
                    <span className="status-indicator active"></span>
                    {service}: active
                    <button 
                      onClick={() => restartService(service)}
                      className="restart-btn"
                    >
                      Simulate Restart
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="metrics-card">
              <h3>Key Metrics</h3>
              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-value">{systemData.products.length}</span>
                  <span className="metric-label">Products</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{systemData.sales.length}</span>
                  <span className="metric-label">Total Sales</span>
                </div>
                <div className="metric">
                  <span className="metric-value">
                    {systemData.queries.filter(q => q.status === 'pending').length}
                  </span>
                  <span className="metric-label">Pending Queries</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="database-tables">
            <h3>Database Records</h3>
            <div className="table-container">
              <h4>Products ({systemData.products.length})</h4>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {systemData.products.slice(0, 5).map(product => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>{product.name}</td>
                      <td>${product.price}</td>
                      <td>{product.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-container">
              <h4>Recent Sales ({systemData.sales.length})</h4>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {systemData.sales.slice(0, 5).map(sale => (
                    <tr key={sale.id}>
                      <td>{sale.id}</td>
                      <td>{sale.product_name}</td>
                      <td>${sale.total_price}</td>
                      <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="monitoring-section">
            <div className="backup-controls">
              <h3>Backup Simulation</h3>
              <button 
                onClick={createBackup}
                disabled={loading.backups}
              >
                {loading.backups ? 'Creating...' : 'Simulate Backup'}
              </button>
            </div>

            <div className="chart-container">
              <h4>Sales Data</h4>
              {monthlySalesData.length > 0 ? (
                <div className="sales-chart">
                  {monthlySalesData.map((item, index) => (
                    <div key={index} className="chart-bar-container">
                      <div className="chart-bar-label">{item.month}</div>
                      <div 
                        className="chart-bar" 
                        style={{ height: `${Math.min(100, item.sales / 100)}px` }}
                      >
                        ${item.sales}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No sales data available</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DeveloperDashboard;