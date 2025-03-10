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
    ]
};

// Event validation rules
export const eventValidationRules = {
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
