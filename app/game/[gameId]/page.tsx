'use client';

import { use, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user } = usePrivy();
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');

  // Poll game state
  const { data: gameData, mutate } = useSWR(`/api/games/${gameId}/state`, fetcher, {
    refreshInterval: 2000,
  });

  // Get private hand
  const { data: handData } = useSWR(
    user ? `/api/games/${gameId}/player-hand?playerId=${user.id}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const handleAction = async () => {
    if (!selectedAction || !user) return;

    const res = await fetch(`/api/games/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: user.id,
        action: selectedAction,
        target: selectedTarget || undefined,
      }),
    });

    const data = await res.json();
    alert(data.message);
    mutate();
  };

  const handleChallenge = async () => {
    if (!user) return;

    const res = await fetch(`/api/games/${gameId}/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengerId: user.id }),
    });

    const data = await res.json();
    alert(data.message);
    mutate();
  };

  if (!gameData?.state) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div>Loading game...</div>
      </div>
    );
  }

  const state = gameData.state;
  const hand = handData?.privateState;
  const isMyTurn = user && state.currentPlayer === user.id;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Timeline: {state.period}</h1>
          <p className="text-neutral-400">Turn {state.turnNumber} | Phase: {state.phase}</p>
        </div>

        {/* Players */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {state.players.map((player: any) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg border ${
                player.id === state.currentPlayer
                  ? 'border-violet-500 bg-violet-950/20'
                  : 'border-neutral-800 bg-neutral-900/50'
              }`}
            >
              <div className="font-semibold">{player.name}</div>
              <div className="text-sm text-neutral-400">
                Coins: {player.coins} | Cards: {player.cardCount}
              </div>
              {player.eliminated && <div className="text-red-500 text-xs">Eliminated</div>}
            </div>
          ))}
        </div>

        {/* Your Hand */}
        {hand && (
          <div className="mb-8 p-6 bg-neutral-900 rounded-lg border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4">Your Hand</h2>
            <div className="grid grid-cols-2 gap-4">
              {hand.hand.map((card: any) => (
                <div key={card.id} className="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                  <div className="font-semibold">{card.name}</div>
                  <div className="text-sm text-neutral-400">{card.type}</div>
                  <div className="text-xs text-neutral-500 mt-2">{card.ability}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {isMyTurn && state.phase === 'action' && hand && (
          <div className="mb-8 p-6 bg-violet-950/20 rounded-lg border border-violet-800">
            <h2 className="text-xl font-semibold mb-4">Your Turn - Take Action</h2>
            <div className="space-y-4">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md"
              >
                <option value="">Select Action</option>
                {hand.availableActions.map((action: string) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>

              {(selectedAction === 'coup' ||
                selectedAction === 'assassinate' ||
                selectedAction === 'steal') && (
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md"
                >
                  <option value="">Select Target</option>
                  {state.players
                    .filter((p: any) => p.id !== user?.id && !p.eliminated)
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}

              <button
                onClick={handleAction}
                disabled={!selectedAction}
                className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 rounded-md font-medium disabled:opacity-50"
              >
                Execute Action
              </button>
            </div>
          </div>
        )}

        {/* Reaction Window */}
        {state.phase === 'reaction' && state.pendingAction && (
          <div className="mb-8 p-6 bg-orange-950/20 rounded-lg border border-orange-800">
            <h2 className="text-xl font-semibold mb-2">Reaction Window</h2>
            <p className="mb-4">
              {state.players.find((p: any) => p.id === state.pendingAction.actor)?.name} is using{' '}
              {state.pendingAction.type}
            </p>
            {user && state.pendingAction.actor !== user.id && (
              <button
                onClick={handleChallenge}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md font-medium"
              >
                Challenge!
              </button>
            )}
          </div>
        )}

        {/* Action History */}
        <div className="p-6 bg-neutral-900 rounded-lg border border-neutral-800">
          <h2 className="text-xl font-semibold mb-4">Game History</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {state.actionHistory.slice(-10).reverse().map((action: any, i: number) => (
              <div key={i} className="text-sm text-neutral-400 border-l-2 border-neutral-700 pl-3">
                Turn {action.turn}: {action.result}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
