'use client';

import AppBar from '@/components/layout/AppBar';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <AppBar />

      <div className="max-w-[88%] mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="relative mb-8">
            <div className="bg-yellow-300 w-48 h-8 -mb-8 ml-0.5 rounded-sm"></div>
            <h1 className="text-5xl font-bold relative z-10 text-black">How to Play</h1>
          </div>
          <p className="text-xl text-gray-700 leading-relaxed">
            Timeline is a social deduction card game inspired by Coup. Bluff, challenge, and
            strategize your way to victory in any historical period.
          </p>
        </div>

        {/* Game Overview */}
        <section className="mb-12 p-6 bg-white border border-gray-400 rounded-lg">
          <div className="relative mb-4">
            <div className="bg-lime-200 w-40 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
            <h2 className="text-2xl font-semibold relative z-10 text-black">Game Overview</h2>
          </div>
          <div className="space-y-4 text-gray-700">
            <p>
              Each player starts with 2 cards and 2 coins. Your goal is to be the last player with
              cards remaining. Use your influence cards to take powerful actions, but beware -
              others can challenge your claims!
            </p>
            <p>
              The twist? You can claim to have any card, whether you actually have it or not. Bluff
              your way to victory, but if you're caught lying, you'll lose influence.
            </p>
          </div>
        </section>

        {/* Card Types */}
        <section className="mb-12 p-6 bg-white border border-gray-400 rounded-lg">
          <div className="relative mb-4">
            <div className="bg-teal-200 w-32 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
            <h2 className="text-2xl font-semibold relative z-10 text-black">Card Types</h2>
          </div>
          <p className="text-gray-700 mb-4">
            Each game generates unique cards based on your chosen historical period. Typically,
            there are 5 card types with different abilities:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-gray-400 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Tax Collector</h3>
              <p className="text-sm text-gray-700">Collect 3 coins from the treasury</p>
            </div>
            <div className="p-4 bg-white border border-gray-400 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Assassin</h3>
              <p className="text-sm text-gray-700">
                Pay 3 coins to force an opponent to lose influence
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-400 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Ambassador</h3>
              <p className="text-sm text-gray-700">Exchange cards with the deck</p>
            </div>
            <div className="p-4 bg-white border border-gray-400 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Thief</h3>
              <p className="text-sm text-gray-700">Steal 2 coins from another player</p>
            </div>
            <div className="p-4 bg-white border border-gray-400 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Blocker</h3>
              <p className="text-sm text-gray-700">Block foreign aid and stealing</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Note: Card names and abilities are dynamically generated to match your historical
            period!
          </p>
        </section>

        {/* Actions */}
        <section className="mb-12 p-6 bg-white border border-gray-400 rounded-lg">
          <div className="relative mb-4">
            <div className="bg-orange-200 w-24 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
            <h2 className="text-2xl font-semibold relative z-10 text-black">Actions</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-black mb-2">General Actions (No card needed)</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>Income:</strong> Take 1 coin from the treasury
                </li>
                <li>
                  <strong>Foreign Aid:</strong> Take 2 coins (can be blocked)
                </li>
                <li>
                  <strong>Coup:</strong> Pay 7 coins to force an opponent to lose influence
                  (unblockable)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-2">Character Actions</h3>
              <p className="text-gray-700">
                Each card type has a special ability. You can claim to have any card to use its
                action, but if challenged and you don't have it, you lose influence!
              </p>
            </div>
          </div>
        </section>

        {/* Challenges */}
        <section className="mb-12 p-6 bg-white border border-gray-400 rounded-lg">
          <div className="relative mb-4">
            <div className="bg-purple-200 w-32 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
            <h2 className="text-2xl font-semibold relative z-10 text-black">Challenges</h2>
          </div>
          <div className="space-y-4 text-gray-700">
            <p>
              When a player claims a card ability, any other player can challenge them before the
              action resolves.
            </p>
            <div className="p-4 bg-yellow-50 border border-gray-400 rounded-lg">
              <h3 className="font-semibold text-black mb-2">If the challenge succeeds:</h3>
              <p className="text-sm">
                The challenged player didn't have the card - they lose influence and their action
                fails.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 border border-gray-400 rounded-lg">
              <h3 className="font-semibold text-black mb-2">If the challenge fails:</h3>
              <p className="text-sm">
                The challenged player proves they have the card - the challenger loses influence and
                the action proceeds.
              </p>
            </div>
          </div>
        </section>

        {/* Winning */}
        <section className="mb-12 p-6 bg-teal-50 border border-gray-400 rounded-lg">
          <div className="relative mb-4">
            <div className="bg-teal-200 w-24 h-6 -mb-6.5 ml-0.5 rounded-sm"></div>
            <h2 className="text-2xl font-semibold relative z-10 text-black">Winning</h2>
          </div>
          <p className="text-gray-700">
            The last player with at least one card remaining wins the game. Master the art of
            deception, know when to challenge, and when to let suspicious claims slide!
          </p>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            Start Playing
          </Link>
        </div>
      </div>
    </div>
  );
}
