/**
 * Meow · Human · AI - Main Server
 * Express + Socket.io server for anonymous chat game
 */

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const matchmaking = require('./matchmaking');
const chatRoom = require('./chatRoom');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for demo
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    /**
     * Handle user joining queue
     */
    socket.on('join_queue', ({ role }) => {
        console.log(`${socket.id} wants to join as ${role}`);

        // Assign role
        const assignedRole = matchmaking.assignRole(role);

        // Add to queue
        matchmaking.addToQueue(socket, assignedRole);

        // Notify client they're waiting
        socket.emit('waiting', { role: assignedRole });

        // Try to find a match immediately
        const user = {
            socketId: socket.id,
            socket: socket,
            role: assignedRole,
            joinedAt: Date.now()
        };

        const matchResult = matchmaking.processMatchmaking(user);

        if (matchResult) {
            createChatSession(matchResult);
        } else {
            // Set timeout to create AI fallback if no match after 3 seconds
            setTimeout(() => {
                const userStillWaiting = matchmaking.getUser(socket.id);
                if (userStillWaiting && userStillWaiting.inQueue) {
                    const retryMatch = matchmaking.processMatchmaking(user);
                    if (retryMatch) {
                        createChatSession(retryMatch);
                    }
                }
            }, 3000);
        }
    });

    /**
     * Handle chat message
     */
    socket.on('send_message', async ({ message }) => {
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            await chatRoom.handleMessage(room.id, socket.id, message, io);
        }
    });

    /**
     * Handle typing indicator
     */
    socket.on('typing', ({ isTyping }) => {
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            chatRoom.handleTyping(room.id, socket.id, isTyping);
        }
    });

    /**
     * Handle end chat request
     */
    socket.on('end_chat', () => {
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            chatRoom.endChat(room.id, 'manual');
        }
    });

    /**
     * Handle guess submission
     */
    socket.on('submit_guess', ({ guess }) => {
        console.log(`[GUESS] ${socket.id} guessed: ${guess}`);
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            // Find partner
            const participant = room.participants.find(p => p.socketId === socket.id);
            const partner = room.participants.find(p => p.socketId !== socket.id);

            if (partner) {
                const correct = guess === partner.role;

                socket.emit('reveal_answer', {
                    partnerType: partner.role,
                    correct: correct
                });
            }
        } else {
            // If room is deleted, check user's stored partner type
            const user = matchmaking.getUser(socket.id);

            if (user && user.partnerType) {
                const correct = guess === user.partnerType;

                socket.emit('reveal_answer', {
                    partnerType: user.partnerType,
                    correct: correct
                });

                // Clear partner type after revealing
                user.partnerType = null;
            }
        }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Remove from queue if waiting
        matchmaking.removeFromQueue(socket.id);

        // End chat if in a room
        chatRoom.handleDisconnect(socket.id);
    });
});

/**
 * Create a chat session from match result
 * @param {Object} matchResult - Match result with participants and chatId
 */
function createChatSession(matchResult) {
    const { participants, chatId } = matchResult;

    // Create chat room
    const room = chatRoom.createChatRoom(chatId, participants);

    // Update user statuses
    participants.forEach(p => {
        if (!p.isAI) {
            matchmaking.updateUserChat(p.socketId, chatId);
            p.socket.emit('matched', { chatId });
        } else {
            // For AI participant, add socket reference to emit messages
            const humanParticipant = participants.find(p => !p.isAI);
            if (humanParticipant) {
                p.socket = humanParticipant.socket; // AI uses human's socket to send messages
            }
        }
    });
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Meow · Human · AI server running on http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop`);
});
