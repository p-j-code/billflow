const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
require('dotenv').config();

const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes     = require('./routes/auth');
const businessRoutes = require('./routes/business');
const partyRoutes    = require('./routes/party');
const hsnRoutes      = require('./routes/hsn');
const dashboardRoutes= require('./routes/dashboard');
const invoiceRoutes  = require('./routes/invoices');
const noteRoutes     = require('./routes/notes');
const paymentRoutes  = require('./routes/payments');
const reportRoutes   = require('./routes/reports');
const publicRoutes   = require('./routes/public');
const exportRoutes   = require('./routes/exports');
const uploadRoutes   = require('./routes/uploads');
const emailRoutes    = require('./routes/email');
const razorpayRoutes = require('./routes/razorpay');
const auditRoutes    = require('./routes/audit');
const usersRoutes    = require('./routes/users');

const app = express();
connectDB();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

const limiter     = rateLimit({ windowMs:15*60*1000, max:300, message:{success:false,message:'Too many requests.'} });
const authLimiter = rateLimit({ windowMs:15*60*1000, max:10,  message:{success:false,message:'Too many login attempts.'} });
app.use('/api/', limiter);

// Raw body for Razorpay webhook (before express.json)
app.use('/api/webhooks', express.raw({ type: '*/*' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Serve uploaded files (local fallback for logos/signatures)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.get('/health', (_, res) => res.json({ status:'ok', service:'billflow-api', version:'1.7', timestamp: new Date().toISOString() }));

// ── Public (no auth) ──────────────────────────────────────────────
app.use('/api/public',           publicRoutes);
app.use('/api/webhooks/razorpay', razorpayRoutes);

// ── Protected ────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/business',  businessRoutes);
app.use('/api/business',  uploadRoutes);     // /:id/upload-logo, /:id/upload-signature
app.use('/api/parties',   partyRoutes);
app.use('/api/hsn',       hsnRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices',  invoiceRoutes);
app.use('/api/invoices',  emailRoutes);      // /:id/send-email (prefix handled in emailRoutes)
app.use('/api/invoices',  razorpayRoutes);   // /:id/payment-link
app.use('/api/notes',     noteRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/exports',   exportRoutes);
app.use('/api/audit',     auditRoutes);
app.use('/api/users',     usersRoutes);

app.use('*', (req, res) => res.status(404).json({ success:false, message:`Route ${req.originalUrl} not found` }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 BillFlow API v1.7 running on port ${PORT} [${process.env.NODE_ENV}]`));
module.exports = app;
