import { body, param, query, validationResult } from 'express-validator';


// Helper function to run validation rules
export const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    };
};

// User validation rules
export const userValidationRules = {
    register: [
        body('username')
            .trim()
            .isLength({ min: 3 })
            .withMessage('Username must be at least 3 characters long')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers and underscores'),
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
    ],
    login: [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required')
    ],

    updateDetails: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters')
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage('Name can only contain letters and spaces'),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail()
    ],

    updatePassword: [
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('New password must be at least 6 characters long')
            .custom((value, { req }) => {
                if (value === req.body.currentPassword) {
                    throw new Error('New password must be different from current password');
                }
                return true;
            })
    ],

    forgotPassword: [
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email')
            .normalizeEmail()
    ]
};

// Event validation rules
export const eventValidationRules = {
    getStats: [],  // No validation needed for public stats as it takes no parameters

    getById: [
        param('id')
            .isMongoId()
            .withMessage('Invalid event ID format')
    ],

    delete: [
        param('id')
            .isMongoId()
            .withMessage('Invalid event ID format')
    ],

    create: [
        body('title')
            .trim()
            .isLength({ min: 3, max: 200 })
            .withMessage('Title must be between 3 and 200 characters'),
        body('description')
            .trim()
            .isLength({ min: 10, max: 1000 })
            .withMessage('Description must be between 10 and 1000 characters'),
        body('category')
            .isIn(['sports', 'politics', 'entertainment', 'technology', 'economics', 'other'])
            .withMessage('Invalid category'),
        body('startTime')
            .isISO8601()
            .withMessage('Start time must be a valid date')
            .custom((value, { req }) => {
                if (new Date(value) <= new Date()) {
                    throw new Error('Start time must be in the future');
                }
                return true;
            }),
        body('endTime')
            .isISO8601()
            .withMessage('End time must be a valid date')
            .custom((value, { req }) => {
                if (new Date(value) <= new Date(req.body.startTime)) {
                    throw new Error('End time must be after start time');
                }
                return true;
            })
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid event ID'),
        body('title')
            .optional()
            .trim()
            .isLength({ min: 3, max: 200 })
            .withMessage('Title must be between 3 and 200 characters'),
        body('description')
            .optional()
            .trim()
            .isLength({ min: 10, max: 1000 })
            .withMessage('Description must be between 10 and 1000 characters')
    ],

    updatePrice: [
        param('id')
            .isMongoId()
            .withMessage('Invalid event ID'),
        body('minPrice')
            .isFloat({ min: 0, max: 100 })
            .withMessage('Minimum price must be between 0 and 100'),
        body('maxPrice')
            .isFloat({ min: 0, max: 100 })
            .withMessage('Maximum price must be between 0 and 100')
            .custom((value, { req }) => {
                if (value <= req.body.minPrice) {
                    throw new Error('Maximum price must be greater than minimum price');
                }
                return true;
            })
    ],

    settle: [
        param('id')
            .isMongoId()
            .withMessage('Invalid event ID'),
        body('outcome')
            .isIn(['yes', 'no', 'cancelled'])
            .withMessage('Outcome must be yes, no, or cancelled'),
        body('settlementPrice')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('Settlement price must be between 0 and 100'),
        body('reason')
            .optional()
            .trim()
            .isLength({ min: 3, max: 500 })
            .withMessage('Reason must be between 3 and 500 characters')
    ]
};

// Trade validation rules
export const tradeValidationRules = {
    create: [
        body('eventId')
            .isMongoId()
            .withMessage('Invalid event ID'),
        body('type')
            .isIn(['buy', 'sell'])
            .withMessage('Trade type must be either buy or sell'),
        body('position')
            .isIn(['yes', 'no'])
            .withMessage('Position must be either yes or no'),
        body('amount')
            .isFloat({ min: 1 })
            .withMessage('Amount must be at least 1'),
        body('price')
            .isFloat({ min: 0, max: 100 })
            .withMessage('Price must be between 0 and 100')
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid trade ID'),
        body('status')
            .optional()
            .isIn(['pending', 'active', 'completed', 'cancelled'])
            .withMessage('Invalid trade status')
    ],

    bulk: [
        body('trades')
            .isArray({ min: 1, max: 10 })
            .withMessage('Must provide between 1 and 10 trades'),
        body('trades.*.eventId')
            .isMongoId()
            .withMessage('Invalid event ID format'),
        body('trades.*.type')
            .isIn(['buy', 'sell'])
            .withMessage('Trade type must be either buy or sell'),
        body('trades.*.position')
            .isIn(['yes', 'no'])
            .withMessage('Position must be either yes or no'),
        body('trades.*.amount')
            .isFloat({ min: 1 })
            .withMessage('Amount must be at least 1'),
        body('trades.*.price')
            .isFloat({ min: 0, max: 100 })
            .withMessage('Price must be between 0 and 100')
    ],

    settle: [
        body('eventId')
            .isMongoId()
            .withMessage('Invalid event ID format'),
        body('outcome')
            .isIn(['yes', 'no', 'cancelled'])
            .withMessage('Invalid outcome value')
    ]
};

