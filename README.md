# Project Monitoring & Evaluation System - Backend API

A Node.js/Express backend API for monitoring and evaluating projects with MySQL database integration.

## 🚀 Features

- **RESTful API** with Express.js framework
- **MySQL Database** with raw SQL queries
- **JWT Authentication** with bcryptjs password hashing
- **File Upload Support** via Multer
- **Environment Configuration** with dotenv
- **CORS Enabled** for frontend integration
- **Error Handling** with consistent response format

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Lucasdeekay/project-monitoring-backend.git
   cd project-monitoring-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Configure your `.env` file with the following variables:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=project_monitoring

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Client Configuration
   CLIENT_URL=http://localhost:5173

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Set up the database**
   - Create a MySQL database named `project_monitoring`
   - Import the database schema (if provided)
   - Test the connection with:
   ```bash
   node -e "require('./src/config/database').testConnection()"
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```
The server will start with auto-reload functionality using nodemon.

### Production Mode
```bash
npm start
```

## 📁 Project Structure

```
project-monitoring-backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration and helper functions
│   ├── server.js                # Main application entry point
│   ├── routes/                  # API routes (to be created)
│   ├── controllers/             # Route controllers (to be created)
│   ├── middleware/              # Custom middleware (to be created)
│   └── models/                  # Data models (to be created)
├── .env                         # Environment variables (don't commit)
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore file
├── package.json                # Dependencies and scripts
├── AGENTS.md                   # Guidelines for coding agents
└── README.md                   # This file
```

## 🔧 API Endpoints

The API follows RESTful conventions with consistent response formats:

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": {}
}
```

### Authentication
Protected routes require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database

This project uses raw SQL queries with MySQL. Key database practices:

- **Parameterized Queries**: All queries use parameterized statements to prevent SQL injection
- **Connection Pooling**: Efficient database connection management
- **Error Handling**: Comprehensive database error handling

### Database Helper Functions
```javascript
const { query, testConnection } = require('./src/config/database');

// Test database connection
await testConnection();

// Execute parameterized query
const results = await query("SELECT * FROM users WHERE id = ?", [userId]);
```

## 🔒 Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Token-based authentication with expiration
- **CORS Protection**: Configurable CORS for trusted origins
- **Input Validation**: Sanitization and validation of user inputs
- **SQL Injection Prevention**: Parameterized queries for all database operations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "test name"
```

*Note: Test framework to be configured (Mocha/Chai or Jest recommended)*

## 📝 Development Guidelines

### Code Style
- **CommonJS Modules**: Uses `require()` instead of ES6 imports
- **camelCase**: Variables and functions
- **UPPER_SNAKE_CASE**: Constants
- **snake_case**: Database tables and columns

### Error Handling
All async operations use try-catch blocks with consistent error responses:
```javascript
try {
  // Database operation
  res.json({ success: true, data: result });
} catch (error) {
  console.error("Database error:", error.message);
  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}
```

## 🚀 Deployment

1. **Set production environment variables**
2. **Build the application** (if build step is added)
3. **Start the server**:
   ```bash
   NODE_ENV=production npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding guidelines
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the [AGENTS.md](./AGENTS.md) file for development guidelines
- Review the code comments for API documentation
- Test endpoints using Postman or curl

## 🔍 API Testing Example

```bash
# Test server health
curl http://localhost:5000/

# Test database connection
curl http://localhost:5000/test-db
```

---

**Note**: This is a backend API. Ensure your frontend application is configured to communicate with this server using the correct CORS settings and API endpoints.