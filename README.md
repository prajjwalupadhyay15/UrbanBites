# 🍔 UrbanBites

UrbanBites is a comprehensive, full-stack food delivery application featuring real-time order tracking, AI-powered customer support, live partner dashboards, and a robust microservice-inspired monolithic backend.

This repository contains both the frontend web application and the backend API server.

---

## 🏗️ Architecture & Tech Stack

### 🎨 Frontend (`/UrbanBites`)
A modern, responsive Single Page Application (SPA) built with React and Vite.
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4, Framer Motion for animations
- **State Management**: Zustand (Global), React Query (Server state/caching)
- **Routing**: React Router DOM v7
- **Maps & Tracking**: Leaflet & React-Leaflet
- **Real-time Communication**: SockJS + STOMP (WebSockets)
- **Data Visualization**: Recharts

### ⚙️ Backend (`/UrbanBitesBackend`)
A robust, secure, and scalable REST API built with Spring Boot.
- **Framework**: Spring Boot 3.3 (Java 21)
- **Primary Database**: PostgreSQL (Relational data: Users, Orders, Menu, Wallet)
- **NoSQL Database**: MongoDB (Unstructured data: Chat logs, Geolocation tracking history)
- **Database Migrations**: Flyway
- **Authentication**: JWT (JSON Web Tokens) & Spring Security
- **Real-time Communication**: Spring WebSocket + STOMP
- **Payments**: Razorpay Integration
- **Storage**: Cloudinary (Image uploads)
- **Email/Notifications**: Brevo (Sendinblue) SMTP
- **AI Integration**: Groq API (LLM-powered Chatbot)

---

## ✨ Key Features

### 👤 For Customers
- Browse restaurants, view menus, and search for items.
- Real-time order tracking with live delivery agent locations on a map.
- Built-in wallet system (top-up, pay from wallet, view transactions).
- Apply discount coupons and promo codes.
- Rate and review restaurants and specific menu items.
- 24/7 AI Chatbot Support for queries and assistance.

### 🏪 For Restaurant Partners
- Dedicated partner dashboard to manage restaurant details.
- Menu management: add, edit, and toggle stock status of items.
- Real-time order receiving and status updates (Preparing, Ready).
- Earnings tracking and withdrawal requests.
- Analytics dashboard (sales, popular items, ratings).

### 🛵 For Delivery Agents
- Live dispatch assignment system (auto-assignment based on proximity).
- Real-time GPS location broadcasting.
- Order delivery workflow management.

### 🛡️ For Administrators
- Comprehensive admin dashboard.
- Manage users, partners, and delivery agents.
- Resolve order disputes (customer vs. partner/agent).
- Review moderation and payout controls for partners.
- Create and manage global coupon campaigns.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Java 21 JDK
- PostgreSQL
- MongoDB
- Maven

### Setting up the Backend
1. Navigate to the backend directory:
   ```bash
   cd UrbanBitesBackend
   ```
2. Configure your database and API keys in `src/main/resources/application.properties` (or use environment variables).
   You will need credentials for PostgreSQL, MongoDB, Cloudinary, Razorpay, Brevo SMTP, and Groq API.
3. Build and run the Spring Boot application:
   ```bash
   ./mvnw clean install -DskipTests
   ./mvnw spring-boot:run
   ```
   *The backend server will start on `http://localhost:8081`.*

### Setting up the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd UrbanBites
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file in the `UrbanBites` folder:
   ```env
   VITE_API_BASE_URL=http://localhost:8081
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend application will run on `http://localhost:5173`.*

---

## 📂 Project Structure

```
UrbanBites/
├── UrbanBites/                  # Frontend React Application
│   ├── src/
│   │   ├── api/                 # Axios API service integrations
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page views (Admin, Home, Partner, etc.)
│   │   ├── store/               # Zustand state stores
│   │   └── App.jsx              # Main application router
│   ├── package.json
│   └── vite.config.js
│
└── UrbanBitesBackend/           # Backend Spring Boot Application
    ├── src/main/java/com/prajjwal/UrbanBites/
    │   ├── controller/          # REST API endpoints
    │   ├── entity/              # JPA/Mongo Data Models
    │   ├── service/             # Business Logic
    │   ├── repository/          # Database interfaces
    │   ├── security/            # JWT & Security config
    │   ├── websocket/           # STOMP/WebSocket controllers
    │   └── dto/                 # Data Transfer Objects
    ├── src/main/resources/
    │   ├── db/migration/        # Flyway SQL scripts
    │   └── application.properties # App configuration
    └── pom.xml
```

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
