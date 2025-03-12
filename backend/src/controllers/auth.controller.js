import User from '../models/user.model.js';
import { generateToken } from '../config/jwt.js';
import { ApiError, asyncHandler } from '../utils/errors.js';
import logger from '../utils/logger.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
        throw new ApiError('User already exists', 400);
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
        token,
        user: user.getPublicProfile()
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new ApiError('Invalid credentials', 401);
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ApiError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
        token,
        user: user.getPublicProfile()
    });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    res.json({
        user: user.getPublicProfile()
    });
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
export const updateDetails = asyncHandler(async (req, res) => {
    const fieldsToUpdate = {
        username: req.body.username,
        email: req.body.email
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
        fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(
        req.user._id,
        fieldsToUpdate,
        {
            new: true,
            runValidators: true
        }
    );

    res.json({
        user: user.getPublicProfile()
    });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new ApiError('Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    res.json({
        token,
        user: user.getPublicProfile()
    });
});

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError('User not found', 404);
    }

    // For now, we'll just log the reset token
    // In production, you would send this via email
    logger.info(`Password reset requested for user: ${user.email}`);

    res.json({
        success: true,
        message: 'Password reset email sent'
    });
});
