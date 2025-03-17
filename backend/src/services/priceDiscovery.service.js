import  logger  from '../utils/logger.js';
import { orderBookManager } from './orderBook.service.js';

class PriceDiscoveryService {
    constructor() {
        this.priceCache = new Map(); // Cache of latest prices
        this.volatilityThreshold = 0.1; // 10% price change threshold
        this.circuitBreakerDuration = 5 * 60 * 1000; // 5 minutes
        this.circuitBreakers = new Map();
    }

    // Calculate fair price based on order book and recent trades
    calculateFairPrice(eventId) {
        const orderBook = orderBookManager.getOrderBook(eventId);
        const bookStats = orderBook.getStats();
        const recentTrades = orderBook.getRecentTrades(10);
        
        // Get order book mid price
        const midPrice = bookStats.marketPrice;

        // Calculate VWAP from recent trades
        const vwap = this._calculateVWAP(recentTrades);

        // Get last traded price
        const lastPrice = bookStats.lastPrice;

        // Combine different price signals with weights
        const fairPrice = this._weightedAverage([
            { value: midPrice, weight: 0.4 },
            { value: vwap, weight: 0.4 },
            { value: lastPrice, weight: 0.2 }
        ]);

        // Check for circuit breaker conditions
        if (this._shouldTriggerCircuitBreaker(eventId, fairPrice)) {
            this._triggerCircuitBreaker(eventId);
            logger.warn(`Circuit breaker triggered for event ${eventId}`);
            return null;
        }

        // Update price cache
        this.priceCache.set(eventId, {
            price: fairPrice,
            timestamp: Date.now()
        });

        return fairPrice;
    }

    // Calculate Volume Weighted Average Price
    _calculateVWAP(trades) {
        if (trades.length === 0) return null;

        const totalVolume = trades.reduce((sum, trade) => sum + trade.amount, 0);
        const weightedSum = trades.reduce(
            (sum, trade) => sum + trade.price * trade.amount, 
            0
        );

        return totalVolume > 0 ? weightedSum / totalVolume : null;
    }

    // Calculate weighted average of price signals
    _weightedAverage(signals) {
        const validSignals = signals.filter(s => s.value !== null);
        if (validSignals.length === 0) return 50; // Default neutral price

        const weightSum = validSignals.reduce((sum, s) => sum + s.weight, 0);
        const weightedSum = validSignals.reduce(
            (sum, s) => sum + s.value * s.weight, 
            0
        );

        return Math.round(weightedSum / weightSum);
    }

    // Check if price change should trigger circuit breaker
    _shouldTriggerCircuitBreaker(eventId, newPrice) {
        // Skip if circuit breaker is already active
        if (this.circuitBreakers.has(eventId)) {
            return false;
        }

        const cached = this.priceCache.get(eventId);
        if (!cached) return false;

        const priceChange = Math.abs(newPrice - cached.price) / cached.price;
        return priceChange > this.volatilityThreshold;
    }

    // Trigger circuit breaker for an event
    _triggerCircuitBreaker(eventId) {
        this.circuitBreakers.set(eventId, {
            triggeredAt: Date.now(),
            expiresAt: Date.now() + this.circuitBreakerDuration
        });

        // Schedule circuit breaker removal
        setTimeout(() => {
            this.circuitBreakers.delete(eventId);
            logger.info(`Circuit breaker removed for event ${eventId}`);
        }, this.circuitBreakerDuration);
    }

    // Check if trading is allowed (circuit breaker not active)
    isTradingAllowed(eventId) {
        const breaker = this.circuitBreakers.get(eventId);
        if (!breaker) return true;

        // Remove expired circuit breaker
        if (Date.now() > breaker.expiresAt) {
            this.circuitBreakers.delete(eventId);
            return true;
        }

        return false;
    }

    // Get price statistics for an event
    getPriceStats(eventId) {
        const orderBook = orderBookManager.getOrderBook(eventId);
        const bookStats = orderBook.getStats();
        const depth = orderBook.getDepth(5);
        const cached = this.priceCache.get(eventId);

        return {
            currentPrice: bookStats.marketPrice,
            lastTradePrice: bookStats.lastPrice,
            fairPrice: cached ? cached.price : null,
            priceChange24h: this._calculate24hPriceChange(eventId),
            volume24h: bookStats.volume24h,
            bestBid: depth.bids[0]?.price || null,
            bestAsk: depth.asks[0]?.price || null,
            spread: depth.spread,
            circuitBreaker: this.circuitBreakers.has(eventId)
        };
    }

    // Calculate 24-hour price change
    _calculate24hPriceChange(eventId) {
        const orderBook = orderBookManager.getOrderBook(eventId);
        const trades = orderBook.getRecentTrades();
        
        if (trades.length < 2) return 0;

        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const oldTrades = trades.filter(t => t.timestamp < oneDayAgo);
        
        if (oldTrades.length === 0) return 0;

        const oldPrice = oldTrades[oldTrades.length - 1].price;
        const currentPrice = trades[trades.length - 1].price;

        return ((currentPrice - oldPrice) / oldPrice) * 100;
    }

    // Get market liquidity score (0-100)
    getLiquidityScore(eventId) {
        const orderBook = orderBookManager.getOrderBook(eventId);
        const depth = orderBook.getDepth(10);
        const stats = orderBook.getStats();

        // Factors affecting liquidity score
        const spreadScore = this._calculateSpreadScore(depth.spread);
        const depthScore = this._calculateDepthScore(depth);
        const volumeScore = this._calculateVolumeScore(stats.volume24h);
        const orderCountScore = this._calculateOrderCountScore(
            stats.buyOrderCount + stats.sellOrderCount
        );

        // Weighted average of factors
        return Math.round(
            spreadScore * 0.3 +
            depthScore * 0.3 +
            volumeScore * 0.2 +
            orderCountScore * 0.2
        );
    }

    // Calculate spread component of liquidity score
    _calculateSpreadScore(spread) {
        if (spread === 0) return 100;
        const maxSpread = 20; // Maximum acceptable spread
        return Math.max(0, 100 * (1 - spread / maxSpread));
    }

    // Calculate depth component of liquidity score
    _calculateDepthScore(depth) {
        const totalVolume = [
            ...depth.bids,
            ...depth.asks
        ].reduce((sum, level) => sum + level.amount, 0);

        const targetVolume = 1000; // Target volume for 100% score
        return Math.min(100, (totalVolume / targetVolume) * 100);
    }

    // Calculate volume component of liquidity score
    _calculateVolumeScore(volume24h) {
        const targetVolume = 5000; // Target 24h volume for 100% score
        return Math.min(100, (volume24h / targetVolume) * 100);
    }

    // Calculate order count component of liquidity score
    _calculateOrderCountScore(orderCount) {
        const targetCount = 50; // Target number of orders for 100% score
        return Math.min(100, (orderCount / targetCount) * 100);
    }
}

export const priceDiscoveryService = new PriceDiscoveryService();
