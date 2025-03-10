// Custom error class for API errors
export class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
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
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            success: false,
            error: {
                status: err.status,
                message: err.message,
                stack: err.stack,
                error: err
            }
        });
    } else {
        // Production mode: don't leak error details
        if (err.isOperational) {
            // Operational, trusted error: send message to client
            res.status(err.statusCode).json({
                success: false,
                error: {
                    status: err.status,
                    message: err.message
                }
            });
        } else {
            // Programming or other unknown error: don't leak error details
            console.error('ERROR 💥:', err);
            res.status(500).json({
                success: false,
                error: {
                    status: 'error',
                    message: 'Something went wrong!'
                }
            });
        }
    }
};
