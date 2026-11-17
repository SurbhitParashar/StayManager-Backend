const express=require('express');
const cookieParser=require('cookie-parser')
require('dotenv').config();

const authRoutes=require('./routes/authRoutes')
const bookingRoutes=require('./routes/bookingRoutes')
const propertyRoutes=require('./routes/propertyRoutes')
const guestRoutes=require('./routes/guestRoutes')
const reservationRoutes=require('./routes/reservationRoutes')
const reportRoutes=require('./routes/reportRoutes')
const workflowRoutes=require('./routes/workflowRoutes')

const app=express();
const cors = require('cors');

app.set('trust proxy', 1);

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://stay-manager-frontend.vercel.app'
];

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOrigins = allowedOrigins.length > 0
  ? allowedOrigins
  : defaultAllowedOrigins;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(Object.assign(new Error('CORS blocked'), { status: 403 }));
    }
  },
  credentials: true,
  optionsSuccessStatus: 204
}));


app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Cookie-authenticated writes require an explicitly trusted browser origin.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!corsOrigins.includes(req.get('origin'))) {
      return res.status(403).json({ message: 'A trusted Origin header is required' });
    }
  }
  next();
});

app.get('/health', async (req, res) => {
  try {
    await require('./config/db').query('SELECT role, token_version FROM users LIMIT 0');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/auth',authRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/',bookingRoutes); //might cause harm in future not only /api 
app.use('/api/properties',propertyRoutes);
app.use('/api',guestRoutes);
app.use('/api',reservationRoutes);
app.use('/api',reportRoutes);
app.use('/api',workflowRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ message: status === 500 ? 'An unexpected server error occurred' : 'Invalid request' });
});


module.exports=app;
