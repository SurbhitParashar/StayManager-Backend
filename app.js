const express=require('express');
const cookieParser=require('cookie-parser')

const authRoutes=require('./routes/authRoutes')
const bookingRoutes=require('./routes/bookingRoutes')
const propertyRoutes=require('./routes/propertyRoutes')

const app=express();
const cors = require('cors');

const allowedOrigins = [
  "http://localhost:3000",
  "https://stay-manager-frontend.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    console.log("Incoming origin:", origin);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked"));
    }
  },
  credentials: true
}));


app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',authRoutes);
app.use('/api/',bookingRoutes); //might cause harm in future not only /api 
app.use('/api/properties',propertyRoutes);


module.exports=app;