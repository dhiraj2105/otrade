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
  Button,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

function UserPositions({ positions }) {
  const toast = useToast();

  const handleClosePosition = async (positionId) => {
    try {
      await axios.post(
        `/api/trading/close-position/${positionId}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      toast({
        title: 'Position closed',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error closing position',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (!positions.length) {
    return (
      <Box textAlign="center" py={4}>
        <Text color="gray.500">No open positions</Text>
      </Box>
    );
  }

  return (
    <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Position</Th>
            <Th>Entry Price</Th>
            <Th>Current Price</Th>
            <Th>Size</Th>
            <Th>P&L</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {positions.map((position) => {
            const pnl = (position.currentPrice - position.entryPrice) * position.size;
            const pnlPercentage = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;

            return (
              <Tr key={position._id}>
                <Td>
                  <Badge colorScheme={position.position === 'yes' ? 'green' : 'red'}>
                    {position.position.toUpperCase()}
                  </Badge>
                </Td>
                <Td isNumeric>${position.entryPrice.toFixed(2)}</Td>
                <Td isNumeric>${position.currentPrice.toFixed(2)}</Td>
                <Td isNumeric>{position.size}</Td>
                <Td>
                  <Box>
                    <Text
                      color={pnl >= 0 ? 'green.500' : 'red.500'}
                      fontWeight="bold"
                    >
                      ${pnl.toFixed(2)}
                    </Text>
                    <Text
                      fontSize="sm"
                      color={pnl >= 0 ? 'green.500' : 'red.500'}
                    >
                      {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                    </Text>
                  </Box>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => handleClosePosition(position._id)}
                  >
                    Close
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

export default UserPositions;
