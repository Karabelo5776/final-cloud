const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '901017181',
    database: process.env.DB_NAME || 'iwb'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');
});

// ========== MIDDLEWARE ========== //
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = decoded;
        next();
    });
};

// ========== AUTHENTICATION ROUTES ========== //
// ========== AUTHENTICATION ROUTES ========== //
// ========== AUTHENTICATION ROUTES ========== //
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    // Input validation
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Role validation
    const validRoles = ["sales", "finance", "developer", "investor", "client", "primary_partner"];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role selection!" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            message: "Password must contain: 8+ characters, uppercase, lowercase, number, and special character"
        });
    }

    // Check if email exists
    const emailCheckQuery = `SELECT COUNT(*) AS count FROM users WHERE email = ?`;
    db.query(emailCheckQuery, [email], async (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });

        if (result[0].count > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        // Role limit check
        const roleCountQuery = `SELECT COUNT(*) AS count FROM users WHERE role = ?`;
        db.query(roleCountQuery, [role], async (err, result) => {
            if (err) return res.status(500).json({ message: "Database error" });

            const roleCount = result[0].count;
            const roleLimits = {
                sales: 3,
                finance: 3,
                developer: 3,
                investor: 10,
                client: 100,
                primary_partner: 3
            };

            if (roleCount >= (roleLimits[role] || 3)) {
                return res.status(403).json({ 
                    message: `Registration denied. Max ${roleLimits[role] || 3} ${role} accounts allowed.`
                });
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 12);
                const insertQuery = `INSERT INTO users (name, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())`;
                
                db.query(insertQuery, [name, email, hashedPassword, role], (err, result) => {
                    if (err) {
                        console.error("Registration error:", err);
                        return res.status(500).json({ 
                            message: "Registration failed",
                            error: process.env.NODE_ENV === 'development' ? err.message : undefined
                        });
                    }

                    res.status(201).json({ 
                        success: true,
                        message: "User registered successfully",
                        user: { name, email, role }
                    });
                });
            } catch (error) {
                console.error("Registration error:", error);
                res.status(500).json({ 
                    message: "Server error during registration",
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });
    });
});

/*
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!["sales", "finance", "developer", "investor", "client"].includes(role)) {
        return res.status(400).json({ message: "Invalid role selection!" });
    }

    const countQuery = `SELECT COUNT(*) AS count FROM users WHERE role = ?`;
    db.query(countQuery, [role], async (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });

        const roleCount = result[0].count;
        if (roleCount >= 3) {
            return res.status(403).json({ message: `Registration denied. Max 3 ${role} accounts allowed.` });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertQuery = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
            db.query(insertQuery, [name, email, hashedPassword, role], (err, result) => {
                if (err) return res.status(500).json({ error: err });
                res.status(201).json({ message: "User registered successfully" });
            });
        } catch (error) {
            res.status(500).json({ message: "Server error during registration!" });
        }
    });
});
*/
app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        db.query(`SELECT * FROM users WHERE email = ?`, [email], async (err, results) => {
            if (err) return res.status(500).json({ error: "Database query error!" });

            if (results.length === 0) {
                return res.status(400).json({ message: "User not found" });
            }

            const user = results[0];
            if (user.role !== role) {
                return res.status(403).json({ message: "Invalid role selection!" });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role }, 
                process.env.JWT_SECRET || "secretkey", 
                { expiresIn: '1h' }
            );

            res.json({ token, user });
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login!" });
    }
});

app.get('/profile', verifyToken, (req, res) => {
    db.query(`SELECT id, name, email, role FROM users WHERE id = ?`, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results[0]);
    });
});

// ========== PRODUCT ROUTES ========== //
app.get('/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products WHERE quantity > 0', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/products', verifyToken, (req, res) => {
    const { name, description, cost_price, expenses, price, quantity } = req.body;
    const query = `INSERT INTO products (name, description, cost_price, expenses, price, quantity) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(query, [name, description, cost_price, expenses, price, quantity], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product added successfully!" });
    });
});

app.put('/products/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { name, description, cost_price, expenses, price, quantity } = req.body;
    const query = `UPDATE products SET name = ?, description = ?, cost_price = ?, expenses = ?, price = ?, quantity = ? WHERE id = ?`;
    db.query(query, [name, description, cost_price, expenses, price, quantity, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product updated successfully!" });
    });
});

app.delete('/products/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM products WHERE id = ?`;
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product deleted successfully!" });
    });
});

