// Custom error class for API errors
export class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Error handler for async functions
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error handler
export const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    return new ApiError(`Invalid input data. ${errors.join('. ')}`, 400);
};

// Duplicate field error handler
export const handleDuplicateFieldsError = (err) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    return new ApiError(`Duplicate field value: ${value}. Please use another value`, 400);
};

// JWT error handlers
export const handleJWTError = () => 
    new ApiError('Invalid token. Please log in again', 401);

export const handleJWTExpiredError = () => 
    new ApiError('Your token has expired. Please log in again', 401);

// Global error handler middleware
export const globalErrorHandler = (err, req, res, next) => {
    // Ensure statusCode is a valid HTTP status code
    const statusCode = err.statusCode && err.statusCode >= 100 && err.statusCode < 600 
        ? err.statusCode 
        : 500;

    // Format error message
    const error = {
        message: err.isOperational ? err.message : 'Something went wrong!'
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        error.stack = err.stack;
    }

    res.status(statusCode).json({
        success: false,
        error
    });
};
