/**
 * Matchmaking System
 * Handles queue management and participant pairing
 */

const { randomUUID } = require('crypto');
const { getRandomPersonality } = require('./aiParticipant');

// Waiting queue
const waitingQueue = [];

// User tracking
const users = new Map();

/**
 * Assign role based on user selection
 * @param {string} selection - 'human', 'cat', or 'random'
 * @returns {string} - Assigned role
 */
function assignRole(selection) {
    if (selection === 'random') {
        const roles = ['human', 'cat', 'ai'];
        return roles[Math.floor(Math.random() * roles.length)];
    }
    return selection;
}

/**
 * Add user to waiting queue
 * @param {Object} socket - Socket.io socket
 * @param {string} role - User's role
 */
function addToQueue(socket, role) {
    const user = {
        socketId: socket.id,
        socket: socket,
        role: role,
        joinedAt: Date.now()
    };

    waitingQueue.push(user);
    users.set(socket.id, { role, inQueue: true, chatId: null });

    console.log(`User ${socket.id} joined queue as ${role}`);
}

/**
 * Find a match for a user
 * @param {Object} user - User looking for match
 * @returns {Object|null} - Matched user or null
 */
function findMatch(user) {
    // Matching rules:
    // - Human can match with Human, Cat, or AI
    // - Cat can only match with Human
    // - AI can only match with Human

    for (let i = 0; i < waitingQueue.length; i++) {
        const candidate = waitingQueue[i];

        // Skip self
        if (candidate.socketId === user.socketId) {
            continue;
        }

        // Check if valid match
        const isValidMatch = (
            (user.role === 'human') || // Human matches with anyone
            (user.role === 'cat' && candidate.role === 'human') ||
            (user.role === 'ai' && candidate.role === 'human')
        );

        if (isValidMatch) {
            // Remove from queue
            waitingQueue.splice(i, 1);
            return candidate;
        }
    }

    return null;
}

/**
 * Create AI participant as fallback
 * @returns {Object} - AI participant object
 */
function createAIParticipant() {
    const aiPersonality = getRandomPersonality();

    return {
        socketId: 'ai-' + randomUUID(),
        socket: null, // AI doesn't have a real socket
        role: 'ai',
        aiPersonality: aiPersonality,
        isAI: true
    };
}

/**
 * Process matchmaking for a user
 * @param {Object} user - User to match
 * @returns {Object|null} - Match result or null if waiting
 */
function processMatchmaking(user) {
    // Try to find a match
    const match = findMatch(user);

    if (match) {
        // Found a match
        return {
            participants: [user, match],
            chatId: randomUUID()
        };
    }

    // No match found - check if we should create AI fallback
    // Only create AI for humans after waiting a bit
    if (user.role === 'human') {
        const waitTime = Date.now() - user.joinedAt;

        if (waitTime > 3000) { // 3 seconds wait
            // Remove from queue
            const index = waitingQueue.findIndex(u => u.socketId === user.socketId);
            if (index !== -1) {
                waitingQueue.splice(index, 1);
            }

            // Create AI participant
            const aiParticipant = createAIParticipant();

            return {
                participants: [user, aiParticipant],
                chatId: randomUUID()
            };
        }
    }

    return null; // Keep waiting
}

/**
 * Remove user from queue
 * @param {string} socketId - Socket ID
 */
function removeFromQueue(socketId) {
    const index = waitingQueue.findIndex(u => u.socketId === socketId);
    if (index !== -1) {
        waitingQueue.splice(index, 1);
    }

    if (users.has(socketId)) {
        users.delete(socketId);
    }

    console.log(`User ${socketId} removed from queue`);
}

/**
 * Update user chat status
 * @param {string} socketId - Socket ID
 * @param {string} chatId - Chat room ID
 */
function updateUserChat(socketId, chatId) {
    if (users.has(socketId)) {
        const user = users.get(socketId);
        user.inQueue = false;
        user.chatId = chatId;
    }
}

/**
 * Get user info
 * @param {string} socketId - Socket ID
 * @returns {Object|null} - User info or null
 */
function getUser(socketId) {
    return users.get(socketId) || null;
}

module.exports = {
    assignRole,
    addToQueue,
    processMatchmaking,
    removeFromQueue,
    updateUserChat,
    getUser
};
