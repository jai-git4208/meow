# Meow · Human · AI 🐱👤🤖

An anonymous real-time chat game where you chat with a random partner and guess if they're a **human**, **cat**, or **AI**.

![Status](https://img.shields.io/badge/status-demo-blue)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)

## 🎮 Game Overview

**Meow · Human · AI** is a fun, anonymous chat experiment where:
1. You choose your role (Human, Cat, or Random)
2. Get matched with a random partner
3. Chat for 2 minutes or 12 messages (whichever comes first)
4. Guess who you were talking to
5. See if you were right and track your stats!

### Features

- 🔄 **Real-time matching** - Instant pairing with humans, cats, or AI
- 💬 **Anonymous chat** - No usernames, no message history
- 🤖 **AI participants** - AI that pretends to be human or cat
- 😺 **Cat mode** - Let your cat walk on the keyboard (or pretend to!)
- 📊 **Stats tracking** - Track your guesses and accuracy
- ⏱️ **Time limits** - 2-minute maximum conversation
- 🚫 **Profanity filter** - Basic content filtering
- ⌨️ **Typing indicators** - See when your partner is typing

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ installed
- Google Gemini API key (for AI participants)

### Installation

1. **Clone or download** this project

2. **Install dependencies:**
```bash
cd meow
npm install
```

3. **Configure environment variables:**
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your-key-here
```

4. **Start the server:**
```bash
npm start
```

5. **Open your browser:**
```
http://localhost:3000
```

6. **Test the game:**
   - Open multiple browser tabs or windows
   - Join as different roles
   - Chat and guess!

## 📁 Project Structure

```
meow/
├── server/
│   ├── server.js           # Main Express + Socket.io server
│   ├── matchmaking.js      # Queue and pairing logic
│   ├── chatRoom.js         # Chat room management
│   ├── aiParticipant.js    # AI integration with Google Gemini
│   └── profanityFilter.js  # Content filtering
├── public/
│   ├── index.html          # Single-page app structure
│   ├── style.css           # Premium glassmorphism design
│   └── app.js              # Client logic + Socket.io
├── package.json
├── .env.example
└── README.md
```

## 🔌 Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_queue` | `{ role: 'human'\|'cat'\|'random' }` | Join matchmaking |
| `send_message` | `{ message: string }` | Send chat message |
| `typing` | `{ isTyping: boolean }` | Typing indicator |
| `end_chat` | `{}` | End current chat |
| `submit_guess` | `{ guess: 'human'\|'cat'\|'ai' }` | Submit guess |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `waiting` | `{ role: string }` | Waiting for match |
| `matched` | `{ chatId: string }` | Match found |
| `receive_message` | `{ message: string, timestamp: number }` | Receive message |
| `partner_typing` | `{ isTyping: boolean }` | Partner typing |
| `chat_ended` | `{ reason: string, partnerType: string }` | Chat ended |
| `reveal_answer` | `{ partnerType: string, correct: boolean }` | Answer revealed |
| `error` | `{ message: string }` | Error occurred |

## 🧠 How It Works

### Matching Algorithm

**Role Assignment:**
- User selects: "Chat as Human", "Let My Cat Chat", or "Random"
- Random assigns: human, cat, or AI randomly

**Pairing Rules:**
- **Human** can match with: Human, Cat, or AI
- **Cat** can only match with: Human
- **AI** can only match with: Human

**Fallback:**
- If no human available after 3 seconds, AI is created as fallback

### AI Personalities

The AI uses OpenAI's API with two distinct personalities:

**Cat Personality:**
- Chaotic typing, lots of "meow"
- Random characters, typos
- Very short messages (1-10 words)
- Never admits being AI

**Human Personality:**
- Natural conversation, casual tone
- Varied capitalization and emojis
- Medium-length messages (5-20 words)
- Never admits being AI

### Chat Limits

Chats automatically end when either limit is reached:
- **Time:** 2 minutes (120 seconds)
- **Messages:** 12 total (6 per person)

## 🎨 Design

The UI features a modern, premium aesthetic with:
- **Glassmorphism** - Frosted glass effects
- **Gradient backgrounds** - Dynamic animated gradients
- **Smooth animations** - Micro-interactions throughout
- **Dark theme** - Easy on the eyes
- **Responsive** - Works on mobile and desktop

## 📊 Stats Tracking

Stats are stored locally in your browser using localStorage:
- **Total games** - Number of chats completed
- **Correct guesses** - How many you got right
- **Accuracy** - Percentage of correct guesses
- **Fooled by cat** - Times you thought a cat was something else

## 🛡️ Safety Features

- ✅ No authentication required
- ✅ No message history saved on server
- ✅ Anonymous - no usernames
- ✅ Auto-end chat limits
- ✅ Skip button to end chat anytime
- ✅ Basic profanity filtering
- ✅ In-memory storage only (no database)

## 🔧 Configuration

Edit `.env` file to customize:

```env
# Server port (default: 3000)
PORT=3000

# Google Gemini API key (required for AI participants)
GEMINI_API_KEY=your-key-here

# Gemini model (default: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash
```

## 🧪 Testing

### Manual Testing Checklist

1. **Role Selection:**
   - [ ] Click "Chat as Human" - joins as human
   - [ ] Click "Let My Cat Chat" - shows cat message, joins as cat
   - [ ] Click "Random" - randomly assigns role

2. **Matchmaking:**
   - [ ] Open 2 tabs, both join as human - they match
   - [ ] Human waits 3+ seconds - gets AI partner
   - [ ] Cat joins - only matches with human

3. **Chat:**
   - [ ] Type message and send - appears on both sides
   - [ ] Type in input - partner sees typing indicator
   - [ ] Wait 2 minutes - chat auto-ends
   - [ ] Send 12 messages total - chat auto-ends
   - [ ] Click Skip - chat ends immediately

4. **AI:**
   - [ ] Chat with AI - responds within 2 seconds
   - [ ] AI cat personality - uses "meow", chaotic
   - [ ] AI human personality - natural conversation

5. **Guess:**
   - [ ] After chat ends - guess screen appears
   - [ ] Make guess - reveals correct answer
   - [ ] Correct guess - shows ✅ success
   - [ ] Wrong guess - shows ❌ failure

6. **Stats:**
   - [ ] Complete game - stats update
   - [ ] Refresh page - stats persist
   - [ ] Accuracy calculates correctly

## 🚨 Troubleshooting

**Server won't start:**
- Check that port 3000 is not in use
- Verify Node.js is installed: `node --version`
- Make sure dependencies are installed: `npm install`

**AI not responding:**
- Verify `.env` has valid `GEMINI_API_KEY`
- Check console for API errors
- Get your Gemini API key from: https://makersuite.google.com/app/apikey

**Clients not matching:**
- Make sure both clients are on same server URL
- Check browser console for Socket.io errors
- Verify server is running

**Can't see messages:**
- Check browser console for errors
- Verify Socket.io connection in Network tab
- Try refreshing the page

## 📝 Notes

- This is a **demo/hackathon-ready MVP** - not production-ready
- No database - all data is in-memory (resets on server restart)
- Stats are stored in browser localStorage only
- AI requires Google Gemini API key (free tier available)
- For production, add: authentication, database, rate limiting, better security

## 🎯 Future Enhancements

Potential improvements for the future:
- Add voice chat support
- Multiple language support
- More AI personalities
- Better profanity filtering
- Persistent user accounts
- Leaderboards
- Match history
- Custom chat rooms
- Mobile apps

## 📄 License

MIT License - Feel free to use this for learning, demos, or hackathons!

---

**Built with:** Node.js, Express, Socket.io, Google Gemini API, HTML/CSS/JavaScript

**Made for:** Fun, learning, and experimentation! 🚀
