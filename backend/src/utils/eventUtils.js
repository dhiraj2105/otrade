// Valid status transitions for events
export const validStatusTransitions = {
    'upcoming': ['active', 'cancelled'],
    'active': ['trading', 'cancelled'],
    'trading': ['closed'],
    'closed': ['settled'],
    'settled': [],
    'cancelled': []
};

// Check if status transition is valid
export const isValidStatusTransition = (currentStatus, newStatus) => {
    return validStatusTransitions[currentStatus]?.includes(newStatus) || false;
};

// Calculate settlement price based on outcome
export const calculateSettlementPrice = (outcome) => {
    switch (outcome) {
        case 'yes':
            return 100;
        case 'no':
            return 0;
        case 'cancelled':
            return 50;
        default:
            return null;
    }
};
