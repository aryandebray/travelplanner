import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTripMembers } from '../contexts/TripMembersContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, X, TrendingUp, CreditCard } from 'lucide-react';
// import ExpenseChart3D from '../components/3d/ExpenseChart3D';
import ExpenseChart2D from '../components/ExpenseChart2D';

type Expense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string | null;
  paid_by_guest_id: string | null;
  split_type: 'equal' | 'custom';
  category: string;
  created_at: string;
};

const CATEGORIES = ['food', 'transport', 'stay', 'activity', 'other'];

export default function ExpensesPage() {
  const { tripId } = useParams();
  const { members, getMemberName } = useTripMembers();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paidBy, setPaidBy] = useState('');
  const [category, setCategory] = useState('other');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tripId]);

  const fetchData = async () => {
    if (!tripId) return;
    try {
      const { data } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
      if (data) setExpenses(data as Expense[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !title || !amount) return;
    setAdding(true);
    try {
      const isGuestPayer = paidBy.startsWith('guest:');
      const insertData: any = {
        trip_id: tripId, title, amount: parseFloat(amount), currency,
        paid_by: isGuestPayer ? null : paidBy,
        paid_by_guest_id: isGuestPayer ? paidBy.replace('guest:', '') : null,
        split_type: 'equal', category
      };
      const { data, error } = await supabase.from('expenses').insert(insertData).select().single();
      if (error) throw error;
      setExpenses([data as Expense, ...expenses]);
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
    } catch (err) {
      console.error(err);
      alert('Failed to add expense');
    } finally {
      setAdding(false);
    }
  };

  const getPayerId = (exp: Expense): string => {
    if (exp.paid_by_guest_id) return `guest:${exp.paid_by_guest_id}`;
    return exp.paid_by || '';
  };

  const totalCost = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const chartData = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat.toUpperCase(),
      value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
    })).filter(d => d.value > 0);
  }, [expenses]);

  const balances = useMemo(() => {
    const b: Record<string, number> = {};
    members.forEach(m => { b[m.user_id] = 0; });
    expenses.forEach(exp => {
      const payerId = getPayerId(exp);
      const share = exp.amount / (members.length || 1);
      members.forEach(m => {
        if (m.user_id === payerId) b[m.user_id] += (exp.amount - share);
        else b[m.user_id] -= share;
      });
    });
    return b;
  }, [expenses, members]);

  if (loading) return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="w-8 h-8 animate-spin text-atlas-amber" /></div>;

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
           <div className="dot-matrix text-atlas-cyan mb-2">FINANCIAL_AUDIT_ACTIVE</div>
           <h1 className="text-4xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Expense_Log</h1>
           <div className="flex items-center gap-3 mt-2">
              <div className="text-[10px] font-bold text-atlas-amber uppercase tracking-widest font-mono">
                TOTAL_BURN: ${totalCost.toFixed(2)}
              </div>
              <div className="w-1 h-1 bg-atlas-border rounded-full" />
              <div className="text-[10px] font-bold text-atlas-muted uppercase tracking-widest font-mono">
                {expenses.length} TRANSACTIONS
              </div>
           </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-amber">
          <Plus className="w-4 h-4" /> LOG_TRANSACTION
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: 3D Visualization */}
        <div className="xl:col-span-2 space-y-8">
           <div className="boarding-pass h-[400px] relative overflow-hidden bg-atlas-bg flex items-center justify-center">
              <div className="absolute inset-0 z-0">
                 <ExpenseChart2D data={chartData.length > 0 ? chartData : [{ name: 'NO_DATA', value: 1 }]} />
              </div>
              <div className="absolute top-6 left-6 pointer-events-none">
                 <div className="dot-matrix text-atlas-cyan text-[10px] mb-1">REALTIME_VOLUMETRIC_DATA</div>
                 <div className="text-white text-xs font-bold uppercase font-mono tracking-widest">CATEGORY_DISTRIBUTION</div>
              </div>
           </div>

           {/* Expenses List */}
           <div className="space-y-4">
              <div className="dot-matrix text-atlas-muted text-[10px] mb-2 uppercase">Recent_Ledger_Entries</div>
              {expenses.map(exp => (
                <motion.div 
                  key={exp.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="boarding-pass p-4 flex items-center justify-between group hover:border-atlas-amber transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-atlas-border rounded-xl flex items-center justify-center text-atlas-muted group-hover:text-atlas-amber transition-colors">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white uppercase font-mono tracking-wider">{exp.title}</h4>
                      <p className="text-[9px] text-atlas-muted uppercase font-mono">
                        By {getMemberName(getPayerId(exp))} · {exp.category.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white uppercase font-mono">${exp.amount.toFixed(2)}</div>
                    <div className="dot-matrix text-[7px] text-atlas-amber opacity-60">AUTH_SUCCESS</div>
                  </div>
                </motion.div>
              ))}
           </div>
        </div>

        {/* Right: Settle Up Panel */}
        <div className="space-y-8">
           <div className="boarding-pass p-6">
              <div className="flex items-center gap-3 mb-6">
                 <TrendingUp className="w-4 h-4 text-atlas-amber" />
                 <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Settlement_Audit</h3>
              </div>
              
              <div className="space-y-3">
                 {members.map(m => {
                   const net = balances[m.user_id] || 0;
                   return (
                     <div key={m.user_id} className="p-4 bg-atlas-bg2 border border-atlas-border flex items-center justify-between">
                        <div>
                           <div className="text-[10px] font-black text-white uppercase font-mono">{getMemberName(m.user_id)}</div>
                           <div className="dot-matrix text-[7px] opacity-40">{m.is_guest ? 'GUEST_PROFILE' : 'USER_PROFILE'}</div>
                        </div>
                        <div className={`text-xs font-black font-mono ${net > 0 ? 'text-atlas-cyan' : net < 0 ? 'text-atlas-red' : 'text-atlas-muted'}`}>
                           {net > 0 ? '+' : ''}{net.toFixed(2)}
                        </div>
                     </div>
                   );
                 })}
              </div>
              
              <div className="mt-8 pt-6 border-t border-atlas-border">
                 <button className="w-full py-3 text-[10px] font-bold text-atlas-cyan border border-atlas-cyan/30 hover:bg-atlas-cyan/10 transition-colors uppercase tracking-[0.2em]">
                   INITIALIZE_SETTLEMENT
                 </button>
              </div>
           </div>
           
           <div className="boarding-pass p-6 bg-atlas-amber/5">
              <div className="dot-matrix text-atlas-amber text-[8px] mb-2 font-bold uppercase">System_Advisory</div>
              <p className="text-[9px] text-atlas-muted uppercase leading-relaxed font-mono">
                All transactions are logged using 256-bit spatial encryption. Settle-up balances are calculated based on equal split protocols.
              </p>
           </div>
        </div>
      </div>

      {/* Log Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(16,19,27,0.8)', backdropFilter: 'blur(8px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="boarding-pass w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col"
            >
               <div className="flex justify-between items-center p-6 border-b border-atlas-border">
                 <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Log_Transaction</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-atlas-muted hover:text-white">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               
               <form onSubmit={handleAddExpense} className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                 <div>
                   <label className="dot-matrix block mb-2">IDENTIFIER</label>
                   <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="PROJECT_UBER" className="input-retro w-full uppercase" />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dot-matrix block mb-2">AMOUNT</label>
                      <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="input-retro w-full" />
                    </div>
                    <div>
                      <label className="dot-matrix block mb-2">CURRENCY</label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-retro w-full uppercase">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="dot-matrix block mb-2">SOURCE_PAYER</label>
                      <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="input-retro w-full uppercase">
                        {members.map(m => (
                          <option key={m.user_id} value={m.user_id}>{getMemberName(m.user_id)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="dot-matrix block mb-2">SECTOR</label>
                      <select value={category} onChange={e => setCategory(e.target.value)} className="input-retro w-full uppercase">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-[10px] font-bold text-atlas-muted uppercase px-4">ABORT</button>
                    <button type="submit" disabled={adding} className="btn-amber px-8">EXECUTE_LOG</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
