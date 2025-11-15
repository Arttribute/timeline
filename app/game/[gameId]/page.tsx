"use client";

import { use, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import useSWR from "swr";
import AppBar from "@/components/layout/AppBar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const { user } = usePrivy();
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");

  // Poll game state
  const { data: gameData, mutate } = useSWR(
    `/api/games/${gameId}/state`,
    fetcher,
    {
      refreshInterval: 2000,
    }
  );

  // Get private hand
  const { data: handData } = useSWR(
    user ? `/api/games/${gameId}/player-hand?playerId=${user.id}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const handleAction = async () => {
    if (!selectedAction || !user) return;

    const res = await fetch(`/api/games/${gameId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengerId: user.id }),
    });

    const data = await res.json();
    alert(data.message);
    mutate();
  };

  if (!gameData?.state) {
    return (
      <div className="min-h-screen bg-white">
        <AppBar />
        <div className="flex items-center justify-center py-20">
          <div className="text-black">Loading game...</div>
        </div>
      </div>
    );
  }

  const state = gameData.state;
  const hand = handData?.privateState;
  const isMyTurn = user && state.currentPlayer === user.id;

  // Get themed action name or fallback to generic
  const getActionName = (action: string) => {
    return (
      state.actionNames?.[action as keyof typeof state.actionNames] || action
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      {state.backgroundUrl && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${state.backgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-white/10 "></div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-[88%] mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="relative mb-6">
              <div className="bg-yellow-300 w-64 h-8 -mb-8 ml-0.5 rounded-sm"></div>
              <h1 className="text-4xl font-bold mb-2 relative z-10 text-black">
                Timeline: {state.period}
              </h1>
            </div>
            <p className="text-gray-700">
              Turn {state.turnNumber} | Phase: {state.phase}
            </p>
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {state.players.map((player: any) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border ${
                  player.id === state.currentPlayer
                    ? "border-black bg-yellow-50"
                    : "border-gray-400 bg-white"
                }`}
              >
                <div className="font-semibold text-black">{player.name}</div>
                <div className="text-sm text-gray-700">
                  Coins: {player.coins} | Cards: {player.cardCount}
                </div>
                {player.eliminated && (
                  <div className="text-red-600 text-xs">Eliminated</div>
                )}
              </div>
            ))}
          </div>

          {/* Your Hand */}
          {hand && (
            <div className="mb-8 p-6 bg-white rounded-lg border border-gray-400">
              <div className="relative mb-4">
                <div className="bg-lime-200 w-32 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
                <h2 className="text-xl font-semibold relative z-10 text-black">
                  Your Hand
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {hand.hand.map((card: any) => (
                  <div
                    key={card.id}
                    className="relative overflow-hidden rounded-lg border border-gray-400 bg-white"
                  >
                    {card.imageUrl && (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="font-semibold text-black">
                        {card.name}
                      </div>
                      <div className="text-sm text-gray-700">{card.type}</div>
                      <div className="text-xs text-gray-600 mt-2">
                        {card.ability}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {isMyTurn && state.phase === "action" && hand && (
            <div className="mb-8 p-6 bg-teal-50 rounded-lg border border-gray-400">
              <div className="relative mb-4">
                <div className="bg-teal-200 w-56 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
                <h2 className="text-xl font-semibold relative z-10 text-black">
                  Your Turn - Take Action
                </h2>
              </div>
              <div className="space-y-4">
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select Action</option>
                  {hand.availableActions.map((action: string) => (
                    <option key={action} value={action}>
                      {getActionName(action)}
                    </option>
                  ))}
                </select>

                {(selectedAction === "coup" ||
                  selectedAction === "assassinate" ||
                  selectedAction === "steal") && (
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
                  className="w-full px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Execute Action
                </button>
              </div>
            </div>
          )}

          {/* Reaction Window */}
          {state.phase === "reaction" && state.pendingAction && (
            <div className="mb-8 p-6 bg-orange-50 rounded-lg border border-gray-400">
              <div className="relative mb-4">
                <div className="bg-orange-200 w-48 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
                <h2 className="text-xl font-semibold relative z-10 text-black">
                  Reaction Window
                </h2>
              </div>
              <p className="mb-4 text-gray-700">
                {
                  state.players.find(
                    (p: any) => p.id === state.pendingAction.actor
                  )?.name
                }{" "}
                is using {state.pendingAction.type}
              </p>
              {user && state.pendingAction.actor !== user.id && (
                <button
                  onClick={handleChallenge}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Challenge!
                </button>
              )}
            </div>
          )}

          {/* Action History */}
          <div className="p-6 bg-white rounded-lg border border-gray-400">
            <div className="relative mb-4">
              <div className="bg-purple-200 w-40 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
              <h2 className="text-xl font-semibold relative z-10 text-black">
                Game History
              </h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {state.actionHistory
                .slice(-10)
                .reverse()
                .map((action: any, i: number) => (
                  <div
                    key={i}
                    className="text-sm text-gray-700 border-l-2 border-gray-400 pl-3"
                  >
                    Turn {action.turn}: {action.result}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
