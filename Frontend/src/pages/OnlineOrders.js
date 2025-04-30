import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './OnlineOrders.css';

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: ''
  });
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await axios.get(`http://localhost:5000/api/client-purchases?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Transform the data to match expected format
      const transformedOrders = res.data.map(order => ({
        ...order,
        customer_name: order.client_name || order.customer_name || 'N/A',
        customer_email: order.client_email || order.customer_email || 'N/A',
        product_name: order.product_name || 'Unknown Product',
        sale_date: order.sale_date || order.purchase_date || new Date().toISOString()
      }));
      
      setOrders(transformedOrders);
      setFeedback({ message: '', type: '' });
    } catch (error) {
      console.error('Error fetching orders:', error);
      setFeedback({
        message: error.response?.data?.message || 'Failed to load orders',
        type: 'error'
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="online-orders-container">
      {feedback.message && (
        <div className={`feedback-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <header>
        <h2>Online Orders Management</h2>
        <button onClick={handleLogout}>Logout</button>
        <nav>
          <Link to="/sales">Sales Dashboard</Link>
          <Link to="/products">Products</Link>
          <Link to="/queries">Client Queries</Link>
        </nav>
      </header>

      <div className="filters-section">
        <h3>Filter Orders</h3>
        <div className="filter-controls">
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="date-filters">
            <label>From:</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />

            <label>To:</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>

          <button onClick={fetchOrders} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="no-orders">No orders found matching your criteria</div>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>
                  <div className="customer-info">
                    <div>{order.customer_name}</div>
                    <div className="customer-email">{order.customer_email}</div>
                    {order.shipping_address && (
                      <div className="shipping-address">
                        <small>{order.shipping_address}</small>
                      </div>
                    )}
                  </div>
                </td>
                <td>{order.product_name}</td>
                <td>{order.quantity}</td>
                <td>${formatPrice(order.total_price)}</td>
                <td>{formatDate(order.sale_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OnlineOrders;