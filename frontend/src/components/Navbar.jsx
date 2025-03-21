import { Box, Flex, Button, Link as ChakraLink, Spacer } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <Box bg="blue.500" px={4} py={2}>
      <Flex maxW="1200px" mx="auto" align="center">
        <ChakraLink as={RouterLink} to="/" color="white" fontWeight="bold" fontSize="xl">
          Opinion Trading
        </ChakraLink>
        
        <Spacer />
        
        <Flex gap={4}>
          <ChakraLink as={RouterLink} to="/events" color="white">
            Events
          </ChakraLink>
          
          {user ? (
            <>
              <ChakraLink as={RouterLink} to="/dashboard" color="white">
                Dashboard
              </ChakraLink>
              
              {isAdmin && (
                <ChakraLink as={RouterLink} to="/admin" color="white">
                  Admin
                </ChakraLink>
              )}
              
              <Button
                colorScheme="whiteAlpha"
                variant="outline"
                size="sm"
                onClick={logout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <ChakraLink as={RouterLink} to="/login" color="white">
                Login
              </ChakraLink>
              <Button
                as={RouterLink}
                to="/register"
                colorScheme="whiteAlpha"
                variant="outline"
                size="sm"
              >
                Register
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

export default Navbar;
