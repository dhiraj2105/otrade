import { Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex } from '@chakra-ui/react';

function OrderBook({ orderBook }) {
  const { bids, asks } = orderBook;

  const formatPrice = (price) => price.toFixed(2);
  const formatSize = (size) => size.toFixed(2);

  return (
    <Box>
      <Flex justify="space-between" mb={4}>
        <Text fontWeight="bold">Order Book</Text>
        <Text fontSize="sm" color="gray.500">Price × Size</Text>
      </Flex>

      <Box maxH="400px" overflowY="auto">
        {/* Asks (Sell Orders) - Displayed in reverse order */}
        <Table variant="simple" size="sm">
          <Tbody>
            {asks.slice().reverse().map((ask, index) => (
              <Tr key={`ask-${index}`}>
                <Td isNumeric color="red.500" pl={0}>
                  {formatPrice(ask.price)}
                </Td>
                <Td isNumeric pr={0}>
                  {formatSize(ask.size)}
                </Td>
                <Td isNumeric color="gray.500" pr={0}>
                  {formatPrice(ask.price * ask.size)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {/* Spread */}
        <Box py={2} textAlign="center" bg="gray.50">
          <Text fontSize="sm" color="gray.600">
            Spread: {bids.length && asks.length
              ? formatPrice(Math.abs(asks[0].price - bids[0].price))
              : '0.00'}
          </Text>
        </Box>

        {/* Bids (Buy Orders) */}
        <Table variant="simple" size="sm">
          <Tbody>
            {bids.map((bid, index) => (
              <Tr key={`bid-${index}`}>
                <Td isNumeric color="green.500" pl={0}>
                  {formatPrice(bid.price)}
                </Td>
                <Td isNumeric pr={0}>
                  {formatSize(bid.size)}
                </Td>
                <Td isNumeric color="gray.500" pr={0}>
                  {formatPrice(bid.price * bid.size)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

export default OrderBook;
