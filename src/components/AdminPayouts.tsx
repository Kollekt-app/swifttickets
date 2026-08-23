import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Clock, Smartphone, DollarSign, Search, Filter, ArrowUpRight } from 'lucide-react';

interface Withdrawal {
  id: string;
  organizerId: string;
  organizerName: string;
  amount: number;
  provider: 'orange_money' | 'mtn_momo';
  phone: string;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

export default function AdminPayouts() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPayouts();
  }, []);

  const fetchPendingPayouts = async () => {
    try {
      const response = await fetch('/api/admin/payouts/pending');
      const data = await response.json();
      setWithdrawals(data);
    } catch (err) {
      console.error('Failed to fetch payouts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: string, status: 'paid' | 'failed') => {
    setProcessingId(id);
    try {
      const response = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, status })
      });
      if (response.ok) {
        setWithdrawals(prev => prev.filter(w => w.id !== id));
      }
    } catch (err) {
      console.error('Failed to process payout', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-xs mb-4">
              <Smartphone size={14} /> Admin Control Panel
            </div>
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">Payout Queue</h1>
            <p className="text-white/40 mt-4 max-w-xl">
              Review and settle organizer withdrawal requests. Manual Orange & MTN MoMo settlement required for V1.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Pending</div>
                <div className="text-2xl font-black">{withdrawals.length}</div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500">
                <DollarSign size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Volume</div>
                <div className="text-2xl font-black">${withdrawals.reduce((acc, curr) => acc + curr.amount, 0)}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" 
                  placeholder="Search organizer or ID..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 text-sm"
                />
              </div>
              <button className="bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-all">
                <Filter size={18} className="text-white/40" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <th className="px-8 py-4">Organizer</th>
                  <th className="px-8 py-4">Amount</th>
                  <th className="px-8 py-4">Provider</th>
                  <th className="px-8 py-4">Phone Number</th>
                  <th className="px-8 py-4">Requested</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest">
                      Loading pending requests...
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest">
                      No pending payouts found.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all group">
                      <td className="px-8 py-6">
                        <div className="font-bold text-lg">{w.organizerName}</div>
                        <div className="text-xs text-white/40 font-mono">{w.id}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-2xl font-black text-orange-500">${w.amount}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${w.provider === 'orange_money' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                          <span className="font-bold uppercase text-xs tracking-wider">
                            {w.provider.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-mono text-sm bg-white/5 px-3 py-1 rounded-lg inline-block">
                          {w.phone}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-white/40 text-sm">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleProcess(w.id, 'failed')}
                            disabled={processingId === w.id}
                            className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                            title="Mark as Failed"
                          >
                            <XCircle size={20} />
                          </button>
                          <button 
                            onClick={() => handleProcess(w.id, 'paid')}
                            disabled={processingId === w.id}
                            className="px-6 py-3 rounded-xl bg-green-600 text-white font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {processingId === w.id ? 'Processing...' : (
                              <>
                                <CheckCircle size={16} /> Mark Paid
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-12 p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center gap-6">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
            <Smartphone size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-1">Manual Settlement Guide</h3>
            <p className="text-white/40 text-sm">
              1. Open your Orange Money or MTN MoMo agent portal. 2. Send the exact amount to the phone number listed. 3. Once confirmed, click "Mark Paid" to update the organizer's ledger.
            </p>
          </div>
          <button className="ml-auto flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-xs hover:underline">
            Open Portal <ArrowUpRight size={14} />
          </button>
        </footer>
      </div>
    </div>
  );
}
