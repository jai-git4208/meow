/**
 * Meow · Human · AI - Client Application
 * Frontend logic and Socket.io client
 */

// Socket.io connection
const socket = io();

// Screen elements
const screens = {
    join: document.getElementById('join-screen'),
    waiting: document.getElementById('waiting-screen'),
    chat: document.getElementById('chat-screen'),
    guess: document.getElementById('guess-screen'),
    result: document.getElementById('result-screen')
};

// State
let currentState = {
    role: null,
    chatId: null,
    partnerType: null,
    messageCount: 0,
    timeRemaining: 120,
    timerInterval: null
};

// Stats (stored in localStorage)
let stats = {
    totalGames: 0,
    correctGuesses: 0,
    fooledByCat: 0
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    displayStats();
    setupEventListeners();
    setupSocketListeners();
});

/**
 * Setup DOM event listeners
 */
function setupEventListeners() {
    // Join buttons
    document.querySelectorAll('[data-role]').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role;
            joinQueue(role);
        });
    });

    // Send message
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Typing indicator
    let typingTimeout;
    document.getElementById('message-input').addEventListener('input', (e) => {
        socket.emit('typing', { isTyping: true });

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', { isTyping: false });
        }, 1000);
    });

    // Skip button
    document.getElementById('skip-btn').addEventListener('click', () => {
        socket.emit('end_chat');
    });

    // Guess buttons
    document.querySelectorAll('[data-guess]').forEach(btn => {
        btn.addEventListener('click', () => {
            const guess = btn.dataset.guess;
            console.log('Guess button clicked:', guess);
            submitGuess(guess);
        });
    });

    // Play again
    document.getElementById('play-again-btn').addEventListener('click', () => {
        resetState();
        showScreen('join');
    });
}

/**
 * Setup Socket.io event listeners
 */
function setupSocketListeners() {
    socket.on('waiting', ({ role }) => {
        currentState.role = role;
        document.getElementById('waiting-role').textContent = `INITIALIZING_SESSION_AS_${role.toUpperCase()}`;

        // Show cat message if cat role
        if (role === 'cat') {
            document.getElementById('cat-message').classList.remove('hidden');
        }

        showScreen('waiting');
    });

    socket.on('matched', ({ chatId }) => {
        currentState.chatId = chatId;
        startChat();
    });

    socket.on('receive_message', ({ message, timestamp }) => {
        displayMessage(message, 'received');
        currentState.messageCount++;
        updateMessageCounter();
    });

    socket.on('partner_typing', ({ isTyping }) => {
        const indicator = document.getElementById('typing-indicator');
        if (isTyping) {
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    });

    socket.on('chat_ended', ({ reason, partnerType }) => {
        currentState.partnerType = partnerType;
        stopTimer();
        showScreen('guess');
    });

    socket.on('reveal_answer', ({ partnerType, correct }) => {
        showResult(partnerType, correct);
    });

    socket.on('error', ({ message }) => {
        console.error('Socket error:', message);
        alert(message);
    });
}

/**
 * Join the matchmaking queue
 */
function joinQueue(role) {
    socket.emit('join_queue', { role });
}

/**
 * Start chat session
 */
function startChat() {
    showScreen('chat');
    startTimer();
    currentState.messageCount = 0;
    updateMessageCounter();

    // Clear messages
    document.getElementById('messages').innerHTML = '';

    // Focus input
    document.getElementById('message-input').focus();
}

/**
 * Send a chat message
 */
function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message) return;

    // Send to server
    socket.emit('send_message', { message });

    // Display locally
    displayMessage(message, 'sent');

    // Clear input
    input.value = '';

    // Update counter
    currentState.messageCount++;
    updateMessageCounter();

    // Stop typing indicator
    socket.emit('typing', { isTyping: false });
}

/**
 * Display a message in the chat
 */
function displayMessage(text, type) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Start chat timer
 */
function startTimer() {
    currentState.timeRemaining = 120;
    updateTimerDisplay();

    currentState.timerInterval = setInterval(() => {
        currentState.timeRemaining--;
        updateTimerDisplay();

        if (currentState.timeRemaining <= 0) {
            stopTimer();
        }
    }, 1000);
}

/**
 * Stop chat timer
 */
function stopTimer() {
    if (currentState.timerInterval) {
        clearInterval(currentState.timerInterval);
        currentState.timerInterval = null;
    }
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const minutes = Math.floor(currentState.timeRemaining / 60);
    const seconds = currentState.timeRemaining % 60;
    document.getElementById('time-remaining').textContent =
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Update message counter
 */
function updateMessageCounter() {
    document.getElementById('message-count').textContent = `${currentState.messageCount}/12`;
}

/**
 * Submit guess
 */
function submitGuess(guess) {
    socket.emit('submit_guess', { guess });
}

/**
 * Show result screen
 */
function showResult(partnerType, correct) {
    const icon = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const message = document.getElementById('result-message');

    // Update stats
    stats.totalGames++;
    if (correct) {
        stats.correctGuesses++;
    }
    if (!correct && partnerType === 'cat') {
        stats.fooledByCat++;
    }
    saveStats();
    displayStats();

    // Display result
    if (correct) {
        icon.textContent = '[ SUCCESS ]';
        title.textContent = 'IDENTITY_MATCHED';
        message.textContent = `ANALYSIS_RESULT: Partner was identified as ${getPartnerName(partnerType).toUpperCase()}.`;
    } else {
        icon.textContent = '[ FAILURE ]';
        title.textContent = 'MISIDENTIFICATION_ERROR';
        message.textContent = `ANALYSIS_RESULT: Actual identity was ${getPartnerName(partnerType).toUpperCase()}.`;
    }

    showScreen('result');
}

/**
 * Get partner name for display
 */
function getPartnerName(type) {
    const names = {
        human: 'human_entity',
        cat: 'cat_entity_simulator',
        ai: 'artificial_intelligence'
    };
    return names[type] || 'unknown_target';
}

/**
 * Load stats from localStorage
 */
function loadStats() {
    const saved = localStorage.getItem('meow-stats');
    if (saved) {
        stats = JSON.parse(saved);
    }
}

/**
 * Save stats to localStorage
 */
function saveStats() {
    localStorage.setItem('meow-stats', JSON.stringify(stats));
}

/**
 * Display stats on join screen
 */
function displayStats() {
    document.getElementById('stat-games').textContent = stats.totalGames;
    document.getElementById('stat-correct').textContent = stats.correctGuesses;

    const accuracy = stats.totalGames > 0
        ? Math.round((stats.correctGuesses / stats.totalGames) * 100)
        : 0;
    document.getElementById('stat-accuracy').textContent = `${accuracy}%`;

    document.getElementById('stat-fooled').textContent = stats.fooledByCat;
}

/**
 * Show a specific screen
 */
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

/**
 * Reset state for new game
 */
function resetState() {
    currentState = {
        role: null,
        chatId: null,
        partnerType: null,
        messageCount: 0,
        timeRemaining: 120,
        timerInterval: null
    };

    // Hide cat message
    document.getElementById('cat-message').classList.add('hidden');

    // Clear input
    document.getElementById('message-input').value = '';
}
