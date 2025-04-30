import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { useNavigate } from 'react-router-dom';

Chart.register(...registerables);

const PrimaryPartnerDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    financial: {
      revenue: 0,
      expenses: 0,
      profit: 0
    },
    sales: [],
    products: [],
    system: {
      database: { status: 'unknown' },
      authService: { status: 'unknown' },
      apiService: { status: 'unknown' },
      uptime: 0
    }
  });

  const [loading, setLoading] = useState({
    financial: true,
    sales: true,
    products: true,
    system: true
  });

  const [error, setError] = useState({
    financial: null,
    sales: null,
    products: null,
    system: null
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchData = async (endpoint, key) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Ensure numeric values for financial data
      if (key === 'financial') {
        result.revenue = Number(result.revenue) || 0;
        result.expenses = Number(result.expenses) || 0;
        result.profit = Number(result.profit) || 0;
      }

      setData(prev => ({ ...prev, [key]: result }));
      setError(prev => ({ ...prev, [key]: null }));
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
      setError(prev => ({ ...prev, [key]: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    fetchData('/finance/summary?period=monthly', 'financial');
    fetchData('/sales', 'sales');
    fetchData('/products', 'products');
    fetchData('/api/system-status', 'system');
  }, []);

  // Format number with 2 decimal places
  const formatCurrency = (value) => {
    if (typeof value !== 'number') {
      value = Number(value) || 0;
    }
    return 'M' + value.toFixed(2);
  };

  // Prepare chart data
  const financialChartData = {
    labels: ['Revenue', 'Expenses', 'Profit'],
    datasets: [{
      label: 'Monthly Financials',
      data: [
        data.financial.revenue,
        data.financial.expenses,
        data.financial.profit
      ],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)'
      ],
      borderWidth: 1
    }]
  };

  const salesChartData = {
    labels: data.sales.slice(0, 10).map(sale => sale.product_name || `Sale ${sale.id}`),
    datasets: [{
      label: 'Recent Sales (Top 10)',
      data: data.sales.slice(0, 10).map(sale => sale.total_price),
      backgroundColor: 'rgba(153, 102, 255, 0.6)',
      borderColor: 'rgba(153, 102, 255, 1)',
      borderWidth: 1
    }]
  };

  const inventoryChartData = {
    labels: data.products.map(product => product.name),
    datasets: [{
      label: 'Product Inventory',
      data: data.products.map(product => product.quantity),
      backgroundColor: 'rgba(255, 159, 64, 0.6)',
      borderColor: 'rgba(255, 159, 64, 1)',
      borderWidth: 1
    }]
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Primary Partner Dashboard</h2>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      
      {/* Financial Overview Section */}
      <div className="dashboard-section">
        <h3>Financial Overview</h3>
        {loading.financial ? (
          <div className="loading">Loading...</div>
        ) : error.financial ? (
          <div className="error">{error.financial}</div>
        ) : (
          <div className="financial-content">
            <div className="financial-table">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Revenue</td>
                    <td>{formatCurrency(data.financial.revenue)}</td>
                  </tr>
                  <tr>
                    <td>Expenses</td>
                    <td>{formatCurrency(data.financial.expenses)}</td>
                  </tr>
                  <tr>
                    <td>Profit</td>
                    <td>{formatCurrency(data.financial.profit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="financial-chart">
              <Pie data={financialChartData} />
            </div>
          </div>
        )}
      </div>

      {/* Sales Performance Section */}
      <div className="dashboard-section">
        <h3>Sales Performance</h3>
        {loading.sales ? (
          <div className="loading">Loading...</div>
        ) : error.sales ? (
          <div className="error">{error.sales}</div>
        ) : (
          <div className="sales-content">
            <div className="sales-chart">
              <Bar data={salesChartData} />
            </div>
            <div className="sales-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.slice(0, 5).map(sale => (
                    <tr key={sale.id}>
                      <td>{sale.product_name}</td>
                      <td>{sale.quantity}</td>
                      <td>{formatCurrency(sale.total_price)}</td>
                      <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Product Inventory Section */}
      <div className="dashboard-section">
        <h3>Product Inventory</h3>
        {loading.products ? (
          <div className="loading">Loading...</div>
        ) : error.products ? (
          <div className="error">{error.products}</div>
        ) : (
          <div className="inventory-content">
            <div className="inventory-chart">
              <Bar data={inventoryChartData} />
            </div>
            <div className="inventory-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>In Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.slice(0, 5).map(product => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* System Status Section */}
      <div className="dashboard-section">
        <h3>System Status</h3>
        {loading.system ? (
          <div className="loading">Loading...</div>
        ) : error.system ? (
          <div className="error">{error.system}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Database</td>
                <td>
                  <span className={`status-badge ${data.system?.database?.status === 'healthy' ? 'success' : 'error'}`}>
                    {data.system?.database?.status || 'Unknown'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Auth Service</td>
                <td>
                  <span className={`status-badge ${data.system?.authService?.status === 'running' ? 'success' : 'error'}`}>
                    {data.system?.authService?.status || 'Unknown'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>API Service</td>
                <td>
                  <span className={`status-badge ${data.system?.apiService?.status === 'active' ? 'success' : 'error'}`}>
                    {data.system?.apiService?.status || 'Unknown'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Uptime</td>
                <td>
                  {data.system?.uptime ? `${Math.floor(data.system.uptime / 3600)} hours` : 'Unknown'}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .dashboard-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .logout-button {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }
        .logout-button:hover {
          background-color: #c82333;
        }
        .dashboard-section {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        h2, h3 {
          color: #333;
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: 20px;
        }
        .error {
          color: #dc3545;
          padding: 10px;
          background: #f8d7da;
          border-radius: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f5f5f5;
        }
        .financial-content,
        .sales-content,
        .inventory-content {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }
        .financial-table,
        .financial-chart,
        .sales-chart,
        .sales-table,
        .inventory-chart,
        .inventory-table {
          flex: 1;
          min-width: 300px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
        }
        .success {
          background-color: #28a745;
          color: white;
        }
        .error {
          background-color: #dc3545;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default PrimaryPartnerDashboard;