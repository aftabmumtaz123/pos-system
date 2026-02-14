# POS System

A modern, full-featured Point of Sale system built with Node.js, Express, MongoDB, EJS, and Tailwind CSS.

## 🚀 Features

### For Super Admin
- **Dashboard**: Real-time sales analytics, charts, and key metrics
- **Product Management**: Full CRUD with image upload, search, sort, and low stock alerts
- **Discount Management**: Create percentage or fixed discounts with expiry dates
- **User Management**: Create and manage cashier accounts
- **Reports**: Comprehensive sales reports with date filters and charts
- **Analytics**: Top products, top cashiers, sales trends

### For Cashiers
- **POS Interface**: Beautiful, fast point-of-sale with product grid and cart
- **Cart Management**: Add, remove, update quantities with real-time calculations
- **Discount Application**: Apply discount codes with validation
- **Multiple Payment Methods**: Cash, Card, EasyPaisa, JazzCash
- **Receipt Generation**: Automatic PDF receipt generation
- **Sales History**: View personal sales performance

### UI/UX Features
- Modern, responsive design with Tailwind CSS
- Toast notifications for all actions
- Real-time search and filtering
- Keyboard shortcuts
- Loading states and confirmations
- Beautiful error pages (404, 403, 500)
- Mobile-friendly sidebar navigation

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 🛠️ Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd E:\Jamshaid\pos-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Edit `.env` file with your settings:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/pos-system
   JWT_SECRET=your-super-secret-jwt-key
   SESSION_SECRET=your-super-secret-session-key
   
   # Initial Super Admin Credentials
   ADMIN_USERNAME=admin
   ADMIN_EMAIL=admin@pos.com
   ADMIN_PASSWORD=admin123
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # Windows (if MongoDB is installed as a service)
   net start MongoDB
   
   # Or run mongod manually
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## 👤 Default Login Credentials

**Super Admin:**
- Username: `admin`
- Password: `admin123`

After first login, you can create additional cashier accounts from the Users page.

## 📁 Project Structure

```
pos-system/
├── config/           # Database configuration
├── middleware/       # Auth, upload middleware
├── models/          # MongoDB schemas (User, Product, Discount, Sale)
├── routes/          # Express routes
├── utils/           # Helper functions (PDF generation, etc.)
├── views/           # EJS templates
│   ├── layouts/     # Base layout
│   ├── auth/        # Login, register
│   ├── admin/       # Admin pages
│   ├── cashier/     # POS and sales
│   └── errors/      # Error pages
├── public/          # Static assets
│   ├── css/         # Custom styles
│   ├── js/          # Client-side scripts
│   └── uploads/     # Product images
├── .env             # Environment variables
├── server.js        # Application entry point
└── package.json     # Dependencies
```

## 🔑 Key Technologies

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Template Engine**: EJS
- **Authentication**: JWT + Express Session
- **Styling**: Tailwind CSS (CDN)
- **Charts**: Chart.js
- **Notifications**: Toastify.js
- **PDF Generation**: Puppeteer
- **File Upload**: Multer

## 📸 Screenshots

### Admin Dashboard
- Real-time sales metrics
- Sales trend charts
- Low stock alerts
- Recent transactions

### POS Interface
- Product grid with search
- Shopping cart with quantity controls
- Discount code application
- Multiple payment methods
- One-click checkout

### Product Management
- Add/Edit products with images
- Search and sort functionality
- Low stock highlighting
- Image preview

## 🔒 Security Features

- Password hashing with bcryptjs
- Session-based authentication
- Role-based access control
- Protected routes
- Input validation
- CSRF protection ready

## 🎨 Design Philosophy

- **Modern & Clean**: Beautiful gradient cards and smooth animations
- **User-Friendly**: Intuitive navigation and clear feedback
- **Responsive**: Works on desktop, tablet, and mobile
- **Fast**: Optimized for quick transactions
- **Professional**: Premium fintech-grade UI

## 🚧 Future Enhancements

- [ ] Dark mode toggle
- [ ] Email notifications
- [ ] Barcode scanning
- [ ] Inventory alerts
- [ ] Multi-store support
- [ ] Advanced analytics
- [ ] Export reports to Excel
- [ ] Customer management

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ using modern web technologies**
