import mongoose, { Schema, Model } from 'mongoose';
import { GameState, Player, Card, PendingAction, Reaction, AIAgent } from '@/lib/types';

// Prevent auto-generation of _id on subdocuments
const CardSchema = new Schema<Card>({
  id: { type: String, required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  ability: { type: String, required: true },
  imageUrl: String,
  historicalContext: String,
}, { _id: false });

const AIAgentSchema = new Schema<AIAgent>({
  agentId: { type: String, required: true },
  playerId: { type: String, required: true },
  name: { type: String, required: true },
  persona: { type: String, required: true },
}, { _id: false });

const PlayerSchema = new Schema<Player>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['human', 'agent'], required: true },
  coins: { type: Number, default: 2 },
  cards: [CardSchema],
  influenceCount: { type: Number, default: 2 },
  eliminated: { type: Boolean, default: false },
  lastActionTime: Number,
}, { _id: false });

const PendingActionSchema = new Schema<PendingAction>({
  id: { type: String, required: true },
  type: { type: String, required: true },
  actor: { type: String, required: true },
  target: String,
  claimedCard: String,
  timestamp: { type: Number, required: true },
}, { _id: false });

const ReactionSchema = new Schema<Reaction>({
  id: { type: String, required: true },
  player: { type: String, required: true },
  type: { type: String, enum: ['challenge', 'block'], required: true },
  claimedCard: String,
  timestamp: { type: Number, required: true },
}, { _id: false });

export interface IGameStateDoc extends GameState, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

const GameStateSchema = new Schema<IGameStateDoc>({
  gameId: { type: String, required: true, unique: true, index: true },
  spaceId: String,
  aiAgents: { type: [AIAgentSchema], default: [] },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
  },
  phase: {
    type: String,
    enum: ['lobby', 'setup', 'action', 'reaction', 'resolution', 'finished'],
    default: 'lobby',
  },

  // Historical theme
  period: { type: String, required: true },
  character: { type: String, required: true },
  actionNames: {
    type: Map,
    of: String,
  },
  backgroundUrl: String,
  characterImageUrl: String,

  // Players
  players: [PlayerSchema],
  currentPlayerIndex: { type: Number, default: 0 },

  // Game state
  deck: [CardSchema],
  discardPile: { type: [CardSchema], default: [] },

  // Turn management
  pendingAction: PendingActionSchema,
  reactions: { type: [ReactionSchema], default: [] },
  reactionWindowEnd: Number,

  // History
  actionHistory: {
    type: [{
      turn: Number,
      action: PendingActionSchema,
      reactions: [ReactionSchema],
      result: String,
      timestamp: Number,
    }],
    default: [],
  },

  // Claims tracking
  claims: {
    type: [{
      player: String,
      claimedCard: String,
      action: String,
      challenged: Boolean,
      challengeResult: String,
      timestamp: Number,
    }],
    default: [],
  },

  // Metadata
  version: { type: Number, default: 0 },
  turnNumber: { type: Number, default: 1 },
  winner: String,
  createdAt: { type: Date, default: Date.now },
  lastUpdate: { type: Number, default: Date.now },
});

// Indexes for performance
GameStateSchema.index({ status: 1, createdAt: -1 });
GameStateSchema.index({ spaceId: 1 });

// Prevent model recompilation during hot reload
const GameModel: Model<IGameStateDoc> =
  (mongoose.models.Game as Model<IGameStateDoc>) ||
  mongoose.model<IGameStateDoc>('Game', GameStateSchema);

export default GameModel;
