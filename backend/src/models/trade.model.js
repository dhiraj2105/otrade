import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: [true, 'Event ID is required'],
        index: true
    },
    type: {
        type: String,
        enum: ['buy', 'sell'],
        required: [true, 'Trade type is required']
    },
    position: {
        type: String,
        enum: ['yes', 'no'],
        required: [true, 'Position is required']
    },
    amount: {
        type: Number,
        required: [true, 'Trade amount is required'],
        min: [1, 'Minimum trade amount is 1']
    },
    price: {
        type: Number,
        required: [true, 'Trade price is required'],
        min: [0, 'Price cannot be negative'],
        max: [100, 'Price cannot exceed 100']
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled', 'settled'],
        default: 'pending',
        index: true
    },
    outcome: {
        type: String,
        enum: ['win', 'loss', 'draw', 'pending'],
        default: 'pending'
    },
    profitLoss: {
        type: Number,
        default: 0
    },
    settlementData: {
        settledAt: Date,
        settledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        settlementPrice: Number,
        notes: String
    },
    metadata: {
        ip: String,
        userAgent: String,
        location: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for efficient querying
tradeSchema.index({ userId: 1, status: 1 });
tradeSchema.index({ eventId: 1, status: 1 });
tradeSchema.index({ createdAt: -1 });

// Virtual for related event details
tradeSchema.virtual('eventDetails', {
    ref: 'Event',
    localField: 'eventId',
    foreignField: '_id',
    justOne: true
});

// Method to calculate potential profit/loss
tradeSchema.methods.calculatePotentialPL = function(currentPrice) {
    const position = this.position === 'yes' ? 1 : -1;
    const priceDiff = position * (currentPrice - this.price);
    return (priceDiff * this.amount).toFixed(2);
};

// Method to settle trade
tradeSchema.methods.settle = async function(settlementPrice, settledBy) {
    const position = this.position === 'yes' ? 1 : -1;
    const priceDiff = position * (settlementPrice - this.price);
    this.profitLoss = (priceDiff * this.amount).toFixed(2);
    this.outcome = this.profitLoss > 0 ? 'win' : this.profitLoss < 0 ? 'loss' : 'draw';
    this.status = 'settled';
    this.settlementData = {
        settledAt: new Date(),
        settledBy,
        settlementPrice,
        notes: `Settled at price ${settlementPrice}`
    };
    return this.save();
};

// Pre-save middleware to validate trade
tradeSchema.pre('save', async function(next) {
    if (this.isNew) {
        // Validate trade amount against event limits
        const Event = mongoose.model('Event');
        const event = await Event.findById(this.eventId);
        if (!event) {
            return next(new Error('Event not found'));
        }
        
        if (!event.isTradingAllowed()) {
            return next(new Error('Trading is not allowed for this event'));
        }
        
        if (this.amount < event.tradingLimits.minAmount || 
            this.amount > event.tradingLimits.maxAmount) {
            return next(new Error('Trade amount is outside event limits'));
        }
    }
    next();
});

const Trade = mongoose.model('Trade', tradeSchema);

export default Trade;
