import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import './Sales.css';

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [products, setProducts] = useState([]);
    const [availableStock, setAvailableStock] = useState(0);
    const [showStockWarning, setShowStockWarning] = useState(false);
    const navigate = useNavigate();

    const userId = localStorage.getItem("userId");

    useEffect(() => {
        axios.get("http://localhost:5000/sales")
            .then(res => setSales(res.data))
            .catch(err => console.error("Error fetching sales:", err));

        axios.get("http://localhost:5000/products")
            .then(res => setProducts(res.data))
            .catch(err => console.error("Error fetching products:", err));
    }, []);

    const handleProductSelect = (e) => {
        const selectedId = e.target.value;
        setProductId(selectedId);
        setShowStockWarning(false); // Reset warning on product change

        const selectedProduct = products.find(product => product.id.toString() === selectedId);
        setAvailableStock(selectedProduct ? selectedProduct.quantity : 0);
    };

    const handleAddSale = async (e) => {
        e.preventDefault();

        if (quantity > availableStock) {
            setShowStockWarning(true);
            return;
        }

        try {
            await axios.post("http://localhost:5000/sales", { userId, productId, quantity });
            alert("Sale recorded successfully!");
            window.location.reload();
        } catch (error) {
            console.error("Error adding sale:", error.response?.data || error.message);
        }
    };

    const salesData = sales.reduce((acc, sale) => {
        const existingProduct = acc.find(item => item.product_name === sale.product_name);
        if (existingProduct) {
            existingProduct.total_sales += Number(sale.total_price);
        } else {
            acc.push({ product_name: sale.product_name, total_sales: Number(sale.total_price) });
        }
        return acc;
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("userId");
        navigate("/");
    };

    return (
        <div className="sales-dashboard-unique">
            {/* Navigation Buttons */}
            <div className="sales-nav-buttons-container">
                <button className="sales-nav-btn sales-products-btn" onClick={() => navigate("/products")}>Add Products</button>
                <button className="sales-nav-btn sales-queries-btn" onClick={() => navigate("/queries")}>Client Queries</button>
                <button className="sales-nav-btn sales-orders-btn" onClick={() => navigate("/orders")}>View Online Orders</button>
                <button className="sales-nav-btn sales-logout-btn" onClick={handleLogout}>Logout</button>
            </div>

            <h2 className="sales-main-title">Sales Transactions</h2>

            {/* Add Sale Form */}
            <form className="sales-form-unique" onSubmit={handleAddSale}>
                <select className="sales-product-select" value={productId} onChange={handleProductSelect} required>
                    <option value="">Select Product</option>
                    {products.map(product => (
                        <option key={product.id} value={product.id}>
                            {product.name} - M{product.price} ({product.quantity} in stock)
                        </option>
                    ))}
                </select>
                <input
                    className="sales-quantity-input"
                    type="number"
                    placeholder="Quantity"
                    value={quantity}
                    min="1"
                    onChange={(e) => {
                        setQuantity(Number(e.target.value));
                        setShowStockWarning(false); // Reset warning on quantity change
                    }}
                    required
                />
                <button className="sales-submit-btn" type="submit" disabled={quantity > availableStock || quantity <= 0}>
                    Record Sale
                </button>
                {showStockWarning && (
                    <p className="sales-stock-warning">Not enough stock available!</p>
                )}
            </form>

            {/* Display Sales Transactions in Table */}
            <h3 className="sales-records-title">Sales Records</h3>
            <div className="sales-table-container">
                <table className="sales-data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Total Price</th>
                            <th>Date Sold</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale) => (
                            <tr key={sale.id}>
                                <td>{sale.product_name}</td>
                                <td>{sale.quantity}</td>
                                <td>M{sale.total_price}</td>
                                <td>{new Date(sale.sale_date).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Sales Chart */}
            <h3 className="sales-chart-title">Sales Performance</h3>
            <div className="sales-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="product_name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total_sales" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Sales;