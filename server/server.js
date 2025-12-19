/**
 * meow · human · ai - main server
 * express + socket.io server for anonymous chat game
 */

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const matchmaking = require('./matchmaking');
const chatRoom = require('./chatRoom');

// initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // aallow all origins for demo
        methods: ["GET", "POST"]
    }
});

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    /**
     * handle user joining queue
     */
    socket.on('join_queue', ({ role }) => {
        console.log(`${socket.id} wants to join as ${role}`);

        // assign role
        const assignedRole = matchmaking.assignRole(role);

        // addd to queue
        matchmaking.addToQueue(socket, assignedRole);

        // notify client they're waiting
        socket.emit('waiting', { role: assignedRole });

        // try to find a match immediately
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
            // set timeout to create AI fallback if no match after 30 seconds
            setTimeout(() => {
                const userStillWaiting = matchmaking.getUser(socket.id);
                if (userStillWaiting && userStillWaiting.inQueue) {
                    const retryMatch = matchmaking.processMatchmaking(user);
                    if (retryMatch) {
                        createChatSession(retryMatch);
                    }
                }
            }, 30000);
        }
    });

    /**
     * handle chat message
     */
    socket.on('send_message', async ({ message }) => {
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            await chatRoom.handleMessage(room.id, socket.id, message, io);
        }
    });

    /**
     * handle typing indicator
     */
    socket.on('typing', ({ isTyping }) => {
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            chatRoom.handleTyping(room.id, socket.id, isTyping);
        }
    });

    /**
     * handle end chat request
     */
    socket.on('end_chat', () => {
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            chatRoom.endChat(room.id, 'manual');
        }
    });

    /**
     * handle guess submission
     */
    socket.on('submit_guess', ({ guess }) => {
        console.log(`[GUESS] ${socket.id} guessed: ${guess}`);
        const room = chatRoom.getChatRoomBySocketId(socket.id);

        if (room) {
            // find partner
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
            // if room is deleted, check user's stored partner type
            const user = matchmaking.getUser(socket.id);

            if (user && user.partnerType) {
                const correct = guess === user.partnerType;

                socket.emit('reveal_answer', {
                    partnerType: user.partnerType,
                    correct: correct
                });

                // clear partner type after revealing
                user.partnerType = null;
            }
        }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);

        // remove from queue if waiting
        matchmaking.removeFromQueue(socket.id);

        // end chat if in a room
        chatRoom.handleDisconnect(socket.id);
    });
});

/**
 * create a chat session from match result
 * @param {Object} matchResult - Match result with participants and chatId
 */
function createChatSession(matchResult) {
    const { participants, chatId } = matchResult;

    // create chat room
    const room = chatRoom.createChatRoom(chatId, participants);

    // update user statuses
    participants.forEach(p => {
        if (!p.isAI) {
            matchmaking.updateUserChat(p.socketId, chatId);
            p.socket.emit('matched', { chatId });
        } else {
            // for AI participant, add socket reference to emit messages
            const humanParticipant = participants.find(p => !p.isAI);
            if (humanParticipant) {
                p.socket = humanParticipant.socket; // aI uses human's socket to send messages
            }
        }
    });
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`meow human or ai server running on http://localhost:${PORT} :3`);
    console.log(`Press Ctrl+C to stop`);
});
