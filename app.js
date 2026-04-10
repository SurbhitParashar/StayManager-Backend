const express=require('express');
const cookieParser=require('cookie-parser')

const authRoutes=require('./routes/authRoutes')
const bookingRoutes=require('./routes/bookingRoutes')
const propertyRoutes=require('./routes/propertyRoutes')

const app=express();
const cors = require('cors');

app.use(cors({
  origin: 'https://stay-manager-frontend.vercel.app/',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',authRoutes);
app.use('/api',bookingRoutes);
app.use('/api',propertyRoutes);


module.exports=app;