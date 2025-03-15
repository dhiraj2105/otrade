import { orderBookManager } from '../services/orderBook.service.js';
import { priceDiscoveryService } from '../services/priceDiscovery.service.js';
import { tradeMatchingService } from '../services/tradeMatching.service.js';
import { riskManagementService } from '../services/riskManagement.service.js';
import { ApiError } from '../utils/errors.js';

export const placeOrder = async (req, res) => {
    try {
        const { eventId, type, position, price, amount } = req.body;
        const userId = req.user.id;

        // Validate trade through risk management
        await riskManagementService.validateTrade({
            eventId,
            userId,
            type,
            position,
            amount,
            price
        });

        // Process order through matching engine
        const result = await tradeMatchingService.processOrder({
            id: `order_${Date.now()}`,
            eventId,
            userId,
            type,
            position,
            price,
            amount
        });

        res.json(result);
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const getOrderBook = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { levels = 10 } = req.query;

        const orderBook = orderBookManager.getOrderBook(eventId);
        const depth = orderBook.getDepth(parseInt(levels));
        const stats = orderBook.getStats();
        const priceStats = priceDiscoveryService.getPriceStats(eventId);

        res.json({
            depth,
            stats,
            priceStats
        });
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const getMarketMetrics = async (req, res) => {
    try {
        const { eventId } = req.params;

        const orderBook = orderBookManager.getOrderBook(eventId);
        const liquidityScore = priceDiscoveryService.getLiquidityScore(eventId);
        const riskMetrics = await riskManagementService.getEventRiskMetrics(eventId);
        const recentTrades = orderBook.getRecentTrades(10);

        res.json({
            liquidityScore,
            riskMetrics,
            recentTrades,
            marketQuality: riskMetrics.marketQuality
        });
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const getUserLimits = async (req, res) => {
    try {
        const userId = req.user.id;
        const limits = await riskManagementService.getUserLimits(userId);
        res.json(limits);
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const { eventId, orderId } = req.params;
        const userId = req.user.id;

        const orderBook = orderBookManager.getOrderBook(eventId);
        const order = orderBook.cancelOrder(orderId);

        if (order.userId !== userId) {
            throw new ApiError('Unauthorized to cancel this order', 403);
        }

        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const getRecentTrades = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { limit = 50 } = req.query;

        const orderBook = orderBookManager.getOrderBook(eventId);
        const trades = orderBook.getRecentTrades(parseInt(limit));

        res.json(trades);
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};
