import User  from '../models/user.model.js';
import  Event  from '../models/event.model.js';
import  Trade  from '../models/trade.model.js';
import { ApiError } from '../utils/errors.js';
import { orderBookManager } from '../services/orderBook.service.js';
import { priceDiscoveryService } from '../services/priceDiscovery.service.js';
import { riskManagementService } from '../services/riskManagement.service.js';

// User Management
export const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, role } = req.query;
        const query = {};
        
        if (status) query.status = status;
        if (role) query.role = role;

        const users = await User.find(query)
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalUsers: count
        });
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, role, balance } = req.body;

        const user = await User.findById(id);
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        if (status) user.status = status;
        if (role) user.role = role;
        if (balance !== undefined) user.balance = balance;

        await user.save();

        res.json({
            message: 'User updated successfully',
            user: user.toJSON()
        });
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

// Event Management
export const getEventStats = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError('Event not found', 404);
        }

        const trades = await Trade.find({ eventId: id });
        const orderBook = orderBookManager.getOrderBook(id);
        const marketMetrics = await riskManagementService.getEventRiskMetrics(id);

        const stats = {
            eventDetails: event,
            tradingStats: {
                totalTrades: trades.length,
                totalVolume: trades.reduce((sum, trade) => sum + trade.amount, 0),
                averagePrice: trades.length > 0 ? 
                    trades.reduce((sum, trade) => sum + trade.price, 0) / trades.length : 
                    0
            },
            marketMetrics,
            orderBookStats: orderBook.getStats(),
            priceStats: priceDiscoveryService.getPriceStats(id)
        };

        res.json(stats);
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, minPrice, maxPrice, description } = req.body;

        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError('Event not found', 404);
        }

        if (status) event.status = status;
        if (minPrice !== undefined) event.minPrice = minPrice;
        if (maxPrice !== undefined) event.maxPrice = maxPrice;
        if (description) event.description = description;

        await event.save();

        res.json({
            message: 'Event updated successfully',
            event
        });
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

// System Monitoring
export const getSystemStats = async (req, res) => {
    try {
        const stats = {
            users: {
                total: await User.countDocuments(),
                active: await User.countDocuments({ status: 'active' }),
                admins: await User.countDocuments({ role: 'admin' })
            },
            events: {
                total: await Event.countDocuments(),
                active: await Event.countDocuments({ status: 'active' }),
                trading: await Event.countDocuments({ status: 'trading' }),
                settled: await Event.countDocuments({ status: 'settled' })
            },
            trades: {
                total: await Trade.countDocuments(),
                completed: await Trade.countDocuments({ status: 'completed' }),
                pending: await Trade.countDocuments({ status: 'pending' }),
                cancelled: await Trade.countDocuments({ status: 'cancelled' })
            },
            markets: {
                activeOrderBooks: orderBookManager.getAllOrderBooks().length,
                totalLiquidity: await calculateTotalLiquidity()
            }
        };

        res.json(stats);
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

export const getRiskReport = async (req, res) => {
    try {
        const activeEvents = await Event.find({ status: 'trading' });
        const riskReport = {
            events: await Promise.all(activeEvents.map(async event => {
                const metrics = await riskManagementService.getEventRiskMetrics(event._id);
                return {
                    eventId: event._id,
                    title: event.title,
                    metrics
                };
            })),
            systemRisk: await calculateSystemRisk()
        };

        res.json(riskReport);
    } catch (error) {
        throw new ApiError(error.message, 400);
    }
};

// Helper Functions
async function calculateTotalLiquidity() {
    const activeEvents = await Event.find({ status: 'trading' });
    return activeEvents.reduce((total, event) => {
        const orderBook = orderBookManager.getOrderBook(event._id);
        const stats = orderBook.getStats();
        return total + stats.volume24h;
    }, 0);
}

async function calculateSystemRisk() {
    const activeEvents = await Event.find({ status: 'trading' });
    const riskFactors = await Promise.all(activeEvents.map(async event => {
        const metrics = await riskManagementService.getEventRiskMetrics(event._id);
        return {
            marketQuality: metrics.marketQuality,
            liquidityScore: metrics.liquidityScore,
            priceVolatility: metrics.priceVolatility
        };
    }));

    return {
        averageMarketQuality: average(riskFactors.map(r => r.marketQuality)),
        averageLiquidity: average(riskFactors.map(r => r.liquidityScore)),
        systemVolatility: average(riskFactors.map(r => r.priceVolatility)),
        riskLevel: calculateRiskLevel(riskFactors)
    };
}

function average(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b) / arr.length : 0;
}

function calculateRiskLevel(riskFactors) {
    const avgMarketQuality = average(riskFactors.map(r => r.marketQuality));
    const avgVolatility = average(riskFactors.map(r => r.priceVolatility));
    
    if (avgMarketQuality > 80 && avgVolatility < 5) return 'LOW';
    if (avgMarketQuality > 60 && avgVolatility < 10) return 'MODERATE';
    if (avgMarketQuality > 40 && avgVolatility < 15) return 'HIGH';
    return 'SEVERE';
}
