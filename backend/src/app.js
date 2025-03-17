import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';

import connectDB from './config/database.js';
import logger from './utils/logger.js';
import { globalErrorHandler } from './utils/errors.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import eventRoutes from './routes/event.routes.js';
import tradeRoutes from './routes/trade.routes.js';
import tradingEngineRoutes from './routes/tradingEngine.routes.js';
import adminRoutes from './routes/admin.routes.js';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Security Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10kb' })); // Body limit is 10kb
app.use(morgan('dev'));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/trading', tradingEngineRoutes);
app.use('/api/admin', adminRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Opinion Trading Platform API Documentation',
    customfavIcon: '/favicon.ico'
}));

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes will be mounted here
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Opinion Trading Platform API',
        version: '1.0.0',
        docs: '/api-docs' // We'll add Swagger documentation later
    });
});

// WebSocket event handlers
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Market data subscription
    socket.on('subscribe_market', (marketId) => {
        socket.join(`market_${marketId}`);
        logger.info(`Client ${socket.id} subscribed to market ${marketId}`);
    });

    // Event updates subscription
    socket.on('subscribe_event', (eventId) => {
        socket.join(`event_${eventId}`);
        logger.info(`Client ${socket.id} subscribed to event ${eventId}`);
    });

    // Trade updates subscription
    socket.on('subscribe_trades', (userId) => {
        socket.join(`user_trades_${userId}`);
        logger.info(`Client ${socket.id} subscribed to trades for user ${userId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: {
            message: process.env.NODE_ENV === 'development' ? err.message : 'Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    // Don't exit the process in development
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Connect to MongoDB
await connectDB();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    logger.info(`WebSocket server is ready for connections`);
});

// Export for testing purposes
export { app, io };
