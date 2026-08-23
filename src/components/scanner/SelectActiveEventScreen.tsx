import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar,
  MapPin,
  ChevronRight,
  AlertCircle,
  Users
} from 'lucide-react';
import { UserProfile, Event } from '../../types';

export default function SelectActiveEventScreen({
  user,
  onEventSelect
}: {
  user: UserProfile | null;
  onEventSelect: (event: Event) => void;
}) {
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveEvents = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/scanner/events/active/${user.uid}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch active events');
      }

      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to fetch active events:', err);
      setError(err.message || 'Failed to fetch active events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    fetchActiveEvents();
  }, [user?.uid]);

  const handleEventClick = (event: Event) => {
    onEventSelect(event);
    navigate('/scanner/scan');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'linear'
          }}
          className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full"
        />

        <p className="text-white/40 font-black uppercase tracking-widest text-xs">
          Fetching Active Events
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
          <Calendar size={32} />
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tighter">
          Active Events
        </h1>

        <p className="text-white/40 text-sm">
          Select the event you are managing
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
          <AlertCircle size={18} />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleEventClick(event)}
              className="w-full group bg-[#111] border border-white/10 overflow-hidden rounded-[2.5rem] flex flex-col hover:border-orange-500/50 transition-all text-left"
            >
              <div className="h-32 w-full relative">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover opacity-60"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />

                <div className="absolute bottom-4 left-6">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />

                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                      Active Now
                    </span>
                  </div>

                  <h3 className="text-xl font-black uppercase tracking-tighter">
                    {event.title}
                  </h3>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <MapPin size={12} />
                    <span>{event.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-orange-500 text-xs font-bold">
                    <Users size={12} />
                    <span>
                      {(event as any)._count?.tickets || 0} Scanned
                    </span>
                  </div>
                </div>

                <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-white/40 text-sm mb-4">
              No active events found for your account.
            </p>

            <button
              onClick={fetchActiveEvents}
              className="text-orange-500 text-xs font-black uppercase tracking-widest hover:text-orange-400 transition-colors"
            >
              Refresh List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}