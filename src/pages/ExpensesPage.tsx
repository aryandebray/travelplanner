import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTripMembers } from '../contexts/TripMembersContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, DollarSign, PieChart as PieChartIcon, X, Users, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import ScoutPanel from '../components/ScoutPanel';

type Expense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_type: 'equal' | 'custom';
  category: string;
  created_at: string;
};

type Member = {
  user_id: string;
  role: string;
};

const CATEGORIES = ['food', 'transport', 'stay', 'activity', 'other'];
const CATEGORY_COLORS: Record<string, string> = {
  food: '#f26a4f',
  transport: '#06b6d4',
  stay: '#8b5cf6',
  activity: '#10b981',
  other: '#64748b'
};

const MEMBER_COLORS = ['#06b6d4', '#8b5cf6', '#f26a4f', '#10b981', '#f59e0b', '#ec4899'];

type ChartView = 'category-pie' | 'per-person-bar' | 'custom';
type CustomChartConfig = {
  chartType: 'pie' | 'bar' | 'line' | 'area';
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
};

export default function ExpensesPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expMembers, setExpMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [category, setCategory] = useState('other');
  const [categorizing, setCategorizing] = useState(false);
  const [adding, setAdding] = useState(false);

  const [rates, setRates] = useState<Record<string, number>>({ USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150 });
  const [chartView, setChartView] = useState<ChartView>('category-pie');
  const [customChart, setCustomChart] = useState<CustomChartConfig | null>(null);

  useEffect(() => {
    fetchData();
    fetchExchangeRates();
  }, [tripId]);

  const fetchExchangeRates = async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      if (data && data.rates) setRates(data.rates);
    } catch (err) {
      console.error('Failed to fetch rates, using fallbacks', err);
    }
  };

  const fetchData = async () => {
    if (!tripId) return;
    try {
      const [expRes, memRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('trip_members').select('user_id, role').eq('trip_id', tripId)
      ]);
      if (expRes.data) setExpenses(expRes.data as Expense[]);
      if (memRes.data) {
        setExpMembers(memRes.data);
        if (user && !paidBy) setPaidBy(user.id);
        else if (memRes.data.length > 0 && !paidBy) setPaidBy(memRes.data[0].user_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleBlur = async () => {
    if (!title || title.length < 3) return;
    setCategorizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-categorize-expense', { body: { title } });
      if (!error && data?.category && CATEGORIES.includes(data.category)) setCategory(data.category);
    } catch (err) { console.error(err); }
    finally { setCategorizing(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !title || !amount) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.from('expenses').insert({
        trip_id: tripId, title, amount: parseFloat(amount), currency,
        paid_by: paidBy, split_type: splitType, category
      }).select().single();
      if (error) throw error;
      setExpenses([data as Expense, ...expenses]);
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
      setCategory('other');
    } catch (err) {
      console.error(err);
      alert('Failed to add expense');
    } finally {
      setAdding(false);
    }
  };

  const { getMemberName } = useTripMembers();
  const convertToUSD = (amount: number, curr: string) => curr === 'USD' ? amount : amount / (rates[curr] || 1);
  const displayInUSD = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // Balances
  const balances: Record<string, { paid: number; owes: number; net: number }> = {};
  expMembers.forEach(m => { balances[m.user_id] = { paid: 0, owes: 0, net: 0 }; });
  expenses.forEach(exp => {
    const usdAmount = convertToUSD(exp.amount, exp.currency);
    if (balances[exp.paid_by]) balances[exp.paid_by].paid += usdAmount;
    const splitAmount = usdAmount / expMembers.length;
    expMembers.forEach(m => { balances[m.user_id].owes += splitAmount; });
  });
  expMembers.forEach(m => { balances[m.user_id].net = balances[m.user_id].paid - balances[m.user_id].owes; });

  // Pie chart data (by category)
  const pieData = CATEGORIES.map(cat => {
    const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + convertToUSD(e.amount, e.currency), 0);
    return { name: cat, value: total };
  }).filter(d => d.value > 0);

  // Per-person spending data
  const perPersonData = expMembers.map((m: Member, i: number) => ({
    name: getMemberName(m.user_id),
    value: balances[m.user_id]?.paid || 0,
    color: MEMBER_COLORS[i % MEMBER_COLORS.length]
  }));

  const totalTripCostUSD = expenses.reduce((sum, e) => sum + convertToUSD(e.amount, e.currency), 0);

  // Scout data context
  const scoutPageData = {
    expenses: expenses.map(e => ({ title: e.title, amount: e.amount, currency: e.currency, category: e.category, paid_by: getMemberName(e.paid_by) })),
    totalCostUSD: totalTripCostUSD,
    members: expMembers.map((m: Member) => getMemberName(m.user_id)),
    balances: expMembers.map((m: Member) => ({ name: getMemberName(m.user_id), net: balances[m.user_id]?.net || 0 })),
  };

  const handleScoutChart = (data: any) => {
    if (data && data.chartType && data.data) {
      setCustomChart(data as CustomChartConfig);
      setChartView('custom');
    }
  };

  const renderChart = () => {
    if (chartView === 'category-pie') {
      return (
        <div className="h-52 w-full relative">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }}
                  formatter={(val: any) => displayInUSD(val as number)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">No data</div>
          )}
          {pieData.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Total</span>
              <span className="text-lg font-bold text-white">{displayInUSD(totalTripCostUSD)}</span>
            </div>
          )}
        </div>
      );
    }

    if (chartView === 'per-person-bar') {
      return (
        <div className="h-52 w-full">
          {perPersonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perPersonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <RechartsTooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }}
                  formatter={(val: any) => displayInUSD(val as number)}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {perPersonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data</div>
          )}
        </div>
      );
    }

    if (chartView === 'custom' && customChart) {
      const colors = customChart.colors || ['#06b6d4', '#8b5cf6', '#10b981', '#f26a4f', '#f59e0b'];
      return (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {customChart.chartType === 'pie' ? (
              <PieChart>
                <Pie data={customChart.data} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {customChart.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }} />
              </PieChart>
            ) : customChart.chartType === 'line' ? (
              <LineChart data={customChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }} />
                <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ fill: colors[0], r: 4 }} />
              </LineChart>
            ) : customChart.chartType === 'area' ? (
              <AreaChart data={customChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.2} />
              </AreaChart>
            ) : (
              <BarChart data={customChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {customChart.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent-cyan" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Expenses</h1>
          <p className="text-slate-400 text-sm">Track spending and settle up fairly.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-gradient flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Expenses List */}
        <div className="flex-1 min-w-0 space-y-4">
          {expenses.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <div className="w-16 h-16 rounded-full bg-accent-cyan/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-accent-cyan" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No expenses yet</h3>
              <p className="text-slate-400 mb-6 text-sm">Start logging your trip expenses.</p>
            </div>
          ) : (
            <motion.div className="space-y-3" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }}>
              {expenses.map(exp => (
                <motion.div
                  key={exp.id}
                  variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
                  className="glass-card glow-border p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${CATEGORY_COLORS[exp.category]}15`, color: CATEGORY_COLORS[exp.category] }}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{exp.title}</h4>
                      <p className="text-xs text-slate-400">
                        Paid by <span className="font-medium text-slate-300">{getMemberName(exp.paid_by)}</span> • {new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{exp.amount} <span className="text-xs font-medium text-slate-500">{exp.currency}</span></div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: `${CATEGORY_COLORS[exp.category]}15`, color: CATEGORY_COLORS[exp.category] }}>
                      {exp.category}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Middle: Charts & Balances */}
        <div className="w-full lg:w-80 space-y-5 shrink-0">
          {/* Chart Card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-accent-cyan" />
                {chartView === 'category-pie' ? 'By Category' : chartView === 'per-person-bar' ? 'Per Person' : customChart?.title || 'Custom Chart'}
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setChartView('category-pie')} className={`p-1.5 rounded-lg transition-all ${chartView === 'category-pie' ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} title="Category">
                  <PieChartIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setChartView('per-person-bar')} className={`p-1.5 rounded-lg transition-all ${chartView === 'per-person-bar' ? 'bg-accent-violet/10 text-accent-violet' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} title="Per Person">
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                {customChart && (
                  <button onClick={() => setChartView('custom')} className={`p-1.5 rounded-lg transition-all ${chartView === 'custom' ? 'bg-accent-teal/10 text-accent-teal' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} title="Custom">
                    <Users className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            {renderChart()}
            {chartView === 'category-pie' && pieData.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/5">
                    <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: CATEGORY_COLORS[d.name] }} />
                    <span className="text-slate-400 capitalize">{d.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balances */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-white mb-4">Running Balances</h3>
            <div className="space-y-2">
              {expMembers.map((m: Member) => {
                const net = balances[m.user_id]?.net || 0;
                return (
                  <div key={m.user_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="font-medium text-slate-300 text-sm">{getMemberName(m.user_id)}</span>
                    <span className={`font-bold text-sm ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {net > 0 ? '+' : ''}{displayInUSD(net)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Scout Panel */}
        <div className="w-full lg:w-[320px] shrink-0 print:hidden">
          <div className="sticky top-6">
            <ScoutPanel
              context="Expenses"
              pageData={scoutPageData}
              onStructuredResponse={handleScoutChart}
              greeting="Hey! I'm Scout. Ask me about your spending, who owes what, or say 'show me a bar chart of expenses by category' to generate custom charts!"
              height="560px"
            />
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="glass-card w-full max-w-md overflow-hidden border border-white/10">
               <div className="flex justify-between items-center p-5 border-b border-white/5">
                 <h2 className="text-lg font-bold text-white">Add an Expense</h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X className="w-5 h-5" /></button>
               </div>
               
               <form onSubmit={handleAddExpense} className="p-5 space-y-4">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider flex justify-between">
                     Title {categorizing && <span className="text-accent-cyan flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/>Categorizing...</span>}
                   </label>
                   <input required type="text" value={title} onChange={e => setTitle(e.target.value)} onBlur={handleTitleBlur} placeholder="Uber to airport" className="glass-input text-sm" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Amount</label>
                     <input required type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="glass-input text-sm" />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Currency</label>
                     <select value={currency} onChange={e => setCurrency(e.target.value)} className="glass-input text-sm appearance-none cursor-pointer">
                       <option value="USD">USD ($)</option>
                       <option value="EUR">EUR (€)</option>
                       <option value="GBP">GBP (£)</option>
                       <option value="JPY">JPY (¥)</option>
                     </select>
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Paid By</label>
                   <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="glass-input text-sm appearance-none cursor-pointer">
                     {expMembers.map((m: Member) => (
                       <option key={m.user_id} value={m.user_id}>{getMemberName(m.user_id)}</option>
                     ))}
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
                     <select value={category} onChange={e => setCategory(e.target.value)} className="glass-input text-sm appearance-none cursor-pointer capitalize">
                       {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Split Type</label>
                     <select value={splitType} onChange={e => setSplitType(e.target.value as any)} className="glass-input text-sm appearance-none cursor-pointer">
                       <option value="equal">Equally</option>
                       <option value="custom">Custom</option>
                     </select>
                   </div>
                 </div>

                 <div className="pt-2">
                   <button type="submit" disabled={adding} className="btn-gradient w-full py-3 flex justify-center items-center text-sm">
                     {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Expense"}
                   </button>
                 </div>
               </form>
            </motion.div>
          </div>
         )}
      </AnimatePresence>
    </div>
  );
}
