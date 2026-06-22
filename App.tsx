import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout as firebaseLogout } from './firebase';
import { MomProfile } from './types';
import { PROFILE_DETAILS } from './data';
import TipSection from './TipSection';
import CalendarTab from './CalendarTab';
import ChoresTab from './ChoresTab';
import BudgetTab from './BudgetTab';
import { 
  Sparkles, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  Home, 
  Briefcase, 
  Signal, 
  LogOut, 
  User as UserIcon, 
  RefreshCw, 
  ShieldCheck,
  Coffee,
  Heart
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // App core state
  const [activeProfile, setActiveProfile] = useState<MomProfile>('housewife');
  const [activeTab, setActiveTab] = useState<'calendar' | 'chores' | 'budget'>('calendar');
  const [uncompletedChores, setUncompletedChores] = useState<number>(3);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, accessToken) => {
        setUser(authUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Google authorization failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to log out?');
    if (!confirmLogout) return;

    try {
      await firebaseLogout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const pDetails = PROFILE_DETAILS[activeProfile];

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#2A1F15] antialiased selection:bg-amber-100 selection:text-amber-950 pb-16 relative">
      {/* Background ambient noise blobs & subtle lines to establish a luxurious editorial vibe */}
      <div className="fixed inset-0 pointer-events-none opacity-30 overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-amber-100 rounded-full filter blur-3xl animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-rose-100/50 rounded-full filter blur-3xl animate-pulse duration-[12000ms]" />
        <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-blue-50 rounded-full filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-4">
        
        {/* TOP STATUS BAR: Styled as a pristine floating modern console with soft glass-like backing */}
        <header id="app-nav-header" className="pt-4 pb-4 px-6 bg-white/70 backdrop-blur-md border border-[#E6DCC5]/70 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_-4px_rgba(139,94,60,0.06)]">
          
          {/* Logo brand design */}
          <div className="flex items-center gap-4">
            <span className="p-3 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-2xl flex items-center justify-center shadow-xs transition-transform hover:rotate-3">
              <Coffee className="w-6 h-6 stroke-[2]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 id="app-logo" className="font-serif text-2xl font-bold tracking-tight text-[#302113]">
                  HustleFree Mom
                </h1>
                <span className="text-[10px] bg-[#302113] text-amber-100 px-2.5 py-0.5 rounded-full font-serif font-medium tracking-wide">
                  Organizer
                </span>
              </div>
              <p className="text-xs font-semibold text-[#8C7A5B] tracking-wide uppercase mt-0.5">
                Establish Calming Routines • House vs. Work Focus
              </p>
            </div>
          </div>

          {/* User Sign In and status */}
          <div id="auth-status-container" className="flex items-center gap-3">
            {needsAuth ? (
              <button 
                id="gsi-main-btn" 
                onClick={handleLogin} 
                disabled={isLoggingIn}
                className="gsi-material-button scroll-smooth shadow-[0_2px_10px_rgba(0,0,0,0.04)] active:shadow-none hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-[#CEBFA1]/60 rounded-full transition-all"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  {isLoggingIn ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-700 mr-2" />
                  ) : (
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                  )}
                  <span className="gsi-material-button-contents font-semibold">
                    {isLoggingIn ? 'Authorizing...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-white border border-[#E6DCC5] rounded-full pl-3.5 pr-2 py-1.5 text-xs shadow-xs">
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-[#302113]">
                    {user?.displayName || 'Mom'}
                  </span>
                  <span className="text-[9px] text-[#8C7A5B] font-mono leading-none">Logged In</span>
                </div>
                
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="User headshot" 
                    className="w-7.5 h-7.5 rounded-full object-cover border-2 border-amber-600/30 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7.5 h-7.5 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 border border-[#E6DCC5]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}

                <button 
                  id="sign-out-btn"
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                  title="Sign out of account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ROLE FOCUS SWAPPER PANEL: Editorial layout, elegant interactive cards */}
        <div id="profile-swapper-deck" className="bg-white border border-[#EADFC9]/70 p-6 rounded-3xl shadow-[0_12px_30px_rgba(139,94,60,0.04)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCFAF2] pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3D2C1B] flex items-center gap-2">
                Select Your Role Focus
              </h3>
              <p className="text-xs text-[#8C7A5B] mt-0.5">Your time planner blocks, chores & finance sheets adapt to support active transitions.</p>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full text-center sm:self-auto self-start">
              ✨ 3 Dynamic Presets
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Housewife Mode Card */}
            <motion.button
              id="profile-toggle-housewife"
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setActiveProfile('housewife');
              }}
              className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                activeProfile === 'housewife'
                  ? 'bg-gradient-to-br from-rose-50/70 to-orange-50/40 border-rose-600/80 shadow-[0_8px_20px_-4px_rgba(225,29,72,0.12)] ring-4 ring-rose-50'
                  : 'bg-[#FCFAF7]/50 border-[#EADFC9]/30 hover:border-[#EADFC9]/70 hover:bg-white'
              }`}
            >
              {activeProfile === 'housewife' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100/30 rounded-full blur-xl -mr-6 -mt-6" />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-xl transition-colors ${
                    activeProfile === 'housewife' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <Home className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-sm text-[#3D2C1B]">Housewife</span>
                </div>
                {activeProfile === 'housewife' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-[#7C6A54] mt-3 leading-relaxed">
                Coordinate delicate family schedules, meal-prepping trackers, micro-cleaning targets, and custom grocery budget sheets.
              </p>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-[9px] font-mono tracking-wider font-semibold uppercase bg-rose-100/60 border border-rose-200/50 text-rose-800 px-2 py-0.5 rounded-md">Family Care</span>
                <span className="text-[9px] font-mono tracking-wider font-semibold uppercase bg-amber-100/60 border border-amber-200/50 text-amber-800 px-2 py-0.5 rounded-md">Grocery Tracker</span>
              </div>
            </motion.button>

            {/* Working Mom Mode Card */}
            <motion.button
              id="profile-toggle-working"
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setActiveProfile('working');
              }}
              className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                activeProfile === 'working'
                  ? 'bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border-blue-600/80 shadow-[0_8px_20px_-4px_rgba(37,99,235,0.12)] ring-4 ring-blue-50'
                  : 'bg-[#FCFAF7]/50 border-[#EADFC9]/30 hover:border-[#EADFC9]/70 hover:bg-white'
              }`}
            >
              {activeProfile === 'working' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/30 rounded-full blur-xl -mr-6 -mt-6" />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-xl transition-colors ${
                    activeProfile === 'working' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-sm text-[#3D2C1B]">Working Mom</span>
                </div>
                {activeProfile === 'working' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-[#7C6A54] mt-3 leading-relaxed">
                Establish morning commuter buffers, direct transition reset workflows, structured 15-minute high-velocity chore blitzes, and work budgets.
              </p>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-[9px] font-mono tracking-wider font-semibold uppercase bg-blue-100/60 border border-blue-200/50 text-blue-800 px-2 py-0.5 rounded-md">Buffer Timers</span>
                <span className="text-[9px] font-mono tracking-wider font-semibold uppercase bg-indigo-100/60 border border-indigo-200/50 text-indigo-800 px-2 py-0.5 rounded-md">Office Warders</span>
              </div>
            </motion.button>

            {/* Remote Working Mom Mode Card */}
            <motion.button
              id="profile-toggle-remote"
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setActiveProfile('remote');
              }}
              className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                activeProfile === 'remote'
                  ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-600/80 shadow-[0_8px_20px_-4px_rgba(5,150,105,0.12)] ring-4 ring-emerald-50'
                  : 'bg-[#FCFAF7]/50 border-[#EADFC9]/30 hover:border-[#EADFC9]/70 hover:bg-white'
              }`}
            >
              {activeProfile === 'remote' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/30 rounded-full blur-xl -mr-6 -mt-6" />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-xl transition-colors ${
                    activeProfile === 'remote' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <Signal className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-sm text-[#3D2C1B]">Remote Mom</span>
                </div>
                {activeProfile === 'remote' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-[#7C6A54] mt-3 leading-relaxed">
                Protect dedicated workspace boundaries, weave passive cleaning routines into breaks, and log tax-deductible home office sheets.
              </p>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-[9px] font-mono tracking-wider font-semibold uppercase bg-emerald-100/60 border border-emerald-200/50 text-emerald-800 px-2 py-0.5 rounded-md">Office Bounds</span>
                <span className="text-[9px] font-mono tracking-wider font-semibold uppercase bg-teal-100/60 border border-teal-200/50 text-teal-800 px-2 py-0.5 rounded-md">Passive Breaks</span>
              </div>
            </motion.button>
          </div>

          <div className="bg-[#FAF8F4] border border-[#EADFC9]/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-inner">
            <p className="text-xs font-bold text-[#4A3E25]">
              Active Routine Target: <span className="font-serif italic text-amber-900 text-sm ml-1">{pDetails.title}</span>
            </p>
            <p className="text-[11px] text-[#8C7A5B] font-medium">
              ✨ {pDetails.subtitle}
            </p>
          </div>
        </div>

        {/* AI GUIDED MINDFUL RESET WIDGET */}
        <TipSection profile={activeProfile} uncompletedChoresCount={uncompletedChores} />

        {/* INTERACTIVE NAVIGATION TAB DECK: Luxury Pill Bar with sliding state appearance */}
        <div id="tab-navigation-bar" className="flex flex-wrap md:flex-nowrap border border-[#EADFC9]/80 bg-white p-1.5 rounded-2xl gap-2 shadow-[0_6px_20px_-4px_rgba(139,94,60,0.04)]">
          {/* Calendar Tab Trigger */}
          <button
            id="tab-trigger-calendar"
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
              activeTab === 'calendar'
                ? 'bg-amber-50 text-amber-950 shadow-xs border border-amber-200/60 font-semibold ring-2 ring-amber-500/5'
                : 'text-[#7C6A54] hover:text-[#3D2C1B] hover:bg-amber-50/20'
            }`}
          >
            <Calendar className={`w-4 h-4 transition-transform ${activeTab === 'calendar' ? 'scale-110 text-amber-800' : 'text-[#8C7A5B]'}`} />
            Time Planner & Calendar
          </button>

          {/* Chores Tab Trigger */}
          <button
            id="tab-trigger-chores"
            onClick={() => setActiveTab('chores')}
            className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
              activeTab === 'chores'
                ? 'bg-amber-50 text-amber-950 shadow-xs border border-amber-200/60 font-semibold ring-2 ring-amber-500/5'
                : 'text-[#7C6A54] hover:text-[#3D2C1B] hover:bg-amber-50/20'
            }`}
          >
            <CheckSquare className={`w-4 h-4 transition-transform ${activeTab === 'chores' ? 'scale-110 text-amber-800' : 'text-[#8C7A5B]'}`} />
            Family Chore Organizer
          </button>

          {/* Budget Tab Trigger */}
          <button
            id="tab-trigger-budget"
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
              activeTab === 'budget'
                ? 'bg-amber-50 text-amber-950 shadow-xs border border-amber-200/60 font-semibold ring-2 ring-amber-500/5'
                : 'text-[#7C6A54] hover:text-[#3D2C1B] hover:bg-amber-50/20'
            }`}
          >
            <DollarSign className={`w-4 h-4 transition-transform ${activeTab === 'budget' ? 'scale-110 text-amber-800' : 'text-[#8C7A5B]'}`} />
            Budget Snap & Sheets
          </button>
        </div>

        {/* TAB WORKSPACE PORTALS */}
        <main className="bg-white border border-[#EADFC9]/70 p-6 md:p-8 rounded-3xl shadow-[0_15px_35px_rgba(139,94,60,0.03)] min-h-[440px]">
          {activeTab === 'calendar' && (
            <CalendarTab 
              profile={activeProfile} 
              userId={user ? user.uid : null} 
              accessToken={token} 
            />
          )}

          {activeTab === 'chores' && (
            <ChoresTab 
              profile={activeProfile} 
              userId={user ? user.uid : null} 
              onChoresChange={setUncompletedChores}
            />
          )}

          {activeTab === 'budget' && (
            <BudgetTab 
              profile={activeProfile} 
              userId={user ? user.uid : null} 
              accessToken={token} 
            />
          )}
        </main>

        {/* MINDFUL FOOTER BRANDING */}
        <footer className="text-center py-8 space-y-3 border-t border-[#EADFC9]/30">
          <p className="text-xs text-[#8C7A5B] font-semibold flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-100 animate-pulse" />
            <span>Simplify your day. Establish rhythm over rush.</span>
          </p>
          <div className="flex justify-center gap-6 text-[10px] text-[#A08F75] font-mono">
            <span>Google Drive API v3</span>
            <span>•</span>
            <span>Gemini interactions</span>
            <span>•</span>
            <span>Cloud Firestore</span>
          </div>
          <p className="text-[10px] text-[#B5A58C] font-mono">
            HustleFree Mom Organizer &copy; 2026. Real-time workspace automation & calming mental boundaries.
          </p>
        </footer>

      </div>
    </div>
  );
}
