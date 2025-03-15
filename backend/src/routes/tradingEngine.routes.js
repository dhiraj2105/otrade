import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { validate, tradingEngineValidationRules } from '../utils/validators.js';
import {
    placeOrder,
    getOrderBook,
    getMarketMetrics,
    getUserLimits,
    cancelOrder,
    getRecentTrades
} from '../controllers/tradingEngine.controller.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - eventId
 *         - type
 *         - position
 *         - price
 *         - amount
 *       properties:
 *         eventId:
 *           type: string
 *           description: ID of the event to trade on
 *         type:
 *           type: string
 *           enum: [buy, sell]
 *           description: Order type
 *         position:
 *           type: string
 *           enum: [yes, no]
 *           description: Trading position
 *         price:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Order price
 *         amount:
 *           type: number
 *           minimum: 1
 *           description: Order amount
 *     OrderBook:
 *       type: object
 *       properties:
 *         bids:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               amount:
 *                 type: number
 *         asks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               amount:
 *                 type: number
 *     MarketMetrics:
 *       type: object
 *       properties:
 *         vwap:
 *           type: number
 *           description: Volume Weighted Average Price
 *         liquidity:
 *           type: number
 *           description: Market liquidity score
 *         volatility:
 *           type: number
 *           description: Price volatility
 *         marketQuality:
 *           type: number
 *           description: Overall market quality score
 *         circuitBreaker:
 *           type: object
 *           properties:
 *             active:
 *               type: boolean
 *             reason:
 *               type: string
 *     UserLimits:
 *       type: object
 *       properties:
 *         positionLimit:
 *           type: number
 *           description: Maximum position size allowed
 *         dailyVolumeLimit:
 *           type: number
 *           description: Maximum daily trading volume
 *         remainingVolume:
 *           type: number
 *           description: Remaining volume for the day
 *         riskLevel:
 *           type: string
 *           enum: [low, moderate, high]
 */

/**
 * @swagger
 * tags:
 *   name: Trading
 *   description: Trading engine endpoints
 */

const router = express.Router();

/**
 * @swagger
 * /api/trading/order:
 *   post:
 *     summary: Place a new order
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Invalid input or insufficient balance
 *       401:
 *         description: Not authenticated
 */
router.post('/order', protect, validate(tradingEngineValidationRules.placeOrder), placeOrder);

/**
 * @swagger
 * /api/trading/order/{eventId}/{orderId}:
 *   delete:
 *     summary: Cancel an existing order
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to cancel
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Order not found
 */
router.delete('/order/:eventId/:orderId', protect, validate(tradingEngineValidationRules.cancelOrder), cancelOrder);

/**
 * @swagger
 * /api/trading/orderbook/{eventId}:
 *   get:
 *     summary: Get order book for an event
 *     tags: [Trading]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: levels
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of price levels to return
 *     responses:
 *       200:
 *         description: Order book data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderBook'
 */
router.get('/orderbook/:eventId', validate(tradingEngineValidationRules.getOrderBook), getOrderBook);

/**
 * @swagger
 * /api/trading/metrics/{eventId}:
 *   get:
 *     summary: Get market metrics for an event
 *     tags: [Trading]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Market metrics data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketMetrics'
 */
router.get('/metrics/:eventId', validate(tradingEngineValidationRules.getMarketMetrics), getMarketMetrics);

/**
 * @swagger
 * /api/trading/trades/{eventId}:
 *   get:
 *     summary: Get recent trades for an event
 *     tags: [Trading]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of trades to return
 *     responses:
 *       200:
 *         description: Recent trades data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   price:
 *                     type: number
 *                   amount:
 *                     type: number
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 */
router.get('/trades/:eventId', validate(tradingEngineValidationRules.getRecentTrades), getRecentTrades);

/**
 * @swagger
 * /api/trading/limits:
 *   get:
 *     summary: Get user's trading limits
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's trading limits
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserLimits'
 *       401:
 *         description: Not authenticated
 */
router.get('/limits', protect, getUserLimits);

export default router;
