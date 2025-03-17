import logger from '../utils/logger.js';
import  Event from '../models/event.model.js';
import  Trade from '../models/trade.model.js';
import  User  from '../models/user.model.js';
import { priceDiscoveryService } from './priceDiscovery.service.js';

class RiskManagementService {
    constructor() {
        // Risk limits
        this.limits = {
            maxPositionSize: 10000, // Maximum position size per event
            maxDailyVolume: 50000, // Maximum daily trading volume per user
            maxPriceDeviation: 0.2, // Maximum 20% price deviation
            minLiquidityScore: 30, // Minimum liquidity score to allow trading
            maxLossLimit: 5000 // Maximum loss limit per user per day
        };

        // Cache for position tracking
        this.positionCache = new Map();
        this.volumeCache = new Map();
        this.lossCache = new Map();

        // Clean up caches daily
        setInterval(() => this._cleanupCaches(), 24 * 60 * 60 * 1000);
    }

    // Validate trade before execution
    async validateTrade(trade) {
        const { eventId, userId, type, position, amount, price } = trade;

        try {
            // Check event status
            const event = await Event.findById(eventId);
            if (!event || event.status !== 'trading') {
                throw new Error('Event is not available for trading');
            }

            // Check user status and balance
            const user = await User.findById(userId);
            if (!user || user.status !== 'active') {
                throw new Error('User account is not active');
            }

            if (user.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Validate position size
            await this._validatePositionSize(eventId, userId, amount);

            // Validate daily volume
            await this._validateDailyVolume(userId, amount);

            // Validate price deviation
            this._validatePriceDeviation(event, price);

            // Check liquidity
            this._validateLiquidity(eventId);

            // Validate loss limit
            await this._validateLossLimit(userId);

            return true;

        } catch (error) {
            logger.warn(`Trade validation failed: ${error.message}`);
            throw error;
        }
    }

    // Validate position size
    async _validatePositionSize(eventId, userId, newAmount) {
        const cacheKey = `${eventId}:${userId}`;
        let position = this.positionCache.get(cacheKey) || 0;

        if (!position) {
            // Calculate from database if not in cache
            const trades = await Trade.find({
                eventId,
                userId,
                status: 'completed'
            });

            position = trades.reduce((sum, trade) => {
                return sum + (trade.type === 'buy' ? trade.amount : -trade.amount);
            }, 0);

            this.positionCache.set(cacheKey, position);
        }

        if (Math.abs(position + newAmount) > this.limits.maxPositionSize) {
            throw new Error('Position size limit exceeded');
        }
    }

    // Validate daily trading volume
    async _validateDailyVolume(userId, newAmount) {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${userId}:${today}`;
        let volume = this.volumeCache.get(cacheKey) || 0;

        if (!volume) {
            // Calculate from database if not in cache
            const startOfDay = new Date(today);
            const trades = await Trade.find({
                userId,
                status: 'completed',
                createdAt: { $gte: startOfDay }
            });

            volume = trades.reduce((sum, trade) => sum + trade.amount, 0);
            this.volumeCache.set(cacheKey, volume);
        }

        if (volume + newAmount > this.limits.maxDailyVolume) {
            throw new Error('Daily trading volume limit exceeded');
        }
    }

    // Validate price deviation
    _validatePriceDeviation(event, price) {
        const marketPrice = event.currentPrice;
        const deviation = Math.abs(price - marketPrice) / marketPrice;

        if (deviation > this.limits.maxPriceDeviation) {
            throw new Error('Price deviation exceeds allowed limit');
        }
    }

    // Validate market liquidity
    _validateLiquidity(eventId) {
        const liquidityScore = priceDiscoveryService.getLiquidityScore(eventId);

        if (liquidityScore < this.limits.minLiquidityScore) {
            throw new Error('Insufficient market liquidity');
        }
    }

    // Validate loss limit
    async _validateLossLimit(userId) {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${userId}:${today}`;
        let totalLoss = this.lossCache.get(cacheKey) || 0;

        if (!totalLoss) {
            // Calculate from database if not in cache
            const startOfDay = new Date(today);
            const trades = await Trade.find({
                userId,
                status: 'completed',
                createdAt: { $gte: startOfDay }
            });

            totalLoss = trades.reduce((sum, trade) => {
                const profitLoss = trade.type === 'buy' ? 
                    -trade.amount : trade.amount;
                return sum + profitLoss;
            }, 0);

            this.lossCache.set(cacheKey, totalLoss);
        }

        if (Math.abs(totalLoss) > this.limits.maxLossLimit) {
            throw new Error('Daily loss limit exceeded');
        }
    }

    // Update position cache after trade
    updatePosition(eventId, userId, amount, type) {
        const cacheKey = `${eventId}:${userId}`;
        let position = this.positionCache.get(cacheKey) || 0;
        position += type === 'buy' ? amount : -amount;
        this.positionCache.set(cacheKey, position);
    }

    // Update volume cache after trade
    updateVolume(userId, amount) {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${userId}:${today}`;
        let volume = this.volumeCache.get(cacheKey) || 0;
        volume += amount;
        this.volumeCache.set(cacheKey, volume);
    }

    // Update loss cache after trade
    updateLoss(userId, amount, type) {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${userId}:${today}`;
        let totalLoss = this.lossCache.get(cacheKey) || 0;
        totalLoss += type === 'buy' ? -amount : amount;
        this.lossCache.set(cacheKey, totalLoss);
    }

    // Clean up expired cache entries
    _cleanupCaches() {
        const today = new Date().toISOString().split('T')[0];
        
        for (const [key] of this.volumeCache) {
            if (!key.includes(today)) {
                this.volumeCache.delete(key);
            }
        }

        for (const [key] of this.lossCache) {
            if (!key.includes(today)) {
                this.lossCache.delete(key);
            }
        }
    }

    // Get user trading limits and usage
    async getUserLimits(userId) {
        const today = new Date().toISOString().split('T')[0];
        const volumeKey = `${userId}:${today}`;
        const lossKey = `${userId}:${today}`;

        return {
            maxPositionSize: this.limits.maxPositionSize,
            maxDailyVolume: this.limits.maxDailyVolume,
            currentDailyVolume: this.volumeCache.get(volumeKey) || 0,
            maxLossLimit: this.limits.maxLossLimit,
            currentLoss: this.lossCache.get(lossKey) || 0,
            maxPriceDeviation: this.limits.maxPriceDeviation * 100 + '%',
            minLiquidityScore: this.limits.minLiquidityScore
        };
    }

    // Get event risk metrics
    async getEventRiskMetrics(eventId) {
        const liquidityScore = priceDiscoveryService.getLiquidityScore(eventId);
        const priceStats = priceDiscoveryService.getPriceStats(eventId);

        return {
            liquidityScore,
            priceVolatility: Math.abs(priceStats.priceChange24h),
            hasCircuitBreaker: priceStats.circuitBreaker,
            marketQuality: this._calculateMarketQuality(liquidityScore, priceStats)
        };
    }

    // Calculate overall market quality score (0-100)
    _calculateMarketQuality(liquidityScore, priceStats) {
        const volatilityScore = Math.max(0, 100 - Math.abs(priceStats.priceChange24h));
        const spreadScore = Math.max(0, 100 - priceStats.spread * 5);
        
        return Math.round(
            liquidityScore * 0.4 +
            volatilityScore * 0.3 +
            spreadScore * 0.3
        );
    }
}

export const riskManagementService = new RiskManagementService();
