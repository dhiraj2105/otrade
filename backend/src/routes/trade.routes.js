import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { validate, tradeValidationRules, queryValidationRules } from '../utils/validators.js';
import {
    createTrade,
    getTrades,
    getTrade,
    updateTrade,
    getTradeStats,
    getEventTrades,
    settleTrades,
    createBulkTrades,
    getTradeHistory
} from '../controllers/trade.controller.js';

const router = express.Router();

// Protected routes
router.route('/')
    .post(protect, validate(tradeValidationRules.create), createTrade)
    .get(protect, validate([...queryValidationRules.pagination, ...queryValidationRules.dateRange]), getTrades);

// Trade operations
router.post('/bulk', protect, validate(tradeValidationRules.bulk), createBulkTrades);
router.post('/settle', protect, restrictTo('admin'), validate(tradeValidationRules.settle), settleTrades);

// Trade analytics
router.get('/stats', protect, getTradeStats);
router.get('/history', protect, validate(queryValidationRules.pagination), getTradeHistory);

// Individual trade operations
router.route('/:id')
    .get(protect, getTrade)
    .put(protect, validate(tradeValidationRules.update), updateTrade);

// Public routes
router.get('/event/:eventId', validate(queryValidationRules.pagination), getEventTrades);

export default router;
