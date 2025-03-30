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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Select,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

function AdminPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [riskReport, setRiskReport] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({
    userStatus: 'all',
    userRole: 'all',
    eventStatus: 'all',
    search: '',
  });

  useEffect(() => {
    if (!user?.isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const socket = io();
    
    socket.on('admin.update', (data) => {
      fetchAdminData(); // Refresh data on updates
    });

    fetchAdminData();

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, eventsRes, riskRes] = await Promise.all([
        axios.get('/api/admin/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/admin/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/admin/events', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/admin/risk-report', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setEvents(eventsRes.data);
      setRiskReport(riskRes.data);
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

  const handleUserAction = async (userId, action, data) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, {
        action,
        ...data
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast({
        title: 'Success',
        description: 'User updated successfully',
        status: 'success',
        duration: 3000,
      });

      fetchAdminData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleEventAction = async (eventId, action, data) => {
    try {
      await axios.put(`/api/admin/events/${eventId}`, {
        action,
        ...data
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast({
        title: 'Success',
        description: 'Event updated successfully',
        status: 'success',
        duration: 3000,
      });

      fetchAdminData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading || !stats) {
    return null; // Add loading spinner
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8}>Admin Panel</Heading>

      {/* System Overview */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={6} mb={8}>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>Total Users</StatLabel>
            <StatNumber>{stats.users.total}</StatNumber>
            <StatHelpText>{stats.users.active} active</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>Active Events</StatLabel>
            <StatNumber>{stats.events.active}</StatNumber>
            <StatHelpText>{stats.events.total} total</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>Trading Volume</StatLabel>
            <StatNumber>${stats.trades.volume.toFixed(2)}</StatNumber>
            <StatHelpText>{stats.trades.count} trades today</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="white" p={4} borderRadius="lg" boxShadow="md">
            <StatLabel>System Risk</StatLabel>
            <StatNumber>
              <Badge colorScheme={riskReport?.systemRisk.riskLevel === 'LOW' ? 'green' : 'red'}>
                {riskReport?.systemRisk.riskLevel}
              </Badge>
            </StatNumber>
            <StatHelpText>Market quality: {(riskReport?.systemRisk.marketQuality * 100).toFixed(1)}%</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {/* Main Content */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
        <Tabs>
          <TabList>
            <Tab>User Management</Tab>
            <Tab>Event Management</Tab>
            <Tab>Risk Management</Tab>
          </TabList>

          <TabPanels>
            {/* User Management */}
            <TabPanel>
              <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
                <Select
                  value={filters.userStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, userStatus: e.target.value }))}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <Select
                  value={filters.userRole}
                  onChange={(e) => setFilters(prev => ({ ...prev, userRole: e.target.value }))}
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </Select>
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </Grid>

              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Balance</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((user) => (
                    <Tr key={user._id}>
                      <Td>{user.name}</Td>
                      <Td>{user.email}</Td>
                      <Td>
                        <Badge colorScheme={user.role === 'admin' ? 'purple' : 'gray'}>
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={user.status === 'active' ? 'green' : 'red'}>
                          {user.status}
                        </Badge>
                      </Td>
                      <Td>${user.balance.toFixed(2)}</Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          mr={2}
                          onClick={() => {
                            setSelectedItem(user);
                            onOpen();
                          }}
                        >
                          Edit
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* Event Management */}
            <TabPanel>
              <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={4}>
                <Select
                  value={filters.eventStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, eventStatus: e.target.value }))}
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="trading">Trading</option>
                  <option value="closed">Closed</option>
                  <option value="settled">Settled</option>
                </Select>
                <Input
                  placeholder="Search events..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </Grid>

              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Title</Th>
                    <Th>Status</Th>
                    <Th>Trading Volume</Th>
                    <Th>Market Quality</Th>
                    <Th>Circuit Breaker</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {events.map((event) => (
                    <Tr key={event._id}>
                      <Td>{event.title}</Td>
                      <Td>
                        <Badge colorScheme={event.status === 'active' ? 'green' : 'gray'}>
                          {event.status}
                        </Badge>
                      </Td>
                      <Td>${event.tradingVolume.toFixed(2)}</Td>
                      <Td>
                        <Badge colorScheme={event.marketQuality > 0.7 ? 'green' : 'yellow'}>
                          {(event.marketQuality * 100).toFixed(1)}%
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={event.circuitBreaker.active ? 'red' : 'green'}>
                          {event.circuitBreaker.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          mr={2}
                          onClick={() => {
                            setSelectedItem(event);
                            onOpen();
                          }}
                        >
                          Manage
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* Risk Management */}
            <TabPanel>
              <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                <Box>
                  <Heading size="md" mb={4}>System Risk Metrics</Heading>
                  <Table variant="simple">
                    <Tbody>
                      <Tr>
                        <Td>Average Market Quality</Td>
                        <Td>
                          <Badge colorScheme={riskReport?.systemRisk.averageMarketQuality > 0.7 ? 'green' : 'yellow'}>
                            {(riskReport?.systemRisk.averageMarketQuality * 100).toFixed(1)}%
                          </Badge>
                        </Td>
                      </Tr>
                      <Tr>
                        <Td>Average Liquidity</Td>
                        <Td>
                          <Badge colorScheme={riskReport?.systemRisk.averageLiquidity > 0.7 ? 'green' : 'yellow'}>
                            {(riskReport?.systemRisk.averageLiquidity * 100).toFixed(1)}%
                          </Badge>
                        </Td>
                      </Tr>
                      <Tr>
                        <Td>System Volatility</Td>
                        <Td>
                          <Badge colorScheme={riskReport?.systemRisk.systemVolatility < 0.3 ? 'green' : 'red'}>
                            {(riskReport?.systemRisk.systemVolatility * 100).toFixed(1)}%
                          </Badge>
                        </Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </Box>

                <Box>
                  <Heading size="md" mb={4}>High Risk Events</Heading>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Event</Th>
                        <Th>Risk Level</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {riskReport?.events
                        .filter(event => event.metrics.riskLevel === 'HIGH' || event.metrics.riskLevel === 'SEVERE')
                        .map(event => (
                          <Tr key={event.eventId}>
                            <Td>{event.title}</Td>
                            <Td>
                              <Badge colorScheme="red">{event.metrics.riskLevel}</Badge>
                            </Td>
                            <Td>
                              <Button size="sm" colorScheme="red">
                                Pause Trading
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                    </Tbody>
                  </Table>
                </Box>
              </Grid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedItem?.email ? 'Edit User' : 'Manage Event'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedItem?.email ? (
              // User Edit Form
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={selectedItem.status}
                    onChange={(e) => setSelectedItem(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={selectedItem.role}
                    onChange={(e) => setSelectedItem(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Balance</FormLabel>
                  <Input
                    type="number"
                    value={selectedItem.balance}
                    onChange={(e) => setSelectedItem(prev => ({ ...prev, balance: parseFloat(e.target.value) }))}
                  />
                </FormControl>
              </Stack>
            ) : (
              // Event Management Form
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={selectedItem?.status}
                    onChange={(e) => setSelectedItem(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="trading">Trading</option>
                    <option value="closed">Closed</option>
                    <option value="settled">Settled</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Circuit Breaker</FormLabel>
                  <Select
                    value={selectedItem?.circuitBreaker?.active ? 'active' : 'inactive'}
                    onChange={(e) => setSelectedItem(prev => ({
                      ...prev,
                      circuitBreaker: {
                        ...prev.circuitBreaker,
                        active: e.target.value === 'active'
                      }
                    }))}
                  >
                    <option value="inactive">Inactive</option>
                    <option value="active">Active</option>
                  </Select>
                </FormControl>
              </Stack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => {
              if (selectedItem?.email) {
                handleUserAction(selectedItem._id, 'update', selectedItem);
              } else {
                handleEventAction(selectedItem._id, 'update', selectedItem);
              }
              onClose();
            }}>
              Save
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default AdminPanel;
