import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventSubscriptions = new Set();
    this.userSubscriptions = new Set();
  }

  connect() {
    if (!this.socket) {
      this.socket = io({
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Reconnect handling
      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.resubscribe();
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      // Error handling
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Authentication error handling
      this.socket.on('auth_error', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventSubscriptions.clear();
      this.userSubscriptions.clear();
    }
  }

  // Resubscribe to all previous subscriptions after reconnect
  resubscribe() {
    this.eventSubscriptions.forEach(eventId => {
      this.socket.emit('subscribe_event', eventId);
    });

    this.userSubscriptions.forEach(userId => {
      this.socket.emit('subscribe_user', userId);
    });
  }

  // Event subscriptions
  subscribeToEvent(eventId) {
    if (this.socket) {
      this.socket.emit('subscribe_event', eventId);
      this.eventSubscriptions.add(eventId);
    }
  }

  unsubscribeFromEvent(eventId) {
    if (this.socket) {
      this.socket.emit('unsubscribe_event', eventId);
      this.eventSubscriptions.delete(eventId);
    }
  }

  // User subscriptions
  subscribeToUser(userId) {
    if (this.socket) {
      this.socket.emit('subscribe_user', userId);
      this.userSubscriptions.add(userId);
    }
  }

  unsubscribeFromUser(userId) {
    if (this.socket) {
      this.socket.emit('unsubscribe_user', userId);
      this.userSubscriptions.delete(userId);
    }
  }

  // Event handlers
  onOrderBookUpdate(callback) {
    if (this.socket) {
      this.socket.on('orderbook.update', callback);
    }
  }

  onTradeUpdate(callback) {
    if (this.socket) {
      this.socket.on('trade.update', callback);
    }
  }

  onMarketUpdate(callback) {
    if (this.socket) {
      this.socket.on('market.update', callback);
    }
  }

  onUserUpdate(callback) {
    if (this.socket) {
      this.socket.on('user.update', callback);
    }
  }

  onPositionUpdate(callback) {
    if (this.socket) {
      this.socket.on('position.update', callback);
    }
  }

  onCircuitBreaker(callback) {
    if (this.socket) {
      this.socket.on('circuit_breaker', callback);
    }
  }

  // Admin event handlers
  onAdminUpdate(callback) {
    if (this.socket) {
      this.socket.on('admin.update', callback);
    }
  }

  onSystemAlert(callback) {
    if (this.socket) {
      this.socket.on('system.alert', callback);
    }
  }

  // Remove event listeners
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;
