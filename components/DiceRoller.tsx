import React, { useState } from 'react';

export const DiceRoller: React.FC = () => {
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const rollDice = (sides: number) => {
    setIsRolling(true);
    setResult(null);
    // Simulate animation time
    setTimeout(() => {
      const value = Math.floor(Math.random() * sides) + 1;
      setResult(value);
      setIsRolling(false);
    }, 400);
  };

  return (
    <div className="bg-ordo-800 p-4 rounded-xl border border-ordo-700 mt-4 shadow-lg">
      <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Rolagem Rápida</h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[4, 6, 8, 10, 12, 20, 100].map(d => (
          <button
            key={d}
            onClick={() => rollDice(d)}
            className="bg-ordo-700 hover:bg-ordo-500 text-white font-bold py-2 px-1 rounded transition-colors text-xs"
          >
            d{d}
          </button>
        ))}
      </div>
      
      <div className="h-16 flex items-center justify-center bg-ordo-900 rounded-lg border border-ordo-700 relative overflow-hidden">
        {isRolling ? (
          <span className="text-ordo-400 animate-pulse font-mono">Rolando...</span>
        ) : result !== null ? (
          <span className="text-3xl font-bold text-white">{result}</span>
        ) : (
          <span className="text-gray-600 text-xs">Selecione um dado</span>
        )}
      </div>
    </div>
  );
};