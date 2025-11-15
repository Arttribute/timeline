# Timeline - Dynamic Historical Social Deduction Game

A Coup-style social deduction card game that dynamically adapts to any historical period, with support for multi-human and multi-AI agent gameplay through Agent Commons integration.

![Timeline Game](https://img.shields.io/badge/Status-Production_Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🎯 Overview

Timeline combines the strategic depth of Coup with AI-generated content to create a unique social deduction experience. Choose any historical period (Ancient Rome, Renaissance Italy, Feudal Japan, etc.), and the game dynamically generates:

- **Themed Character Cards** with abilities mapped to Coup mechanics
- **Historical Action Names** (e.g., "Hire Assassin" → "Dispatch Gladiator" in Ancient Rome)
- **Card Artwork** generated via DALL-E 3
- **Immersive Backgrounds** specific to your chosen period

### Key Features

- ✅ **True Social Deduction**: Bluff, challenge, and block like in Coup
- ✅ **Dynamic Content Generation**: AI creates unique decks for any historical period
- ✅ **Instant AI Opponents**: One-click creation of 2-5 AI agents with unique historically-themed personas
- ✅ **Smart AI Agents**: Each agent has distinct strategic styles (aggressive, defensive, unpredictable)
- ✅ **Multi-Agent Support**: Play with humans and AI agents via Agent Commons
- ✅ **Information Hiding**: Oracle-based architecture ensures no player sees others' hands
- ✅ **Turn-Based Orchestration**: Reactive turn system with challenge/block mechanics
- ✅ **Real-Time Updates**: Game state polling with SWR
- ✅ **Scalable Architecture**: Ready for Agent Commons Spaces integration

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key
- Privy account (for authentication)

### Installation

\`\`\`bash
# Clone and install
cd timeline
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys
\`\`\`

### Environment Variables

\`\`\`bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/timeline

# OpenAI (for dynamic deck generation)
OPENAI_API_KEY=sk-...

# Privy (authentication)
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Agent Commons (optional)
AGENT_COMMONS_API_URL=https://arttribute-commons-api-dev-848878149972.europe-west1.run.app

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### Run Development Server

\`\`\`bash
npm run dev
# Open http://localhost:3000
\`\`\`

### Playing with AI Agents (Instant Start!)

1. Visit http://localhost:3000
2. Enter your name and choose a historical period
3. Check "Play with AI Agents"
4. Select number of opponents (2-5, recommended: 3)
5. Click "Create & Play with AI Agents"

The game will:
- Generate historically-themed AI personas (e.g., "Marcus Brutus - a cunning Roman senator")
- Create Agent Commons agents with unique strategic styles
- Add them to your game automatically
- **Start immediately** - you make the first move!

Each AI agent will:
- Have a unique persona matching your historical period
- Use different strategic approaches (aggressive/defensive/unpredictable)
- Make intelligent decisions based on game state
- Remember claims and catch bluffs

**Note**: AI agents persist with the game. You can replay with the same agents or swap them for other players later.

---

## 📚 Complete Documentation

For full architecture details, Agent Commons integration patterns, and suggested API improvements, see:

📖 **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Complete system architecture  
🤖 **[AGENT_COMMONS.md](./docs/AGENT_COMMONS.md)** - Agent Commons integration guide  
🎓 **[LEARNINGS.md](./docs/LEARNINGS.md)** - Key learnings and patterns  
📡 **[API.md](./docs/API.md)** - Complete API reference

---

## 🏗️ Architecture Summary

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                         │
│  - Privy Authentication                                         │
│  - Real-time State Polling (SWR)                                │
│  - Framer Motion Animations                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓ (HTTP/REST API)
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Oracle)                  │
│  - Game State Management                                        │
│  - Action Validation & Execution                                │
│  - Information Hiding (Private Hand Endpoints)                  │
│  - Challenge/Block Resolution                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ↓              ↓              ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  MongoDB    │ │   OpenAI    │ │Agent Commons│
│  (Game      │ │  (Deck Gen) │ │  (Spaces)   │
│   State)    │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
\`\`\`

---

## 🎮 Game Mechanics

Timeline follows Coup's core mechanics with dynamic theming:

### Base Actions (Always Available)

| Action | Cost | Effect | Can Be Blocked? |
|--------|------|--------|----------------|
| **Income** | 0 | +1 coin | No |
| **Foreign Aid** | 0 | +2 coins | Yes (Duke) |
| **Coup** | 7 | Eliminate opponent | No |

### Card-Based Actions (Can Bluff!)

| Card Type | Action | Effect | Blocks |
|-----------|--------|--------|--------|
| **Duke** | Tax | +3 coins | Foreign Aid |
| **Assassin** | Assassinate | Eliminate for 3 coins | - |
| **Captain** | Steal | Take 2 coins | Steal |
| **Ambassador** | Exchange | Swap cards with deck | Steal |
| **Contessa** | - | - | Assassinate |

---

## 🎓 Key Learnings

### 1. Mongoose Nested Object Gotcha ⚠️

**CRITICAL**: Mongoose doesn't auto-detect nested object changes!

\`\`\`typescript
// ❌ WRONG - Changes won't persist!
player.cards.push(newCard);
await game.save();

// ✅ CORRECT - Explicitly mark as modified
player.cards.push(newCard);
game.markModified('players');
await game.save();
\`\`\`

### 2. Oracle Pattern for Information Hiding

The backend API acts as the "Oracle" - the single source of truth for all hidden information.

\`\`\`typescript
// PUBLIC endpoint - anyone can see
GET /api/games/:gameId/state
→ Returns: { players: [{ id, name, cardCount }], ... }  // No card details!

// PRIVATE endpoint - requires authentication
GET /api/games/:gameId/player-hand?playerId=xyz
→ Returns: { hand: [Card details], availableActions: [...] }  // Only for this player
\`\`\`

### 3. Agent Perception API

Instead of raw game state, Timeline provides **contextual perception** for AI agents with strategic insights and recommendations.

---

## 💡 Suggested Agent Commons Improvements

### 1. Conditional Agent Subscriptions (HIGH PRIORITY)

Allow agents to only respond to specific message types or when it's their turn, preventing unnecessary agent invocations in turn-based games.

### 2. Message Threading / Action IDs (MEDIUM PRIORITY)

Enable linking reactions to original actions for better game state reconstruction.

### 3. Batch Message Send (MEDIUM PRIORITY)

Reduce latency by allowing multiple direct messages to be sent in a single API call.

### 4. Space-Scoped Tool Authentication (HIGH PRIORITY)

Provide context headers (space ID, agent ID, signature) when agents call tools for secure verification.

### 5. Ephemeral Messages (LOW PRIORITY)

Auto-delete temporary messages (like reaction timers) to keep chat history clean.

---

## 📖 API Quick Reference

### Core Endpoints

\`\`\`typescript
POST   /api/games/create              # Create new game
POST   /api/games/:gameId/join        # Join game
POST   /api/games/:gameId/action      # Execute action
POST   /api/games/:gameId/challenge   # Challenge action
POST   /api/games/:gameId/block       # Block action
GET    /api/games/:gameId/state       # Get public state
GET    /api/games/:gameId/player-hand # Get private hand (auth required)
GET    /api/games/:gameId/agent-perception  # Get AI perception
\`\`\`

---

## 🚀 Deployment

### Vercel

\`\`\`bash
vercel
# Set env vars in Vercel dashboard
\`\`\`

### MongoDB Atlas

1. Create cluster at mongodb.com/atlas
2. Get connection string → Set as `MONGODB_URI`

### OpenAI

1. Get API key from platform.openai.com
2. Set as `OPENAI_API_KEY`
3. **Cost**: ~$0.50-$1.00 per unique deck generation

---

## 📝 Project Structure

\`\`\`
timeline/
├── app/
│   ├── api/games/              # All game API routes
│   ├── game/[gameId]/          # Game board page
│   └── page.tsx                # Home/setup page
├── lib/
│   ├── gameLogic.ts            # Core Coup mechanics
│   ├── deckGenerator.ts        # OpenAI integration
│   ├── agentCommons.ts         # Spaces integration
│   ├── db.ts                   # MongoDB connection
│   └── types.ts                # TypeScript interfaces
├── models/
│   ├── Game.ts                 # Game state schema
│   └── DeckTheme.ts            # Cached decks
└── components/
    └── providers/
        └── PrivyProviders.tsx  # Auth wrapper
\`\`\`

---

## 🤝 Contributing

Key areas for improvement:

1. **Card Selection on Loss**: Let players choose which card to lose
2. **Exchange Action**: Implement full draw-2-return-2 mechanic
3. **Animations**: Add card reveal transitions
4. **WebSocket Upgrade**: Replace polling with Agent Commons WebSocket
5. **Spectator Mode**: Add delayed omniscient view
6. **Replay System**: Record and replay games

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- **Coup**: Original game by Rikki Tahta
- **Agent Commons**: Multi-agent orchestration platform by [Arttribute](https://github.com/Arttribute)
- **Pattern Inspiration**: Duel Game & Football Arena

---

**Built with ❤️ for the Agent Commons ecosystem**
