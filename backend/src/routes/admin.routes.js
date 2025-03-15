import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { validate, adminValidationRules } from '../utils/validators.js';
import {
    getUsers,
    updateUser,
    getEventStats,
    updateEvent,
    getSystemStats,
    getRiskReport
} from '../controllers/admin.controller.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemStats:
 *       type: object
 *       properties:
 *         users:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             active:
 *               type: number
 *             admins:
 *               type: number
 *         events:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             active:
 *               type: number
 *             trading:
 *               type: number
 *             settled:
 *               type: number
 *         trades:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             completed:
 *               type: number
 *             pending:
 *               type: number
 *             cancelled:
 *               type: number
 *         markets:
 *           type: object
 *           properties:
 *             activeOrderBooks:
 *               type: number
 *             totalLiquidity:
 *               type: number
 *     RiskReport:
 *       type: object
 *       properties:
 *         events:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               title:
 *                 type: string
 *               metrics:
 *                 type: object
 *                 properties:
 *                   marketQuality:
 *                     type: number
 *                   liquidityScore:
 *                     type: number
 *                   priceVolatility:
 *                     type: number
 *         systemRisk:
 *           type: object
 *           properties:
 *             averageMarketQuality:
 *               type: number
 *             averageLiquidity:
 *               type: number
 *             systemVolatility:
 *               type: number
 *             riskLevel:
 *               type: string
 *               enum: [LOW, MODERATE, HIGH, SEVERE]
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin panel endpoints
 */

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with filtering and pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, inactive]
 *         description: Filter by user status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalUsers:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/users', validate(adminValidationRules.getUsers), getUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               balance:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.put('/users/:id', validate(adminValidationRules.updateUser), updateUser);

/**
 * @swagger
 * /api/admin/events/{id}/stats:
 *   get:
 *     summary: Get detailed event statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventDetails:
 *                   $ref: '#/components/schemas/Event'
 *                 tradingStats:
 *                   type: object
 *                   properties:
 *                     totalTrades:
 *                       type: number
 *                     totalVolume:
 *                       type: number
 *                     averagePrice:
 *                       type: number
 *                 marketMetrics:
 *                   $ref: '#/components/schemas/MarketMetrics'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.get('/events/:id/stats', validate(adminValidationRules.getEventStats), getEventStats);

/**
 * @swagger
 * /api/admin/events/{id}:
 *   put:
 *     summary: Update event settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [upcoming, active, trading, closed, settled]
 *               minPrice:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               maxPrice:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.put('/events/:id', validate(adminValidationRules.updateEvent), updateEvent);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system-wide statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemStats'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/stats', validate(adminValidationRules.getSystemStats), getSystemStats);

/**
 * @swagger
 * /api/admin/risk-report:
 *   get:
 *     summary: Get system risk assessment report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk assessment report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RiskReport'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/risk-report', validate(adminValidationRules.getRiskReport), getRiskReport);

export default router;
