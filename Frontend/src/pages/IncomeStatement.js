import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import "./IncomeStatement.css";

const IncomeStatement = () => {
    const [financialData, setFinancialData] = useState({
        revenue: 0,
        expenses: 0,
        profit: 0,
        loading: true,
        error: null
    });
    const navigate = useNavigate();

    // Fetch financial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    throw new Error("No authentication token found");
                }

                const response = await axios.get("http://localhost:5000/finance/summary", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                // Ensure all values are numbers
                const data = {
                    revenue: Number(response.data.revenue) || 0,
                    expenses: Number(response.data.expenses) || 0,
                    profit: Number(response.data.profit) || 0
                };

                setFinancialData({
                    ...data,
                    loading: false,
                    error: null
                });
            } catch (err) {
                console.error("Error fetching summary:", err);
                setFinancialData({
                    revenue: 0,
                    expenses: 0,
                    profit: 0,
                    loading: false,
                    error: err.message || "Failed to load financial data"
                });
            }
        };

        fetchData();
    }, []);

    // Data for the financial chart
    const financeData = [
        { category: "Revenue", amount: financialData.revenue },
        { category: "Expenses", amount: financialData.expenses },
        { category: "Profit", amount: financialData.profit },
    ];

    const formatCurrency = (value) => {
        return `M${Number(value).toFixed(2)}`;
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    if (financialData.loading) {
        return <div className="loading-message">Loading financial data...</div>;
    }

    if (financialData.error) {
        return <div className="error-message">{financialData.error}</div>;
    }

    return (
        <div className="income-statement-container">
            <button id="logout-button" onClick={handleLogout} className="logout-btn">
                Logout
            </button>

            <h2 id="income-statement-title">Income Statement</h2>

            <table id="financial-summary-table" border="1" cellPadding="10">
                <thead>
                    <tr>
                        <th className="table-header">Category</th>
                        <th className="table-header">Amount (M)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="table-row">
                        <td className="table-cell">Total Revenue</td>
                        <td className="table-cell">{formatCurrency(financialData.revenue)}</td>
                    </tr>
                    <tr className="table-row">
                        <td className="table-cell">Total Expenses</td>
                        <td className="table-cell">{formatCurrency(financialData.expenses)}</td>
                    </tr>
                    <tr className="table-row">
                        <td className="table-cell">Net Profit</td>
                        <td className="table-cell" style={{ 
                            color: financialData.profit >= 0 ? 'green' : 'red',
                            fontWeight: 'bold'
                        }}>
                            {formatCurrency(financialData.profit)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <h3 id="chart-title">Financial Overview</h3>
            <div id="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip 
                            formatter={(value) => [formatCurrency(value), "Amount"]}
                            labelFormatter={(label) => label}
                        />
                        <Bar dataKey="amount" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default IncomeStatement;