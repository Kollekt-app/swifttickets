
import React, { useState, useEffect } from 'react';
import { Event, UserProfile, Ticket, PromoCode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  BarChart3,
  Users,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  Lock,
  ShieldCheck,
  Scan,
  AlertCircle,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import CheckIn from './CheckIn';

export default function OrganizerDashboard({
  user
}: {
  user: UserProfile | null;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'checkin'>('dashboard');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [withdrawalsDisabled, setWithdrawalsDisabled] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [newCategory, setNewCategory] =
    useState<Event['category']>('Music');

  const [newTicketTypes, setNewTicketTypes] = useState([
    {
      name: 'Regular',
      price: 0,
      capacity: 100,
      sold: 0
    }
  ]);

  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);

  const organizerId = user?.uid || user?.id;

  useEffect(() => {
    if (!organizerId) return;

    fetchEvents();
    fetchWallet();
  }, [organizerId]);

  const fetchWallet = async () => {
    if (!organizerId) {
      console.error('Cannot fetch wallet: organizer ID is missing');
      return;
    }

    try {
      const res = await fetch(
        `/api/organizer/wallet/${organizerId}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch wallet');
      }

      const data = await res.json();

      setWalletBalance(
        typeof data.balance === 'number'
          ? data.balance
          : Number(data.balance || 0)
      );

      setRiskLevel(
        data.riskLevel === 'medium' || data.riskLevel === 'high'
          ? data.riskLevel
          : 'low'
      );

      setWithdrawalsDisabled(Boolean(data.withdrawalsDisabled));
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };

  const fetchAnalytics = async (eventId: string) => {
    try {
      setAnalytics(null);

      const res = await fetch(
        `/api/organizer/analytics/${eventId}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await res.json();

      setAnalytics(data);

      if (Array.isArray(data.recentTickets)) {
        setTickets(data.recentTickets);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setAnalytics(null);
      setTickets([]);
      toast.error('Failed to load event analytics');
    }
  };

  const handleRequestPayout = async () => {
    if (
      !user ||
      walletBalance === null ||
      walletBalance <= 0
    ) {
      toast.error('No balance available for payout.');
      return;
    }

    if (withdrawalsDisabled) {
      toast.error(
        'Withdrawals are currently disabled for your account.'
      );
      return;
    }

    setPayoutLoading(true);

    try {
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizerId: organizerId,
          amount: walletBalance,
          provider: 'orange_money',
          phone: user.phone || '+231 77 000 0000'
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success(
          'Payout request submitted successfully!'
        );
        await fetchWallet();
      } else {
        toast.error(
          data.error || 'Failed to submit payout request.'
        );
      }
    } catch (err) {
      console.error('Payout error:', err);
      toast.error('An error occurred while requesting payout.');
    } finally {
      setPayoutLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!organizerId) {
      console.error('Cannot fetch events: organizer ID is missing');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/organizer/events/${organizerId}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await res.json();

      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewDate('');
    setNewEndDate('');
    setNewLocation('');
    setNewImageUrl('');
    setImageFiles([]);
    setImagePreviews([]);
    setNewCategory('Music');

    setNewTicketTypes([
      {
        name: 'Regular',
        price: 0,
        capacity: 100,
        sold: 0
      }
    ]);

    setIsPrivate(false);
    setPassword('');
    setInsuranceEnabled(false);
  };

  const handleCreateEvent = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user || !organizerId) {
      toast.error('Organizer information is missing.');
      return;
    }

    if (!newTitle.trim()) {
      toast.error('Please enter an event title.');
      return;
    }

    if (!newDesc.trim()) {
      toast.error('Please enter an event description.');
      return;
    }

    if (!newDate || !newEndDate) {
      toast.error('Please select both start and end dates.');
      return;
    }

    if (
      new Date(newEndDate).getTime() <=
      new Date(newDate).getTime()
    ) {
      toast.error(
        'End date must be after the start date.'
      );
      return;
    }

    if (!newLocation.trim()) {
      toast.error('Please enter an event location.');
      return;
    }

    if (
      isPrivate &&
      !password.trim()
    ) {
      toast.error(
        'Please enter a password for the private event.'
      );
      return;
    }

    if (
      newTicketTypes.some(
        (ticket) =>
          !ticket.name.trim() ||
          ticket.capacity <= 0 ||
          ticket.price < 0
      )
    ) {
      toast.error(
        'Please provide valid ticket types.'
      );
      return;
    }

    setLoading(true);

    try {
      const finalImageUrl =
        imagePreviews[0] ||
        newImageUrl ||
        `https://picsum.photos/seed/${Date.now()}/800/600`;

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          date: newDate,
          endDate: newEndDate,
          location: newLocation.trim(),
          organizerId,
          category: newCategory,
          imageUrl: finalImageUrl,
          ticketTypes: newTicketTypes.map(
            (ticket) => ({
              name: ticket.name.trim(),
              price: Number(ticket.price),
              capacity: Number(ticket.capacity),
              sold: 0
            })
          ),
          isPrivate,
          password: isPrivate
            ? password.trim()
            : undefined,
          insuranceEnabled
        })
      });

      const errorData = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          errorData.error ||
            'Failed to create event'
        );
      }

      const createdEvent = errorData;

      setEvents((prev) => [
        createdEvent,
        ...prev
      ]);

      toast.success(
        'Event created successfully!'
      );

      setShowCreateModal(false);
      resetCreateForm();
    } catch (err: any) {
      console.error(
        'Create event error:',
        err
      );

      toast.error(
        err?.message ||
          'Failed to create event'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    if (
      files.length +
        imageFiles.length >
      5
    ) {
      toast.error(
        'Maximum 5 images allowed'
      );
      return;
    }

    files.forEach((file: File) => {
      if (
        file.size >
        5 * 1024 * 1024
      ) {
        toast.error(
          `${file.name} is too large (max 5MB)`
        );
        return;
      }

      if (
        !file.type.startsWith('image/')
      ) {
        toast.error(
          `${file.name} is not an image`
        );
        return;
      }

      const reader =
        new FileReader();

      reader.onloadend = () => {
        if (
          typeof reader.result !==
          'string'
        ) {
          return;
        }

        setImagePreviews(
          (prev) => [
            ...prev,
            reader.result as string
          ]
        );

        setImageFiles(
          (prev) => [
            ...prev,
            file
          ]
        );
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (
    index: number
  ) => {
    setImagePreviews(
      (prev) =>
        prev.filter(
          (_, i) => i !== index
        )
    );

    setImageFiles(
      (prev) =>
        prev.filter(
          (_, i) => i !== index
        )
    );
  };

  const viewEventStats = async (
    event: Event
  ) => {
    setActiveEvent(event);
    setAnalytics(null);
    setTickets([]);
    setPromoCodes([]);

    await fetchAnalytics(
      event.id
    );
  };

  const handleCancelEvent = async (
    eventId: string
  ) => {
    const confirmed =
      window.confirm(
        'Are you sure you want to cancel this event? This will auto-refund all unscanned tickets and cannot be undone.'
      );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/events/${eventId}/cancel`,
        {
          method: 'POST'
        }
      );

      const data = await res
        .json()
        .catch(() => ({}));

      if (res.ok) {
        toast.success(
          'Event cancelled and tickets refunded.'
        );

        await fetchEvents();
        await fetchWallet();

        setActiveEvent(null);
        setAnalytics(null);
        setTickets([]);
      } else {
        toast.error(
          data.error ||
            'Failed to cancel event.'
        );
      }
    } catch (err) {
      console.error(
        'Cancel event error:',
        err
      );

      toast.error(
        'Failed to cancel event.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (
    user?.role !== 'Organizer' &&
    user?.role !== 'Admin'
  ) {
    return (
      <div className="h-screen flex items-center justify-center">
        Access Denied. You must be an organizer.
      </div>
    );
  }

  if (view === 'checkin') {
    return (
      <CheckIn
        onBack={() =>
          setView('dashboard')
        }
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">
            Organizer Dashboard
          </h1>

          <p className="text-white/40">
            Manage your events, track sales, and grow your audience.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-white/50 font-medium">
              Active Plan:
            </span>

            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all group"
            >
              <Rocket
                size={12}
                className="group-hover:rotate-12 transition-transform"
              />

              {user?.plan || 'Starter'} Plan

              <ArrowUpRight
                size={12}
                className="text-orange-500"
              />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex flex-col gap-2">
              <Link
                to="/organizer/wallet"
                className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                  <Wallet size={20} />
                </div>

                <div>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                    Balance
                  </p>

                  <p
                    className={cn(
                      'text-xl font-black',
                      (walletBalance || 0) < 0
                        ? 'text-red-500'
                        : 'text-white'
                    )}
                  >
                    $
                    {walletBalance?.toLocaleString() ||
                      '0'}
                  </p>
                </div>

                <ChevronRight
                  className="text-white/20 ml-2"
                  size={16}
                />
              </Link>

              <div className="flex items-center gap-4 px-4">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                    Risk:
                  </span>

                  <span
                    className={cn(
                      'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                      riskLevel === 'low'
                        ? 'bg-green-500/10 text-green-500'
                        : riskLevel === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-red-500/10 text-red-500'
                    )}
                  >
                    {riskLevel}
                  </span>
                </div>

                {withdrawalsDisabled && (
                  <div className="flex items-center gap-1 text-red-500">
                    <Lock size={10} />

                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Withdrawals Locked
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() =>
              setView('checkin')
            }
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-full text-lg font-black transition-all"
          >
            <Scan size={20} />
            CHECK-IN
          </button>

          <button
            onClick={() =>
              setShowCreateModal(true)
            }
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 px-8 py-4 rounded-full text-lg font-black transition-all shadow-lg shadow-orange-600/20"
          >
            <Plus size={20} />
            CREATE EVENT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-orange-500" />
            Your Events
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-white/5 rounded-3xl animate-pulse"
                />
              ))}
            </div>
          ) : events.length > 0 ? (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() =>
                  viewEventStats(event)
                }
                className={cn(
                  'bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between cursor-pointer transition-all hover:border-orange-500/50',
                  activeEvent?.id ===
                    event.id &&
                    'border-orange-500 bg-orange-500/5'
                )}
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <CalendarIcon
                          size={24}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">
                      {event.title}
                    </h3>

                    <p className="text-sm text-white/40">
                      {event.location} •{' '}
                      {new Date(
                        event.date
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] text-white/40 uppercase font-black">
                      Status
                    </p>

                    <p
                      className={cn(
                        'text-xs font-bold',
                        event.status ===
                          'Published'
                          ? 'text-green-500'
                          : event.status ===
                            'Cancelled'
                          ? 'text-red-500'
                          : 'text-orange-500'
                      )}
                    >
                      {event.status}
                    </p>
                  </div>

                  <ChevronRight className="text-white/20" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-white/40">
                You haven't created any events yet.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-orange-500" />
            Event Insights
          </h2>

          {activeEvent ? (
            <motion.div
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8"
            >
              <div className="space-y-1">
                <h3 className="text-3xl font-black tracking-tighter uppercase">
                  {activeEvent.title}
                </h3>

                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
                  Performance Overview
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/40 font-black uppercase mb-1">
                    Tickets Sold
                  </p>

                  <p className="text-2xl font-black text-orange-500">
                    {analytics?.ticketsSold ??
                      tickets.length}
                  </p>
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/40 font-black uppercase mb-1">
                    Revenue
                  </p>

                  <p className="text-2xl font-black text-green-500">
                    $
                    {(
                      analytics?.revenue ??
                      tickets.reduce(
                        (acc, t) =>
                          acc +
                          Number(
                            t.pricePaid || 0
                          ),
                        0
                      )
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              {analytics && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-white/40 font-black uppercase mb-1">
                      Attendance
                    </p>

                    <p className="text-2xl font-black text-blue-500">
                      {analytics.attendanceRate ??
                        0}
                      %
                    </p>
                  </div>

                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-white/40 font-black uppercase mb-1">
                      Conversion
                    </p>

                    <p className="text-2xl font-black text-purple-500">
                      {analytics.conversionRate ??
                        activeEvent.conversionRate ??
                        0}
                      %
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-white/40">
                  Ticket Breakdown
                </h4>

                {activeEvent.ticketTypes?.map(
                  (type) => {
                    const sold =
                      Number(
                        type.sold || 0
                      );

                    const capacity =
                      Number(
                        type.capacity || 0
                      );

                    const percentage =
                      capacity > 0
                        ? Math.min(
                            100,
                            (sold /
                              capacity) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        key={type.name}
                        className="space-y-2"
                      >
                        <div className="flex justify-between text-xs font-bold">
                          <span>
                            {type.name}
                          </span>

                          <span>
                            {sold} /{' '}
                            {capacity}
                          </span>
                        </div>

                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-600 transition-all"
                            style={{
                              width: `${percentage}%`
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-white/40">
                  Recent Attendees
                </h4>

                <div className="space-y-2">
                  {tickets
                    .slice(0, 5)
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between text-xs p-3 bg-white/5 rounded-xl"
                      >
                        <span className="font-bold">
                          {
                            ticket.attendeeName
                          }
                        </span>

                        <span className="text-white/40 italic">
                          {
                            ticket.ticketType
                          }
                        </span>
                      </div>
                    ))}

                  {tickets.length === 0 && (
                    <p className="text-xs text-white/20 italic">
                      No sales yet.
                    </p>
                  )}
                </div>
              </div>

              {activeEvent.status !==
                'Cancelled' && (
                <button
                  onClick={() =>
                    handleCancelEvent(
                      activeEvent.id
                    )
                  }
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 border border-red-500/30 text-red-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <AlertCircle
                    size={14}
                  />
                  {loading
                    ? 'CANCELLING...'
                    : 'CANCEL EVENT'}
                </button>
              )}
            </motion.div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <Users
                className="mx-auto text-white/10 mb-4"
                size={48}
              />

              <p className="text-white/40 text-sm">
                Select an event to view its real-time analytics and attendee list.
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              onClick={() =>
                !loading &&
                setShowCreateModal(
                  false
                )
              }
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 20
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 20
              }}
              className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black tracking-tighter uppercase">
                  Create New Event
                </h2>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowCreateModal(
                      false
                    )
                  }
                  className="p-2 hover:bg-white/10 rounded-full disabled:opacity-50"
                >
                  <X />
                </button>
              </div>

              <form
                onSubmit={
                  handleCreateEvent
                }
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40">
                    Basic Info
                  </label>

                  <input
                    type="text"
                    placeholder="Event Title"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
                    value={newTitle}
                    onChange={(e) =>
                      setNewTitle(
                        e.target.value
                      )
                    }
                  />

                  <textarea
                    placeholder="Event Description"
                    required
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
                    value={newDesc}
                    onChange={(e) =>
                      setNewDesc(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40">
                    Event Photos (Up to 5)
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map(
                      (
                        preview,
                        idx
                      ) => (
                        <div
                          key={idx}
                          className="relative group aspect-video rounded-2xl overflow-hidden border border-white/10"
                        >
                          <img
                            src={preview}
                            alt=""
                            className="w-full h-full object-cover"
                          />

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                removeImage(
                                  idx
                                )
                              }
                              className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>
                          </div>
                        </div>
                      )
                    )}

                    {imagePreviews.length <
                      5 && (
                      <div className="relative aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center hover:border-white/20 transition-all cursor-pointer">
                        <Plus
                          size={24}
                          className="text-white/20 mb-1"
                        />

                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                          Add Photo
                        </span>

                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={
                            handleImageUpload
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40">
                      Start Date & Time
                    </label>

                    <input
                      type="datetime-local"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
                      value={newDate}
                      onChange={(e) =>
                        setNewDate(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40">
                      End Date & Time
                    </label>

                    <input
                      type="datetime-local"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
                      value={newEndDate}
                      onChange={(e) =>
                        setNewEndDate(
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40">
                    Category
                  </label>

                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
                    value={
                      newCategory
                    }
                    onChange={(e) =>
                      setNewCategory(
                        e.target
                          .value as Event['category']
                      )
                    }
                  >
                    <option value="Music">
                      Music
                    </option>
                    <option value="Club">
                      Club
                    </option>
                    <option value="Festival">
                      Festival
                    </option>
                    <option value="Conference">
                      Conference
                    </option>
                    <option value="Beach">
                      Beach
                    </option>
                    <option value="Restaurant">
                      Restaurant
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40">
                    Location
                  </label>

                  <input
                    type="text"
                    placeholder="Venue Name, City"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
                    value={newLocation}
                    onChange={(e) =>
                      setNewLocation(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40">
                      Ticket Types
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setNewTicketTypes(
                          (prev) => [
                            ...prev,
                            {
                              name: '',
                              price: 0,
                              capacity: 100,
                              sold: 0
                            }
                          ]
                        )
                      }
                      className="text-xs font-bold text-orange-500 hover:text-orange-400"
                    >
                      + Add Type
                    </button>
                  </div>

                  {newTicketTypes.map(
                    (
                      type,
                      idx
                    ) => (
                      <div
                        key={idx}
                        className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                            Ticket Type #
                            {idx + 1}
                          </span>

                          {newTicketTypes.length >
                            1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setNewTicketTypes(
                                  (
                                    prev
                                  ) =>
                                    prev.filter(
                                      (
                                        _,
                                        i
                                      ) =>
                                        i !==
                                        idx
                                    )
                                )
                              }
                              className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                              Name
                            </label>

                            <input
                              type="text"
                              placeholder="e.g. VIP"
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
                              value={
                                type.name
                              }
                              onChange={(
                                e
                              ) => {
                                setNewTicketTypes(
                                  (
                                    prev
                                  ) =>
                                    prev.map(
                                      (
                                        item,
                                        i
                                      ) =>
                                        i ===
                                        idx
                                          ? {
                                              ...item,
                                              name: e
                                                .target
                                                .value
                                            }
                                          : item
                                    )
                                );
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                              Price ($)
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
                              value={
                                type.price
                              }
                              onChange={(
                                e
                              ) => {
                                const value =
                                  Number(
                                    e
                                      .target
                                      .value
                                  );

                                setNewTicketTypes(
                                  (
                                    prev
                                  ) =>
                                    prev.map(
                                      (
                                        item,
                                        i
                                      ) =>
                                        i ===
                                        idx
                                          ? {
                                              ...item,
                                              price:
                                                Number.isFinite(
                                                  value
                                                )
                                                  ? value
                                                  : 0
                                            }
                                          : item
                                    )
                                );
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20">
                              Capacity
                            </label>

                            <input
                              type="number"
                              min="1"
                              placeholder="100"
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
                              value={
                                type.capacity
                              }
                              onChange={(
                                e
                              ) => {
                                const value =
                                  Number(
                                    e
                                      .target
                                      .value
                                  );

                                setNewTicketTypes(
                                  (
                                    prev
                                  ) =>
                                    prev.map(
                                      (
                                        item,
                                        i
                                      ) =>
                                        i ===
                                        idx
                                          ? {
                                              ...item,
                                              capacity:
                                                Number.isFinite(
                                                  value
                                                )
                                                  ? value
                                                  : 0
                                            }
                                          : item
                                    )
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40">
                    Advanced Settings
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setIsPrivate(
                          (prev) =>
                            !prev
                        )
                      }
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 text-left',
                        isPrivate
                          ? 'bg-orange-500/10 border-orange-500'
                          : 'bg-white/5 border-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          isPrivate
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/10 text-white/40'
                        )}
                      >
                        <Lock
                          size={16}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-bold">
                          Private Event
                        </p>

                        <p className="text-[10px] text-white/40">
                          Password required
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setInsuranceEnabled(
                          (prev) =>
                            !prev
                        )
                      }
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 text-left',
                        insuranceEnabled
                          ? 'bg-green-500/10 border-green-500'
                          : 'bg-white/5 border-white/10'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          insuranceEnabled
                            ? 'bg-green-500 text-white'
                            : 'bg-white/10 text-white/40'
                        )}
                      >
                        <ShieldCheck
                          size={16}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-bold">
                          Event Insurance
                        </p>

                        <p className="text-[10px] text-white/40">
                          Protect ticket sales
                        </p>
                      </div>
                    </button>
                  </div>

                  {isPrivate && (
                    <input
                      type="text"
                      placeholder="Access Password"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-500 transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'CREATING EVENT...'
                    : 'PUBLISH EVENT'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

