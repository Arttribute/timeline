import OpenAI from 'openai';
import { Card, CardType, ActionType, DeckTheme } from '@/lib/types';
import DeckThemeModel from '@/models/DeckTheme';
import { nanoid } from 'nanoid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Mapping of base card types to their roles
const CARD_TYPE_DESCRIPTIONS: Record<CardType, string> = {
  duke: 'Tax collector, blocks foreign aid, takes 3 coins',
  assassin: 'Assassinates opponents for 3 coins',
  captain: 'Steals 2 coins from others, blocks stealing',
  ambassador: 'Exchanges cards with deck, blocks stealing',
  contessa: 'Blocks assassinations',
};

/**
 * Generate or retrieve cached themed deck
 */
export async function generateDeck(
  period: string,
  character: string
): Promise<{
  success: boolean;
  deck?: DeckTheme;
  error?: string;
  cached?: boolean;
}> {
  try {
    // Check cache first
    const cached = await DeckThemeModel.findOne({
      period,
      character,
    }).sort({ generatedAt: -1 });

    if (cached && cached.usageCount < 100) {
      // Reuse cached deck
      cached.usageCount++;
      await cached.save();
      return { success: true, deck: cached.toObject(), cached: true };
    }

    // Generate new deck
    console.log(`Generating new deck for period: ${period}, character: ${character}`);

    const [cards, actionNames, backgroundUrl, characterImageUrl] = await Promise.all([
      generateThemedCards(period, character),
      generateActionNames(period),
      generateBackgroundImage(period, character),
      generateCharacterImage(character, period),
    ]);

    const deckTheme: DeckTheme = {
      period,
      character,
      cards,
      actionNames,
      backgroundUrl,
      characterImageUrl,
      generatedAt: new Date(),
      usageCount: 1,
    };

    // Save to database
    const savedDeck = await DeckThemeModel.create(deckTheme);

    return { success: true, deck: savedDeck.toObject(), cached: false };
  } catch (error) {
    console.error('Error generating deck:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate themed cards using GPT-4
 */
async function generateThemedCards(period: string, character: string): Promise<Card[]> {
  const prompt = `You are designing cards for a Coup-style social deduction card game set in ${period}.
The player character is: ${character}

Create 5 unique character cards that fit this historical setting. Each card represents a role that would exist in ${period}.

Map each card to one of these game mechanics:
1. DUKE (Tax): Takes 3 coins, blocks foreign aid
2. ASSASSIN: Pays 3 coins to eliminate opponent
3. CAPTAIN: Steals 2 coins from opponent, blocks stealing
4. AMBASSADOR: Exchanges cards with deck, blocks stealing
5. CONTESSA: Blocks assassinations

For each card, provide:
- name: A role name fitting the period (e.g., "Consul" for Ancient Rome instead of "Duke")
- historicalContext: 2-3 sentences explaining this role in ${period}
- ability: Clear description of what the card does in game terms
- visualDescription: Detailed description for AI image generation (clothing, setting, pose, 150 words max)

Return valid JSON only:
{
  "cards": [
    {
      "type": "duke",
      "name": "...",
      "historicalContext": "...",
      "ability": "...",
      "visualDescription": "..."
    },
    ...
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const response = JSON.parse(completion.choices[0].message.content || '{}');

  if (!response.cards || !Array.isArray(response.cards) || response.cards.length !== 5) {
    throw new Error('Invalid card generation response');
  }

  // Map to Card type
  const cards: Card[] = response.cards.map((card: any) => ({
    id: nanoid(),
    type: card.type as CardType,
    name: card.name,
    description: card.historicalContext,
    ability: card.ability,
    historicalContext: card.historicalContext,
  }));

  return cards;
}

/**
 * Generate themed action names
 */
async function generateActionNames(period: string): Promise<Record<ActionType, string>> {
  const prompt = `You are renaming game actions to fit ${period}.

Rename these actions to match the historical period while keeping their meaning clear:

1. income: Take 1 coin (basic economic action)
2. foreign_aid: Take 2 coins (getting help)
3. coup: Pay 7 coins to eliminate opponent (forceful takeover)
4. tax: Take 3 coins using Duke role (extracting wealth)
5. assassinate: Pay 3 coins to eliminate opponent (targeted killing)
6. steal: Take 2 coins from opponent (theft/plunder)
7. exchange: Swap cards with deck (information gathering/networking)

Return valid JSON only:
{
  "income": "...",
  "foreign_aid": "...",
  "coup": "...",
  "tax": "...",
  "assassinate": "...",
  "steal": "...",
  "exchange": "..."
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const actionNames = JSON.parse(completion.choices[0].message.content || '{}');

  // Validate all actions are present
  const requiredActions: ActionType[] = [
    'income',
    'foreign_aid',
    'coup',
    'tax',
    'assassinate',
    'steal',
    'exchange',
  ];

  for (const action of requiredActions) {
    if (!actionNames[action]) {
      throw new Error(`Missing action name for: ${action}`);
    }
  }

  return actionNames as Record<ActionType, string>;
}

/**
 * Generate background image for the game
 */
async function generateBackgroundImage(period: string, character: string): Promise<string> {
  const prompt = `A cinematic wide-angle view of ${period}.
Atmospheric historical scene showing architecture and environment typical of ${period}.
Setting where ${character} would exist.
Muted, dramatic colors suitable for a card game background with UI overlays.
Photorealistic historical accuracy.
Landscape orientation, 16:9 aspect ratio.`;

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1792x1024',
    quality: 'hd',
    n: 1,
  });

  if (!response.data || response.data.length === 0 || !response.data[0].url) {
    throw new Error('Failed to generate background image');
  }

  return response.data[0].url;
}

/**
 * Generate character portrait
 */
async function generateCharacterImage(character: string, period: string): Promise<string> {
  const prompt = `Portrait of ${character} in ${period}.
Detailed historical costume and setting accurate to ${period}.
Confident, strategic pose fitting a social deduction game.
Dramatic lighting, serious expression.
Portrait orientation, upper body visible.
Photorealistic style, historical accuracy.`;

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1024x1792',
    quality: 'hd',
    n: 1,
  });

  if (!response.data || response.data.length === 0 || !response.data[0].url) {
    throw new Error('Failed to generate character image');
  }

  return response.data[0].url;
}

