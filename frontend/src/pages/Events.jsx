import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  SimpleGrid,
  Box,
  Heading,
  Text,
  Badge,
  Button,
  Flex,
  Select,
  Input,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const socket = io();

    // Subscribe to market updates
    socket.on('market.update', (data) => {
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event._id === data.eventId
            ? { ...event, metrics: data.metrics }
            : event
        )
      );
    });

    // Fetch initial events
    fetchEvents();

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data);
    } catch (error) {
      toast({
        title: 'Error fetching events',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = Array.isArray(events) ? events.filter((event) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && event.status === 'active') ||
      (filter === 'upcoming' && event.status === 'upcoming') ||
      (filter === 'closed' && event.status === 'closed');

    const matchesSearch = event.title
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
}) : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'upcoming':
        return 'blue';
      case 'closed':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8}>Events</Heading>

      <Flex mb={6} gap={4}>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          w="200px"
        >
          <option value="all">All Events</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="closed">Closed</option>
        </Select>

        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w="300px"
        />
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {filteredEvents.map((event) => (
          <Box
            key={event._id}
            p={6}
            bg="white"
            borderRadius="lg"
            boxShadow="md"
            transition="transform 0.2s"
            _hover={{ transform: 'translateY(-4px)' }}
          >
            <Flex justify="space-between" align="start" mb={4}>
              <Heading size="md" noOfLines={2}>
                {event.title}
              </Heading>
              <Badge colorScheme={getStatusColor(event.status)}>
                {event.status}
              </Badge>
            </Flex>

            <Text noOfLines={3} mb={4} color="gray.600">
              {event.description}
            </Text>

            {event.metrics && (
              <SimpleGrid columns={2} spacing={4} mb={4}>
                <Stat size="sm">
                  <StatLabel>VWAP</StatLabel>
                  <StatNumber>{event.metrics.vwap.toFixed(2)}</StatNumber>
                  <StatHelpText>Current Price</StatHelpText>
                </Stat>
                <Stat size="sm">
                  <StatLabel>Liquidity</StatLabel>
                  <StatNumber>
                    {(event.metrics.liquidity * 100).toFixed(1)}%
                  </StatNumber>
                  <StatHelpText>Market Quality</StatHelpText>
                </Stat>
              </SimpleGrid>
            )}

            {event.metrics?.circuitBreaker?.active && (
              <Badge colorScheme="red" mb={4}>
                Circuit Breaker Active
              </Badge>
            )}

            <Button
              as={RouterLink}
              to={`/events/${event._id}`}
              colorScheme="blue"
              width="full"
              isDisabled={!user || event.status === 'closed'}
            >
              {user
                ? event.status === 'closed'
                  ? 'Event Closed'
                  : 'Trade Now'
                : 'Login to Trade'}
            </Button>
          </Box>
        ))}
      </SimpleGrid>

      {filteredEvents.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <Text>No events found matching your criteria.</Text>
        </Box>
      )}
    </Container>
  );
}

export default Events;
