import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import './ClientPurchase.css';

const ClientPurchase = () => {
    const API_BASE = "http://localhost:5000/api";
    const [purchaseData, setPurchaseData] = useState({ 
        productId: "", 
        quantity: "" 
    });
    const [paymentData, setPaymentData] = useState({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardName: ""
    });
    const [response, setResponse] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));

            if (!token || !user || user.role !== 'client') {
                navigate('/login');
                return false;
            }
            return true;
        };

        if (checkAuth()) {
            const user = JSON.parse(localStorage.getItem('user'));
            fetchAvailableProducts();
            fetchPurchaseHistory(user.email);
        }
    }, [navigate]);

    const fetchAvailableProducts = async () => {
        try {
            const res = await fetch(`${API_BASE}/products?available=true`);
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error("Error fetching products:", err);
            setError("Failed to load available products");
        }
    };

    const fetchPurchaseHistory = async (email) => {
        try {
            const res = await fetch(`${API_BASE}/client-purchases?email=${email}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setPurchaseHistory(data);
        } catch (err) {
            console.error("Error fetching purchase history:", err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handlePurchaseChange = (e) => {
        const { name, value } = e.target;
        setPurchaseData(prev => ({ 
            ...prev, 
            [name]: name === 'quantity' ? Math.max(1, parseInt(value) || '') : value 
        }));
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;

        if (name === "cardNumber") {
            const formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            setPaymentData(prev => ({ ...prev, [name]: formattedValue }));
            return;
        }

        if (name === "expiryDate" && value.length === 2 && !value.includes('/')) {
            setPaymentData(prev => ({ ...prev, [name]: value + '/' }));
            return;
        }

        setPaymentData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPurchase = async (e) => {
        e.preventDefault();
        
        if (!purchaseData.productId || !purchaseData.quantity || purchaseData.quantity < 1) {
            setError("Please select a product and valid quantity");
            return;
        }

        if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardName) {
            setError("Please complete payment information");
            return;
        }

        setLoading(true);
        setError("");
        setResponse("");

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const selectedProduct = products.find(p => p.id == purchaseData.productId);
            
            if (!selectedProduct) {
                throw new Error("Selected product not found");
            }

            if (selectedProduct.quantity < purchaseData.quantity) {
                throw new Error(`Only ${selectedProduct.quantity} units available`);
            }

            const res = await fetch(`${API_BASE}/place-order`, {  // Changed from place-purchase to place-order
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    productId: purchaseData.productId,
                    quantity: parseInt(purchaseData.quantity),
                    payment: {
                        lastFour: paymentData.cardNumber.slice(-4).replace(/\s/g, ''),
                        method: "credit_card"
                    }
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Purchase failed");

            setResponse(`Purchase successful! ${data.message}`);
            setPurchaseData({ productId: "", quantity: "" });
            setPaymentData({ cardNumber: "", expiryDate: "", cvv: "", cardName: "" });
            
            await fetchAvailableProducts();
            await fetchPurchaseHistory(user.email);
        } catch (err) {
            setError(err.message || "Failed to complete purchase");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="client-purchase-container">
            <header>
                <h2>Client Dashboard</h2>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
                <nav>
                    <Link to="/clientpurchase" className="nav-link active">Make Purchase</Link>
                    <Link to="/clientquery" className="nav-link">Submit Query</Link>
                </nav>
            </header>

            <div className="purchase-content">
                <form onSubmit={handleSubmitPurchase} className="purchase-form">
                    <h3>Make a Purchase</h3>
                    
                    <div className="form-group">
                        <label>Select Product:</label>
                        <select 
                            name="productId" 
                            value={purchaseData.productId} 
                            onChange={handlePurchaseChange} 
                            required
                        >
                            <option value="">-- Select Product --</option>
                            {products.map(product => (
                                <option 
                                    key={product.id} 
                                    value={product.id}
                                    disabled={product.quantity <= 0}
                                >
                                    {product.name} - ${product.price} ({product.quantity} available)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Quantity:</label>
                        <input 
                            type="number" 
                            name="quantity" 
                            value={purchaseData.quantity} 
                            onChange={handlePurchaseChange} 
                            required 
                            min="1"
                            max={products.find(p => p.id == purchaseData.productId)?.quantity || 1}
                            placeholder="Enter quantity" 
                        />
                    </div>

                    <div className="payment-section">
                        <h4>Payment Information</h4>
                        
                        <div className="form-group">
                            <label>Card Number:</label>
                            <input
                                type="text"
                                name="cardNumber"
                                value={paymentData.cardNumber}
                                onChange={handlePaymentChange}
                                maxLength="19"
                                placeholder="1234 5678 9012 3456"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Name on Card:</label>
                            <input
                                type="text"
                                name="cardName"
                                value={paymentData.cardName}
                                onChange={handlePaymentChange}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Expiry Date:</label>
                                <input
                                    type="text"
                                    name="expiryDate"
                                    value={paymentData.expiryDate}
                                    onChange={handlePaymentChange}
                                    maxLength="5"
                                    placeholder="MM/YY"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>CVV:</label>
                                <input
                                    type="text"
                                    name="cvv"
                                    value={paymentData.cvv}
                                    onChange={handlePaymentChange}
                                    maxLength="4"
                                    placeholder="123"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !purchaseData.productId}
                        className="submit-btn"
                    >
                        {loading ? "Processing..." : "Complete Purchase"}
                    </button>
                </form>

                <div className="purchase-history">
                    <h3>Your Purchase History</h3>
                    {purchaseHistory.length > 0 ? (
                        <table className="purchase-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseHistory.map(purchase => (
                                    <tr key={purchase.id}>
                                        <td>{new Date(purchase.sale_date).toLocaleString()}</td>
                                        <td>{purchase.product_name}</td>
                                        <td>{purchase.quantity}</td>
                                        <td>${parseFloat(purchase.total_price).toFixed(2)}</td>
                                        <td className={`status status-${purchase.order_status}`}>
                                            {purchase.order_status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="no-purchases">No purchases made yet</p>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {response && <div className="success-message">{response}</div>}
        </div>
    );
};

export default ClientPurchase;