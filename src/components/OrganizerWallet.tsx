import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, Smartphone, DollarSign, Plus, CheckCircle, AlertCircle, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  createdAt: string;
}

export default function OrganizerWallet({ user }: { user: UserProfile | null }) {
  const [balance, setBalance] = useState({ 
    balance: 0, 
    pendingBalance: 0,
    pendingWithdrawals: 0, 
    riskLevel: 'low' as 'low' | 'medium' | 'high',
    withdrawalsDisabled: false 
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [balanceRes, transactionsRes] = await Promise.all([
          fetch(`/api/organizer/wallet/${user.uid}`),
          fetch(`/api/organizer/transactions/${user.uid}`)
        ]);
        const balanceData = await balanceRes.json();
        const transactionsData = await transactionsRes.json();
        setBalance(balanceData);
        setTransactions(transactionsData);
      } catch (err) {
        console.error('Failed to fetch wallet data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', provider: 'orange_money', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: user.uid,
          amount: parseFloat(withdrawForm.amount),
          provider: withdrawForm.provider,
          phone: withdrawForm.phone
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(data.message);
        setTimeout(() => {
          setShowWithdrawModal(false);
          setSuccessMessage(null);
          setWithdrawForm({ amount: '', provider: 'orange_money', phone: '' });
        }, 3000);
      } else {
        toast.error(data.error || 'Withdrawal failed');
      }
    } catch (err) {
      console.error('Withdrawal failed', err);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-xs mb-4">
              <Wallet size={14} /> Organizer Escrow Wallet
            </div>
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">Your Balance</h1>
            <p className="text-white/40 mt-4 max-w-xl">
              Track your ticket sales and request payouts to your mobile money account.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Risk Level:</span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                  balance.riskLevel === 'low' ? "bg-green-500/10 text-green-500" :
                  balance.riskLevel === 'medium' ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-red-500/10 text-red-500"
                )}>
                  {balance.riskLevel}
                </span>
              </div>
              {balance.withdrawalsDisabled && (
                <div className="flex items-center gap-1 text-red-500">
                  <Lock size={10} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Locked</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowWithdrawModal(true)}
              disabled={balance.withdrawalsDisabled}
              className="bg-orange-600 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-orange-700 transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpRight size={20} /> Request Payout
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-gradient-to-br from-orange-600 to-orange-900 rounded-[3rem] p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="relative z-10">
              <div className="text-white/60 font-black uppercase tracking-widest text-xs mb-2">Available for Payout</div>
              <div className="text-8xl font-black tracking-tighter mb-8">${balance.balance.toLocaleString()}</div>
              
              <div className="flex gap-8 flex-wrap">
                <div>
                  <div className="text-white/60 font-black uppercase tracking-widest text-[10px] mb-1">Pending Escrow (Held Until Event Ends)</div>
                  <div className="text-2xl font-black flex items-center gap-2">
                    <Clock size={18} className="text-white/40" />
                    ${(balance.pendingBalance ?? 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-white/60 font-black uppercase tracking-widest text-[10px] mb-1">Total Sales Revenue</div>
                  <div className="text-2xl font-black flex items-center gap-2">
                    <CheckCircle size={18} className="text-white/40" />
                    ${(balance.balance + (balance.pendingBalance ?? 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 flex flex-col justify-center">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Payout Settings</h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Default Provider</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500">
                    <Smartphone size={16} />
                  </div>
                  <span className="font-bold">Orange Money Liberia</span>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Payout Number</div>
                <div className="font-mono text-lg">+231 77 000 0000</div>
              </div>
              <button className="w-full py-4 text-white/40 font-black uppercase tracking-widest text-xs hover:text-white transition-all">
                Edit Payout Methods
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Transaction Ledger</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">All</button>
              <button className="px-4 py-2 bg-white/5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white/40">Credits</button>
              <button className="px-4 py-2 bg-white/5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white/40">Debits</button>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-8 flex items-center gap-6 hover:bg-white/[0.01] transition-all">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  {tx.type === 'credit' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{tx.description}</div>
                  <div className="flex items-center gap-3 text-xs text-white/40 font-mono mt-1">
                    <span>{tx.id}</span>
                    <span>•</span>
                    <span>Ref: {tx.reference}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${tx.type === 'credit' ? 'text-green-500' : 'text-white'}`}>
                    {tx.type === 'credit' ? '+' : '-'}${tx.amount}
                  </div>
                  <div className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-12 shadow-2xl"
            >
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-8 right-8 text-white/20 hover:text-white transition-all"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-6">
                  <ArrowUpRight size={32} />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Request Payout</h2>
                <p className="text-white/40 text-sm">Withdraw your available balance to mobile money.</p>
              </div>

              {successMessage ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
                  <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-2">Request Received!</h3>
                  <p className="text-white/40 text-sm">{successMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleWithdraw} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Amount (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                      <input 
                        type="number" 
                        required
                        min="5"
                        max={balance.balance}
                        value={withdrawForm.amount}
                        onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-orange-500 text-2xl font-black"
                      />
                    </div>
                    <div className="mt-2 text-[10px] text-white/40 font-bold">Max available: ${balance.balance}</div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Payout Provider</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button"
                        onClick={() => setWithdrawForm({...withdrawForm, provider: 'orange_money'})}
                        className={`p-4 rounded-2xl border transition-all text-left ${withdrawForm.provider === 'orange_money' ? 'bg-orange-500/10 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        <div className="font-black text-xs uppercase tracking-widest mb-1">Orange Money</div>
                        <div className="text-[10px]">Liberia</div>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setWithdrawForm({...withdrawForm, provider: 'mtn_momo'})}
                        className={`p-4 rounded-2xl border transition-all text-left ${withdrawForm.provider === 'mtn_momo' ? 'bg-yellow-500/10 border-yellow-500 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        <div className="font-black text-xs uppercase tracking-widest mb-1">MTN MoMo</div>
                        <div className="text-[10px]">Lonestar Cell</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Mobile Number</label>
                    <input 
                      type="tel" 
                      required
                      value={withdrawForm.phone}
                      onChange={e => setWithdrawForm({...withdrawForm, phone: e.target.value})}
                      placeholder="+231 77 000 0000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>

                  <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 flex gap-3">
                    <AlertCircle className="text-orange-500 shrink-0" size={20} />
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      Standard processing time is 24-48 hours. Ensure your mobile money account is active and registered.
                    </p>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-600 text-white py-5 rounded-full font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