// ========== SALES ROUTES ========== //
app.get('/sales', verifyToken, (req, res) => {
    const query = `
        SELECT sales.id, sales.quantity, sales.total_price, sales.sale_date, 
               products.name AS product_name, products.price AS product_price 
        FROM sales 
        JOIN products ON sales.product_id = products.id
        ORDER BY sales.sale_date DESC;
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/sales', verifyToken, (req, res) => {
    const { productId, quantity } = req.body;

    db.query(`SELECT quantity, price FROM products WHERE id = ?`, [productId], (err, result) => {
        if (err) return res.status(500).json({ error: "Error fetching product details." });
        if (result.length === 0) return res.status(404).json({ error: "Product not found." });

        const availableStock = result[0].quantity;
        const productPrice = result[0].price;

        if (quantity > availableStock) {
            return res.status(400).json({ error: "Not enough stock available." });
        }

        const totalPrice = productPrice * quantity;

        const query = `INSERT INTO sales (product_id, quantity, total_price) VALUES (?, ?, ?)`;
        db.query(query, [productId, quantity, totalPrice], (err, result) => {
            if (err) return res.status(500).json({ error: "Error recording sale." });

            db.query(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, [quantity, productId], (err, updateResult) => {
                if (err) return res.status(500).json({ error: "Error updating stock." });
                res.json({ message: "Sale recorded successfully!" });
            });
        });
    });
});

app.post("/api/place-order", verifyToken, (req, res) => {
    const { productId, quantity, email, name } = req.body;

    if (!productId || !quantity || quantity < 1 || !email || !name) {
        return res.status(400).json({ error: "Invalid order data" });
    }

    db.query(`SELECT quantity, price FROM products WHERE id = ?`, [productId], (err, result) => {
        if (err) return res.status(500).json({ error: "Error fetching product details" });
        if (result.length === 0) return res.status(404).json({ error: "Product not found" });

        const availableStock = result[0].quantity;
        const productPrice = result[0].price;

        if (quantity > availableStock) {
            return res.status(400).json({ 
                error: `Only ${availableStock} units available`,
                availableStock
            });
        }

        const totalPrice = productPrice * quantity;
        const saleDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const query = `INSERT INTO sales (product_id, quantity, total_price, customer_email, customer_name, sale_date) 
                      VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.query(query, [productId, quantity, totalPrice, email, name, saleDate], (err, result) => {
            if (err) return res.status(500).json({ error: "Error recording sale" });

            db.query(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, 
            [quantity, productId], (err, updateResult) => {
                if (err) return res.status(500).json({ error: "Error updating stock" });
                
                res.json({ 
                    message: "Order placed successfully",
                    orderId: result.insertId,
                    totalPrice,
                    remainingStock: availableStock - quantity
                });
            });
        });
    });
});

// ========== FINANCE ROUTES ========== //
app.get("/finance/summary", verifyToken, async (req, res) => {
    const { period } = req.query;
  
    let dateCondition = "";
    switch (period) {
      case "daily":
        dateCondition = "WHERE DATE(s.sale_date) = CURDATE()";
        break;
      case "weekly":
        dateCondition = "WHERE YEARWEEK(s.sale_date, 1) = YEARWEEK(CURDATE(), 1)";
        break;
      case "monthly":
        dateCondition = "WHERE MONTH(s.sale_date) = MONTH(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())";
        break;
      case "yearly":
        dateCondition = "WHERE YEAR(s.sale_date) = YEAR(CURDATE())";
        break;
      default:
        dateCondition = "";
    }
  
    try {
      const query = `
        SELECT
          COALESCE(SUM(s.total_price), 0) AS revenue,
          COALESCE(SUM((p.cost_price + p.expenses) * s.quantity), 0) AS expenses,
          COALESCE(SUM(s.total_price - (p.cost_price + p.expenses) * s.quantity), 0) AS profit
        FROM sales s
        JOIN products p ON s.product_id = p.id
        ${dateCondition}
      `;
  
      const [rows] = await db.promise().query(query);
      
      res.json({
        revenue: rows[0].revenue || 0,
        expenses: rows[0].expenses || 0,
        profit: rows[0].profit || 0
      });
      
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ 
        revenue: 0,
        expenses: 0,
        profit: 0,
        message: "Error fetching financial summary" 
      });
    }
});

