import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  GridItem,
  Box,
  Heading,
  Text,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from '@chakra-ui/react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import OrderBook from '../components/OrderBook';
import TradeForm from '../components/TradeForm';
import PriceChart from '../components/PriceChart';
import UserPositions from '../components/UserPositions';
import EventStats from '../components/EventStats';

function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [userPositions, setUserPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = io();

    // Subscribe to event updates
    socket.emit('subscribe_event', id);

    // Listen for order book updates
    socket.on('orderbook.update', (data) => {
      if (data.eventId === id) {
        setOrderBook(data);
      }
    });

    // Listen for trade updates
    socket.on('trade.update', (data) => {
      if (data.eventId === id) {
        setTrades((prev) => [data, ...prev].slice(0, 50));
      }
    });

    // Listen for market updates
    socket.on('market.update', (data) => {
      if (data.eventId === id) {
        setEvent((prev) => prev ? { ...prev, metrics: data.metrics } : prev);
      }
    });

    // Fetch initial data
    fetchEventData();

    return () => {
      socket.emit('unsubscribe_event', id);
      socket.disconnect();
    };
  }, [id]);

  const fetchEventData = async () => {
    try {
      const [eventRes, orderBookRes, tradesRes] = await Promise.all([
        axios.get(`/api/events/${id}`),
        axios.get(`/api/trading/orderbook/${id}`),
        axios.get(`/api/trading/trades/${id}`),
      ]);

      setEvent(eventRes.data);
      setOrderBook(orderBookRes.data);
      setTrades(tradesRes.data);

      if (user) {
        const positionsRes = await axios.get(`/api/trading/positions/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUserPositions(positionsRes.data);
      }
    } catch (error) {
      toast({
        title: 'Error fetching event data',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (tradeData) => {
    try {
      await axios.post('/api/trading/order', {
        ...tradeData,
        eventId: id
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast({
        title: 'Order placed successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error placing order',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading || !event) {
    return null; // Add a loading spinner here
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        {/* Event Header */}
        <GridItem colSpan={12}>
          <Box mb={6}>
            <Heading size="lg">{event.title}</Heading>
            <Text mt={2} color="gray.600">{event.description}</Text>
            <Badge colorScheme={event.status === 'active' ? 'green' : 'red'} mt={2}>
              {event.status}
            </Badge>
          </Box>
        </GridItem>

        {/* Main Trading Area */}
        <GridItem colSpan={{ base: 12, lg: 8 }}>
          <Box bg="white" p={6} borderRadius="lg" boxShadow="md" mb={6}>
            <PriceChart trades={trades} />
          </Box>

          <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={6}>
            <GridItem>
              <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
                <StatLabel>Current Price</StatLabel>
                <StatNumber>{event.metrics?.vwap?.toFixed(2) || 'N/A'}</StatNumber>
                <StatHelpText>VWAP</StatHelpText>
              </Stat>
            </GridItem>
            <GridItem>
              <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
                <StatLabel>24h Volume</StatLabel>
                <StatNumber>{event.metrics?.volume?.toFixed(2) || 'N/A'}</StatNumber>
                <StatHelpText>Trading Volume</StatHelpText>
              </Stat>
            </GridItem>
          </Grid>

          <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
            <Tabs>
              <TabList>
                <Tab>Order Book</Tab>
                <Tab>Recent Trades</Tab>
                <Tab>Your Positions</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <OrderBook orderBook={orderBook} />
                </TabPanel>
                <TabPanel>
                  <EventStats trades={trades} />
                </TabPanel>
                <TabPanel>
                  <UserPositions positions={userPositions} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </GridItem>

        {/* Trading Form */}
        <GridItem colSpan={{ base: 12, lg: 4 }}>
          <Box position="sticky" top="20px">
            <TradeForm
              onSubmit={handleTrade}
              disabled={!user || event.status !== 'active'}
              currentPrice={event.metrics?.vwap}
              minPrice={event.minPrice}
              maxPrice={event.maxPrice}
            />
          </Box>
        </GridItem>
      </Grid>
    </Container>
  );
}

export default EventDetail;
