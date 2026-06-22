import React, { useState, useEffect } from 'react';
import { MomProfile } from '../types';
import { PROFILE_DETAILS } from '../data';
import { Sparkles, RefreshCw, Quote, Heart } from 'lucide-react';

interface TipSectionProps {
  profile: MomProfile;
  uncompletedChoresCount: number;
}

export default function TipSection({ profile, uncompletedChoresCount }: TipSectionProps) {
  const [tip, setTip] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTip = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile, uncompletedChoresCount }),
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      setTip(data.tip);
    } catch (err) {
      console.error(err);
      // Fallback tips from profile details
      const defaultTips = PROFILE_DETAILS[profile].defaultTips;
      const randomTip = defaultTips[Math.floor(Math.random() * defaultTips.length)];
      setTip(randomTip);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTip();
  }, [profile, uncompletedChoresCount]);

  const pDetails = PROFILE_DETAILS[profile];

  return (
    <div id="mindful-reset-panel" className="bg-gradient-to-br from-[#FAF5EC] to-white border border-[#E6DCC5]/80 rounded-2xl p-6 shadow-[0_8px_24px_rgba(139,94,60,0.03)] relative overflow-hidden transition-all duration-300">
      {/* Decorative organic backdrop circle */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#EADFC9]/20 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-start gap-4">
        {/* Sparkle container with clean layout & animation */}
        <div id="tip-sparkle-icon" className="p-3.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-2xl flex-shrink-0 shadow-sm relative overflow-hidden">
          <Sparkles className="w-5 h-5 relative z-10 animate-pulse" />
        </div>
        
        <div className="flex-1 space-y-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif font-bold text-[#302113] text-lg">
                Daily Mindful Reset
              </h3>
              <span className="text-[10px] uppercase font-mono tracking-widest font-bold px-2.5 py-0.5 rounded-full bg-amber-100/60 border border-amber-200/50 text-amber-800 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI Guided
              </span>
            </div>
            
            <button
              id="refresh-tip-btn"
              onClick={fetchTip}
              disabled={loading}
              className="text-[#8C7A5B] hover:text-[#3D2C1B] p-2 hover:bg-[#EADFC9]/20 rounded-xl transition-all cursor-pointer flex-shrink-0"
              title="Tailor a fresh reset moment"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'transition-transform hover:rotate-45'}`} />
            </button>
          </div>

          <div className="relative">
            <Quote className="absolute top-0 left-0 w-8 h-8 text-[#CEBFA1]/25 -mt-3.5 -ml-1.5 pointer-events-none" />
            
            {loading ? (
              <div className="space-y-2 py-1">
                <div className="h-3.5 bg-amber-100/40 rounded-full w-full animate-pulse" />
                <div className="h-3.5 bg-amber-100/40 rounded-full w-11/12 animate-pulse" />
                <div className="h-3.5 bg-amber-100/40 rounded-full w-3/4 animate-pulse" />
              </div>
            ) : (
              <div className="pl-4 relative z-10">
                <p className="font-serif italic text-base text-[#4E3925] leading-relaxed tracking-wide">
                  "{tip || "Pause and take 3 deep, mindful breaths. It doesn't all have to be perfect to be meaningful."}"
                </p>
              </div>
            )}
          </div>

          <div className="pt-1.5 text-xs text-[#8C7A5B] flex items-center gap-1.5 border-t border-[#FCFAF2]">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-100" />
            <span className="font-medium">
              Tailored for <strong className="text-[#302113] font-serif">{pDetails.title}</strong> with <strong className="text-amber-900 font-mono text-[13px] bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">{uncompletedChoresCount}</strong> pending task{uncompletedChoresCount !== 1 && 's'}.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
