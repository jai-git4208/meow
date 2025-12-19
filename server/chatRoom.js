/**
 * Chat Room Management
 * Handles chat room lifecycle, messages, and limits
 */

const { filterProfanity } = require('./profanityFilter');
const { generateResponse, clearHistory } = require('./aiParticipant');

// Active chat rooms
const chatRooms = new Map();

// Chat configuration
const CHAT_CONFIG = {
    MAX_DURATION: 120000, // 2 minutes in milliseconds
    MAX_MESSAGES: 12, // Total messages (6 per person)
};

/**
 * Create a new chat room
 * @param {string} chatId - Unique chat room ID
 * @param {Array} participants - Array of {socketId, role, socket}
 * @returns {Object} - Chat room object
 */
function createChatRoom(chatId, participants) {
    const chatRoom = {
        id: chatId,
        participants: participants.map(p => ({
            socketId: p.socketId,
            role: p.role,
            socket: p.socket,
            messageCount: 0
        })),
        totalMessages: 0,
        startTime: Date.now(),
        ended: false,
        timer: null
    };

    chatRooms.set(chatId, chatRoom);

    // Set auto-end timer
    chatRoom.timer = setTimeout(() => {
        endChat(chatId, 'time_limit');
    }, CHAT_CONFIG.MAX_DURATION);

    console.log(`Chat room ${chatId} created with participants:`,
        participants.map(p => p.role).join(' & '));

    return chatRoom;
}

/**
 * Handle incoming message in a chat room
 * @param {string} chatId - Chat room ID
 * @param {string} senderSocketId - Sender's socket ID
 * @param {string} message - Message content
 * @param {Object} io - Socket.io instance
 */
async function handleMessage(chatId, senderSocketId, message, io) {
    const chatRoom = chatRooms.get(chatId);

    if (!chatRoom || chatRoom.ended) {
        return;
    }

    // Filter profanity
    const filteredMessage = filterProfanity(message);

    // Find sender
    const sender = chatRoom.participants.find(p => p.socketId === senderSocketId);
    if (!sender) return;

    sender.messageCount++;
    chatRoom.totalMessages++;

    // Send message to the other participant
    const recipient = chatRoom.participants.find(p => p.socketId !== senderSocketId);

    if (recipient) {
        // Only emit to recipient if they're not AI (AI has null socket)
        if (recipient.role !== 'ai' && recipient.socket) {
            recipient.socket.emit('receive_message', {
                message: filteredMessage,
                timestamp: Date.now()
            });
        }

        // If recipient is AI, generate and send response
        if (recipient.role === 'ai') {
            setTimeout(async () => {
                try {
                    // Determine AI personality based on what it's supposed to be
                    const aiPersonality = recipient.aiPersonality || 'human';
                    const aiResponse = await generateResponse(chatId, aiPersonality, filteredMessage);

                    // Send AI response back to human
                    sender.socket.emit('receive_message', {
                        message: aiResponse,
                        timestamp: Date.now()
                    });

                    recipient.messageCount++;
                    chatRoom.totalMessages++;

                    // Check message limit after AI response
                    if (chatRoom.totalMessages >= CHAT_CONFIG.MAX_MESSAGES) {
                        endChat(chatId, 'message_limit');
                    }
                } catch (error) {
                    console.error('AI response error:', error);
                }
            }, 800 + Math.random() * 1200); // Random delay 0.8-2 seconds
        }
    }

    // Check message limit
    if (chatRoom.totalMessages >= CHAT_CONFIG.MAX_MESSAGES) {
        endChat(chatId, 'message_limit');
    }
}

/**
 * Handle typing indicator
 * @param {string} chatId - Chat room ID
 * @param {string} senderSocketId - Sender's socket ID
 * @param {boolean} isTyping - Typing status
 */
function handleTyping(chatId, senderSocketId, isTyping) {
    const chatRoom = chatRooms.get(chatId);

    if (!chatRoom || chatRoom.ended) {
        return;
    }

    // Send typing indicator to the other participant
    const recipient = chatRoom.participants.find(p => p.socketId !== senderSocketId);

    if (recipient && recipient.role !== 'ai') {
        recipient.socket.emit('partner_typing', { isTyping });
    }
}

/**
 * End a chat room
 * @param {string} chatId - Chat room ID
 * @param {string} reason - Reason for ending ('time_limit', 'message_limit', 'manual', 'disconnect')
 */
function endChat(chatId, reason = 'manual') {
    const chatRoom = chatRooms.get(chatId);

    if (!chatRoom || chatRoom.ended) {
        return;
    }

    chatRoom.ended = true;

    // Clear timer
    if (chatRoom.timer) {
        clearTimeout(chatRoom.timer);
    }

    // Determine partner types for each participant
    chatRoom.participants.forEach(participant => {
        const partner = chatRoom.participants.find(p => p.socketId !== participant.socketId);

        if (partner) {
            // Store partner type for humans so they can guess after chat ends
            if (participant.role !== 'ai') {
                const matchmaking = require('./matchmaking');
                const user = matchmaking.getUser(participant.socketId);
                if (user) {
                    user.partnerType = partner.role;
                    console.log(`[STATE] Stored partnerType ${partner.role} for user ${participant.socketId}`);
                }
            }

            // Only notify non-AI participants
            if (participant.role !== 'ai' && participant.socket) {
                participant.socket.emit('chat_ended', {
                    reason,
                    partnerType: partner.role
                });
            }
        }
    });

    // Clear AI conversation history
    clearHistory(chatId);

    // Remove chat room after a delay to allow clients to process
    setTimeout(() => {
        chatRooms.delete(chatId);
        console.log(`Chat room ${chatId} deleted (reason: ${reason})`);
    }, 1000);
}

/**
 * Get chat room by socket ID
 * @param {string} socketId - Socket ID
 * @returns {Object|null} - Chat room or null
 */
function getChatRoomBySocketId(socketId) {
    for (const [chatId, chatRoom] of chatRooms) {
        if (chatRoom.participants.some(p => p.socketId === socketId)) {
            return chatRoom;
        }
    }
    return null;
}

/**
 * Handle participant disconnect
 * @param {string} socketId - Disconnected socket ID
 */
function handleDisconnect(socketId) {
    const chatRoom = getChatRoomBySocketId(socketId);

    if (chatRoom) {
        endChat(chatRoom.id, 'disconnect');
    }
}

module.exports = {
    createChatRoom,
    handleMessage,
    handleTyping,
    endChat,
    getChatRoomBySocketId,
    handleDisconnect
};
