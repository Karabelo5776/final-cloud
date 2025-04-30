import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Line, Pie, Bar } from "react-chartjs-2";
import "chart.js/auto";
import "./InvestorDashboard.css";

const InvestorDashboard = () => {
    const [revenue, setRevenue] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [profit, setProfit] = useState(0);
    const [dailySales, setDailySales] = useState([]);
    const [monthlySales, setMonthlySales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Fetch all financial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Get token from storage
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Axios config with auth header
                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                };

                // Fetch data from all endpoints
                const [summaryRes, dailyRes, monthlyRes] = await Promise.all([
                    axios.get("http://localhost:5000/finance/summary", config),
                    axios.get("http://localhost:5000/sales", config), // Existing sales endpoint
                    axios.get("http://localhost:5000/investor/monthly-sales", config)
                ]);

                console.log("API Responses:", { 
                    summary: summaryRes.data, 
                    daily: dailyRes.data,
                    monthly: monthlyRes.data 
                });

                setRevenue(summaryRes.data.revenue || 0);
                setExpenses(summaryRes.data.expenses || 0);
                setProfit(summaryRes.data.profit || 0);
                
                // Process daily sales data - limit to last 30 days for better visualization
                const dailyData = dailyRes.data || [];
                const recentDailySales = dailyData
                    .sort((a, b) => new Date(a.sale_date) - new Date(b.sale_date))
                    .slice(-30); // Last 30 days
                setDailySales(recentDailySales);
                
                setMonthlySales(monthlyRes.data || []);
            } catch (err) {
                console.error("Error fetching data:", err.response?.data || err.message);
                setError(err.response?.data?.message || "Failed to load dashboard data");
                
                if (err.response?.status === 401) {
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate("/login");
    };

    // Financial overview pie chart
    const pieChartData = {
        labels: ["Revenue", "Expenses", "Profit"],
        datasets: [
            {
                data: [revenue, expenses, profit],
                backgroundColor: ["#4CAF50", "#FF9800", "#2196F3"],
                hoverOffset: 4,
            },
        ],
    };

    // Process daily sales for line chart
    const dailyLineChartData = {
        labels: dailySales.length > 0
            ? dailySales.map(data => new Date(data.sale_date).toLocaleDateString())
            : ['No data'],
        datasets: [
            {
                label: "Daily Sales (M)",
                data: dailySales.length > 0
                    ? dailySales.map(data => data.total_price)
                    : [0],
                borderColor: "#4CAF50",
                backgroundColor: "rgba(76, 175, 80, 0.2)",
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // Process monthly sales for bar chart
    const monthlyBarChartData = {
        labels: monthlySales.length > 0 
            ? monthlySales.map(data => data.month) 
            : ['No data'],
        datasets: [
            {
                label: "Monthly Sales (M)",
                data: monthlySales.length > 0 
                    ? monthlySales.map(data => data.total_sales) 
                    : [0],
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
            },
        ],
    };

    if (loading) {
        return <div className="loading-container">Loading dashboard data...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>Investor Dashboard</h2>
                <button 
                    onClick={handleLogout} 
                    className="logout-button"
                >
                    Logout
                </button>
            </div>

            {/* Financial Overview Table */}
            <div className="financial-table">
                <table>
                    <thead>
                        <tr>
                            <th>Financial Metric</th>
                            <th>Amount (M)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Revenue</td>
                            <td>M{revenue.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Total Expenses</td>
                            <td>M{expenses.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Net Profit</td>
                            <td className={profit >= 0 ? "positive" : "negative"}>
                                M{profit.toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                {/* Pie Chart */}
                <div className="chart-card">
                    <h3>Revenue Distribution</h3>
                    <div className="chart-container">
                        <Pie 
                            data={pieChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                return ` ${context.label}: M${context.raw.toLocaleString()}`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Daily Sales Line Chart */}
                <div className="chart-card full-width">
                    <h3>Daily Sales (Last 30 Days)</h3>
                    <div className="chart-container">
                        <Line 
                            data={dailyLineChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: function(value) {
                                                return 'M' + value.toLocaleString();
                                            }
                                        }
                                    }
                                },
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                return ` Sales: M${context.raw.toLocaleString()}`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Monthly Sales Bar Chart */}
            <div className="chart-card full-width">
                <h3>Monthly Sales Performance</h3>
                <div className="chart-container">
                    <Bar 
                        data={monthlyBarChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return 'M' + value.toLocaleString();
                                        }
                                    }
                                }
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return ` Sales: M${context.raw.toLocaleString()}`;
                                        }
                                    }
                                }
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default InvestorDashboard;