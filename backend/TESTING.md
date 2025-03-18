# Testing Guide

This guide outlines the testing strategy and procedures for the Opinion Trading Platform backend.

## Testing Stack

- **Jest**: Main testing framework
- **Supertest**: HTTP assertions for API testing
- **MongoDB Memory Server**: In-memory MongoDB for integration tests
- **Socket.IO Client**: WebSocket testing
- **Artillery**: Load testing

## Test Types

### 1. Unit Tests

Located in `src/__tests__/unit/`

```bash
# Run unit tests
npm run test:unit
```

Test individual components in isolation:

- Models
- Services
- Utilities
- Validators

### 2. Integration Tests

Located in `src/__tests__/integration/`

```bash
# Run integration tests
npm run test:integration
```

Test interactions between components:

- API Routes
- Database Operations
- Authentication Flow
- WebSocket Events

### 3. Load Tests

Located in `src/__tests__/load/`

```bash
# Run load tests
npm run test:load
```

Test system performance under load:

- Concurrent Users
- Order Processing
- WebSocket Broadcasting
- Database Performance

## Test Coverage

We maintain high test coverage across critical components:

- Trading Engine: 90%+
- Authentication: 90%+
- Event Management: 85%+
- Admin Panel: 85%+

## Testing Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Use mocks for external services
3. **Clean Up**: Reset state between tests
4. **Assertions**: Make specific assertions
5. **Documentation**: Document test scenarios

## Component Testing Guide

### Trading Engine

1. Order Book Service
```javascript
describe('OrderBookService', () => {
  it('should maintain price-time priority', async () => {
    const order1 = { price: 50, amount: 10, timestamp: Date.now() };
    const order2 = { price: 50, amount: 5, timestamp: Date.now() + 1000 };
    // Test implementation
  });
});
```

2. Price Discovery Service
```javascript
describe('PriceDiscoveryService', () => {
  it('should calculate VWAP correctly', async () => {
    const trades = [
      { price: 50, amount: 10 },
      { price: 55, amount: 5 }
    ];
    // Test implementation
  });
});
```

3. Trade Matching Service
```javascript
describe('TradeMatchingService', () => {
  it('should match compatible orders', async () => {
    const buyOrder = { type: 'buy', price: 50, amount: 10 };
    const sellOrder = { type: 'sell', price: 50, amount: 10 };
    // Test implementation
  });
});
```

### WebSocket Testing

1. Event Subscriptions
```javascript
describe('WebSocket Events', () => {
  it('should receive order updates', (done) => {
    const client = io('http://localhost:3000');
    client.emit('subscribe', { events: ['event1'] });
    client.on('order.update', (data) => {
      expect(data).toHaveProperty('orderId');
      done();
    });
  });
});
```

2. Market Data Updates
```javascript
describe('Market Data WebSocket', () => {
  it('should broadcast order book updates', (done) => {
    const client = io('http://localhost:3000');
    client.on('orderbook.update', (data) => {
      expect(data).toHaveProperty('bids');
      expect(data).toHaveProperty('asks');
      done();
    });
  });
});
```

### API Testing

1. Authentication
```javascript
describe('Authentication API', () => {
  it('should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
    expect(res.status).toBe(201);
  });
});
```

2. Event Management
```javascript
describe('Event Management API', () => {
  it('should create new event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Event',
        description: 'Test Description',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
    expect(res.status).toBe(201);
  });
});
```

### Load Testing Scenarios

1. Order Processing
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - post:
          url: '/api/trading/order'
          json:
            eventId: '{{$randomString()}}'
            type: 'buy'
            price: 50
            amount: 10
```

2. WebSocket Connections
```yaml
config:
  target: 'ws://localhost:3000'
  phases:
    - duration: 30
      arrivalRate: 5
scenarios:
  - engine: 'ws'
    flow:
      - send: 
          subscribe:
            events: ['{{$randomEventId}}']
      - think: 5
```

## Running Tests

1. Install dependencies:
```bash
npm install
```

2. Run all tests:
```bash
npm test
```

3. Run specific test suites:
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Load tests
npm run test:load
```

4. Generate coverage report:
```bash
npm run test:coverage
```

## Continuous Integration

Tests are automatically run on:
- Pull Request creation
- Push to main branch
- Daily scheduled runs

## Debugging Tests

1. Use the `debug` npm package:
```javascript
const debug = require('debug')('app:test');
debug('Test state:', state);
```

2. Run tests in debug mode:
```bash
DEBUG=app:* npm test
```

## Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.js` or `*.spec.js`
3. Import required modules
4. Write test cases
5. Run and verify

## Test Environment Setup

```javascript
// src/__tests__/setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

beforeAll(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
```
