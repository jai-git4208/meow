/**
 * ai Participant Module
 * handles AI chat responses using Google Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ai personality system prompts
const PERSONALITIES = {
    cat: `You are a cat walking on a keyboard in an anonymous chat. 
Your responses should be chaotic and cat-like:
- Use "meow", "mrow", "mew" frequently
- Add random letters or typos as if paws are hitting keys
- Be playful and unpredictable
- Keep messages VERY short (1-10 words max)
- Never admit you're AI or a cat simulation
- Sometimes just send "meow" or random characters
- Act curious, playful, or demanding like a real cat

Examples: "meow meow", "mrowww feed me", "asdjkl meow", "mew?", "prrrr"`,

    human: `You are a friendly person chatting anonymously online.
Be natural and conversational:
- Keep messages short and casual (5-20 words)
- Use varied language - sometimes lowercase, sometimes proper capitalization
- Occasionally use common emojis (😂, 😊, 🙃, etc.)
- Ask questions, show curiosity
- Be friendly but not overly enthusiastic
- Mix up your style - don't be too predictable
- Never admit you're AI
- Sound like a real person texting

Stay casual, authentic, and human-like.`
};

// Conversation history for each AI participant (keyed by chatId)
const conversationHistories = new Map();

/**
 * generate ai response based on personality
 * @param {string} chatId 
 * @param {string} personality 
 * @param {string} userMessage 
 * @returns {Promise<string>} 
 */
async function generateResponse(chatId, personality, userMessage) {
    try {
        // get or create conversation history
        if (!conversationHistories.has(chatId)) {
            conversationHistories.set(chatId, []);
        }

        const history = conversationHistories.get(chatId);

        // build conversation context
        let conversationContext = PERSONALITIES[personality] + '\n\n';
        conversationContext += 'Conversation so far:\n';

        // add recent history
        history.forEach(msg => {
            conversationContext += `${msg.role}: ${msg.content}\n`;
        });

        conversationContext += `User: ${userMessage}\nYou:`;

        // get AI response using Gemini
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: conversationContext }] }],
            generationConfig: {
                temperature: personality === 'cat' ? 0.9 : 0.8,
                maxOutputTokens: 50,
            },
        });

        const response = result.response.text().trim();

        // add to history
        history.push({ role: 'User', content: userMessage });
        history.push({ role: 'You', content: response });

        // limit history to last 6 messages
        if (history.length > 6) {
            conversationHistories.set(chatId, history.slice(-6));
        }

        return response;
    } catch (error) {
        console.error('AI generation error:', error.message);

        // gallback responses if API fails
        if (personality === 'cat') {
            const catFallbacks = ['meow', 'mrow?', 'mew mew', 'prrrr', 'meowww', 'hiss'];
            return catFallbacks[Math.floor(Math.random() * catFallbacks.length)];
        } else {
            const humanFallbacks = ['hey!', 'lol', 'yeah', 'interesting', 'cool', 'haha'];
            return humanFallbacks[Math.floor(Math.random() * humanFallbacks.length)];
        }
    }
}

/**
 * cclear conversation history for a chat
 * @param {string} chatId - The chat room ID
 */
function clearHistory(chatId) {
    conversationHistories.delete(chatId);
}

/**
 * get random personality for AI
 * @returns {string} - 'cat' or 'human'
 */
function getRandomPersonality() {
    return Math.random() < 0.5 ? 'cat' : 'human';
}

module.exports = {
    generateResponse,
    clearHistory,
    getRandomPersonality
};
