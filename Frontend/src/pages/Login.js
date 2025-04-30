import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("sales");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await axios.post("http://localhost:5000/login", { 
                email, 
                password, 
                role 
            });

            // Store all user data
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            localStorage.setItem("userRole", res.data.user.role);
            localStorage.setItem("userId", res.data.user.id);

            // Redirect based on user role
            switch (res.data.user.role) {
                case "sales":
                    navigate("/sales");
                    break;
                case "finance":
                    navigate("/income-statement");
                    break;
                case "developer":
                    navigate("/developer");
                    break;
                case "investor":
                    navigate("/investor-dashboard");
                    break;
                case "client":
                    navigate("/clientqueryform");
                    break;
                case "primary_partner": // Note: Changed from "primary-partner" to match backend
                    navigate("/primary-partner");
                    break;
                default:
                    navigate("/");
            }
        } catch (error) {
            console.error("Login Error:", error);
            setError(error.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="iwb-login-portal">
            <div className="iwb-login-container">
                <div className="iwb-login-left"></div>

                <div className="iwb-login-right">
                    <div className="iwb-login-header">
                        <div className="iwb-logo-placeholder"></div>
                        <h2 className="iwb-login-title">IWB Portal Login</h2>
                        <p className="iwb-login-subtitle">Secure access to your workspace</p>
                    </div>
                    
                    {error && <div className="iwb-login-error">{error}</div>}
                    
                    <form className="iwb-login-form" onSubmit={handleLogin}>
                        <div className="iwb-input-group">
                            <label htmlFor="email">Email</label>
                            <input 
                                type="email"
                                id="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="iwb-input-group">
                            <label htmlFor="password">Password</label>
                            <input 
                                type="password"
                                id="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="iwb-input-group">
                            <label htmlFor="role">Role</label>
                            <select 
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                required
                            >
                                <option value="sales">Sales Personnel</option>
                                <option value="finance">Finance Personnel</option>
                                <option value="developer">Developer</option>
                                <option value="investor">Investor</option>
                                <option value="client">Client</option>
                                <option value="primary_partner">Primary Partner (IWC)</option>
                            </select>
                        </div>

                        <button 
                            className="iwb-login-button" 
                            type="submit" 
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="iwb-button-loading">
                                    <span className="iwb-spinner"></span>
                                    Authenticating...
                                </span>
                            ) : (
                                "Login"
                            )}
                        </button>
                    </form>

                    <div className="iwb-login-footer">
                        <p>
                            Don't have an account? <Link to="/register">Register here</Link>
                        </p>
                        <p>
                            <Link to="/">← Return to Home</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;