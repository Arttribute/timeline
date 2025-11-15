import mongoose, { Schema, Model } from 'mongoose';
import { DeckTheme, Card } from '@/lib/types';

const CardSchema = new Schema<Card>({
  id: { type: String, required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  ability: { type: String, required: true },
  imageUrl: String,
  historicalContext: String,
}, { _id: false });

const DeckThemeSchema = new Schema<DeckTheme>({
  period: { type: String, required: true },
  character: { type: String, required: true },
  cards: [CardSchema],
  actionNames: {
    type: Map,
    of: String,
    required: true,
  },
  backgroundUrl: { type: String, required: true },
  characterImageUrl: String,
  generatedAt: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 },
});

// Compound index for cache lookup
DeckThemeSchema.index({ period: 1, character: 1 });
DeckThemeSchema.index({ generatedAt: -1 });

export interface IDeckThemeDoc extends DeckTheme, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

const DeckThemeModel: Model<IDeckThemeDoc> =
  (mongoose.models.DeckTheme as Model<IDeckThemeDoc>) ||
  mongoose.model<IDeckThemeDoc>('DeckTheme', DeckThemeSchema);

export default DeckThemeModel;
