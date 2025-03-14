import Trade  from '../models/trade.model.js';
import Event from '../models/event.model.js';
import User  from '../models/user.model.js';
import { ApiError } from '../utils/errors.js';
import logger from '../utils/logger.js';

// @desc    Create a new trade
// @route   POST /api/trades
// @access  Private
export const createTrade = async (req, res) => {
    const { eventId, type, position, amount, price } = req.body;

    // Check if event exists and is tradeable
    const event = await Event.findById(eventId);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    if (!event.isTradingAllowed()) {
        throw new ApiError('Trading is not allowed for this event', 400);
    }

    // Verify user has sufficient balance
    const user = await User.findById(req.user.id);
    if (user.balance < amount) {
        throw new ApiError('Insufficient balance', 400);
    }

    // Create trade
    const trade = await Trade.create({
        userId: req.user.id,
        eventId,
        type,
        position,
        amount,
        price,
        metadata: {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            location: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        }
    });

    // Update user balance
    user.balance -= amount;
    await user.save();

    // Add user to event participants if not already added
    if (!event.participants.includes(req.user.id)) {
        event.participants.push(req.user.id);
        await event.save();
    }

    // Emit trade creation via WebSocket
    req.io.emit(`event:${eventId}:trade`, { 
        type: 'new',
        trade: {
            id: trade._id,
            type,
            position,
            amount,
            price
        }
    });

    logger.info(`New trade created for event: ${eventId}`);
    res.status(201).json({
        success: true,
        data: trade
    });
};

// @desc    Get all trades for current user
// @route   GET /api/trades
// @access  Private
export const getTrades = async (req, res) => {
    const { status, eventId, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.user.id };
    if (status) query.status = status;
    if (eventId) query.eventId = eventId;
    
    // Add date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const trades = await Trade.find(query)
        .populate('eventId', 'title status currentPrice')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Trade.countDocuments(query);

    res.json({
        success: true,
        data: trades,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total
        }
    });
};

// @desc    Get single trade
// @route   GET /api/trades/:id
// @access  Private
export const getTrade = async (req, res) => {
    const trade = await Trade.findOne({
        _id: req.params.id,
        userId: req.user.id
    }).populate('eventId', 'title status currentPrice');

    if (!trade) {
        throw new ApiError('Trade not found', 404);
    }

    res.json({
        success: true,
        data: trade
    });
};

// @desc    Update trade status
// @route   PUT /api/trades/:id
// @access  Private
export const updateTrade = async (req, res) => {
    const { status } = req.body;

    let trade = await Trade.findOne({
        _id: req.params.id,
        userId: req.user.id
    });

    if (!trade) {
        throw new ApiError('Trade not found', 404);
    }

    if (trade.status === 'settled') {
        throw new ApiError('Cannot update settled trade', 400);
    }

    if (status === 'cancelled' && trade.status !== 'pending') {
        throw new ApiError('Can only cancel pending trades', 400);
    }

    // If cancelling trade, refund user's balance
    if (status === 'cancelled') {
        const user = await User.findById(req.user.id);
        user.balance += trade.amount;
        await user.save();
    }

    trade.status = status;
    await trade.save();

    // Emit trade update via WebSocket
    req.io.emit(`event:${trade.eventId}:trade`, {
        type: 'update',
        trade: {
            id: trade._id,
            status
        }
    });

    logger.info(`Trade ${trade._id} updated to status: ${status}`);
    res.json({
        success: true,
        data: trade
    });
};

// @desc    Get trade statistics
// @route   GET /api/trades/stats
// @access  Private
export const getTradeStats = async (req, res) => {
    const stats = await Trade.aggregate([
        { $match: { userId: req.user.id } },
        { $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgPrice: { $avg: '$price' },
            totalProfitLoss: { $sum: '$profitLoss' }
        }},
        { $project: {
            status: '$_id',
            count: 1,
            totalAmount: 1,
            avgPrice: { $round: ['$avgPrice', 2] },
            totalProfitLoss: { $round: ['$totalProfitLoss', 2] },
            _id: 0
        }}
    ]);

    res.json({
        success: true,
        data: stats
    });
};

