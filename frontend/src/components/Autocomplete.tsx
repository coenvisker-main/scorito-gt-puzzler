import { useState, useRef, useEffect, useMemo } from 'react';
import { Renner, RennerType } from '../types';
import { X, Target } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

interface AutocompleteProps {
  value: string;
  options: Renner[];
  onSelect: (rider: Renner) => void;
  onChange: (val: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function Autocomplete({ value, options, onSelect, onChange, onClear, placeholder }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { getTypeStatus, maxAffordablePrice, slots } = useTeam();

  const filteredOptions = useMemo(() => {
    if (!value || value.length < 2) return [];
    const search = value.toLowerCase();
    
    // Also check if already in team to avoid double showing
    const existingNames = new Set(slots.map(s => s.name));

    return options.filter(opt => 
      (opt.naam.toLowerCase().includes(search) || opt.ploeg.toLowerCase().includes(search)) &&
      !existingNames.has(opt.naam)
    ).slice(0, 10);
  }, [value, options, slots]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
      setIsOpen(true);
    } else if (e.key === 'Enter' && isOpen && filteredOptions[highlightedIndex]) {
      e.preventDefault();
      onSelect(filteredOptions[highlightedIndex]);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full group/ac">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/50 shadow-inner placeholder:text-neutral-500"
        />
        {value && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-[100] left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto ring-1 ring-black">
          {filteredOptions.map((opt, i) => {
            const status = getTypeStatus(opt.gebruiker_type || 'Wildcard');
            const isTooExpensive = opt.prijs > maxAffordablePrice;

            return (
              <div
                key={opt.id}
                onMouseDown={(e) => e.preventDefault()}
                className={`px-3 py-2 flex justify-between items-center transition-colors border-b border-neutral-800/50 last:border-0 ${
                    isTooExpensive 
                        ? 'opacity-40 grayscale-[0.5] cursor-not-allowed bg-neutral-950/20' 
                        : i === highlightedIndex ? 'bg-amber-500 text-neutral-950 font-bold cursor-pointer' : 'text-neutral-200 hover:bg-neutral-800 cursor-pointer'
                }`}
                onClick={() => {
                  if (!isTooExpensive) {
                    onSelect(opt);
                    setIsOpen(false);
                  }
                }}
                onMouseEnter={() => !isTooExpensive && setHighlightedIndex(i)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate tracking-tight font-black flex items-center gap-1">
                    {opt.naam}
                    {opt.is_jongere && (
                      <span className={`text-sm ${i === highlightedIndex ? 'text-neutral-900' : 'text-amber-500'}`}>*</span>
                    )}
                    {isTooExpensive && (
                        <span className="text-[8px] bg-red-500/20 text-red-500 border border-red-500/30 px-1 rounded ml-1">TE DUUR</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] uppercase font-black truncate tracking-tighter ${i === highlightedIndex ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {opt.ploeg}
                    </span>
                    <span className={`text-[8px] font-black px-1 rounded uppercase tracking-tighter ${
                        i === highlightedIndex 
                            ? 'bg-black/20 text-black' 
                            : status === 'under' ? 'bg-emerald-500/20 text-emerald-500' : status === 'over' ? 'bg-red-500/20 text-red-500' : 'bg-neutral-800 text-neutral-500'
                    }`}>
                        {opt.gebruiker_type} • {status === 'under' ? 'Nodig' : status === 'over' ? 'Vol' : 'OK'}
                    </span>
                  </div>
                </div>
                <div className={`text-[11px] font-mono font-black ml-2 ${isTooExpensive ? 'text-red-500' : i === highlightedIndex ? 'text-neutral-950' : 'text-amber-500'}`}>
                  &euro;{(opt.prijs / 1000000).toFixed(1)}M
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
