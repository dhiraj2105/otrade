import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "sports",
        "politics",
        "entertainment",
        "technology",
        "economics",
        "other",
      ],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
      index: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: "End time must be after start time",
      },
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "trading", "closed", "settled", "cancelled"],
      default: "upcoming",
      index: true,
    },
    outcome: {
      type: String,
      enum: ["yes", "no", "pending", "cancelled"],
      default: "pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    marketData: {
      currentPrice: {
        type: Number,
        default: 50, // Starting at 50 (neutral position)
        min: 0,
        max: 100,
      },
      volume: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalTrades: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    tradingLimits: {
      minAmount: {
        type: Number,
        default: 10,
        min: 1,
      },
      maxAmount: {
        type: Number,
        default: 1000,
        min: 1,
      },
      maxParticipants: {
        type: Number,
        default: 1000,
        min: 2,
      },
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    metadata: {
      source: String,
      externalId: String,
      additionalInfo: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
eventSchema.index({ startTime: 1, status: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ tags: 1 });

// Virtual for active trades count
eventSchema.virtual("activeTrades", {
  ref: "Trade",
  localField: "_id",
  foreignField: "eventId",
  count: true,
  match: { status: "active" },
});

// Method to check if trading is allowed
eventSchema.methods.isTradingAllowed = function () {
  const now = new Date();
  return (
    this.status === "trading" &&
    now >= this.startTime &&
    now < this.endTime &&
    this.participants.length < this.tradingLimits.maxParticipants
  );
};

// Method to update market price
eventSchema.methods.updateMarketPrice = async function (newPrice, tradeVolume) {
  this.marketData.currentPrice = newPrice;
  this.marketData.volume += tradeVolume;
  this.marketData.totalTrades += 1;
  return this.save();
};

// Pre-save middleware to validate dates
eventSchema.pre("save", function (next) {
  if (this.endTime <= this.startTime) {
    next(new Error("End time must be after start time"));
  }
  next();
});

const Event = mongoose.model("Event", eventSchema);

export default Event;
