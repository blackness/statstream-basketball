import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

const PinEntryModal = ({ team, onSuccess, onClose }) => {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleKey = (k) => {
    if (k === '⌫') {
      setPin(p => p.slice(0, -1));
      setError(false);
      return;
    }
    if (!k) return;
    if (pin.length >= 4) return;

    const next = pin + k;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      if (next === team.pin) {
        onSuccess(team.id);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setPin(''); setShake(false); }, 700);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-xs rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Lock size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm">Enter Team PIN</p>
              <p className="text-xs text-gray-400">{team.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* PIN dots */}
        <div className={`flex justify-center gap-4 py-6 ${shake ? 'animate-bounce' : ''}`}>
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? error ? 'bg-red-500 scale-110' : 'bg-blue-600 scale-110'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-xs font-bold text-red-500 -mt-4 mb-2">
            Incorrect PIN — try again
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
          {KEYS.map((k, i) => (
            <button
              key={i}
              onClick={() => handleKey(k)}
              disabled={!k && k !== '0'}
              className={`py-5 text-xl font-black transition active:scale-95 ${
                k === '⌫'
                  ? 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                  : k
                  ? 'text-gray-900 bg-white hover:bg-gray-50'
                  : 'bg-gray-50 cursor-default'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PinEntryModal;