app.get('/finance/revenue', verifyToken, (req, res) => {
    const query = `SELECT SUM(total_price) AS total_revenue FROM sales`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ total_revenue: results[0].total_revenue || 0 });
    });
});

app.get('/finance/expenses', verifyToken, (req, res) => {
    const query = `SELECT SUM((cost_price + expenses) * quantity) AS total_expenses FROM products`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ total_expenses: results[0].total_expenses || 0 });
    });
});

app.get('/investor/monthly-sales', verifyToken, (req, res) => {
    const query = `
        SELECT 
            DATE_FORMAT(sale_date, '%Y-%m') AS month,
            SUM(total_price) AS total_sales
        FROM sales
        GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
        ORDER BY month ASC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ========== QUERY ROUTES ========== //
const getAutoReply = async (message) => {
    return new Promise((resolve) => {
        db.query(
            "SELECT auto_reply FROM queries WHERE MATCH(message) AGAINST (? IN NATURAL LANGUAGE MODE) ORDER BY created_at DESC LIMIT 1",
            [message],
            (err, results) => {
                if (err) {
                    console.error("Error finding auto-reply:", err);
                    return resolve(null);
                }
                if (results.length > 0) {
                    return resolve(results[0].auto_reply);
                }

                db.query(
                    "SELECT auto_reply FROM queries WHERE message LIKE ? ORDER BY created_at DESC LIMIT 1",
                    [`%${message}%`],
                    (err, results) => {
                        if (err || results.length === 0) {
                            return resolve(null);
                        }
                        return resolve(results[0].auto_reply);
                    }
                );
            }
        );
    });
};

app.post("/api/submit-query", verifyToken, async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const autoReply = await getAutoReply(message);
        const status = autoReply ? "complete" : "pending";

        db.query(
            "INSERT INTO queries (customer_name, customer_email, message, auto_reply, status) VALUES (?, ?, ?, ?, ?)",
            [name, email, message, autoReply, status],
            (err, result) => {
                if (err) {
                    console.error("Query insert error:", err);
                    return res.status(500).json({ error: "Database error" });
                }
                res.status(201).json({
                    message: autoReply || "Your query has been received and is under review.",
                });
            }
        );
    } catch (error) {
        console.error("Error processing query:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/api/my-queries", verifyToken, (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    db.query("SELECT * FROM queries WHERE customer_email = ? ORDER BY created_at DESC", [email], (err, results) => {
        if (err) {
            console.error("Error fetching client queries:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

app.get("/queries", verifyToken, (req, res) => {
    db.query("SELECT * FROM queries ORDER BY created_at DESC", (err, results) => {
        if (err) {
            console.error("Error fetching queries:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

app.get("/queries/pending", verifyToken, (req, res) => {
    db.query("SELECT * FROM queries WHERE status = 'pending'", (err, results) => {
        if (err) {
            console.error("Error fetching pending queries:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

app.post("/queries/respond", verifyToken, (req, res) => {
    const { queryId, response } = req.body;

    const sql = "UPDATE queries SET auto_reply = ?, status = 'complete' WHERE id = ?";
    db.query(sql, [response, queryId], (err, result) => {
        if (err) {
            console.error("Error updating query:", err);
            return res.status(500).json({ error: "Failed to send response" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Query not found" });
        }

        res.json({ message: "Response sent successfully!" });
    });
});

app.get("/api/query-stats", verifyToken, (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) AS total_queries,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_queries,
            SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) AS completed_queries,
            SUM(CASE WHEN auto_reply IS NOT NULL THEN 1 ELSE 0 END) AS auto_replied
        FROM queries
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching query stats:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(result[0]);
    });
});

// ========== CLIENT SALES ROUTE ========== //
app.post('/api/place-sale', verifyToken, (req, res) => {
    const { client_name, client_email, product_id, quantity } = req.body;

    if (!client_name || !client_email || !product_id || !quantity || quantity < 1) {
        return res.status(400).json({ error: "Invalid purchase data" });
    }

    db.query(`SELECT quantity, price, name FROM products WHERE id = ?`, [product_id], (err, result) => {
        if (err) return res.status(500).json({ error: "Error fetching product details" });
        if (result.length === 0) return res.status(404).json({ error: "Product not found" });

        const availableStock = result[0].quantity;
        const productPrice = result[0].price;
        const productName = result[0].name;

        if (quantity > availableStock) {
            return res.status(400).json({ 
                error: `Only ${availableStock} units available`,
                availableStock
            });
        }

        const totalPrice = productPrice * quantity;
        const saleDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const insertQuery = `
            INSERT INTO sales (product_id, quantity, total_price, customer_email, customer_name, product_name, sale_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(insertQuery, [product_id, quantity, totalPrice, client_email, client_name, productName, saleDate], (err, result) => {
            if (err) return res.status(500).json({ error: "Error recording client sale" });

            db.query(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, [quantity, product_id], (err, updateResult) => {
                if (err) return res.status(500).json({ error: "Error updating stock after sale" });

                res.json({ 
                    message: "Purchase placed successfully!",
                    totalPrice,
                    remainingStock: availableStock - quantity
                });
            });
        });
    });
});


