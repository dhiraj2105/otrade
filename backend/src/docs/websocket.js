/**
 * @swagger
 * components:
 *   schemas:
 *     OrderUpdate:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [placed, matched, cancelled]
 *           description: Type of order update
 *         orderId:
 *           type: string
 *           description: ID of the order
 *         eventId:
 *           type: string
 *           description: ID of the event
 *         price:
 *           type: number
 *           description: Order price
 *         amount:
 *           type: number
 *           description: Order amount
 *         position:
 *           type: string
 *           enum: [yes, no]
 *           description: Trading position
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the update
 *     OrderBookUpdate:
 *       type: object
 *       properties:
 *         eventId:
 *           type: string
 *           description: ID of the event
 *         bids:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               amount:
 *                 type: number
 *         asks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               amount:
 *                 type: number
 *     MarketUpdate:
 *       type: object
 *       properties:
 *         eventId:
 *           type: string
 *           description: ID of the event
 *         metrics:
 *           type: object
 *           properties:
 *             vwap:
 *               type: number
 *               description: Volume Weighted Average Price
 *             liquidity:
 *               type: number
 *               description: Market liquidity score
 *             volatility:
 *               type: number
 *               description: Price volatility
 *             marketQuality:
 *               type: number
 *               description: Overall market quality score
 *             circuitBreaker:
 *               type: object
 *               properties:
 *                 active:
 *                   type: boolean
 *                 reason:
 *                   type: string
 */

/**
 * @swagger
 * tags:
 *   name: WebSocket
 *   description: WebSocket events for real-time updates
 */

/**
 * @swagger
 * /ws:
 *   get:
 *     summary: WebSocket connection endpoint
 *     tags: [WebSocket]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Connect to the WebSocket server to receive real-time updates.
 *       
 *       ## Events Emitted by Server
 *       
 *       ### order.update
 *       Emitted when an order is placed, matched, or cancelled
 *       ```json
 *       {
 *         "type": "placed|matched|cancelled",
 *         "orderId": "string",
 *         "eventId": "string",
 *         "price": 50,
 *         "amount": 10,
 *         "position": "yes|no",
 *         "timestamp": "2023-01-01T00:00:00Z"
 *       }
 *       ```
 *       
 *       ### orderbook.update
 *       Emitted when the order book changes
 *       ```json
 *       {
 *         "eventId": "string",
 *         "bids": [{"price": 50, "amount": 10}],
 *         "asks": [{"price": 60, "amount": 5}]
 *       }
 *       ```
 *       
 *       ### market.update
 *       Emitted when market metrics are updated
 *       ```json
 *       {
 *         "eventId": "string",
 *         "metrics": {
 *           "vwap": 55.5,
 *           "liquidity": 0.85,
 *           "volatility": 0.12,
 *           "marketQuality": 0.9,
 *           "circuitBreaker": {
 *             "active": false,
 *             "reason": null
 *           }
 *         }
 *       }
 *       ```
 *       
 *       ## Client Events
 *       
 *       ### subscribe
 *       Subscribe to updates for specific events
 *       ```json
 *       {
 *         "events": ["eventId1", "eventId2"]
 *       }
 *       ```
 *       
 *       ### unsubscribe
 *       Unsubscribe from updates for specific events
 *       ```json
 *       {
 *         "events": ["eventId1", "eventId2"]
 *       }
 *       ```
 *     responses:
 *       101:
 *         description: WebSocket connection established
 *       401:
 *         description: Not authenticated
 */
