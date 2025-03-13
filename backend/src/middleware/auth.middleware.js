import { verifyToken } from '../config/jwt.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';

// Middleware to protect routes that require authentication
export const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in headers
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User account is deactivated'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }
};

// Middleware to restrict access to specific roles
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to perform this action'
            });
        }
        next();
    };
};

// Middleware to track user's last login
export const trackLastLogin = async (req, res, next) => {
    try {
        if (req.user) {
            req.user.lastLogin = new Date();
            await User.findByIdAndUpdate(req.user._id, { lastLogin: new Date() });
        }
        next();
    } catch (error) {
        logger.error('Track last login error:', error);
        next();
    }
};

// Middleware to validate user balance for trades
export const checkUserBalance = async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount) return next();

        const user = await User.findById(req.user._id);
        if (user.balance < amount) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance'
            });
        }
        next();
    } catch (error) {
        logger.error('Balance check error:', error);
        return res.status(500).json({
            success: false,
            error: 'Error checking user balance'
        });
    }
};
