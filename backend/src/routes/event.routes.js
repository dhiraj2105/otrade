import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validate, eventValidationRules } from "../utils/validators.js";
import {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  updateEventPrice,
  settleEvent,
  addParticipant,
  removeParticipant,
  getPublicStats,
} from "../controllers/event.controller.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - startDate
 *         - endDate
 *       properties:
 *         title:
 *           type: string
 *           description: Event title
 *         description:
 *           type: string
 *           description: Event description
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Event start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Event end date
 *         status:
 *           type: string
 *           enum: [upcoming, active, trading, closed, settled]
 *           description: Event status
 *         minPrice:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Minimum price for trading
 *         maxPrice:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Maximum price for trading
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *           description: List of participant user IDs
 */

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

const router = express.Router();

/**
 * @swagger
 * /api/events/stats:
 *   get:
 *     summary: Get public platform statistics
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeEvents:
 *                   type: number
 *                   description: Number of active and trading events
 *                 totalUsers:
 *                   type: number
 *                   description: Total number of users
 *                 totalTrades:
 *                   type: number
 *                   description: Total number of trades
 *                 tradingVolume:
 *                   type: number
 *                   description: Total trading volume
 */
router.get("/stats", validate(eventValidationRules.getStats), getPublicStats);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, active, trading, closed, settled]
 *         description: Filter events by status
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       201:
 *         description: Event created successfully
 *       401:
 *         description: Not authorized
 *       400:
 *         description: Invalid input
 */
router
  .route("/")
  .get(getEvents)
  .post(protect, validate(eventValidationRules.create), createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *   put:
 *     summary: Update event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *   delete:
 *     summary: Delete event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router
  .route("/:id")
  .get(validate(eventValidationRules.getById), getEvent)
  .put(
    protect,
    restrictTo("admin"),
    validate(eventValidationRules.update),
    updateEvent
  )
  .delete(
    protect,
    restrictTo("admin"),
    validate(eventValidationRules.delete),
    deleteEvent
  );

/**
 * @swagger
 * /api/events/{id}/price:
 *   put:
 *     summary: Update event price limits
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - minPrice
 *               - maxPrice
 *             properties:
 *               minPrice:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               maxPrice:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Price limits updated successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.put(
  "/:id/price",
  protect,
  restrictTo("admin"),
  validate(eventValidationRules.updatePrice),
  updateEventPrice
);

/**
 * @swagger
 * /api/events/{id}/settle:
 *   put:
 *     summary: Settle an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settlementPrice
 *             properties:
 *               settlementPrice:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Event settled successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.put(
  "/:id/settle",
  protect,
  restrictTo("admin"),
  validate(eventValidationRules.settle),
  settleEvent
);

/**
 * @swagger
 * /api/events/{id}/participants:
 *   post:
 *     summary: Add participant to event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant added successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *   delete:
 *     summary: Remove participant from event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.post("/:id/participants", protect, addParticipant);
router.delete("/:id/participants", protect, removeParticipant);

/**
 * @swagger
 * /api/events/stats:
 *   get:
 *     summary: Get public platform statistics
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeEvents:
 *                   type: number
 *                   description: Number of active and trading events
 *                 totalUsers:
 *                   type: number
 *                   description: Total number of users
 *                 totalTrades:
 *                   type: number
 *                   description: Total number of trades
 *                 tradingVolume:
 *                   type: number
 *                   description: Total trading volume
 */
export default router;