// Query validation rules
// Trading engine validation rules
export const tradingEngineValidationRules = {
    placeOrder: [
        body('eventId').isMongoId().withMessage('Invalid event ID'),
        body('type').isIn(['buy', 'sell']).withMessage('Invalid order type'),
        body('position').isIn(['yes', 'no']).withMessage('Invalid position'),
        body('price').isFloat({ min: 0, max: 100 }).withMessage('Price must be between 0 and 100'),
        body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1')
    ],
    
    cancelOrder: [
        param('eventId').isMongoId().withMessage('Invalid event ID'),
        param('orderId').isMongoId().withMessage('Invalid order ID')
    ],

    getOrderBook: [
        param('eventId').isMongoId().withMessage('Invalid event ID'),
        query('levels')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Levels must be between 1 and 100')
    ],

    getMarketMetrics: [
        param('eventId').isMongoId().withMessage('Invalid event ID'),
        query('timeframe')
            .optional()
            .isIn(['1h', '4h', '12h', '24h', '7d'])
            .withMessage('Invalid timeframe')
    ],

    getRecentTrades: [
        param('eventId').isMongoId().withMessage('Invalid event ID'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ]
};

// Admin validation rules
export const adminValidationRules = {
    getUsers: [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('status').optional().isIn(['active', 'suspended', 'inactive']).withMessage('Invalid status'),
        query('role').optional().isIn(['user', 'admin']).withMessage('Invalid role')
    ],

    updateUser: [
        param('id').isMongoId().withMessage('Invalid user ID'),
        body('status').optional().isIn(['active', 'suspended', 'inactive']).withMessage('Invalid status'),
        body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
        body('balance').optional().isFloat({ min: 0 }).withMessage('Balance must be non-negative')
    ],

    getEventStats: [
        param('id').isMongoId().withMessage('Invalid event ID'),
        query('timeframe').optional().isIn(['1h', '4h', '12h', '24h', '7d']).withMessage('Invalid timeframe')
    ],

    updateEvent: [
        param('id').isMongoId().withMessage('Invalid event ID'),
        body('status').optional().isIn(['upcoming', 'active', 'trading', 'closed', 'settled'])
            .withMessage('Invalid event status'),
        body('minPrice').optional().isFloat({ min: 0, max: 100 })
            .withMessage('Minimum price must be between 0 and 100'),
        body('maxPrice').optional().isFloat({ min: 0, max: 100 })
            .withMessage('Maximum price must be between 0 and 100')
            .custom((value, { req }) => {
                if (req.body.minPrice && value <= req.body.minPrice) {
                    throw new Error('Maximum price must be greater than minimum price');
                }
                return true;
            }),
        body('description').optional().isString().trim().notEmpty()
            .withMessage('Description cannot be empty')
    ],

    getSystemStats: [
        query('timeframe')
            .optional()
            .isIn(['1h', '4h', '12h', '24h', '7d', '30d'])
            .withMessage('Invalid timeframe'),
        query('includeInactive')
            .optional()
            .isBoolean()
            .withMessage('includeInactive must be a boolean')
    ],

    getRiskReport: [
        query('timeframe')
            .optional()
            .isIn(['1h', '4h', '12h', '24h', '7d', '30d'])
            .withMessage('Invalid timeframe'),
        query('riskLevel')
            .optional()
            .isIn(['LOW', 'MODERATE', 'HIGH', 'SEVERE'])
            .withMessage('Invalid risk level')
    ]
};

export const queryValidationRules = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ],
    dateRange: [
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Start date must be a valid date'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be a valid date')
            .custom((value, { req }) => {
                if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
                    throw new Error('End date must be after start date');
                }
                return true;
            })
    ]
};
