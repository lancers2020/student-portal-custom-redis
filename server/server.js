const express = require('express');
const cors = require('cors');
const { redisClient } = require('./redisClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Redis connection
(async () => {
    try {
        await redisClient.connect();
        console.log('Redis client connected');
    } catch (error) {
        console.error('Redis connection error:', error);
    }
})();

// Auth Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await redisClient.get(`user:${decoded.id}`, 'json');
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Routes
require('./routes/auth')(app, redisClient, bcrypt, jwt, JWT_SECRET);
require('./routes/profile')(app, redisClient, authMiddleware);
require('./routes/academic')(app, redisClient, authMiddleware);
require('./routes/notebook')(app, redisClient, authMiddleware);
require('./routes/timeline')(app, redisClient, authMiddleware);
require('./routes/organization')(app, redisClient, authMiddleware);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});