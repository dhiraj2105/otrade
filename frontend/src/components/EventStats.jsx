import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';

function EventStats({ trades }) {
  // Calculate statistics
  const stats = trades.reduce((acc, trade) => {
    // Update volume
    acc.volume += trade.price * trade.size;
    acc.totalSize += trade.size;

    // Update price stats
    if (!acc.high || trade.price > acc.high) acc.high = trade.price;
    if (!acc.low || trade.price < acc.low) acc.low = trade.price;
    
    // Update position counts
    if (trade.position === 'yes') {
      acc.yesVolume += trade.price * trade.size;
      acc.yesSize += trade.size;
    } else {
      acc.noVolume += trade.price * trade.size;
      acc.noSize += trade.size;
    }

    return acc;
  }, {
    volume: 0,
    totalSize: 0,
    high: null,
    low: null,
    yesVolume: 0,
    yesSize: 0,
    noVolume: 0,
    noSize: 0,
  });

  // Calculate VWAPs
  const vwap = stats.volume / stats.totalSize || 0;
  const yesVwap = stats.yesVolume / stats.yesSize || 0;
  const noVwap = stats.noVolume / stats.noSize || 0;

  return (
    <Box>
      {/* Market Overview */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mb={6}>
        <Stat bg="gray.50" p={4} borderRadius="md">
          <StatLabel>24h Volume</StatLabel>
          <StatNumber>${stats.volume.toFixed(2)}</StatNumber>
          <StatHelpText>{stats.totalSize} trades</StatHelpText>
        </Stat>
        
        <Stat bg="gray.50" p={4} borderRadius="md">
          <StatLabel>24h Range</StatLabel>
          <StatNumber>
            ${stats.low?.toFixed(2) || '0.00'} - ${stats.high?.toFixed(2) || '0.00'}
          </StatNumber>
          <StatHelpText>Low - High</StatHelpText>
        </Stat>

        <Stat bg="gray.50" p={4} borderRadius="md">
          <StatLabel>VWAP</StatLabel>
          <StatNumber>${vwap.toFixed(2)}</StatNumber>
          <StatHelpText>Volume Weighted Average Price</StatHelpText>
        </Stat>
      </Grid>

      {/* Position Stats */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} mb={6}>
        <Box bg="green.50" p={4} borderRadius="md">
          <Text fontWeight="bold" mb={2}>YES Position</Text>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <Box>
              <Text color="gray.600">Volume</Text>
              <Text fontWeight="bold">${stats.yesVolume.toFixed(2)}</Text>
            </Box>
            <Box>
              <Text color="gray.600">VWAP</Text>
              <Text fontWeight="bold">${yesVwap.toFixed(2)}</Text>
            </Box>
            <Box>
              <Text color="gray.600">Size</Text>
              <Text fontWeight="bold">{stats.yesSize}</Text>
            </Box>
            <Box>
              <Text color="gray.600">% of Volume</Text>
              <Text fontWeight="bold">
                {((stats.yesVolume / stats.volume) * 100 || 0).toFixed(1)}%
              </Text>
            </Box>
          </Grid>
        </Box>

        <Box bg="red.50" p={4} borderRadius="md">
          <Text fontWeight="bold" mb={2}>NO Position</Text>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <Box>
              <Text color="gray.600">Volume</Text>
              <Text fontWeight="bold">${stats.noVolume.toFixed(2)}</Text>
            </Box>
            <Box>
              <Text color="gray.600">VWAP</Text>
              <Text fontWeight="bold">${noVwap.toFixed(2)}</Text>
            </Box>
            <Box>
              <Text color="gray.600">Size</Text>
              <Text fontWeight="bold">{stats.noSize}</Text>
            </Box>
            <Box>
              <Text color="gray.600">% of Volume</Text>
              <Text fontWeight="bold">
                {((stats.noVolume / stats.volume) * 100 || 0).toFixed(1)}%
              </Text>
            </Box>
          </Grid>
        </Box>
      </Grid>

      {/* Recent Trades */}
      <Box>
        <Text fontWeight="bold" mb={4}>Recent Trades</Text>
        <Box maxH="300px" overflowY="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Position</Th>
                <Th>Price</Th>
                <Th>Size</Th>
                <Th>Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {trades.map((trade) => (
                <Tr key={trade._id}>
                  <Td>{new Date(trade.timestamp).toLocaleTimeString()}</Td>
                  <Td>
                    <Badge colorScheme={trade.position === 'yes' ? 'green' : 'red'}>
                      {trade.position.toUpperCase()}
                    </Badge>
                  </Td>
                  <Td isNumeric>${trade.price.toFixed(2)}</Td>
                  <Td isNumeric>{trade.size}</Td>
                  <Td isNumeric>${(trade.price * trade.size).toFixed(2)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}

export default EventStats;
