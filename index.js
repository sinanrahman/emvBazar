require('dotenv').config();
const path = require('path');

const express = require('express');
const app = express();
const port = process.env.PORT || 3005;

const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');


// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));



// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', authRoutes);
app.use('/', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
