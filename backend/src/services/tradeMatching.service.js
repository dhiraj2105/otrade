import logger  from '../utils/logger.js';
import { orderBookManager } from './orderBook.service.js';
import { priceDiscoveryService } from './priceDiscovery.service.js';
import Event from '../models/event.model.js';
import Trade from '../models/trade.model.js';
import User  from '../models/user.model.js';
import { io } from '../app.js';

class TradeMatchingService {
    constructor() {
        this.processingQueue = new Map(); // Track orders being processed
        this.maxQueueSize = 1000; // Maximum orders in queue
        this.processingTimeout = 10000; // 10 seconds timeout
    }

    // Process a new trade order
    async processOrder(order) {
        const { eventId, userId, type, position, price, amount } = order;

        try {
            // Validate event status
            const event = await Event.findById(eventId);
            if (!event || event.status !== 'trading') {
                throw new Error('Event is not available for trading');
            }

            // Check circuit breaker
            if (!priceDiscoveryService.isTradingAllowed(eventId)) {
                throw new Error('Trading is temporarily suspended');
            }

            // Validate user balance
            const user = await User.findById(userId);
            if (!user || user.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Add to processing queue
            if (!this._addToQueue(order)) {
                throw new Error('Order queue is full');
            }

            // Get order book and submit order
            const orderBook = orderBookManager.getOrderBook(eventId);
            const matches = orderBook.addOrder({
                userId,
                type,
                position,
                price,
                amount
            });

            // Process matches
            await this._processMatches(matches, event);

            // Update market price
            const fairPrice = priceDiscoveryService.calculateFairPrice(eventId);
            if (fairPrice !== null) {
                await event.updateMarketPrice(fairPrice);
            }

            // Emit order book update
            this._emitOrderBookUpdate(eventId);

            return { success: true, matches };

        } catch (error) {
            logger.error(`Order processing failed: ${error.message}`);
            throw error;
        } finally {
            // Remove from processing queue
            this._removeFromQueue(order);
        }
    }

    // Process multiple orders in bulk
    async processBulkOrders(orders) {
        const results = [];
        const errors = [];

        for (const order of orders) {
            try {
                const result = await this.processOrder(order);
                results.push({ orderId: order.id, ...result });
            } catch (error) {
                errors.push({
                    orderId: order.id,
                    error: error.message
                });
            }
        }

        return { results, errors };
    }

    // Process matched trades
    async _processMatches(matches, event) {
        for (const match of matches) {
            try {
                // Create trade records
                const buyTrade = await Trade.create({
                    eventId: event._id,
                    userId: match.buyUserId,
                    type: 'buy',
                    position: 'yes',
                    amount: match.amount,
                    price: match.price,
                    status: 'completed',
                    matchId: match.id
                });

                const sellTrade = await Trade.create({
                    eventId: event._id,
                    userId: match.sellUserId,
                    type: 'sell',
                    position: 'yes',
                    amount: match.amount,
                    price: match.price,
                    status: 'completed',
                    matchId: match.id
                });

                // Update user balances
                await Promise.all([
                    User.findByIdAndUpdate(match.buyUserId, {
                        $inc: { balance: -match.amount }
                    }),
                    User.findByIdAndUpdate(match.sellUserId, {
                        $inc: { balance: match.amount }
                    })
                ]);

                // Update event statistics
                await event.updateTradeStats(match.amount, match.price);

                // Emit trade notifications
                this._emitTradeNotifications(buyTrade, sellTrade);

            } catch (error) {
                logger.error(`Match processing failed: ${error.message}`);
                // Continue processing other matches
            }
        }
    }

    // Add order to processing queue
    _addToQueue(order) {
        if (this.processingQueue.size >= this.maxQueueSize) {
            return false;
        }

        const queueEntry = {
            order,
            timestamp: Date.now()
        };

        this.processingQueue.set(order.id, queueEntry);

        // Set timeout to remove stale orders
        setTimeout(() => {
            this._removeFromQueue(order);
        }, this.processingTimeout);

        return true;
    }

    // Remove order from processing queue
    _removeFromQueue(order) {
        this.processingQueue.delete(order.id);
    }

    // Emit order book update via WebSocket
    _emitOrderBookUpdate(eventId) {
        const orderBook = orderBookManager.getOrderBook(eventId);
        const depth = orderBook.getDepth();
        const stats = orderBook.getStats();
        const priceStats = priceDiscoveryService.getPriceStats(eventId);

        io.to(`event:${eventId}`).emit('orderBookUpdate', {
            eventId,
            depth,
            stats,
            priceStats
        });
    }

    // Emit trade notifications via WebSocket
    _emitTradeNotifications(buyTrade, sellTrade) {
        // Notify buyers
        io.to(`user:${buyTrade.userId}`).emit('tradeUpdate', {
            trade: buyTrade,
            type: 'execution'
        });

        // Notify sellers
        io.to(`user:${sellTrade.userId}`).emit('tradeUpdate', {
            trade: sellTrade,
            type: 'execution'
        });

        // Notify event subscribers
        io.to(`event:${buyTrade.eventId}`).emit('tradeUpdate', {
            eventId: buyTrade.eventId,
            price: buyTrade.price,
            amount: buyTrade.amount,
            type: 'market'
        });
    }

    // Get queue statistics
    getQueueStats() {
        const now = Date.now();
        const queueStats = {
            size: this.processingQueue.size,
            maxSize: this.maxQueueSize,
            oldestOrder: null,
            averageAge: 0
        };

        if (this.processingQueue.size > 0) {
            const ages = Array.from(this.processingQueue.values())
                .map(entry => now - entry.timestamp);

            queueStats.oldestOrder = Math.max(...ages);
            queueStats.averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
        }

        return queueStats;
    }

    // Clean up stale orders
    cleanupStaleOrders() {
        const now = Date.now();
        for (const [orderId, entry] of this.processingQueue.entries()) {
            if (now - entry.timestamp > this.processingTimeout) {
                this.processingQueue.delete(orderId);
            }
        }
    }
}

export const tradeMatchingService = new TradeMatchingService();
