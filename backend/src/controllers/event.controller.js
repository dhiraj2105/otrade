import Event from '../models/event.model.js';
import User from '../models/user.model.js';
import Trade from '../models/trade.model.js';
import { ApiError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { isValidStatusTransition, calculateSettlementPrice } from '../utils/eventUtils.js';

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Admin)
export const createEvent = async (req, res) => {
    const { title, description, category, startTime, endTime, initialPrice } = req.body;

    const event = await Event.create({
        title,
        description,
        category,
        startTime,
        endTime,
        currentPrice: initialPrice,
        createdBy: req.user.id
    });

    logger.info(`Event created: ${event.title}`);
    res.status(201).json({
        success: true,
        data: event
    });
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
export const getEvents = async (req, res) => {
    const { status, category, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const events = await Event.find(query)
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    res.json({
        success: true,
        data: events,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total
        }
    });
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
export const getEvent = async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    res.json({
        success: true,
        data: event
    });
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Admin)
export const updateEvent = async (req, res) => {
    const { title, description, category, startTime, endTime, status } = req.body;

    let event = await Event.findById(req.params.id);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    // Validate status transition
    if (status && !isValidStatusTransition(event.status, status)) {
        throw new ApiError(`Invalid status transition from ${event.status} to ${status}`, 400);
    }

    // Additional validation for status transitions
    if (status === 'trading' && (!event.startTime || new Date() < event.startTime)) {
        throw new ApiError('Cannot start trading before event start time', 400);
    }

    if (status === 'closed' && (!event.endTime || new Date() < event.endTime)) {
        throw new ApiError('Cannot close event before end time', 400);
    }

    event = await Event.findByIdAndUpdate(
        req.params.id,
        { title, description, category, startTime, endTime, status },
        { new: true, runValidators: true }
    );

    // Emit status update via WebSocket
    if (status) {
        req.io.emit(`event:${event._id}:status`, { status });
    }

    logger.info(`Event updated: ${event.title}`);
    res.json({
        success: true,
        data: event
    });
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Admin)
// @desc    Settle event with outcome
// @route   PUT /api/events/:id/settle
// @access  Private (Admin)
export const settleEvent = async (req, res) => {
    const { outcome } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    if (event.status !== 'closed') {
        throw new ApiError('Can only settle closed events', 400);
    }

    if (!['yes', 'no', 'cancelled'].includes(outcome)) {
        throw new ApiError('Invalid outcome value', 400);
    }

    const settlementPrice = calculateSettlementPrice(outcome);
    
    event.status = 'settled';
    event.outcome = outcome;
    event.marketData.currentPrice = settlementPrice;
    await event.save();

    // Emit settlement update via WebSocket
    req.io.emit(`event:${event._id}:settled`, { 
        outcome,
        settlementPrice 
    });

    logger.info(`Event settled: ${event.title} with outcome: ${outcome}`);
    res.json({
        success: true,
        data: event
    });
};

// @desc    Add participant to event
// @route   POST /api/events/:id/participants
// @access  Private
export const addParticipant = async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    if (!event.isTradingAllowed()) {
        throw new ApiError('Trading is not allowed for this event', 400);
    }

    if (event.participants.includes(req.user.id)) {
        throw new ApiError('User is already a participant', 400);
    }

    event.participants.push(req.user.id);
    await event.save();

    logger.info(`Participant added to event: ${event.title}`);
    res.json({
        success: true,
        data: event
    });
};

// @desc    Remove participant from event
// @route   DELETE /api/events/:id/participants
// @access  Private
/**
 * Get public platform statistics
 * @route   GET /api/events/stats
 * @access  Public
 */
export const getPublicStats = async (req, res) => {
    try {
        const [events, users, trades] = await Promise.all([
            Event.countDocuments({ status: { $in: ['active', 'trading'] } }),
            User.countDocuments(),
            Trade.countDocuments()
        ]);

        const volume = await Trade.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            activeEvents: events,
            totalUsers: users,
            totalTrades: trades,
            tradingVolume: volume[0]?.total || 0
        });
    } catch (error) {
        throw new ApiError('Failed to fetch platform statistics', 500);
    }
};

export const removeParticipant = async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    if (!event.participants.includes(req.user.id)) {
        throw new ApiError('User is not a participant', 400);
    }

    event.participants = event.participants.filter(
        (id) => id.toString() !== req.user.id
    );
    await event.save();

    logger.info(`Participant removed from event: ${event.title}`);
    res.json({
        success: true,
        data: event
    });
};

export const deleteEvent = async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    if (event.status !== 'upcoming') {
        throw new ApiError('Can only delete upcoming events', 400);
    }

    await event.deleteOne();
    logger.info(`Event deleted: ${event.title}`);

    res.json({
        success: true,
        data: {}
    });
};

// @desc    Update event price
// @route   PUT /api/events/:id/price
// @access  Private (Admin)
export const updateEventPrice = async (req, res) => {

    const { price } = req.body;
    
    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ApiError('Event not found', 404);
    }

    if (event.status !== 'trading') {
        throw new ApiError('Can only update price for trading events', 400);
    }

    event.currentPrice = price;
    event.priceHistory.push({ price, timestamp: Date.now() });
    await event.save();

    // Emit price update via WebSocket
    req.io.emit(`event:${event._id}:price`, { price });

    res.json({
        success: true,
        data: event
    });
};
