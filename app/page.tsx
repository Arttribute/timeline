'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const { login, authenticated, user } = usePrivy();
  const [period, setPeriod] = useState('');
  const [character, setCharacter] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!authenticated || !user) {
        login();
        return;
      }

      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          character,
          playerName: playerName || user.email?.address || 'Player',
          playerId: user.id,
          useAgentCommons: false,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Failed to create game');
        return;
      }

      router.push(`/game/${data.gameId}`);
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const suggestedPeriods = [
    { label: 'Ancient Rome, 44 BCE', value: 'Ancient Rome, 44 BCE' },
    { label: 'Renaissance Italy, 1492', value: 'Renaissance Italy, 1492' },
    { label: 'Feudal Japan, 1600', value: 'Feudal Japan, 1600' },
    { label: 'Victorian London, 1888', value: 'Victorian London, 1888' },
    { label: 'Wild West, 1880s', value: 'Wild West, 1880s USA' },
    { label: 'Medieval France, 1350', value: 'Medieval France, 1350' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
            Timeline
          </h1>
          <p className="text-xl text-neutral-400 mb-2">
            Social Deduction Through History
          </p>
          <p className="text-neutral-500 max-w-2xl mx-auto">
            A dynamic Coup-style card game that adapts to any historical period. Play with humans and AI
            agents in a battle of deception, deduction, and strategy.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-lg p-8"
        >
          <h2 className="text-2xl font-semibold mb-6">Create New Game</h2>

          <form onSubmit={handleCreateGame} className="space-y-6">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div>
              <label htmlFor="period" className="block text-sm font-medium mb-2">
                Historical Period
              </label>
              <input
                type="text"
                id="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g., Ancient Rome, 44 BCE"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 mb-2"
                required
              />
              <div className="flex flex-wrap gap-2">
                {suggestedPeriods.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPeriod(p.value)}
                    className="text-xs px-3 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-full transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="character" className="block text-sm font-medium mb-2">
                Your Character
              </label>
              <textarea
                id="character"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="Describe your character (e.g., A cunning senator seeking power)"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 h-24 resize-none"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900 rounded-md p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Game...' : 'Create Game'}
            </button>

            {!authenticated && (
              <p className="text-sm text-neutral-500 text-center">
                You'll be prompted to sign in when you create a game
              </p>
            )}
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 max-w-4xl mx-auto grid md:grid-cols-3 gap-6"
        >
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-6">
            <div className="text-3xl mb-3">🎭</div>
            <h3 className="font-semibold mb-2">Social Deduction</h3>
            <p className="text-sm text-neutral-400">
              Bluff, deduce, and outsmart opponents. Claim cards you may not have.
            </p>
          </div>

          <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-6">
            <div className="text-3xl mb-3">⏳</div>
            <h3 className="font-semibold mb-2">Dynamic History</h3>
            <p className="text-sm text-neutral-400">
              AI generates unique cards and abilities based on your chosen historical period.
            </p>
          </div>

          <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-6">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold mb-2">Human & AI</h3>
            <p className="text-sm text-neutral-400">
              Play against other humans or challenge AI agents powered by Agent Commons.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
