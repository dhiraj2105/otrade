import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  RadioGroup,
  Radio,
  Text,
  Divider,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

function TradeForm({ onSubmit, disabled, currentPrice, minPrice, maxPrice }) {
  const { user } = useAuth();
  const [position, setPosition] = useState('yes');
  const [type, setType] = useState('market');
  const [price, setPrice] = useState(currentPrice || 0);
  const [size, setSize] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(price * size);
  }, [price, size]);

  useEffect(() => {
    if (currentPrice && type === 'market') {
      setPrice(currentPrice);
    }
  }, [currentPrice, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      position,
      type,
      price,
      size,
    });
  };

  if (!user) {
    return (
      <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
        <Alert status="warning">
          <AlertIcon />
          Please login to trade
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <Text fontSize="xl" fontWeight="bold" mb={2}>
            Place Order
          </Text>

          <FormControl>
            <FormLabel>Position</FormLabel>
            <RadioGroup value={position} onChange={setPosition}>
              <Stack direction="row" spacing={4}>
                <Radio value="yes" colorScheme="green">
                  Yes
                </Radio>
                <Radio value="no" colorScheme="red">
                  No
                </Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          <FormControl>
            <FormLabel>Order Type</FormLabel>
            <RadioGroup value={type} onChange={setType}>
              <Stack direction="row" spacing={4}>
                <Radio value="market">Market</Radio>
                <Radio value="limit">Limit</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          <FormControl>
            <FormLabel>Price</FormLabel>
            <NumberInput
              value={price}
              onChange={(_, value) => setPrice(value)}
              min={minPrice || 0}
              max={maxPrice || 100}
              precision={2}
              step={0.01}
              isReadOnly={type === 'market'}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            {currentPrice && (
              <Text fontSize="sm" color="gray.500" mt={1}>
                Current Market Price: ${currentPrice.toFixed(2)}
              </Text>
            )}
          </FormControl>

          <FormControl>
            <FormLabel>Size</FormLabel>
            <NumberInput
              value={size}
              onChange={(_, value) => setSize(value)}
              min={1}
              precision={0}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <Divider />

          <Box>
            <Text fontSize="sm" color="gray.600">
              Order Summary
            </Text>
            <Stack spacing={2} mt={2}>
              <Text>
                Position: <Text as="span" fontWeight="bold">{position.toUpperCase()}</Text>
              </Text>
              <Text>
                Type: <Text as="span" fontWeight="bold">{type.toUpperCase()}</Text>
              </Text>
              <Text>
                Price: <Text as="span" fontWeight="bold">${price.toFixed(2)}</Text>
              </Text>
              <Text>
                Size: <Text as="span" fontWeight="bold">{size}</Text>
              </Text>
              <Text>
                Total: <Text as="span" fontWeight="bold">${total.toFixed(2)}</Text>
              </Text>
            </Stack>
          </Box>

          <Button
            type="submit"
            colorScheme={position === 'yes' ? 'green' : 'red'}
            size="lg"
            isDisabled={disabled || !price || !size}
          >
            Place {position.toUpperCase()} Order
          </Button>

          {disabled && (
            <Alert status="warning">
              <AlertIcon />
              Trading is currently disabled for this event
            </Alert>
          )}
        </Stack>
      </form>
    </Box>
  );
}

export default TradeForm;