// ========== VIEW CLIENT PURCHASES ROUTE ========== //
app.get('/api/client-purchases', verifyToken, (req, res) => {
    const query = `
        SELECT 
            id,
            customer_name AS client_name,
            customer_email AS client_email,
            product_name,
            quantity,
            total_price,
            sale_date AS purchase_date
        FROM sales
        WHERE customer_email IS NOT NULL
        ORDER BY sale_date DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching client purchases:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});



// ========== SYSTEM ROUTES ========== //
app.get("/api/system-status", (req, res) => {
    res.json({
        database: "MySQL Connected",
        uptime: process.uptime(),
        env: process.env.NODE_ENV || "development"
    });
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Add to server.js

// Get client purchases with filtering
app.get('/api/client-purchases', verifyToken, (req, res) => {
    const { status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        s.id,
        s.customer_name,
        s.customer_email,
        s.product_name,
        s.quantity,
        s.total_price,
        s.sale_date,
        s.order_status,
        s.payment_method,
        s.shipping_address
      FROM sales s
      WHERE s.customer_email IS NOT NULL
    `;
    
    const params = [];
    
    if (status && status !== 'all') {
      query += ' AND s.order_status = ?';
      params.push(status);
    }
    
    if (startDate) {
      query += ' AND DATE(s.sale_date) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(s.sale_date) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY s.sale_date DESC';
    
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching client purchases:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  });
  
  // Update order status
  app.put('/sales/:id/status', verifyToken, (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const query = `
      UPDATE sales 
      SET order_status = ?, 
          ${status === 'cancelled' ? 'rejection_reason = ?' : 'rejection_reason = NULL'}
      WHERE id = ?
    `;
    
    const params = status === 'cancelled' ? [status, reason, id] : [status, id];
    
    db.query(query, params, (err, result) => {
      if (err) {
        console.error('Error updating order status:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ message: 'Order status updated successfully' });
    });
  });

//============Developer

// In your server.js
app.get('/api/system-status', verifyToken, (req, res) => {
    res.json({
      database: { status: 'healthy' },
      authService: { status: 'running' },
      apiService: { status: 'active' }
    });
  });
  
  app.post('/api/backups', verifyToken, (req, res) => {
    // Implement actual backup logic
    res.json({ success: true });
  });
  

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});