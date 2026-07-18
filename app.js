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
      callback(new Error("CORS blocked"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 204
}));


app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',authRoutes);
app.use('/api/',bookingRoutes); //might cause harm in future not only /api 
app.use('/api/properties',propertyRoutes);
app.use('/api',guestRoutes);
app.use('/api',reservationRoutes);
app.use('/api',reportRoutes);
app.use('/api',workflowRoutes);


module.exports=app;
