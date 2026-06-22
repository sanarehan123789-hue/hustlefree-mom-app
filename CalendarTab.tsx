import React, { useState, useEffect } from 'react';
import { MomProfile, TimeBlock, GoogleCalendarEvent } from '../types';
import { getDefaultRoutines, PROFILE_DETAILS } from '../data';
import { fetchGoogleCalendarEvents, addGoogleCalendarEvent } from '../utils/googleApis';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Calendar, Plus, Trash, Check, Clock, CheckCircle2, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarTabProps {
  profile: MomProfile;
  userId: string | null;
  accessToken: string | null;
}

export default function CalendarTab({ profile, userId, accessToken }: CalendarTabProps) {
  const [routines, setRoutines] = useState<TimeBlock[]>([]);
  const [gEvents, setGEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false);
  const [loadingRoutines, setLoadingRoutines] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Form for custom time block
  const [newTime, setNewTime] = useState<string>('09:00 AM - 10:00 AM');
  const [newActivity, setNewActivity] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form for Google Calendar Event
  const [gSummary, setGSummary] = useState<string>('');
  const [gDesc, setGDesc] = useState<string>('');
  const [gDate, setGDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [gStart, setGStart] = useState<string>('12:00');
  const [gEnd, setGEnd] = useState<string>('13:00');
  const [showGForm, setShowGForm] = useState<boolean>(false);
  const [gActionLoading, setGActionLoading] = useState<boolean>(false);

  // Load routines (from Firestore if userID exists, otherwise client default)
  const loadRoutines = async () => {
    if (!userId) {
      // Offline fallback: load defaults
      const defaults = getDefaultRoutines('offline', profile).map((item, idx) => ({
        ...item,
        id: `offline-${profile}-${idx}`,
      })) as TimeBlock[];
      setRoutines(defaults);
      return;
    }

    setLoadingRoutines(true);
    try {
      const q = query(
        collection(db, 'routines'),
        where('userId', '==', userId),
        where('profile', '==', profile)
      );
      const querySnapshot = await getDocs(q);
      const items: TimeBlock[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: d.userId,
          time: d.time,
          activity: d.activity,
          profile: d.profile,
          isCompleted: d.isCompleted || false,
        });
      });

      if (items.length === 0) {
        // First time: pre-populate and save to Firestore
        const defaults = getDefaultRoutines(userId, profile);
        const savedItems: TimeBlock[] = [];
        for (const item of defaults) {
          const docRef = await addDoc(collection(db, 'routines'), item);
          savedItems.push({
            ...item,
            id: docRef.id,
          } as TimeBlock);
        }
        setRoutines(savedItems);
      } else {
        setRoutines(items);
      }
    } catch (e) {
      console.error('Error listing routines:', e);
    } finally {
      setLoadingRoutines(false);
    }
  };

  useEffect(() => {
    loadRoutines();
  }, [profile, userId]);

  // Sync / load Google Calendar list
  const syncGoogleCalendar = async () => {
    if (!accessToken) return;
    setLoadingCalendar(true);
    setCalendarError(null);
    try {
      const events = await fetchGoogleCalendarEvents(accessToken);
      setGEvents(events);
    } catch (err: any) {
      console.error(err);
      setCalendarError('Failed to load Google Calendar events. Make sure your token is active.');
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      syncGoogleCalendar();
    }
  }, [accessToken]);

  // Handler for custom block toggle status
  const handleToggleBlock = async (block: TimeBlock) => {
    const updatedStatus = !block.isCompleted;
    
    // Update local state first
    setRoutines(prev => prev.map(r => r.id === block.id ? { ...r, isCompleted: updatedStatus } : r));

    if (userId && !block.id.startsWith('offline-')) {
      try {
        const routineDoc = doc(db, 'routines', block.id);
        await updateDoc(routineDoc, { isCompleted: updatedStatus });
      } catch (err) {
        console.error('Failed to update routine status in Firestore:', err);
      }
    }
  };

  // Handler for custom block delete
  const handleDeleteBlock = async (blockId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this routine block?');
    if (!confirmDelete) return;

    setRoutines(prev => prev.filter(r => r.id !== blockId));

    if (userId && !blockId.startsWith('offline-')) {
      try {
        await deleteDoc(doc(db, 'routines', blockId));
      } catch (err) {
        console.error('Failed to delete routine block:', err);
      }
    }
  };

  // Add custom time block
  const handleAddCustomBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;

    const blockData: Omit<TimeBlock, 'id'> = {
      userId: userId || 'offline',
      time: newTime,
      activity: newActivity,
      profile,
      isCompleted: false,
    };

    if (userId) {
      try {
        const docRef = await addDoc(collection(db, 'routines'), blockData);
        setRoutines(prev => [...prev, { ...blockData, id: docRef.id }]);
      } catch (err) {
        console.error('Error saving routine to Firestore:', err);
      }
    } else {
      setRoutines(prev => [...prev, { ...blockData, id: `offline-${Date.now()}` }]);
    }

    setNewActivity('');
    setShowAddForm(false);
  };

  // Pre-populate/reset routine templates
  const handleResetTemplate = async () => {
    const confirmReset = window.confirm('Reset schedule to original template values? Custom additions will be lost.');
    if (!confirmReset) return;

    if (userId) {
      setLoadingRoutines(true);
      try {
        // Delete current routines for this profile
        const q = query(
          collection(db, 'routines'),
          where('userId', '==', userId),
          where('profile', '==', profile)
        );
        const querySnapshot = await getDocs(q);
        for (const docSnap of querySnapshot.docs) {
          await deleteDoc(doc(db, 'routines', docSnap.id));
        }
      } catch (err) {
        console.error('Error clearing templates:', err);
      }
    }
    // Reload items (which re-populates defaults)
    await loadRoutines();
  };

  // Add event to Google Calendar
  const handleAddGCalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!gSummary.trim()) return;

    const startDateTime = `${gDate}T${gStart}:00`;
    const endDateTime = `${gDate}T${gEnd}:00`;

    // Step 5 Guidelines: Explicitly prompt confirmation for mutation of Workspace data!
    const promptMessage = `Connect to Google Calendar: Allow adding event "${gSummary}" on ${gDate} from ${gStart} to ${gEnd}?`;
    const confirmed = window.confirm(promptMessage);
    if (!confirmed) return;

    setGActionLoading(true);
    try {
      await addGoogleCalendarEvent(accessToken, {
        summary: gSummary,
        description: gDesc || 'Added via HustleFree Mom Organizer App',
        startDateTime,
        endDateTime,
      });

      // Clear form
      setGSummary('');
      setGDesc('');
      setShowGForm(false);
      
      // Reload Calendar items
      await syncGoogleCalendar();
      alert('Event successfully synchronized and loaded into Google Calendar.');
    } catch (err: any) {
      console.error(err);
      alert('Failed to list or add event to Google Calendar. Please check scope permissions.');
    } finally {
      setGActionLoading(false);
    }
  };

  const pDetails = PROFILE_DETAILS[profile];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Visual Day-Block Planner column */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FCFAF2] pb-4">
          <div>
            <h2 id="planner-section-title" className="font-serif text-2xl font-bold text-[#302113]">
              Time-Blocked Day Planner
            </h2>
            <p className="text-[#8C7A5B] text-sm mt-0.5">
              Establish calming routines with automated buffers, transition states, and micro-clean slots.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              id="reset-template-btn"
              onClick={handleResetTemplate}
              className="px-3 py-2 border border-[#DACBB8] hover:bg-[#EADFC9]/25 text-[#4E3925] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Reset today's routine template"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#8C7A5B]" />
              Reset Routine
            </button>
            <button
              id="add-block-drawer-toggle"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-gradient-to-r from-[#4E3925] to-[#3D2C1B] hover:from-[#3D2C1B] hover:to-[#22180F] text-[#FAF7F2] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Block
            </button>
          </div>
        </div>

        {/* Collapsible custom block form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              id="add-block-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddCustomBlock}
              className="bg-white border border-[#E6DCC5] rounded-2xl p-5 shadow-[0_4px_16px_rgba(139,94,60,0.03)] space-y-4 overflow-hidden"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-[#FAF6F0]">
                <Clock className="w-4 h-4 text-amber-700" />
                <h3 className="font-serif font-bold text-sm text-[#302113]">Add Custom Time Block</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#8C7A5B]">Time Window</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 09:30 AM - 10:30 AM"
                    className="w-full text-sm bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3.5 py-2 text-[#3D2C1B] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#8C7A5B]">Activity Details</label>
                  <input
                    type="text"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="e.g. Check washing machine break"
                    className="w-full text-sm bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3.5 py-2 text-[#3D2C1B] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-2 rounded-xl text-[#8C7A5B] hover:bg-[#FCFAF7] font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition-all"
                >
                  Save Block
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {loadingRoutines ? (
          <div className="space-y-3 py-16 text-center text-[#8C7A5B]">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-700" />
            <p className="text-sm">Populating your routine blocks...</p>
          </div>
        ) : (
          <div id="planner-routine-list" className="space-y-3.5 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:border-l-2 before:border-dashed before:border-[#CEBFA1]/70">
            {routines.map((block) => {
              // Dynamically determine day period tag for beautiful representation
              let periodTag = "☀️ Active Slot";
              let periodStyle = "bg-amber-50/70 border-amber-200/50 text-amber-800";
              const lTime = block.time.toUpperCase();
              
              if (lTime.includes("05:") || lTime.includes("06:") || lTime.includes("07:") || lTime.includes("08:") || lTime.includes("09:") || lTime.includes("10:") || lTime.includes("11:")) {
                if (lTime.includes("AM")) {
                  periodTag = "🍳 Morning Routine";
                  periodStyle = "bg-rose-50/70 border-rose-200/40 text-rose-800";
                } else {
                  periodTag = "🌙 Evening Transition";
                  periodStyle = "bg-indigo-50/70 border-indigo-200/40 text-indigo-800";
                }
              } else if (lTime.includes("12:") || lTime.includes("01:") || lTime.includes("02:") || lTime.includes("03:") || lTime.includes("04:")) {
                periodTag = "🌤️ Afternoon Rhythm";
                periodStyle = "bg-emerald-50/70 border-emerald-200/40 text-emerald-800";
              }

              return (
                <div
                  key={block.id}
                  id={`routine-card-${block.id}`}
                  className={`relative pl-12 flex items-center justify-between p-4.5 rounded-2xl border bg-white ${
                    block.isCompleted 
                      ? 'opacity-60 border-dashed border-[#E5E7EB] bg-[#FCFAF5]/30' 
                      : 'shadow-[0_2px_12px_rgba(139,94,60,0.02)] border-[#EADFC9]/50 hover:border-amber-200 hover:shadow-[0_4px_16px_rgba(139,94,60,0.05)]'
                  } transition-all duration-200 group`}
                >
                  {/* Visual Circle Indicator along timeline vertical line */}
                  <button
                    onClick={() => handleToggleBlock(block)}
                    className={`absolute left-2.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      block.isCompleted
                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-[#8C7A5B]/40 hover:border-amber-600 hover:bg-amber-50 shadow-xs'
                    }`}
                  >
                    {block.isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                  </button>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <div className="flex items-center gap-1 font-mono font-bold text-[#8C7A5B]">
                        <Clock className="w-3.5 h-3.5 text-[#A08F75]" />
                        <span>{block.time}</span>
                      </div>
                      <span className={`text-[9px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded-md border ${periodStyle}`}>
                        {periodTag}
                      </span>
                    </div>
                    <h4 className={`text-sm font-semibold mt-1.5 pr-2 ${
                      block.isCompleted ? 'line-through text-gray-400' : 'text-[#3D2C1B]'
                    }`}>
                      {block.activity}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleBlock(block)}
                      className="p-2 hover:bg-amber-50 rounded-xl text-amber-800 cursor-pointer transition-colors"
                      title={block.isCompleted ? 'Mark as active' : 'Mark as completed'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-2 hover:bg-rose-50 rounded-xl text-rose-700 cursor-pointer transition-colors"
                      title="Delete block"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Google Calendar integration column */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-gradient-to-b from-white to-[#FCFAF8] border border-[#EADFC9]/70 rounded-2xl p-6 shadow-[0_4px_24px_rgba(139,94,60,0.02)] space-y-5">
          <div className="flex items-center justify-between border-b border-[#FAF6F0] pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h3 id="gcal-panel-title" className="font-serif font-bold text-base text-[#302113]">
                  Google Calendar Sync
                </h3>
              </div>
            </div>
            
            {accessToken && (
              <button
                id="gcal-refresh-btn"
                onClick={syncGoogleCalendar}
                disabled={loadingCalendar}
                className="text-[#8C7A5B] hover:text-[#3D2C1B] p-2 hover:bg-[#EADFC9]/25 rounded-xl transition-all cursor-pointer"
                title="Sync calendar events"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCalendar ? 'animate-spin' : 'transition-transform hover:rotate-180'}`} />
              </button>
            )}
          </div>

          {!accessToken ? (
            <div className="text-center py-8 px-5 border border-dashed border-[#DFCEBA] rounded-2xl bg-[#FCFAF6] space-y-4">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100/60">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
              <div className="space-y-1.5 max-w-xs mx-auto">
                <p className="font-bold text-sm text-[#302113]">Natively Sync Family Calendars</p>
                <p className="text-xs text-[#8C7A5B] leading-relaxed">
                  Sign in with Google at the top to import work calendars, household slots, and school agendas in real-time.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8C7A5B]">Upcoming Family Events</span>
                <button
                  id="add-gcal-event-toggle-btn"
                  onClick={() => setShowGForm(!showGForm)}
                  className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-amber-50/50 border border-amber-100/60 pl-2.5 pr-2 py-1 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Sync Event
                </button>
              </div>

              {/* Add GCal Event dropdown form */}
              <AnimatePresence>
                {showGForm && (
                  <motion.form
                    id="add-gcal-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddGCalEvent}
                    className="bg-white border border-[#E6DCC5] rounded-xl p-4 space-y-4 overflow-hidden text-xs shadow-xs"
                  >
                    <h4 className="font-serif font-bold text-[#302113]">Log Event to Primary Google Calendar</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#8C7A5B] uppercase tracking-wider mb-1">Event Name</label>
                        <input
                          type="text"
                          value={gSummary}
                          onChange={(e) => setGSummary(e.target.value)}
                          placeholder="e.g. Pediatrician appointment / Groceries sweep"
                          className="w-full bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3 py-2 text-[#302113] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8C7A5B] uppercase tracking-wider mb-1">Description (Optional)</label>
                        <textarea
                          value={gDesc}
                          onChange={(e) => setGDesc(e.target.value)}
                          placeholder="Family notes, grocery items or links..."
                          rows={2}
                          className="w-full bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3 py-2 text-[#302113] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#8C7A5B] uppercase tracking-wider mb-1">Date</label>
                          <input
                            type="date"
                            value={gDate}
                            onChange={(e) => setGDate(e.target.value)}
                            className="w-full bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-2 py-1.5 text-[#302113] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#8C7A5B] uppercase tracking-wider mb-1">Start Time</label>
                          <input
                            type="time"
                            value={gStart}
                            onChange={(e) => setGStart(e.target.value)}
                            className="w-full bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-2 py-1.5 text-[#302113] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#8C7A5B] uppercase tracking-wider mb-1">End Time</label>
                          <input
                            type="time"
                            value={gEnd}
                            onChange={(e) => setGEnd(e.target.value)}
                            className="w-full bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-2 py-1.5 text-[#302113] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowGForm(false)}
                        className="px-3.5 py-2 text-[#8C7A5B] hover:bg-[#FCFAF7] font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={gActionLoading}
                        className="px-4 py-2 bg-[#302113] hover:bg-[#1C130B] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {gActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
                        Confirm Sync
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {loadingCalendar ? (
                <div className="space-y-3 py-10 text-center text-[#8C7A5B]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-700" />
                  <p className="text-xs">Fetching Google Calendar events...</p>
                </div>
              ) : calendarError ? (
                <div className="text-center py-5 bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-xs text-rose-800 space-y-1.5">
                  <p className="font-bold">Sync Interrupted</p>
                  <p className="leading-relaxed">{calendarError}</p>
                </div>
              ) : gEvents.length === 0 ? (
                <p className="text-center py-8 text-xs text-[#8C7A5B] italic bg-[#FCFAF7] rounded-2xl border border-dashed border-[#EADFC9]/60">
                  No upcoming meetings or events found in your primary calendar today.
                </p>
              ) : (
                <div id="gcal-events-timeline" className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {gEvents.map((event) => {
                    const startDateAndHour = event.start.dateTime 
                      ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : 'All Day';
                    return (
                      <div
                        key={event.id}
                        className="p-3 bg-[#FAF8F5] border border-[#ECE5DB] hover:border-amber-100 rounded-xl flex flex-col gap-0.5 hover:bg-amber-50/20 transition-all text-xs"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-semibold text-[#4A3E25] line-clamp-1">{event.summary}</span>
                          <span className="font-mono text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100 flex-shrink-0">
                            {startDateAndHour}
                          </span>
                        </div>
                        {event.description && (
                          <span className="text-[#8C7A5B] line-clamp-2 mt-1">{event.description}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
