'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import AppBar from '@/components/layout/AppBar';

export default function Home() {
  const router = useRouter();
  const { login, authenticated, user } = usePrivy();
  const [period, setPeriod] = useState('');
  const [character, setCharacter] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playWithAgents, setPlayWithAgents] = useState(true);
  const [agentCount, setAgentCount] = useState(3);
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
          useAgentCommons: playWithAgents,
          playWithAgents,
          agentCount,
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
    { label: 'Ancient Rome', value: 'Ancient Rome, 44 BCE' },
    { label: 'Renaissance', value: 'Renaissance Italy, 1492' },
    { label: 'Feudal Japan', value: 'Feudal Japan, 1600' },
    { label: 'Wild West', value: 'Wild West, 1880s USA' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <AppBar />

      {/* Hero Section */}
      <section className="border-b border-gray-400">
        <div className="max-w-[88%] mx-auto px-6 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left: Marketing Copy */}
            <div>
              <div className="mb-8">
                <div className="bg-yellow-300 w-64 h-7 -mb-8 ml-0.5 rounded-sm"></div>
                <h1 className="text-6xl leading-tight text-black mb-6 tracking-tight relative z-10">
                  Social deduction through history.
                </h1>
              </div>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                A Coup-style bluffing game that adapts to any historical period. Challenge AI
                agents or friends in battles of deception and strategy.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="bg-lime-200 w-48 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
                  <h3 className="text-xl font-semibold mb-2 relative z-10">
                    Play Instantly
                  </h3>
                  <p className="text-gray-700">
                    Create a game and start playing immediately with AI opponents
                  </p>
                </div>

                <div>
                  <div className="bg-teal-200 w-56 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
                  <h3 className="text-xl font-semibold mb-2 relative z-10">
                    Dynamic Content
                  </h3>
                  <p className="text-gray-700">
                    AI generates unique cards, artwork, and agent personas for your chosen period
                  </p>
                </div>

                <div>
                  <div className="bg-orange-200 w-52 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
                  <h3 className="text-xl font-semibold mb-2 relative z-10">
                    Smart Opponents
                  </h3>
                  <p className="text-gray-700">
                    Each AI has distinct personalities and strategic styles
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Create Game Form */}
            <div className="bg-white border border-gray-400 rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-6">Create New Game</h2>

              <form onSubmit={handleCreateGame} className="space-y-5">
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
                    className="w-full px-4 py-2 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
                    className="w-full px-4 py-2 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-black mb-2"
                    required
                  />
                  <div className="flex flex-wrap gap-2">
                    {suggestedPeriods.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPeriod(p.value)}
                        className="text-xs px-3 py-1 bg-white hover:bg-gray-100 border border-gray-400 rounded-full transition-colors"
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
                    placeholder="A cunning senator seeking power"
                    className="w-full px-4 py-2 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-black h-20 resize-none"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border border-gray-400 rounded-lg p-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={playWithAgents}
                      onChange={(e) => setPlayWithAgents(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-400 bg-white"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Play with AI Agents</span>
                      <p className="text-xs text-gray-700 mt-1">
                        Instantly start with AI opponents
                      </p>
                    </div>
                  </label>

                  {playWithAgents && (
                    <div className="mt-4 ml-7">
                      <label htmlFor="agentCount" className="block text-sm font-medium mb-2">
                        Number of Opponents
                      </label>
                      <select
                        id="agentCount"
                        value={agentCount}
                        onChange={(e) => setAgentCount(parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value={2}>2 Agents</option>
                        <option value={3}>3 Agents</option>
                        <option value={4}>4 Agents</option>
                        <option value={5}>5 Agents</option>
                      </select>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? playWithAgents
                      ? 'Creating AI Agents...'
                      : 'Creating Game...'
                    : playWithAgents
                      ? `Play with ${agentCount} AI Agents`
                      : 'Create Game'}
                </button>

                {!authenticated && (
                  <p className="text-sm text-gray-600 text-center">
                    You'll be prompted to sign in
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 border-b border-gray-400">
        <div className="max-w-[88%] mx-auto px-6">
          <div className="mb-12">
            <div className="bg-purple-200 w-48 h-7 -mb-7.5 ml-0.5 rounded-sm"></div>
            <h2 className="text-4xl font-bold mb-4 relative z-10">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold mb-3">1</div>
              <h3 className="text-lg font-semibold mb-2">Choose Your Era</h3>
              <p className="text-gray-700">
                Pick any historical period from Ancient Rome to the Wild West
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold mb-3">2</div>
              <h3 className="text-lg font-semibold mb-2">AI Generates Everything</h3>
              <p className="text-gray-700">
                Unique cards, artwork, and agent personas tailored to your period
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold mb-3">3</div>
              <h3 className="text-lg font-semibold mb-2">Bluff & Deduce</h3>
              <p className="text-gray-700">
                Claim cards, challenge opponents, and be the last player standing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-[88%] mx-auto px-6 text-center text-sm text-gray-600">
          <p>Built with Agent Commons • Powered by OpenAI</p>
        </div>
      </footer>
    </div>
  );
}
