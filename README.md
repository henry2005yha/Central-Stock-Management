# Warehouse Stock Management System — Startup Guide

## Quick Start

### 1. Setup PostgreSQL Database
Run these commands in psql or pgAdmin:
```sql
CREATE DATABASE warehouse_stock;
```
Then run the schema:
```
psql -U postgres -d warehouse_stock -f backend/src/migrations/schema.sql
```

### 2. Configure backend environment
Edit `backend/.env` to match your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=warehouse_stock
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 3. Seed the database (creates users, kitchens, suppliers, items, sample data)
```
cd backend
npm run seed
```

### 4. Start the backend API
```
cd backend
npm run dev
```
API runs on http://localhost:3001

### 5. Start the frontend
```
cd frontend
npm run dev
```
Frontend runs on http://localhost:5173

## Demo Login Credentials
| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | admin@warehouse.com      | admin123    |
| Manager | manager@warehouse.com    | manager123  |
| Staff   | staff@warehouse.com      | staff123    |