/**
 * Generate card images (batch generation)
 */
export async function generateCardImages(cards: Card[], period: string): Promise<Card[]> {
  const imagePromises = cards.map(async (card) => {
    if (card.imageUrl) return card; // Already has image

    const prompt = `${card.historicalContext}

A playing card illustration showing ${card.name} from ${period}.
${card.description}
Portrait orientation, dramatic lighting.
Style: Historical painting meets modern card game art.
Upper body portrait, period-accurate costume and setting.
Serious, strategic expression.`;

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size: '1024x1792',
        quality: 'hd',
        n: 1,
      });

      const imageUrl = response.data?.[0]?.url;

      return {
        ...card,
        imageUrl: imageUrl || undefined,
      };
    } catch (error) {
      console.error(`Failed to generate image for ${card.name}:`, error);
      return card; // Return card without image
    }
  });

  return Promise.all(imagePromises);
}

/**
 * Get fallback deck (default themed deck if generation fails)
 */
export function getFallbackDeck(): DeckTheme {
  const defaultPeriod = 'Renaissance Italy, 15th Century';
  const defaultCards: Card[] = [
    {
      id: nanoid(),
      type: 'duke',
      name: 'Doge',
      description: 'The elected leader of the Venetian Republic, controlling vast trade wealth.',
      ability: 'Collect taxes from trade routes (3 coins), block foreign merchants',
      historicalContext: 'The Doge was the chief magistrate of Venice, elected for life.',
    },
    {
      id: nanoid(),
      type: 'assassin',
      name: 'Assassino',
      description: 'A hired blade from the shadows, eliminating political rivals.',
      ability: 'Hire an assassin to eliminate a rival (3 coins)',
      historicalContext: 'Political assassinations were common in Renaissance power struggles.',
    },
    {
      id: nanoid(),
      type: 'captain',
      name: 'Condottiero',
      description: 'A mercenary captain commanding private armies.',
      ability: 'Plunder rival coffers (2 coins), defend against raids',
      historicalContext: 'Condottieri were professional military leaders who sold their services.',
    },
    {
      id: nanoid(),
      type: 'ambassador',
      name: 'Ambasciatore',
      description: 'A diplomatic envoy with access to secret information and networks.',
      ability: 'Exchange intelligence (swap cards), block raids',
      historicalContext: 'Ambassadors were key figures in Renaissance diplomacy and espionage.',
    },
    {
      id: nanoid(),
      type: 'contessa',
      name: 'Contessa',
      description: 'A noble lady with the power to grant protection and sanctuary.',
      ability: 'Block assassination attempts',
      historicalContext: 'Noble women wielded significant political influence through family connections.',
    },
  ];

  return {
    period: defaultPeriod,
    character: 'A cunning merchant seeking political influence',
    cards: defaultCards,
    actionNames: {
      income: 'Trade Profit',
      foreign_aid: 'Merchant Guild',
      coup: 'Political Coup',
      tax: 'Tariff Collection',
      assassinate: 'Hire Assassin',
      steal: 'Raid Coffers',
      exchange: 'Diplomatic Exchange',
    },
    backgroundUrl: '',
    generatedAt: new Date(),
    usageCount: 0,
  };
}
