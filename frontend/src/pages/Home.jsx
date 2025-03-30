import { Box, Container, Heading, Text, Button, SimpleGrid } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

const formatNumber = (num) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

function Home() {
  const [stats, setStats] = useState({
    activeEvents: 0,
    totalUsers: 0,
    totalTrades: 0,
    tradingVolume: 0
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/events/stats');
        setStats(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Unable to load platform statistics');
        setStats({
          activeEvents: 0,
          totalUsers: 0,
          totalTrades: 0,
          tradingVolume: 0
        });
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container maxW="container.xl" py={8}>
      {error && (
        <Box bg="red.50" color="red.600" p={4} borderRadius="lg" mb={8}>
          <Text>{error}</Text>
        </Box>
      )}
      <Box textAlign="center" mb={12}>
        <Heading as="h1" size="2xl" mb={4}>
          Opinion Trading Platform
        </Heading>
        <Text fontSize="xl" color="gray.600" mb={8}>
          Trade your opinions on future events and earn rewards
        </Text>
        <Button
          as={RouterLink}
          to="/events"
          colorScheme="blue"
          size="lg"
          mb={8}
        >
          Start Trading
        </Button>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={12}>
        <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
          <Text fontSize="sm" color="gray.500">Active Events</Text>
          <Text fontSize="3xl" fontWeight="bold">{formatNumber(stats.activeEvents)}</Text>
          <Text fontSize="sm" color="gray.500">Available for trading</Text>
        </Box>
        <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
          <Text fontSize="sm" color="gray.500">Total Users</Text>
          <Text fontSize="3xl" fontWeight="bold">{formatNumber(stats.totalUsers)}</Text>
          <Text fontSize="sm" color="gray.500">Active traders</Text>
        </Box>
        <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
          <Text fontSize="sm" color="gray.500">Total Trades</Text>
          <Text fontSize="3xl" fontWeight="bold">{formatNumber(stats.totalTrades)}</Text>
          <Text fontSize="sm" color="gray.500">Completed trades</Text>
        </Box>
        <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
          <Text fontSize="sm" color="gray.500">Trading Volume</Text>
          <Text fontSize="3xl" fontWeight="bold">{formatNumber(stats.tradingVolume)}</Text>
          <Text fontSize="sm" color="gray.500">Total volume</Text>
        </Box>
      </SimpleGrid>

      <Box textAlign="center">
        <Heading as="h2" size="xl" mb={4}>
          How It Works
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
          <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
            <Heading as="h3" size="md" mb={4}>
              1. Choose an Event
            </Heading>
            <Text>Browse through various events and select one to trade on</Text>
          </Box>
          <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
            <Heading as="h3" size="md" mb={4}>
              2. Make Your Trade
            </Heading>
            <Text>Take a position based on your opinion of the outcome</Text>
          </Box>
          <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
            <Heading as="h3" size="md" mb={4}>
              3. Earn Rewards
            </Heading>
            <Text>Get rewarded when your predictions are correct</Text>
          </Box>
        </SimpleGrid>
      </Box>
    </Container>
  );
}

export default Home;
