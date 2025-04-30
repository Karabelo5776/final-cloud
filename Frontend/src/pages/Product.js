import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Product.css";

// Set up axios interceptor for auth token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

const Product = () => {
    const [products, setProducts] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [expenses, setExpenses] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await axios.get("http://localhost:5000/products");
            setProducts(res.data);
        } catch (err) {
            console.error("Fetch products error:", err);
            setError(err.response?.data?.error || "Failed to fetch products");
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const productData = {
                name, 
                description, 
                cost_price: parseFloat(costPrice) || 0, 
                expenses: parseFloat(expenses) || 0, 
                price: parseFloat(price), 
                quantity: parseInt(quantity) || 0
            };

            if (!productData.name || !productData.price) {
                throw new Error("Product name and price are required");
            }

            if (editingId) {
                await axios.put(`http://localhost:5000/products/${editingId}`, productData);
                showNotification("Product updated successfully!", "success");
            } else {
                await axios.post("http://localhost:5000/products", productData);
                showNotification("Product added successfully!", "success");
            }
            resetForm();
            await fetchProducts();
        } catch (error) {
            console.error("Save product error:", error);
            const errorMsg = error.response?.data?.error || 
                          error.message || 
                          "Error saving product";
            showNotification(errorMsg, "error");
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setName(product.name);
        setDescription(product.description);
        setCostPrice(product.cost_price);
        setExpenses(product.expenses);
        setPrice(product.price);
        setQuantity(product.quantity);
        
        document.getElementById("iwb-product-form").scrollIntoView({
            behavior: "smooth"
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await axios.delete(`http://localhost:5000/products/${id}`);
                showNotification("Product deleted successfully!", "success");
                await fetchProducts();
            } catch (error) {
                console.error("Delete product error:", error);
                showNotification("Error deleting product", "error");
                if (error.response?.status === 401) {
                    navigate('/login');
                }
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setDescription("");
        setCostPrice("");
        setExpenses("");
        setPrice("");
        setQuantity("");
    };

    const showNotification = (message, type) => {
        const notification = document.createElement("div");
        notification.className = `iwb-notification iwb-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add("iwb-notification-show");
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove("iwb-notification-show");
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    };

    return (
        <div className="iwb-product-management-container">
            <div id="iwb-notification-container"></div>
            
            <header className="iwb-product-header">
                <h1 className="iwb-product-main-title">Inventory Management</h1>
                <button 
                    id="iwb-make-sales-button" 
                    onClick={() => navigate("/sales")} 
                    className="iwb-nav-button"
                >
                    <span className="iwb-button-icon">🛒</span>
                    <span className="iwb-button-text">Make Sales</span>
                </button>
            </header>

            <main className="iwb-product-main-content">
                <section className="iwb-product-form-section">
                    <h2 className="iwb-product-form-title">
                        {editingId ? "Edit Product" : "Add New Product"}
                        <span className="iwb-title-decoration"></span>
                    </h2>
                    
                    {error && <div className="iwb-error-message">{error}</div>}
                    
                    <form 
                        id="iwb-product-form" 
                        onSubmit={handleSubmit} 
                        className="iwb-product-form"
                    >
                        <div className="iwb-form-grid">
                            <div className="iwb-form-group">
                                <label htmlFor="iwb-product-name" className="iwb-input-label">
                                    Product Name*
                                </label>
                                <input 
                                    type="text" 
                                    id="iwb-product-name"
                                    placeholder="Enter product name" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    required 
                                    className="iwb-form-input" 
                                />
                            </div>
                            
                            <div className="iwb-form-group">
                                <label htmlFor="iwb-product-description" className="iwb-input-label">
                                    Description
                                </label>
                                <input 
                                    type="text" 
                                    id="iwb-product-description"
                                    placeholder="Enter description" 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    className="iwb-form-input" 
                                />
                            </div>
                            
                            <div className="iwb-form-group">
                                <label htmlFor="iwb-product-cost" className="iwb-input-label">
                                    Cost Price (M)
                                </label>
                                <input 
                                    type="number" 
                                    id="iwb-product-cost"
                                    placeholder="Enter cost price" 
                                    value={costPrice} 
                                    onChange={(e) => setCostPrice(e.target.value)} 
                                    className="iwb-form-input" 
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            
                            <div className="iwb-form-group">
                                <label htmlFor="iwb-product-expenses" className="iwb-input-label">
                                    Expenses (M)
                                </label>
                                <input 
                                    type="number" 
                                    id="iwb-product-expenses"
                                    placeholder="Enter expenses" 
                                    value={expenses} 
                                    onChange={(e) => setExpenses(e.target.value)} 
                                    className="iwb-form-input" 
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            
                            <div className="iwb-form-group">
                                <label htmlFor="iwb-product-price" className="iwb-input-label">
                                    Selling Price (M)*
                                </label>
                                <input 
                                    type="number" 
                                    id="iwb-product-price"
                                    placeholder="Enter selling price" 
                                    value={price} 
                                    onChange={(e) => setPrice(e.target.value)} 
                                    required 
                                    className="iwb-form-input" 
                                    step="0.01"
                                    min="0.01"
                                />
                            </div>
                            
                            <div className="iwb-form-group">
                                <label htmlFor="iwb-product-quantity" className="iwb-input-label">
                                    Quantity
                                </label>
                                <input 
                                    type="number" 
                                    id="iwb-product-quantity"
                                    placeholder="Enter quantity" 
                                    value={quantity} 
                                    onChange={(e) => setQuantity(e.target.value)} 
                                    className="iwb-form-input" 
                                    min="0"
                                />
                            </div>
                        </div>
                        
                        <div className="iwb-form-actions">
                            <button 
                                type="submit" 
                                className="iwb-form-submit-button"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="iwb-button-icon">⏳</span>
                                ) : editingId ? (
                                    <>
                                        <span className="iwb-button-icon">🔄</span>
                                        Update Product
                                    </>
                                ) : (
                                    <>
                                        <span className="iwb-button-icon">➕</span>
                                        Add Product
                                    </>
                                )}
                            </button>
                            
                            {editingId && (
                                <button 
                                    type="button" 
                                    onClick={resetForm} 
                                    className="iwb-form-cancel-button"
                                    disabled={isLoading}
                                >
                                    <span className="iwb-button-icon">✖</span>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="iwb-products-list-section">
                    <div className="iwb-section-header">
                        <h2 className="iwb-products-list-title">
                            Available Products
                            <span className="iwb-title-decoration"></span>
                        </h2>
                        <div className="iwb-products-count">
                            {isLoading ? "Loading..." : `${products.length} products`}
                        </div>
                    </div>
                    
                    {isLoading ? (
                        <div className="iwb-loading-spinner">
                            <div className="iwb-spinner"></div>
                            <p>Loading products...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="iwb-empty-state">
                            <div className="iwb-empty-icon">📦</div>
                            <h3>No Products Available</h3>
                            <p>Add your first product to get started</p>
                        </div>
                    ) : (
                        <ul className="iwb-products-list">
                            {products.map((product) => (
                                <li key={product.id} className="iwb-product-card">
                                    <div className="iwb-product-info">
                                        <h3 className="iwb-product-name">{product.name}</h3>
                                        <p className="iwb-product-description">{product.description}</p>
                                        
                                        <div className="iwb-product-stats">
                                            <div className="iwb-product-stat">
                                                <span className="iwb-stat-label">Cost:</span>
                                                <span className="iwb-stat-value">M{parseFloat(product.cost_price).toFixed(2)}</span>
                                            </div>
                                            <div className="iwb-product-stat">
                                                <span className="iwb-stat-label">Expenses:</span>
                                                <span className="iwb-stat-value">M{parseFloat(product.expenses).toFixed(2)}</span>
                                            </div>
                                            <div className="iwb-product-stat">
                                                <span className="iwb-stat-label">Price:</span>
                                                <span className="iwb-stat-value">M{parseFloat(product.price).toFixed(2)}</span>
                                            </div>
                                            <div className="iwb-product-stat">
                                                <span className="iwb-stat-label">Stock:</span>
                                                <span className={`iwb-stat-value ${
                                                    product.quantity < 5 ? "iwb-low-stock" : ""
                                                }`}>
                                                    {product.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="iwb-product-actions">
                                        <button 
                                            onClick={() => handleEdit(product)} 
                                            className="iwb-product-edit-button"
                                            disabled={isLoading}
                                        >
                                            <span className="iwb-button-icon">✏️</span>
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(product.id)} 
                                            className="iwb-product-delete-button"
                                            disabled={isLoading}
                                        >
                                            <span className="iwb-button-icon">🗑️</span>
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Product;