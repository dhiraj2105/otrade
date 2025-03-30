import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  GridItem,
  Box,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrades: 0,
    openPositions: 0,
    balance: 0,
    profitLoss: 0,
  });
  const [positions, setPositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [limits, setLimits] = useState({
    positionLimit: 0,
    dailyVolumeLimit: 0,
    remainingVolume: 0,
    riskLevel: 'low',
  });

  useEffect(() => {
    const socket = io();
    
    // Subscribe to user's trade updates
    socket.emit('subscribe_trades', user._id);

    socket.on('trade.update', (data) => {
      if (data.userId === user._id) {
        fetchUserData(); // Refresh data on trade updates
      }
    });

    fetchUserData();

    return () => {
      socket.disconnect();
    };
  }, [user._id]);

  const fetchUserData = async () => {
    try {
      const [positionsRes, historyRes, limitsRes] = await Promise.all([
        axios.get('/api/trading/positions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/trading/history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/trading/limits', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setPositions(positionsRes.data);
      setTradeHistory(historyRes.data);
      setLimits(limitsRes.data);

      // Calculate stats
      const stats = {
        totalTrades: historyRes.data.length,
        openPositions: positionsRes.data.length,
        balance: user.balance,
        profitLoss: positionsRes.data.reduce((acc, pos) => acc + pos.unrealizedPnL, 0),
      };
      setStats(stats);
    } catch (error) {
      toast({
        title: 'Error fetching data',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'green';
      case 'moderate':
        return 'yellow';
      case 'high':
        return 'orange';
      case 'severe':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return null; // Add loading spinner
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8}>Trading Dashboard</Heading>

      {/* Stats Overview */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={6} mb={8}>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>Balance</StatLabel>
            <StatNumber>${stats.balance.toFixed(2)}</StatNumber>
            <StatHelpText>Available for trading</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>Open Positions</StatLabel>
            <StatNumber>{stats.openPositions}</StatNumber>
            <StatHelpText>Active trades</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>P&L</StatLabel>
            <StatNumber color={stats.profitLoss >= 0 ? 'green.500' : 'red.500'}>
              ${stats.profitLoss.toFixed(2)}
            </StatNumber>
            <StatHelpText>Unrealized profit/loss</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>Risk Level</StatLabel>
            <StatNumber>
              <Badge colorScheme={getRiskLevelColor(limits.riskLevel)}>
                {limits.riskLevel.toUpperCase()}
              </Badge>
            </StatNumber>
            <StatHelpText>Trading risk assessment</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {/* Trading Limits */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="md" mb={8}>
        <Heading size="md" mb={4}>Trading Limits</Heading>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
          <Stat>
            <StatLabel>Position Limit</StatLabel>
            <StatNumber>${limits.positionLimit.toFixed(2)}</StatNumber>
            <StatHelpText>Maximum position size</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Daily Volume Limit</StatLabel>
            <StatNumber>${limits.dailyVolumeLimit.toFixed(2)}</StatNumber>
            <StatHelpText>Maximum daily trading volume</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Remaining Volume</StatLabel>
            <StatNumber>${limits.remainingVolume.toFixed(2)}</StatNumber>
            <StatHelpText>Available today</StatHelpText>
          </Stat>
        </Grid>
      </Box>

      {/* Positions and History */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
        <Tabs>
          <TabList>
            <Tab>Open Positions</Tab>
            <Tab>Trade History</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Event</Th>
                    <Th>Position</Th>
                    <Th>Entry Price</Th>
                    <Th>Current Price</Th>
                    <Th>Size</Th>
                    <Th>P&L</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {positions.map((position) => (
                    <Tr key={position._id}>
                      <Td>{position.eventTitle}</Td>
                      <Td>
                        <Badge colorScheme={position.position === 'yes' ? 'green' : 'red'}>
                          {position.position.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>${position.entryPrice.toFixed(2)}</Td>
                      <Td>${position.currentPrice.toFixed(2)}</Td>
                      <Td>{position.size}</Td>
                      <Td color={position.unrealizedPnL >= 0 ? 'green.500' : 'red.500'}>
                        ${position.unrealizedPnL.toFixed(2)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            <TabPanel>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Event</Th>
                    <Th>Type</Th>
                    <Th>Position</Th>
                    <Th>Price</Th>
                    <Th>Size</Th>
                    <Th>Total</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tradeHistory.map((trade) => (
                    <Tr key={trade._id}>
                      <Td>{new Date(trade.timestamp).toLocaleDateString()}</Td>
                      <Td>{trade.eventTitle}</Td>
                      <Td>
                        <Badge colorScheme={trade.type === 'buy' ? 'green' : 'red'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={trade.position === 'yes' ? 'green' : 'red'}>
                          {trade.position.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>${trade.price.toFixed(2)}</Td>
                      <Td>{trade.size}</Td>
                      <Td>${(trade.price * trade.size).toFixed(2)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
}

export default Dashboard;
