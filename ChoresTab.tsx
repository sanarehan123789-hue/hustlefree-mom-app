import React, { useState, useEffect } from 'react';
import { MomProfile, Chore } from '../types';
import { getDefaultChores, PROFILE_DETAILS } from '../data';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Sparkles, Trash, Check, Plus, ClipboardList, Zap, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChoresTabProps {
  profile: MomProfile;
  userId: string | null;
  onChoresChange: (uncompletedCount: number) => void;
}

interface ConfettiItem {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
}

export default function ChoresTab({ profile, userId, onChoresChange }: ChoresTabProps) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newType, setNewType] = useState<'tiny' | 'deep'>('tiny');
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);

  // Trigger confetti particles
  const triggerConfetti = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];
    const newParticles: ConfettiItem[] = [];

    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: Math.random(),
        x,
        y: y - 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        angle: Math.random() * 360,
        speed: Math.random() * 8 + 4,
      });
    }

    setConfetti(prev => [...prev, ...newParticles]);

    // Cleanup particles after 1 second
    setTimeout(() => {
      setConfetti(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1200);
  };

  // Load chores
  const loadChores = async () => {
    if (!userId) {
      const defaults = getDefaultChores('offline', profile).map((item, idx) => ({
        ...item,
        id: `offline-chore-${profile}-${idx}`,
        createdAt: new Date().toISOString(),
      })) as Chore[];
      setChores(defaults);
      onChoresChange(defaults.filter(c => !c.completed).length);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'chores'),
        where('userId', '==', userId),
        where('profile', '==', profile)
      );
      const querySnapshot = await getDocs(q);
      const items: Chore[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: d.userId,
          title: d.title,
          type: d.type as 'tiny' | 'deep',
          completed: d.completed || false,
          createdAt: d.createdAt || new Date().toISOString(),
          profile: d.profile as MomProfile,
        });
      });

      if (items.length === 0) {
        // Prepopulate with defaults
        const defaults = getDefaultChores(userId, profile).map(d => ({
          ...d,
          createdAt: new Date().toISOString(),
        }));
        const savedItems: Chore[] = [];
        for (const item of defaults) {
          const docRef = await addDoc(collection(db, 'chores'), item);
          savedItems.push({
            ...item,
            id: docRef.id,
          } as Chore);
        }
        setChores(savedItems);
        onChoresChange(savedItems.filter(c => !c.completed).length);
      } else {
        setChores(items);
        onChoresChange(items.filter(c => !c.completed).length);
      }
    } catch (err) {
      console.error('Error fetching chores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChores();
  }, [profile, userId]);

  // Handler for toggle completion
  const handleToggleChore = async (chore: Chore, e: React.MouseEvent) => {
    const nextCompleted = !chore.completed;

    if (nextCompleted) {
      triggerConfetti(e);
    }

    // Update state
    setChores(prev => {
      const nextList = prev.map(c => c.id === chore.id ? { ...c, completed: nextCompleted } : c);
      onChoresChange(nextList.filter(c => !c.completed).length);
      return nextList;
    });

    if (userId && !chore.id.startsWith('offline-')) {
      try {
        await updateDoc(doc(db, 'chores', chore.id), { completed: nextCompleted });
      } catch (err) {
        console.error('Error updating chore completion:', err);
      }
    }
  };

  // Handler for delete chore
  const handleDeleteChore = async (choreId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this chore item?');
    if (!confirmDelete) return;

    setChores(prev => {
      const nextList = prev.filter(c => c.id !== choreId);
      onChoresChange(nextList.filter(c => !c.completed).length);
      return nextList;
    });

    if (userId && !choreId.startsWith('offline-')) {
      try {
        await deleteDoc(doc(db, 'chores', choreId));
      } catch (err) {
        console.error('Error deleting chore:', err);
      }
    }
  };

  // Add new chore
  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const choreData = {
      userId: userId || 'offline',
      title: newTitle,
      type: newType,
      completed: false,
      createdAt: new Date().toISOString(),
      profile,
    };

    if (userId) {
      try {
        const docRef = await addDoc(collection(db, 'chores'), choreData);
        setChores(prev => {
          const nextList = [...prev, { ...choreData, id: docRef.id }];
          onChoresChange(nextList.filter(c => !c.completed).length);
          return nextList;
        });
      } catch (err) {
        console.error('Error creating chore:', err);
      }
    } else {
      setChores(prev => {
        const nextList = [...prev, { ...choreData, id: `offline-chore-${Date.now()}` }];
        onChoresChange(nextList.filter(c => !c.completed).length);
        return nextList;
      });
    }

    setNewTitle('');
  };

  // Preset reset
  const handleResetChores = async () => {
    const confirmReset = window.confirm('Reset chore lists back to core template items? Custom entries will be cleared.');
    if (!confirmReset) return;

    if (userId) {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'chores'),
          where('userId', '==', userId),
          where('profile', '==', profile)
        );
        const querySnapshot = await getDocs(q);
        for (const docSnap of querySnapshot.docs) {
          await deleteDoc(doc(db, 'chores', docSnap.id));
        }
      } catch (err) {
        console.error('Error clearing chores:', err);
      }
    }
    await loadChores();
  };

  // Filter columns
  const tinyChores = chores.filter(c => c.type === 'tiny');
  const deepChores = chores.filter(c => c.type === 'deep');

  const totalCount = chores.length;
  const completedCount = chores.filter(c => c.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 relative">
      {/* Absolute floating portal for custom confetti elements */}
      {confetti.map((p) => {
        const angleRad = (p.angle * Math.PI) / 180;
        const driftX = Math.cos(angleRad) * p.speed * 12;
        const driftY = Math.sin(angleRad) * p.speed * 12 + 60; // drift downward heavier
        return (
          <motion.div
            key={p.id}
            initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            animate={{
              scale: 0,
              opacity: 0,
              x: driftX,
              y: driftY,
            }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.color,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        );
      })}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 id="chore-section-title" className="font-serif text-2xl font-bold text-[#302113]">
            Family Chore Organizer
          </h2>
          <p className="text-[#8C7A5B] text-sm mt-0.5">
            Sweep through tiny velocity chores or tackle deep cleaning blocks. Keep high focus metrics.
          </p>
        </div>

        <button
          id="reset-chores-btn"
          onClick={handleResetChores}
          className="px-3 py-1.5 border border-[#DACBB8] hover:bg-[#EADFC9]/25 text-[#4E3925] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#8C7A5B]" />
          Reset Chores List
        </button>
      </div>

      {/* SVG Completion Dial widget */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-gradient-to-br from-[#FCFAF6] to-white border border-[#E6DCC5]/80 rounded-2xl shadow-[0_2px_12px_rgba(139,94,60,0.02)]">
        <div className="relative w-18 h-18 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="36" cy="36" r="30" stroke="#FAF2E5" strokeWidth="5" fill="none" />
            <circle cx="36" cy="36" r="30" stroke="#b45309" strokeWidth="5" fill="none"
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - percentage / 100)}
              className="transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1)"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute font-mono font-extrabold text-[#302113] text-sm">{percentage}%</span>
        </div>
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-serif font-bold text-sm text-[#302113]">Micro-Task Velocity Progress</h3>
          <p className="text-xs text-[#8C7A5B] leading-relaxed max-w-xl">
            You have marked <strong className="text-[#302113] font-bold">{completedCount}</strong> out of <strong className="text-[#302113] font-bold">{totalCount}</strong> chores. Great pacing! Check off tasks to release sparkle effects and lift your reset state.
          </p>
        </div>
      </div>

      {/* Add New Chore Form */}
      <form id="add-chore-submit-form" onSubmit={handleAddChore} className="bg-white border border-[#EADFC9]/70 p-4 rounded-2xl flex flex-col md:flex-row gap-3 shadow-[0_4px_16px_rgba(139,94,60,0.02)]">
        <div className="flex-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add new chore (e.g. Empty dryer filters, Wipe keyboard & desk...)"
            className="w-full h-11 bg-[#FCFAF7] border border-[#DFD1C4] rounded-xl px-4 text-sm text-[#302113] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all placeholder-[#A08F75]"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-[#DFD1C4] rounded-xl p-0.5 bg-[#FCFAF7]">
            <button
              type="button"
              id="chore-type-tiny-btn"
              onClick={() => setNewType('tiny')}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                newType === 'tiny'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-[#8C7A5B] hover:text-[#4A3E25]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Tiny Chore
            </button>
            <button
              type="button"
              id="chore-type-deep-btn"
              onClick={() => setNewType('deep')}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                newType === 'deep'
                  ? 'bg-[#4E3925] text-white shadow-xs'
                  : 'text-[#8C7A5B] hover:text-[#4A3E25]'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Deep Clean
            </button>
          </div>

          <button
            type="submit"
            className="h-11 px-5 bg-[#302113] hover:bg-[#1C130B] text-white font-bold rounded-xl text-sm flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto md:ml-0"
          >
            <Plus className="w-4 h-4" />
            Add Chore
          </button>
        </div>
      </form>

      {loading ? (
        <div className="py-16 text-center text-[#8C7A5B]">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#8C7A5B]" />
          <p className="mt-2 text-sm">Syncing task sheets...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column 1: Tiny Chores */}
          <div id="tiny-chores-column" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EADFC9]/60 pb-3">
              <span className="p-1.5 bg-amber-50 rounded-lg text-amber-700 border border-amber-200">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif font-bold text-[#302113] text-base">
                  Tiny Chores
                </h3>
                <p className="text-xs text-[#8C7A5B]">Micro-steps in under 15 minutes that block clutter build-up.</p>
              </div>
              <span className="ml-auto text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-100 rounded-lg px-2.5 py-0.5">
                {tinyChores.filter(c => !c.completed).length} Rem
              </span>
            </div>

            <div className="space-y-2.5">
              {tinyChores.length === 0 ? (
                <p className="text-center py-10 text-xs text-[#8C7A5B] italic bg-[#FCFAF7] rounded-2xl border border-dashed border-[#EADFC9]/60">
                  No pending tiny chores. Complete for today!
                </p>
              ) : (
                tinyChores.map((chore) => (
                  <div
                    key={chore.id}
                    className={`flex items-center justify-between p-4 rounded-xl border bg-white ${
                      chore.completed
                        ? 'opacity-60 border-dashed border-gray-200 bg-[#FCFAF5]/30'
                        : 'border-[#EADFC9]/40 shadow-xs hover:border-amber-200'
                    } transition-all duration-200 group`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={(e) => handleToggleChore(chore, e)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer mt-0.5 ${
                          chore.completed
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : 'bg-white border-[#DFD1C4] hover:border-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        {chore.completed ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                      </button>

                      <div className="flex-1 min-w-0 pr-2">
                        <span
                          className={`text-sm ${
                            chore.completed ? 'line-through text-gray-400' : 'text-[#3D2C1B] font-semibold'
                          } block truncate pr-1`}
                        >
                          {chore.title}
                        </span>
                        <div className="flex gap-1 mt-1">
                          <span className="text-[8px] tracking-wider uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-800 leading-none">
                            ⚡ Tiny win
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteChore(chore.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                      title="Delete chore"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Deep projects */}
          <div id="deep-chores-column" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EADFC9]/60 pb-3">
              <span className="p-1.5 bg-purple-50 rounded-lg text-purple-700 border border-purple-200">
                <ClipboardList className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif font-bold text-[#302113] text-base">
                  Deep Clean & Projects
                </h3>
                <p className="text-xs text-[#8C7A5B]">Substantial upgrades to keep household buffers working smoothly.</p>
              </div>
              <span className="ml-auto text-xs font-mono font-bold bg-purple-50 text-purple-800 border border-purple-100 rounded-lg px-2.5 py-0.5">
                {deepChores.filter(c => !c.completed).length} Rem
              </span>
            </div>

            <div className="space-y-2.5">
              {deepChores.length === 0 ? (
                <p className="text-center py-10 text-xs text-[#8C7A5B] italic bg-[#FCFAF7] rounded-2xl border border-dashed border-[#EADFC9]/60">
                  No heavy upgrades listed. Save a deep-work target!
                </p>
              ) : (
                deepChores.map((chore) => (
                  <div
                    key={chore.id}
                    className={`flex items-center justify-between p-4 rounded-xl border bg-white ${
                      chore.completed
                        ? 'opacity-60 border-dashed border-gray-200 bg-[#FCFAF5]/30'
                        : 'border-[#EADFC9]/50 shadow-xs hover:border-purple-200'
                    } transition-all duration-200 group`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={(e) => handleToggleChore(chore, e)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer mt-0.5 ${
                          chore.completed
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : 'bg-white border-[#DFD1C4] hover:border-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        {chore.completed ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                      </button>

                      <div className="flex-1 min-w-0 pr-2">
                        <span
                          className={`text-sm ${
                            chore.completed ? 'line-through text-gray-400' : 'text-[#3D2C1B] font-semibold'
                          } block truncate pr-1`}
                        >
                          {chore.title}
                        </span>
                        <div className="flex gap-1 mt-1">
                          <span className="text-[8px] tracking-wider uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-purple-50 border border-purple-100 text-purple-800 leading-none">
                            🛡️ Deep focus
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteChore(chore.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                      title="Delete chore"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