// @desc    Get event trades
// @route   GET /api/trades/event/:eventId
// @access  Public
// @desc    Settle multiple trades
// @route   POST /api/trades/settle
// @access  Private (Admin)
export const settleTrades = async (req, res) => {
    const { eventId, outcome } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    if (event.status !== 'closed') {
        throw new ApiError('Can only settle trades for closed events', 400);
    }

    if (!['yes', 'no', 'cancelled'].includes(outcome)) {
        throw new ApiError('Invalid outcome value', 400);
    }

    const settlementPrice = calculateSettlementPrice(outcome);

    // Find all active trades for this event
    const trades = await Trade.find({
        eventId,
        status: { $in: ['active', 'completed'] }
    });

    // Settle each trade
    const settledTrades = await Promise.all(
        trades.map(trade => trade.settle(settlementPrice, req.user.id))
    );

    // Update event status
    event.status = 'settled';
    event.outcome = outcome;
    await event.save();

    // Emit settlement updates via WebSocket
    req.io.emit(`event:${eventId}:settled`, {
        outcome,
        settlementPrice,
        tradesSettled: trades.length
    });

    logger.info(`Settled ${trades.length} trades for event: ${eventId}`);
    res.json({
        success: true,
        data: {
            settledTrades,
            event
        }
    });
};

// @desc    Create multiple trades
// @route   POST /api/trades/bulk
// @access  Private
export const createBulkTrades = async (req, res) => {
    const { trades } = req.body;

    if (!Array.isArray(trades) || trades.length === 0) {
        throw new ApiError('Invalid trades array', 400);
    }

    if (trades.length > 10) {
        throw new ApiError('Cannot create more than 10 trades at once', 400);
    }

    // Calculate total amount needed
    const totalAmount = trades.reduce((sum, trade) => sum + trade.amount, 0);

    // Verify user has sufficient balance
    const user = await User.findById(req.user.id);
    if (user.balance < totalAmount) {
        throw new ApiError('Insufficient balance for bulk trades', 400);
    }

    // Create trades
    const createdTrades = await Promise.all(
        trades.map(async trade => {
            const { eventId, type, position, amount, price } = trade;

            // Verify event exists and is tradeable
            const event = await Event.findById(eventId);
            if (!event || !event.isTradingAllowed()) {
                throw new ApiError(`Invalid or untradeable event: ${eventId}`, 400);
            }

            return Trade.create({
                userId: req.user.id,
                eventId,
                type,
                position,
                amount,
                price,
                metadata: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    location: req.headers['x-forwarded-for'] || req.connection.remoteAddress
                }
            });
        })
    );

    // Update user balance
    user.balance -= totalAmount;
    await user.save();

    // Add user to event participants if needed
    const uniqueEventIds = [...new Set(trades.map(t => t.eventId))];
    await Promise.all(
        uniqueEventIds.map(async eventId => {
            const event = await Event.findById(eventId);
            if (!event.participants.includes(req.user.id)) {
                event.participants.push(req.user.id);
                await event.save();
            }
        })
    );

    // Emit trade creation events
    createdTrades.forEach(trade => {
        req.io.emit(`event:${trade.eventId}:trade`, {
            type: 'new',
            trade: {
                id: trade._id,
                type: trade.type,
                position: trade.position,
                amount: trade.amount,
                price: trade.price
            }
        });
    });

    logger.info(`Created ${createdTrades.length} trades in bulk`);
    res.status(201).json({
        success: true,
        data: createdTrades
    });
};

// @desc    Get trade history
// @route   GET /api/trades/history
// @access  Private
export const getTradeHistory = async (req, res) => {
    const { eventId } = req.query;

    const aggregation = [
        {
            $match: {
                userId: req.user.id,
                ...(eventId && { eventId: mongoose.Types.ObjectId(eventId) })
            }
        },
        {
            $lookup: {
                from: 'events',
                localField: 'eventId',
                foreignField: '_id',
                as: 'event'
            }
        },
        { $unwind: '$event' },
        {
            $project: {
                event: { title: 1, status: 1 },
                type: 1,
                position: 1,
                amount: 1,
                price: 1,
                status: 1,
                profitLoss: 1,
                createdAt: 1
            }
        },
        { $sort: { createdAt: -1 } }
    ];

    const history = await Trade.aggregate(aggregation);

    res.json({
        success: true,
        data: history
    });
};

// @desc    Get event trades
// @route   GET /api/trades/event/:eventId
// @access  Public
export const getEventTrades = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const trades = await Trade.find({
        eventId: req.params.eventId,
        status: { $in: ['active', 'completed'] }
    })
        .select('-userId -metadata')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Trade.countDocuments({
        eventId: req.params.eventId,
        status: { $in: ['active', 'completed'] }
    });

    res.json({
        success: true,
        data: trades,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total
        }
    });
};
