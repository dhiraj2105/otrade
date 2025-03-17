import logger from '../utils/logger.js';

class OrderBook {
    constructor(eventId) {
        this.eventId = eventId;
        this.buyOrders = []; // Orders to buy YES (or sell NO)
        this.sellOrders = []; // Orders to sell YES (or buy NO)
        this.trades = [];
        this.lastPrice = 50; // Start at 50 as neutral price
    }

    // Add a new order to the book
    addOrder(order) {
        const { type, position, price, amount, userId } = order;
        const orderEntry = {
            id: this._generateOrderId(),
            userId,
            type,
            position,
            price,
            amount,
            timestamp: Date.now()
        };

        // Normalize order type based on position
        const isEffectiveBuy = (type === 'buy' && position === 'yes') || 
                              (type === 'sell' && position === 'no');

        if (isEffectiveBuy) {
            this.buyOrders.push(orderEntry);
            this.buyOrders.sort((a, b) => b.price - a.price); // Sort by highest price first
        } else {
            this.sellOrders.push(orderEntry);
            this.sellOrders.sort((a, b) => a.price - b.price); // Sort by lowest price first
        }

        logger.info(`New order added to book: ${JSON.stringify(orderEntry)}`);
        return this._matchOrders();
    }

    // Match orders and create trades
    _matchOrders() {
        const matches = [];
        
        while (this.buyOrders.length > 0 && this.sellOrders.length > 0) {
            const topBuy = this.buyOrders[0];
            const topSell = this.sellOrders[0];

            // Check if orders can be matched
            if (topBuy.price >= topSell.price) {
                const matchPrice = this._calculateMatchPrice(topBuy.price, topSell.price);
                const matchAmount = Math.min(topBuy.amount, topSell.amount);

                // Create trade
                const trade = {
                    id: this._generateTradeId(),
                    buyOrderId: topBuy.id,
                    sellOrderId: topSell.id,
                    buyUserId: topBuy.userId,
                    sellUserId: topSell.userId,
                    price: matchPrice,
                    amount: matchAmount,
                    timestamp: Date.now()
                };

                matches.push(trade);
                this.trades.push(trade);
                this.lastPrice = matchPrice;

                // Update order amounts
                topBuy.amount -= matchAmount;
                topSell.amount -= matchAmount;

                // Remove filled orders
                if (topBuy.amount === 0) this.buyOrders.shift();
                if (topSell.amount === 0) this.sellOrders.shift();
            } else {
                break; // No more matches possible
            }
        }

        if (matches.length > 0) {
            logger.info(`Matched ${matches.length} orders in event ${this.eventId}`);
        }

        return matches;
    }

    // Calculate the match price (midpoint of bid and ask)
    _calculateMatchPrice(buyPrice, sellPrice) {
        return Math.round((buyPrice + sellPrice) / 2);
    }

    // Get current market price
    getMarketPrice() {
        if (this.buyOrders.length === 0 && this.sellOrders.length === 0) {
            return this.lastPrice;
        }

        if (this.buyOrders.length === 0) {
            return this.sellOrders[0].price;
        }

        if (this.sellOrders.length === 0) {
            return this.buyOrders[0].price;
        }

        return this._calculateMatchPrice(this.buyOrders[0].price, this.sellOrders[0].price);
    }

    // Get order book depth
    getDepth(levels = 10) {
        const bids = this._aggregateOrders(this.buyOrders, levels);
        const asks = this._aggregateOrders(this.sellOrders, levels);

        return {
            bids,
            asks,
            lastPrice: this.lastPrice,
            spread: asks.length > 0 && bids.length > 0 ? 
                   asks[0].price - bids[0].price : 0
        };
    }

    // Aggregate orders by price level
    _aggregateOrders(orders, levels) {
        const aggregated = orders.reduce((acc, order) => {
            const priceLevel = acc.find(level => level.price === order.price);
            if (priceLevel) {
                priceLevel.amount += order.amount;
                priceLevel.orderCount++;
            } else {
                acc.push({
                    price: order.price,
                    amount: order.amount,
                    orderCount: 1
                });
            }
            return acc;
        }, []);

        return aggregated.slice(0, levels);
    }

    // Cancel an order
    cancelOrder(orderId) {
        let order = this.buyOrders.find(o => o.id === orderId);
        let orderList = this.buyOrders;

        if (!order) {
            order = this.sellOrders.find(o => o.id === orderId);
            orderList = this.sellOrders;
        }

        if (!order) {
            throw new Error('Order not found');
        }

        const index = orderList.indexOf(order);
        orderList.splice(index, 1);

        logger.info(`Order ${orderId} cancelled`);
        return order;
    }

    // Generate unique order ID
    _generateOrderId() {
        return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Generate unique trade ID
    _generateTradeId() {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get recent trades
    getRecentTrades(limit = 50) {
        return this.trades.slice(-limit);
    }

    // Get order book statistics
    getStats() {
        return {
            buyOrderCount: this.buyOrders.length,
            sellOrderCount: this.sellOrders.length,
            totalTrades: this.trades.length,
            lastPrice: this.lastPrice,
            volume24h: this._calculate24hVolume(),
            marketPrice: this.getMarketPrice()
        };
    }

    // Calculate 24-hour trading volume
    _calculate24hVolume() {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return this.trades
            .filter(trade => trade.timestamp >= oneDayAgo)
            .reduce((sum, trade) => sum + trade.amount, 0);
    }
}

// Singleton to manage all order books
class OrderBookManager {
    constructor() {
        this.orderBooks = new Map();
    }

    getOrderBook(eventId) {
        if (!this.orderBooks.has(eventId)) {
            this.orderBooks.set(eventId, new OrderBook(eventId));
        }
        return this.orderBooks.get(eventId);
    }

    removeOrderBook(eventId) {
        return this.orderBooks.delete(eventId);
    }

    getAllOrderBooks() {
        return Array.from(this.orderBooks.entries()).map(([eventId, book]) => ({
            eventId,
            stats: book.getStats()
        }));
    }
}

export const orderBookManager = new OrderBookManager();
