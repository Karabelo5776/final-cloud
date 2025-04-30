import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Chart from "chart.js/auto";
import { useNavigate } from "react-router-dom";
import './QueryManagement.css';

const QueryManagement = () => {
    const [queries, setQueries] = useState([]);
    const [filteredQueries, setFilteredQueries] = useState([]);
    const [responses, setResponses] = useState({});
    const [stats, setStats] = useState({});
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    
    const chartRef = useRef(null);
    let chartInstance = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterQueries();
    }, [queries, filter, searchTerm]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const [queriesRes, statsRes] = await Promise.all([
                axios.get("http://localhost:5000/queries"),
                axios.get("http://localhost:5000/api/query-stats")
            ]);
            
            setQueries(queriesRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load data. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const filterQueries = () => {
        let result = [...queries];
        
        if (filter !== "all") {
            result = result.filter(query => query.status === filter);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(query => 
                query.customer_name.toLowerCase().includes(term) || 
                query.customer_email.toLowerCase().includes(term) ||
                query.message.toLowerCase().includes(term)
            );
        }
        
        setFilteredQueries(result);
    };

    useEffect(() => {
        if (chartRef.current && stats.total_queries) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            
            chartInstance.current = new Chart(chartRef.current, {
                type: "doughnut",
                data: {
                    labels: ["Pending", "Completed", "Auto-Replied"],
                    datasets: [{
                        data: [stats.pending_queries, stats.completed_queries, stats.auto_replied],
                        backgroundColor: ["#FF5733", "#33FF57", "#3380FF"],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [stats]);

    const handleResponseChange = (queryId, value) => {
        setResponses(prev => ({ ...prev, [queryId]: value }));
    };

    const handleRespond = async (queryId) => {
        if (!responses[queryId]?.trim()) {
            alert("Please enter a response before sending!");
            return;
        }

        try {
            await axios.post("http://localhost:5000/queries/respond", {
                queryId,
                response: responses[queryId]
            });

            alert("Response sent successfully!");
            fetchData(); // Refresh all data
        } catch (error) {
            console.error("Error sending response:", error);
            alert("Failed to send response. Please try again.");
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (isLoading) {
        return <div className="query-loading-indicator">Loading queries...</div>;
    }

    if (error) {
        return <div className="query-error-message">{error}</div>;
    }

    return (
        <div className="query-management-container">
            <button 
                className="query-back-button"
                onClick={() => navigate(-1)}
            >
                <span>←</span> Back to Sales
            </button>
            
            <h2 className="query-main-title">Client Query Management</h2>

            {/* Filters and Search */}
            <div className="query-filters-container">
                <div className="query-status-filter">
                    <label htmlFor="query-status-select">Status:</label>
                    <select
                        id="query-status-select"
                        className="query-status-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Queries</option>
                        <option value="pending">Pending Only</option>
                        <option value="complete">Completed Only</option>
                    </select>
                </div>
                
                <div className="query-search-filter">
                    <label htmlFor="query-search-input">Search:</label>
                    <input
                        id="query-search-input"
                        type="text"
                        className="query-search-input"
                        placeholder="Search by name, email or message"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats and Chart */}
            <div className="query-stats-container">
                <div className="query-stats-card">
                    <h3 className="query-stats-title">Query Statistics</h3>
                    <div className="query-chart-wrapper">
                        <canvas ref={chartRef} className="query-stats-chart"></canvas>
                    </div>
                    <div className="query-stats-details">
                        <p>Total: <strong>{stats.total_queries || 0}</strong></p>
                        <p>Pending: <strong>{stats.pending_queries || 0}</strong></p>
                        <p>Completed: <strong>{stats.completed_queries || 0}</strong></p>
                    </div>
                </div>
            </div>

            {/* Query List Table */}
            <div className="query-table-container">
                <table className="query-data-table">
                    <thead>
                        <tr className="query-table-header">
                            <th>Client</th>
                            <th>Email</th>
                            <th>Message</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredQueries.length > 0 ? (
                            filteredQueries.map((query) => (
                                <tr 
                                    key={query.id} 
                                    className={`query-table-row ${query.status === "pending" ? "query-pending" : "query-completed"}`}
                                >
                                    <td>{query.customer_name}</td>
                                    <td>{query.customer_email}</td>
                                    <td className="query-message-cell">{query.message}</td>
                                    <td>{formatDate(query.created_at)}</td>
                                    <td className={`query-status-cell query-status-${query.status}`}>
                                        {query.status}
                                        {query.auto_reply && query.status === "complete" && " (auto)"}
                                    </td>
                                    <td className="query-actions-cell">
                                        {query.status === "pending" ? (
                                            <div className="query-response-form">
                                                <textarea
                                                    className="query-response-input"
                                                    value={responses[query.id] || ""}
                                                    onChange={(e) => handleResponseChange(query.id, e.target.value)}
                                                    placeholder="Type your response..."
                                                />
                                                <button
                                                    className="query-send-button"
                                                    onClick={() => handleRespond(query.id)}
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="query-response-display">
                                                <strong>Response:</strong> {query.auto_reply}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr className="query-empty-row">
                                <td colSpan="6">No queries found matching your criteria</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QueryManagement;