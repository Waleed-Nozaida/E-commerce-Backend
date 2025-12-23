# E-commerce Backend API (Assignment #4)

A robust RESTful API built with **Node.js**, **Express**, and **PostgreSQL** for managing e-commerce products and orders. This project was developed as part of Assignment #4 to demonstrate backend architecture, database persistence, and cloud deployment.

**Live Demo:** `http://15.206.211.113`

## 🚀 Features

*   **Product Management:** Create, Read, Update, and Delete (CRUD) products.
*   **Order Management:** Place orders and retrieve order history.
*   **Automatic Calculation:** Automatically calculates total order price on the backend.
*   **Database Persistence:** Uses PostgreSQL to store data permanently.
*   **Auto-Initialization:** The server automatically detects if the database or tables are missing and creates them on startup.
*   **Cloud Ready:** Deployed on **AWS EC2** (Ubuntu Linux) connected to **AWS RDS** (Managed PostgreSQL).

## 🛠 Technology Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** PostgreSQL
*   **Driver:** `pg` (node-postgres)
*   **Deployment:** AWS EC2 (Compute), AWS RDS (Database), Nginx (Reverse Proxy), PM2 (Process Manager).

---

## ⚙️ Local Installation & Setup

If you want to run this API on your local machine:

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Waleed-Nozaida/E-commerce-Backend.git
    cd E-commerce-Backend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. You can use your local Postgres credentials:
    ```ini
    DB_NAME=e-commerce
    DB_USER=postgres
    DB_HOST=localhost
    DB_PASSWORD=your_local_password
    PORT=5600
    ```

4.  **Start the Server**
    ```bash
    node server.js
    ```
    *The server will automatically create the `e-commerce` database and the required `products` and `orders` tables if they don't exist.*

---

## 📖 API Documentation

### 1. Products

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Retrieve all products. |
| `GET` | `/api/products/:id` | Retrieve a single product by ID. |
| `POST` | `/api/products` | Create a new product. |
| `PATCH` | `/api/products/:id` | Update specific fields of a product. |
| `DELETE` | `/api/products/:id` | Delete a product. |

**Example POST Body:**
```json
{
  "title": "Wireless Headphones",
  "price": 15000,
  "image_url": "https://example.com/headphones.jpg"
}
```

### 2. Orders

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/orders` | Retrieve all placed orders. |
| `POST` | `/api/orders` | Place a new order (calculates total automatically). |

**Example POST Body:**
```json
{
  "products": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 1 }
  ]
}
```

---

## ☁️ Deployment Guide (AWS)

This project was deployed manually to **AWS** to ensure full control over the infrastructure.

### Architecture
*   **AWS RDS:** A managed PostgreSQL Free Tier instance (`db.t4g.micro`) handles data persistence.
*   **AWS EC2:** An Ubuntu 24.04 server (`t3.micro`) hosts the Node.js application.
*   **Nginx:** Acts as a reverse proxy to forward traffic from Port 80 (HTTP) to the application port.
*   **PM2:** Manages the Node.js process to ensure it stays online 24/7.

### Steps taken to Deploy:

1.  **Database Setup (RDS):**
    *   Created a PostgreSQL instance on AWS RDS.
    *   Configured Security Groups to allow traffic from the EC2 instance.

2.  **Server Provisioning (EC2):**
    *   Launched an Ubuntu Server instance.
    *   Installed dependencies: `sudo apt install nodejs npm nginx`.
    *   Cloned the GitHub repository via SSH.

3.  **Configuration:**
    *   Created a production `.env` file on the server with RDS credentials:
        ```ini
        DB_HOST=my-rds-endpoint.ap-south-1c.rds.amazonaws.com
        DB_USER=postgres
        DB_PASSWORD=xxxxxxx
        DB_NAME=postgres
        PORT=5600
        ```

4.  **Process Management:**
    *   Used **PM2** to keep the app running in the background:
        ```bash
        pm2 start server.js --name "ecommerce-api"
        ```

5.  **Reverse Proxy (Nginx):**
    *   Configured Nginx to forward public traffic from Port 80 to Port 5600.
    *   Modified `/etc/nginx/sites-available/default`:
        ```nginx
        server {
            listen 80;
            location / {
                proxy_pass http://localhost:5600;
                # ... headers ...
            }
        }
        ```

---

## 💡 Code Highlights

### Smart Database Initialization
One key feature of `server.js` is the self-healing database logic. Upon starting, the server:
1.  Connects to the default `postgres` database.
2.  Checks if the target `DB_NAME` exists. If not, it creates it using raw SQL (`CREATE DATABASE`).
3.  Reconnects to the new database.
4.  Checks information schemas to see if tables `products` and `orders` exist.
5.  Creates the tables automatically if they are missing.

This ensures the code works immediately on any machine (Local or Cloud) without needing manual SQL scripts.

### Port Flexibility
The application respects cloud environment variables via:
```javascript
const PORT = process.env.PORT || 5600;
```
This allows AWS or other cloud providers to inject their preferred port, falling back to 5600 for local development.