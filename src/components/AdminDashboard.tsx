import { useState, useEffect } from 'react';
import { UserProfile, Event } from '../types';
import { Plus, Trash2, Database, Music, Utensils, Waves, GlassWater } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';


export default function AdminDashboard({ user }: { user: UserProfile | null }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'events' | 'users' | 'payouts'>('events');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'events') {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          console.error('Expected array of events, got:', data);
          setEvents([]);
        }
        } else if (activeTab === 'users') {
          const res = await fetch('/api/admin/users');
          if (!res.ok) throw new Error('Failed to fetch users');
          const data = await res.json();
          if (Array.isArray(data)) {
            setUsers(data);
          } else {
            console.error('Expected array of users, got:', data);
            setUsers([]);
          }
        } else if (activeTab === 'payouts') {
          const res = await fetch('/api/admin/payouts/pending');
          if (!res.ok) throw new Error('Failed to fetch payouts');
          const data = await res.json();
          setWithdrawals(data);
        }
    } catch (err) {
      toast.error('Failed to fetch data');
      if (activeTab === 'events') setEvents([]);
      else setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (uid: string, role: UserProfile['role']) => {
    try {
      const res = await fetch(`/api/admin/users/${uid}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
        toast.success(`User role updated to ${role}`);
      }
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        toast.success('Event deleted');
      }
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const processPayout = async (withdrawalId: string, status: 'paid' | 'failed') => {
    try {
      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, status })
      });
      if (res.ok) {
        setWithdrawals(prev => prev.filter(w => w.id !== withdrawalId));
        toast.success(`Payout marked as ${status}`);
      }
    } catch (err) {
      toast.error('Failed to process payout');
    }
  };

  if (user?.role !== 'Admin') return <div className="h-screen flex items-center justify-center">Access Denied</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">Admin Panel</h1>
          <p className="text-white/40">Manage events, tickets, and reservations.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('events')}
            className={cn("px-6 py-2 rounded-full text-sm font-bold", activeTab === 'events' ? "bg-white text-black" : "bg-white/5")}
          >
            Events
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("px-6 py-2 rounded-full text-sm font-bold", activeTab === 'users' ? "bg-white text-black" : "bg-white/5")}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('payouts')}
            className={cn("px-6 py-2 rounded-full text-sm font-bold", activeTab === 'payouts' ? "bg-white text-black" : "bg-white/5")}
          >
            Payouts
          </button>
        </div>
      </div>

      {activeTab === 'events' ? (
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          ) : events.map(event => (
            <div key={event.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <h3 className="text-xl font-bold">{event.title}</h3>
                  <p className="text-sm text-white/40">{event.location} • {new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => deleteEvent(event.id)}
                  className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'users' ? (
        <div className="grid grid-cols-1 gap-4">
          {users.map(u => (
            <div key={u.uid} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{u.name}</h3>
                <p className="text-sm text-white/40">{u.email}</p>
              </div>
              <div className="flex gap-2">
                {['Customer', 'Organizer', 'Admin'].map(role => (
                  <button
                    key={role}
                    onClick={() => updateUserRole(u.uid, role as any)}
                    className={cn(
                      "px-4 py-1 rounded-full text-xs font-bold transition-all",
                      u.role === role ? "bg-orange-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {withdrawals.length > 0 ? withdrawals.map(w => (
            <div key={w.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">${w.amount.toLocaleString()}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full">Pending</span>
                </div>
                <p className="text-sm text-white/40">{w.organizerName} • {w.provider} ({w.phone})</p>
                <p className="text-[10px] text-white/20 mt-1">{new Date(w.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => processPayout(w.id, 'failed')}
                  className="px-6 py-2 bg-red-500/10 text-red-500 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all"
                >
                  Reject
                </button>
                <button 
                  onClick={() => processPayout(w.id, 'paid')}
                  className="px-6 py-2 bg-green-500/10 text-green-500 rounded-xl font-bold text-sm hover:bg-green-500 hover:text-white transition-all"
                >
                  Approve & Pay
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-white/40">No pending payout requests.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
