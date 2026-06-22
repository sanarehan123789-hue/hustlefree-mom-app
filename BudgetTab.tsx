import React, { useState, useEffect } from 'react';
import { MomProfile, BudgetLog } from '../types';
import { PROFILE_DETAILS } from '../data';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { findBudgetSpreadsheet, createBudgetSpreadsheet, appendBudgetLogToSheets } from '../utils/googleApis';
import { DollarSign, Plus, Trash, FileSpreadsheet, FilePlus, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Wallet, ExternalLink, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BudgetTabProps {
  profile: MomProfile;
  userId: string | null;
  accessToken: string | null;
}

export default function BudgetTab({ profile, userId, accessToken }: BudgetTabProps) {
  const [logs, setLogs] = useState<BudgetLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingSync, setLoadingSync] = useState<boolean>(false);

  // Google Sheets states
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [isSyncingWithSheets, setIsSyncingWithSheets] = useState<boolean>(false);

  // Form states
  const [bType, setBType] = useState<'income' | 'expense'>('expense');
  const [bCategory, setBCategory] = useState<string>('');
  const [bAmount, setBAmount] = useState<string>('');
  const [bDesc, setBDesc] = useState<string>('');
  const [bDate, setBDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const pDetails = PROFILE_DETAILS[profile];

  // Set default category when profile changes
  useEffect(() => {
    if (pDetails.categories.length > 0) {
      setBCategory(pDetails.categories[0]);
    }
  }, [profile]);

  // Load budgets from Firestore or local storage falling back
  const loadBudgetLogs = async () => {
    if (!userId) {
      // Offline mock data fallback
      const mockItems: BudgetLog[] = [
        { id: 'offline-b1', userId: 'offline', type: 'income', amount: 4800, category: 'Salary', description: 'Monthly income snapshot', date: '2026-06-01', profile },
        { id: 'offline-b2', userId: 'offline', type: 'expense', amount: 350, category: pDetails.categories[0], description: 'Weekly groceries & staples', date: '2026-06-15', profile },
        { id: 'offline-b3', userId: 'offline', type: 'expense', amount: 120, category: pDetails.categories[1] || 'Household', description: 'Essential household items', date: '2026-06-18', profile },
      ];
      setLogs(mockItems);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'budgets'),
        where('userId', '==', userId),
        where('profile', '==', profile)
      );
      const querySnapshot = await getDocs(q);
      const items: BudgetLog[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: d.userId,
          type: d.type as 'income' | 'expense',
          amount: Number(d.amount),
          category: d.category,
          description: d.description || '',
          date: d.date,
          profile: d.profile as MomProfile,
        });
      });

      // If dry run and brand new user, seed with realistic snapshot
      if (items.length === 0) {
        const seeded: Omit<BudgetLog, 'id'>[] = [
          { userId, type: 'income', amount: 5000, category: 'Primary Income', description: 'Monthly base snapshot', date: '2026-06-01', profile },
          { userId, type: 'expense', amount: 450, category: pDetails.categories[0], description: 'Weekly family restock', date: '2026-06-10', profile },
        ];
        const saved: BudgetLog[] = [];
        for (const item of seeded) {
          const docRef = await addDoc(collection(db, 'budgets'), item);
          saved.push({ ...item, id: docRef.id } as BudgetLog);
        }
        setLogs(saved);
      } else {
        setLogs(items);
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgetLogs();
  }, [profile, userId]);

  // Load Google Sheets matching file
  const initializeSheetsSync = async () => {
    if (!accessToken) return;
    setLoadingSync(true);
    try {
      let spreadsheetId = await findBudgetSpreadsheet(accessToken);
      if (spreadsheetId) {
        setSheetId(spreadsheetId);
      }
    } catch (err) {
      console.error('Sheets check fail:', err);
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      initializeSheetsSync();
    } else {
      setSheetId(null);
    }
  }, [accessToken]);

  // Set up spreadsheet if none found
  const handleCreateGoogleSheet = async () => {
    if (!accessToken) return;
    setLoadingSync(true);
    try {
      const spreadsheetId = await createBudgetSpreadsheet(accessToken);
      setSheetId(spreadsheetId);
      alert('Pristine spreadsheet sheets-log created in your Google Drive! Columns auto-formatted.');
    } catch (err) {
      console.error(err);
      alert('Could not establish spreadsheet file in your Google Drive. Check permissions.');
    } finally {
      setLoadingSync(false);
    }
  };

  // Submit budget entry
  const handleAddBudgetEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(bAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const logData: Omit<BudgetLog, 'id'> = {
      userId: userId || 'offline',
      type: bType,
      amount: amountNum,
      category: bCategory,
      description: bDesc,
      date: bDate,
      profile,
    };

    // Confirm step for workspace mutations (Google Sheets append requires explicit dialog confirmation!)
    if (accessToken && sheetId) {
      const confirmed = window.confirm(`Append this budget entry to Google Sheets matching 'HustleFree Mom Organizer'?`);
      if (!confirmed) return;
    }

    setLoadingSync(true);
    try {
      let createdId = `offline-${Date.now()}`;
      
      // Save locally/Firestore
      if (userId) {
        const docRef = await addDoc(collection(db, 'budgets'), logData);
        createdId = docRef.id;
      }
      
      const completeLog = { ...logData, id: createdId } as BudgetLog;
      setLogs(prev => [completeLog, ...prev]);

      // If spreadsheet connected, append natively in real-time
      if (accessToken && sheetId) {
        await appendBudgetLogToSheets(accessToken, sheetId, completeLog);
      }

      setBAmount('');
      setBDesc('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert('Added entry in application database, but synced write to Google Sheets failed. Check your network.');
    } finally {
      setLoadingSync(false);
    }
  };

  // Delete budget entry
  const handleDeleteEntry = async (logId: string) => {
    const confirmDelete = window.confirm('Delete this budget log? Deleted logs cannot be recovered.');
    if (!confirmDelete) return;

    setLogs(prev => prev.filter(l => l.id !== logId));

    if (userId && !logId.startsWith('offline-')) {
      try {
        await deleteDoc(doc(db, 'budgets', logId));
      } catch (err) {
        console.error('Failed to delete budget doc:', err);
      }
    }
  };

  // Calculate stats
  const totalIncome = logs.filter(l => l.type === 'income').reduce((sum, current) => sum + current.amount, 0);
  const totalExpense = logs.filter(l => l.type === 'expense').reduce((sum, current) => sum + current.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsPct = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / totalIncome) * 100))) : 0;

  return (
    <div className="space-y-6">
      {/* Header and Sync Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#FCFAF2] pb-4">
        <div>
          <h2 id="budget-heading" className="font-serif text-2xl font-bold text-[#302113]">
            Automated Budget Snapshot
          </h2>
          <p className="text-[#8C7A5B] text-sm mt-0.5">
            Monitor incoming cash blocks against profile targets and sync row data natively to Google Sheets.
          </p>
        </div>

        <button
          id="add-entry-drawer-toggle"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-to-r from-[#4E3925] to-[#3D2C1B] hover:from-[#3D2C1B] hover:to-[#22180F] text-[#FAF7F2] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Budget Entry
        </button>
      </div>

      {/* Google Sheets syncing status card */}
      <div className="bg-gradient-to-r from-[#FCFAF6] to-white border border-[#EADFC9]/85 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-[0_2px_12px_rgba(139,94,60,0.01)]">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 flex-shrink-0 animate-pulse">
            <FileSpreadsheet className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-[#302113] flex flex-wrap items-center gap-2">
              Google Drive Cloud Sync
              <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${sheetId ? 'bg-emerald-50 border-emerald-200/50 text-emerald-800' : 'bg-amber-50 border-amber-200/50 text-amber-800'}`}>
                {sheetId ? 'Active Connect' : 'Offline Backup Ready'}
              </span>
            </h3>
            <p className="text-xs text-[#8C7A5B] max-w-xl mt-1 leading-relaxed">
              {sheetId 
                ? 'Your budget snapshots automatically stream row-by-row into a formatted Google Sheets spreadsheet in your Google Drive.' 
                : 'Connect with your Google Account at the top to automatically generate, write, and secure daily budget logs in real-time.'}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 w-full md:w-auto self-stretch md:self-center flex items-center justify-end">
          {!accessToken ? (
            <div className="text-xs text-[#8C7A5B] font-semibold flex items-center gap-1.5 bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-[#EADFC9]/50 w-full md:w-auto justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>Sign in at top to enable sheets</span>
            </div>
          ) : loadingSync ? (
            <div className="flex items-center gap-1.5 text-xs text-[#8C7A5B] font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
              Checking cloud drive...
            </div>
          ) : sheetId ? (
            <a
              id="open-sheets-link"
              href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all w-full md:w-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Live Google Sheet
            </a>
          ) : (
            <button
              id="create-sheets-api-btn"
              onClick={handleCreateGoogleSheet}
              className="px-4 py-2 border border-amber-700 hover:bg-amber-50/70 text-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all w-full md:w-auto"
            >
              <FilePlus className="w-4 h-4" />
              Create Sync Spreadsheet
            </button>
          )}
        </div>
      </div>

      {/* Add Entry Collapsible Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            id="budget-entry-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddBudgetEntry}
            className="bg-white border border-[#E6DCC5] rounded-2xl p-5 shadow-[0_4px_16px_rgba(139,94,60,0.03)] space-y-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-[#FAF6F0]">
              <Wallet className="w-4 h-4 text-amber-700" />
              <h3 className="font-serif font-bold text-sm text-[#302113]">Add Account Entry ({pDetails.title})</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#8C7A5B]">Flow Type</label>
                <select
                  value={bType}
                  onChange={(e) => setBType(e.target.value as 'income' | 'expense')}
                  className="w-full text-sm bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3 py-2 text-[#3D2C1B] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer font-semibold"
                >
                  <option value="expense">Expense (-)</option>
                  <option value="income">Income (+)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#8C7A5B]">Category</label>
                <select
                  value={bCategory}
                  onChange={(e) => setBCategory(e.target.value)}
                  className="w-full text-sm bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3 py-2 text-[#3D2C1B] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer font-semibold"
                >
                  {/* General Category */}
                  <option value="Primary Income">Salary / Base Income</option>
                  <option value="Other Influx">Other Influx</option>
                  {/* Selected mom-profile categories */}
                  {pDetails.categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {/* Other Default categories */}
                  <option value="Savings Deposit">Savings Buffer/Safety</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="space-y-1 col-span-1">
                <label className="block text-xs font-semibold text-[#8C7A5B]">Amount ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-sm text-[#8C7A5B] font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    value={bAmount}
                    onChange={(e) => setBAmount(e.target.value)}
                    placeholder="250.00"
                    className="w-full text-sm bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl pl-8 pr-3 py-2 text-[#3D2C1B] focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#8C7A5B]">Date</label>
                <input
                  type="date"
                  value={bDate}
                  onChange={(e) => setBDate(e.target.value)}
                  className="w-full text-sm bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3 py-2 text-[#3D2C1B] focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#8C7A5B]">Description (Optional)</label>
              <input
                type="text"
                value={bDesc}
                onChange={(e) => setBDesc(e.target.value)}
                placeholder="Where or what (e.g. Costco bulk restock / Shared Coworking rent...)"
                className="w-full text-sm bg-[#FCFAF7] border border-[#ECD9C6] rounded-xl px-3.5 py-2 text-[#3D2C1B] focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all placeholder-[#A08F75]"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-2 text-[#8C7A5B] hover:bg-[#FCFAF7] font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#302113] hover:bg-[#1C130B] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {sheetId && <FileSpreadsheet className="w-3.5 h-3.5 animate-bounce" />}
                Log Entry
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-[#EADFC9]/60 rounded-2xl p-5 shadow-[0_2px_12px_rgba(139,94,60,0.02)] flex items-center gap-4 hover:border-amber-200 transition-colors">
          <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl flex-shrink-0">
            <TrendingUp className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C7A5B] block">Total Inflow</span>
            <span className="font-mono font-bold text-xl text-[#302113]">${totalIncome.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-[#EADFC9]/60 rounded-2xl p-5 shadow-[0_2px_12px_rgba(139,94,60,0.02)] flex items-center gap-4 hover:border-amber-200 transition-colors">
          <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl flex-shrink-0">
            <TrendingDown className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C7A5B] block">Total Outflow</span>
            <span className="font-mono font-bold text-xl text-[#302113]">${totalExpense.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-[#EADFC9]/60 rounded-2xl p-5 shadow-[0_2px_12px_rgba(139,94,60,0.02)] flex items-center gap-4 hover:border-amber-200 transition-colors">
          <div className="p-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl flex-shrink-0">
            <Wallet className="w-5.5 h-5.5 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C7A5B] block">Net Leftover</span>
            <span className="font-mono font-bold text-xl text-[#302113] block truncate">${netSavings.toLocaleString()}</span>

            {/* Custom mini horizontal progress bar */}
            <div className="w-full bg-[#EADFC9]/30 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${savingsPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Budget list */}
      <div className="bg-white border border-[#EADFC9]/65 rounded-2xl overflow-hidden p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#FAF6F0] pb-3">
          <h3 className="font-serif font-bold text-[#302113] text-base">
            Recent Log Dashboard
          </h3>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#FCFAF7] border border-[#EADFC9]/60 text-[#8C7A5B]">
            {logs.length} logged
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#8C7A5B]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-700" />
            <p className="mt-2 text-xs">Populating logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-12 text-xs text-[#8C7A5B] italic bg-[#FCFAF7] rounded-xl border border-dashed border-[#EADFC9]/60">
            No entries cataloged under this profile yet. Log your first expense or inflow block!
          </p>
        ) : (
          <div id="budget-snap-rows" className="divide-y divide-[#FAF6F0]">
            {logs.map((log) => (
              <div
                key={log.id}
                id={`budget-row-${log.id}`}
                className="py-3 flex items-center justify-between group transition-colors hover:bg-amber-50/10 rounded-lg px-2"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border font-semibold flex-shrink-0 flex items-center justify-center ${
                    log.type === 'income' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                      : 'bg-rose-50 text-rose-800 border-rose-100'
                  }`}>
                    {log.type === 'income' ? '+' : '-'}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[#302113]">{log.description || log.category}</h4>
                    <div className="flex items-center gap-2 text-[#8C7A5B] mt-0.5 text-[11px] font-mono">
                      <span>{log.date}</span>
                      <span className="w-1 h-1 bg-[#8C7A5B] rounded-full" />
                      <span className="font-sans font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50/50 border border-amber-100/50 text-[#8C7A5B] scale-90">{log.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm font-bold ${log.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {log.type === 'income' ? '+' : '-'}${log.amount.toFixed(2)}
                  </span>

                  <button
                    onClick={() => handleDeleteEntry(log.id)}
                    className="p-1 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                    title="Delete log entry"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
