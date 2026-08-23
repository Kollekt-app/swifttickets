import { useState, useEffect } from 'react';
import { UserProfile, Ticket, Reservation, Event } from '../types';
import { motion, AnimatePresence } from 'motion/react';

import {
  Armchair,
  Calendar,
  MapPin,
  Smartphone,
  QrCode,
  User as UserIcon,
  LayoutDashboard,
  ChevronRight,
  Send,
  ShieldCheck,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Profile({
  user,
}: {
  user: UserProfile | null;
}) {
  const [tickets, setTickets] = useState<
    (Ticket & { event?: Event })[]
  >([]);

  const [reservations, setReservations] = useState<
    (Reservation & { event?: Event })[]
  >([]);

  const [myEvents, setMyEvents] = useState<Event[]>([]);

  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'tickets' | 'reservations' | 'my-events'
  >('tickets');

  const [selectedTransferTicket, setSelectedTransferTicket] =
    useState<any>(null);

  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setTickets([]);
        setReservations([]);
        setMyEvents([]);
        return;
      }

      setLoading(true);

      try {
        const currentUser = user as UserProfile & {
          uid?: string;
          id?: string;
        };

        const userId =
  currentUser.id ||
  currentUser.uid ||
  currentUser.email ||
  '';

if (!userId) {
  console.error(
    'Profile: No user ID, UID, or email found',
    currentUser
  );

  setTickets([]);
  setReservations([]);
  setMyEvents([]);
  return;
}

console.log('PROFILE RESOLVED USER ID:', userId);

        console.log('PROFILE USER:', {
          id: currentUser.id,
          uid: currentUser.uid,
          resolvedUserId: userId,
          email: currentUser.email,
          role: currentUser.role,
        });

        const ticketsResponse = await fetch(
  `/api/tickets/user/${encodeURIComponent(userId)}`
);

        if (!ticketsResponse.ok) {
          const errorText = await ticketsResponse.text();

          console.error(
            'Profile tickets request failed:',
            ticketsResponse.status,
            errorText
          );

          setTickets([]);
        } else {
          const ticketData = await ticketsResponse.json();

          console.log('PROFILE TICKETS:', ticketData);

          const allTickets = Array.isArray(ticketData?.all)
            ? ticketData.all
            : Array.isArray(ticketData)
            ? ticketData
            : [];

          setTickets(allTickets);
        }

        setReservations([]);

        if (currentUser.role === 'Organizer') {
          try {
            const eventsResponse = await fetch(
              `/api/events?organizerId=${encodeURIComponent(userId)}`
            );

            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();

              const events = Array.isArray(eventsData)
                ? eventsData
                : Array.isArray(eventsData?.events)
                ? eventsData.events
                : [];

              console.log(
                'PROFILE ORGANIZER EVENTS:',
                events
              );

              setMyEvents(events);
            } else {
              console.warn(
                'Could not load organizer events:',
                eventsResponse.status
              );

              setMyEvents([]);
            }
          } catch (error) {
            console.error(
              'Organizer events error:',
              error
            );

            setMyEvents([]);
          }
        } else {
          setMyEvents([]);
        }
      } catch (error) {
        console.error(
          'Profile data error:',
          error
        );

        setTickets([]);
        setReservations([]);
        setMyEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleTransferSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !selectedTransferTicket ||
      !recipientName.trim() ||
      !recipientEmail.trim()
    ) {
      toast.error(
        'Recipient name and email are required'
      );
      return;
    }

    setIsTransferring(true);

    try {
      const response = await fetch(
        '/api/tickets/transfer',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketCode:
              selectedTransferTicket.ticketCode,
            newRecipientName:
              recipientName.trim(),
            newRecipientEmail:
              recipientEmail.trim(),
            newRecipientPhone:
              recipientPhone.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Transfer failed'
        );
      }

      toast.success(
        `Ticket transferred to ${recipientName}!`
      );

      setTickets((previousTickets) =>
        previousTickets.filter(
          (ticket) =>
            ticket.id !== selectedTransferTicket.id
        )
      );

      setSelectedTransferTicket(null);
      setRecipientName('');
      setRecipientEmail('');
      setRecipientPhone('');
    } catch (error: any) {
      console.error(
        'Ticket transfer error:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to transfer ticket'
      );
    } finally {
      setIsTransferring(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-black mb-2">
            Please sign in
          </h1>

          <p className="text-white/50">
            Please sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-white/5 p-8 rounded-3xl border border-white/10">

          <div className="w-24 h-24 rounded-full bg-orange-600 flex items-center justify-center text-4xl font-black shrink-0">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <div className="text-center md:text-left flex-1">

            <h1 className="text-4xl font-black tracking-tighter mb-2">
              {user.name}
            </h1>

            <p className="text-white/40 mb-4">
              {user.email}
            </p>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">

              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                {user.role}
              </span>

              {user.role === 'Organizer' && (
                <Link
                  to="/pricing"
                  className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-orange-500/30 transition-all"
                >
                  {user.plan || 'Starter'} Plan
                </Link>
              )}

              {user.phone && (
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  {user.phone}
                </span>
              )}

            </div>
          </div>

          <Link
            to="/verify-ticket"
            className="bg-orange-600/20 hover:bg-orange-600 border border-orange-500 text-orange-200 hover:text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <ShieldCheck size={16} />
            <span>Verify Ticket Code</span>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">

          <button
            type="button"
            onClick={() =>
              setActiveTab('tickets')
            }
            className={cn(
              'px-6 py-3 rounded-full text-sm font-bold transition-all',
              activeTab === 'tickets'
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            My Tickets ({tickets.length})
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab('reservations')
            }
            className={cn(
              'px-6 py-3 rounded-full text-sm font-bold transition-all',
              activeTab === 'reservations'
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            Reservations ({reservations.length})
          </button>

          {user.role === 'Organizer' && (
            <button
              type="button"
              onClick={() =>
                setActiveTab('my-events')
              }
              className={cn(
                'px-6 py-3 rounded-full text-sm font-bold transition-all',
                activeTab === 'my-events'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              My Events ({myEvents.length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-6">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-36 bg-white/5 border border-white/10 rounded-3xl animate-pulse"
              />
            ))}

          </div>
        ) : (
          <>
            {activeTab === 'tickets' && (
              <div className="space-y-6">

                {tickets.length > 0 ? (
                  tickets.map((ticket) => (
                    <motion.div
                      key={ticket.id}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="bg-white/5 border border-white/10 rounded-3xl p-6"
                    >

                      <div className="flex flex-col md:flex-row gap-6">

                        <div className="w-full md:w-32 h-32 bg-white rounded-2xl p-2 flex items-center justify-center shrink-0">
                          <QRCodeSVG
                            value={
                              ticket.ticketCode || ''
                            }
                            size={112}
                          />
                        </div>

                        <div className="flex-1">

                          <div className="flex items-start justify-between gap-4 mb-3">

                            <div>
                              <h3 className="text-xl font-black tracking-tight">
                                {ticket.event?.title ||
                                  ticket.eventTitle ||
                                  'Event Ticket'}
                              </h3>

                              <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mt-1">
                                {ticket.ticketType ||
                                  'General Admission'}
                              </p>
                            </div>

                            <span
                              className={cn(
                                'px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0',
                                ticket.status ===
                                  'Active'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : ticket.status ===
                                    'Scanned'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-white/10 text-white/50'
                              )}
                            >
                              {ticket.status ||
                                'Active'}
                            </span>

                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/60">

                            <div className="flex items-center gap-2">
                              <Calendar
                                size={14}
                                className="text-orange-500"
                              />

                              {ticket.event?.date
                                ? new Date(
                                    ticket.event.date
                                  ).toLocaleDateString()
                                : ticket.date
                                ? new Date(
                                    ticket.date
                                  ).toLocaleDateString()
                                : 'N/A'}
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin
                                size={14}
                                className="text-orange-500"
                              />

                              {ticket.event?.location ||
                                ticket.location ||
                                'N/A'}
                            </div>

                            <div className="flex items-center gap-2 font-mono text-white">
                              <QrCode
                                size={14}
                                className="text-orange-500"
                              />

                              <span className="break-all">
                                {ticket.ticketCode}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <UserIcon
                                size={14}
                                className="text-orange-500"
                              />

                              Attendee:{' '}
                              {ticket.attendeeName ||
                                'N/A'}
                            </div>

                            <div className="flex items-center gap-2">
                              <Smartphone
                                size={14}
                                className="text-orange-500"
                              />

                              {ticket.deliveryMethod ||
                                'Digital'}
                            </div>

                            <div className="flex items-center gap-2 text-green-400 font-bold">
                              Paid: $
                              {ticket.pricePaid ??
                                '0.00'}
                            </div>

                          </div>

                          <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-white/10">

                            <Link
                              to={`/verify-ticket?code=${encodeURIComponent(
                                ticket.ticketCode || ''
                              )}`}
                              className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10 transition-all"
                            >
                              <ShieldCheck
                                size={14}
                                className="text-orange-400"
                              />

                              Verify Authenticity
                            </Link>

                            {ticket.status ===
                              'Active' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTransferTicket(
                                    ticket
                                  );

                                  setRecipientName('');
                                  setRecipientEmail('');
                                  setRecipientPhone('');
                                }}
                                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-orange-500/30 transition-all"
                              >
                                <Send size={14} />
                                Transfer to Friend
                              </button>
                            )}

                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">

                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                      <QrCode
                        size={30}
                        className="text-orange-500"
                      />
                    </div>

                    <h3 className="text-xl font-black mb-2">
                      No tickets yet
                    </h3>

                    <p className="text-white/40 text-sm">
                      Tickets you purchase will appear here.
                    </p>

                  </div>
                )}

              </div>
            )}

            {activeTab === 'reservations' && (
              <div className="space-y-6">

                {reservations.length > 0 ? (
                  reservations.map(
                    (reservation) => (
                      <motion.div
                        key={reservation.id}
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-6"
                      >

                        <div className="w-16 h-16 rounded-2xl bg-orange-600/20 flex items-center justify-center text-orange-500 shrink-0">
                          <Armchair size={32} />
                        </div>

                        <div className="flex-1">

                          <div className="flex items-center justify-between mb-2">

                            <h3 className="text-xl font-black tracking-tight">
                              {reservation.event?.title ||
                                'Unknown Event'}
                            </h3>

                            <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                              Confirmed
                            </span>

                          </div>

                          <div className="flex flex-wrap gap-6 text-sm text-white/60">

                            <div className="flex items-center gap-2">
                              <Armchair size={14} />
                              Table{' '}
                              {
                                reservation.tableNumber
                              }
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar size={14} />

                              {reservation.event
                                ? new Date(
                                    reservation.event.date
                                  ).toLocaleDateString()
                                : 'N/A'}
                            </div>

                          </div>
                        </div>

                      </motion.div>
                    )
                  )
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">

                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                      <Armchair
                        size={30}
                        className="text-orange-500"
                      />
                    </div>

                    <h3 className="text-xl font-black mb-2">
                      No reservations
                    </h3>

                    <p className="text-white/40 text-sm">
                      Your VIP table reservations will appear here.
                    </p>

                  </div>
                )}

              </div>
            )}

            {activeTab === 'my-events' &&
              user.role === 'Organizer' && (
                <div className="space-y-6">

                  {myEvents.length > 0 ? (
                    myEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-6"
                      >

                        <div className="w-16 h-16 rounded-2xl bg-orange-600/20 flex items-center justify-center text-orange-500 shrink-0">
                          <LayoutDashboard
                            size={32}
                          />
                        </div>

                        <div className="flex-1">

                          <div className="flex items-center justify-between mb-2">

                            <h3 className="text-xl font-black tracking-tight">
                              {event.title}
                            </h3>

                            <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                              {event.status}
                            </span>

                          </div>

                          <div className="flex flex-wrap gap-6 text-sm text-white/60">

                            <div className="flex items-center gap-2">
                              <Calendar size={14} />

                              {event.date
                                ? new Date(
                                    event.date
                                  ).toLocaleDateString()
                                : 'N/A'}
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin size={14} />

                              {event.location ||
                                'N/A'}
                            </div>

                          </div>
                        </div>

                        <Link
                          to="/organizer"
                          className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                        >
                          <ChevronRight
                            size={20}
                          />
                        </Link>

                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">

                      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                        <LayoutDashboard
                          size={30}
                          className="text-orange-500"
                        />
                      </div>

                      <h3 className="text-xl font-black mb-2">
                        No organized events
                      </h3>

                      <p className="text-white/40 text-sm mb-6">
                        You haven't organized any events yet.
                      </p>

                      <Link
                        to="/organizer"
                        className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Go to Organizer Dashboard
                        <ChevronRight
                          size={16}
                        />
                      </Link>

                    </div>
                  )}

                  <Link
                    to="/organizer"
                    className="block w-full py-4 rounded-3xl border-2 border-dashed border-white/10 text-center text-white/40 hover:border-orange-500/50 hover:text-orange-500 transition-all font-bold uppercase tracking-widest text-xs"
                  >
                    Go to Organizer Dashboard to Create Events
                  </Link>

                </div>
              )}

          </>
        )}

        <AnimatePresence>
          {selectedTransferTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
            >

              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                }}
                className="bg-[#111] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 relative shadow-2xl"
              >

                <button
                  type="button"
                  onClick={() =>
                    setSelectedTransferTicket(null)
                  }
                  className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                >
                  <X size={20} />
                </button>

                <div className="space-y-2 pr-8">

                  <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <UserCheck size={12} />
                    Peer-to-Peer Transfer
                  </div>

                  <h3 className="text-xl font-black uppercase tracking-tight text-white">
                    Transfer Credential
                  </h3>

                  <p className="text-xs text-white/60 leading-relaxed">
                    Transferring{' '}
                    <span className="text-orange-400 font-bold">
                      {
                        selectedTransferTicket.ticketCode
                      }
                    </span>{' '}
                    will invalidate the old QR code and issue the ticket to the recipient.
                  </p>

                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">

                  <p className="text-sm font-bold text-white">
                    {selectedTransferTicket.event
                      ?.title ||
                      'Event Ticket'}
                  </p>

                  <p className="text-xs text-white/40 mt-1">
                    Current ticket:
                  </p>

                  <p className="text-xs text-orange-400 font-mono mt-1 break-all">
                    {
                      selectedTransferTicket.ticketCode
                    }
                  </p>

                </div>

                <form
                  onSubmit={
                    handleTransferSubmit
                  }
                  className="space-y-4"
                >

                  <div>

                    <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                      Recipient Full Name *
                    </label>

                    <input
                      type="text"
                      required
                      placeholder="e.g. Marie Johnson"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500"
                      value={recipientName}
                      onChange={(e) =>
                        setRecipientName(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div>

                    <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                      Recipient Email Address *
                    </label>

                    <input
                      type="email"
                      required
                      placeholder="e.g. marie@gmail.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500"
                      value={recipientEmail}
                      onChange={(e) =>
                        setRecipientEmail(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div>

                    <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1">
                      Recipient Liberian Phone
                    </label>

                    <input
                      type="tel"
                      placeholder="+231 77 123 4567"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500"
                      value={recipientPhone}
                      onChange={(e) =>
                        setRecipientPhone(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="pt-2 flex gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTransferTicket(
                          null
                        )
                      }
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white/80 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        isTransferring
                      }
                      className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isTransferring ? (
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Send size={16} />
                      )}

                      <span>
                        Issue Ticket
                      </span>
                    </button>

                  </div>

                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}