import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Event, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Calendar, MapPin, Users, Ticket as TicketIcon, Armchair, ChevronLeft, ShieldCheck, 
  CheckCircle2, Lock, Smartphone, MessageSquare, Info, Globe, Plus, Minus, 
  CreditCard, Mail, Send, Download, ExternalLink, Zap, Eye, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import StripeCardForm from './StripeCardForm';

export default function EventDetails({ user, onAuthRequired }: { user: UserProfile | null, onAuthRequired: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingType, setBookingType] = useState<'ticket' | 'table'>('ticket');
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);
  const [promoCode, setPromoCode] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<'orange_money' | 'mtn_momo' | 'stripe'>('orange_money');
  const [discount, setDiscount] = useState(0);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [addInsurance, setAddInsurance] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Stripe Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('28');
  const [cvc, setCvc] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  // Modals for Email & SMS previews
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);

  const [lastBookingInfo, setLastBookingInfo] = useState<{ 
    type: string; 
    code: string;
    qrDataUrl?: string;
    notifications?: {
      email?: {
        recipient: string;
        subject: string;
        htmlContent: string;
        simulated: boolean;
        messageId?: string;
      };
      sms?: {
        recipient: string;
        messageText: string;
        simulated: boolean;
        sid?: string;
      };
    };
  } | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) throw new Error('Event not found');
        const data = await res.json();
        setEvent(data);
        if (data.isPrivate) {
          setShowPasswordPrompt(true);
        }
        if (data.ticketTypes.length > 0) {
          setSelectedTicketType(data.ticketTypes[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch event', err);
        toast.error('Event not found');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const [isUnlocking, setIsUnlocking] = useState(false);

  // The password is checked on the server; it is never sent to the browser.
  const handleUnlock = async () => {
    if (!event) return;

    setIsUnlocking(true);

    try {
      const res = await fetch(`/api/events/${event.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.unlocked) {
        toast.error(data.error || 'Incorrect password');
        return;
      }

      setIsUnlocked(true);
      setShowPasswordPrompt(false);
      toast.success('Event unlocked!');
    } catch {
      toast.error('Could not reach the server. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    if (user) {
      setAttendeeName(user.name);
      setAttendeeEmail(user.email);
      setAttendeePhone(user.phone || '');
      setCardHolderName(user.name);
    }
  }, [user]);

  const applyPromoCode = async () => {
    if (!promoCode || !event) return;
    if (promoCode === 'SAVE10') {
      setDiscount(0.1);
      toast.success('Promo code applied!');
    } else {
      toast.error('Invalid promo code');
      setDiscount(0);
    }
  };

  const handleAutoFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpMonth('12');
    setExpYear('28');
    setCvc('123');
    setCardHolderName(attendeeName || 'Alex Johnson');
    toast.success('Test card auto-filled! (Stripe Demo 4242)');
  };

  const handleBookTicket = async () => {
    if (!event || !selectedTicketType) return;
    if (!attendeeName || !attendeeEmail || !attendeePhone) {
      toast.error('Please fill in all attendee contact details');
      return;
    }

    setIsBooking(true);
    try {
      const selectedType = event.ticketTypes.find(t => t.name === selectedTicketType);
      const unitPrice = selectedType ? selectedType.price * (1 - discount) : 0;
      const insuranceTotal = addInsurance ? 2 * ticketQuantity : 0;
      const totalPricePaid = (unitPrice * ticketQuantity) + insuranceTotal;

      // 1. If Stripe selected, process Stripe payment first
      if (paymentProvider === 'stripe') {
        if (!cardNumber || !cvc) {
          toast.error('Please complete your credit card details or click "Fill Test Card"');
          setIsBooking(false);
          return;
        }

        toast.loading('Processing Stripe payment authorization...');
        const stripeRes = await fetch('/api/stripe/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalPricePaid,
            cardNumber,
            expMonth,
            expYear,
            cvc,
            cardHolderName: cardHolderName || attendeeName,
            attendeeEmail,
            eventTitle: event.title
          })
        });

        toast.dismiss();

        if (!stripeRes.ok) {
          const errData = await stripeRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Stripe card authorization failed');
        }

        const stripeData = await stripeRes.json();
        toast.success(`Stripe Payment Approved! Ref: ${stripeData.transactionId.substring(0, 16)}...`);
      }

      // 2. Create booking and trigger Email & SMS QR code dispatch
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: event.id,
    ticketType: selectedTicketType,
    attendeeName,
    attendeeEmail,
    attendeePhone,
    pricePaid: totalPricePaid,
    quantity: ticketQuantity,
    userId: user?.uid || user?.id,
    paymentProvider
  })
});

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Booking failed');
      }
      
      const ticketData = await response.json();
      
      const delivered = [
        ticketData.notifications?.email?.simulated === false && 'email',
        ticketData.notifications?.sms?.simulated === false && 'SMS',
      ].filter(Boolean);

      toast.success(
        delivered.length
          ? `Ticket issued! QR code sent by ${delivered.join(' and ')}.`
          : 'Ticket issued! Your QR code is below — save or download it now.'
      );

      setLastBookingInfo({ 
        type: `${selectedTicketType} (${ticketQuantity}x)`, 
        code: ticketData.ticketCode || ticketData.primaryCode || ticketData.id,
        qrDataUrl: ticketData.qrDataUrl,
        notifications: ticketData.notifications
      });
      setBookingSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete booking');
    } finally {
      setIsBooking(false);
    }
  };

  const handleReserveTable = async () => {
    if (!event || selectedTable === null) return;
    if (!attendeeName || !attendeeEmail || !attendeePhone) {
      toast.error('Please fill in your contact information for the reservation');
      return;
    }

    setIsBooking(true);
    try {
      const table = event.tableOptions?.find(t => t.number === selectedTable);
      const pricePaid = table ? table.price : 0;

      if (paymentProvider === 'stripe') {
        const stripeRes = await fetch('/api/stripe/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: pricePaid,
            cardNumber,
            expMonth,
            expYear,
            cvc,
            cardHolderName: cardHolderName || attendeeName,
            attendeeEmail,
            eventTitle: event.title
          })
        });

        if (!stripeRes.ok) {
          const errData = await stripeRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Stripe card authorization failed');
        }
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          ticketType: `Table ${selectedTable}`,
          attendeeName,
          attendeeEmail,
          attendeePhone,
          pricePaid,
          userId: user?.uid,
          paymentProvider
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Reservation failed');
      }

      const ticket = await response.json();
      const tableDelivered = [
        ticket.notifications?.email?.simulated === false && 'email',
        ticket.notifications?.sms?.simulated === false && 'SMS',
      ].filter(Boolean);

      toast.success(
        tableDelivered.length
          ? `Table reserved! QR code sent by ${tableDelivered.join(' and ')}.`
          : 'Table reserved! Your QR code is below — save or download it now.'
      );
      
      setLastBookingInfo({ 
        type: 'Table Reservation', 
        code: ticket.ticketCode,
        qrDataUrl: ticket.qrDataUrl,
        notifications: ticket.notifications 
      });
      setBookingSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reserve table');
    } finally {
      setIsBooking(false);
    }
  };

  // Download QR Code function
  const handleDownloadQr = () => {
    if (!lastBookingInfo?.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = lastBookingInfo.qrDataUrl;
    link.download = `Swift-Ticket-${lastBookingInfo.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded!');
  };

  if (bookingSuccess && lastBookingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-white/10 p-6 md:p-10 rounded-[3rem] max-w-2xl w-full text-center space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500" />
          
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto border border-green-500/30">
            <CheckCircle2 size={40} />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">Booking Confirmed!</h2>
            <p className="text-white/60 text-sm">
              Thank you, <span className="text-white font-bold">{attendeeName}</span>. 
              Your {lastBookingInfo.type} for <span className="text-white font-bold">{event?.title}</span> is complete.
            </p>
          </div>

          {/* Ticket & QR Code Card */}
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-3xl shadow-xl relative group">
                {lastBookingInfo.qrDataUrl ? (
                  <img src={lastBookingInfo.qrDataUrl} alt="Ticket QR Code" className="w-44 h-44 object-contain" />
                ) : (
                  <QRCodeSVG value={lastBookingInfo.code} size={170} />
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Official Verification Ticket Code</p>
                <p className="text-2xl md:text-3xl font-black tracking-widest text-orange-500 font-mono">{lastBookingInfo.code}</p>
              </div>

              <button
                onClick={handleDownloadQr}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border border-white/10"
              >
                <Download size={15} />
                <span>Download Ticket QR Code</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Email Recipient</p>
                <p className="text-xs md:text-sm font-bold truncate text-white">{attendeeEmail}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">SMS Recipient</p>
                <p className="text-xs md:text-sm font-bold text-white">{attendeePhone}</p>
              </div>
            </div>
          </div>

          {/* Dispatched Notification Status Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {/* Email Notification Card */}
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">
                    {lastBookingInfo.notifications?.email?.simulated
                      ? 'Email Preview'
                      : 'Email Dispatched'}
                  </h4>
                  <p className="text-[10px] text-orange-200/80">
                    {lastBookingInfo.notifications?.email?.simulated
                      ? `Email delivery is not configured — nothing was sent to ${attendeeEmail}`
                      : `QR Ticket sent to ${attendeeEmail}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/40 text-orange-200 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <Eye size={13} />
                <span>
                  {lastBookingInfo.notifications?.email?.simulated
                    ? 'View Email Preview'
                    : 'View Sent Email'}
                </span>
              </button>
            </div>

            {/* SMS Notification Card */}
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Send size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">
                    {lastBookingInfo.notifications?.sms?.simulated
                      ? 'SMS Preview'
                      : 'SMS Dispatched'}
                  </h4>
                  <p className="text-[10px] text-blue-200/80">
                    {lastBookingInfo.notifications?.sms?.simulated
                      ? `SMS delivery is not configured — nothing was sent to ${attendeePhone}`
                      : `Text message sent to ${attendeePhone}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSmsModal(true)}
                className="w-full bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <Smartphone size={13} />
                <span>
                  {lastBookingInfo.notifications?.sms?.simulated
                    ? 'View SMS Preview'
                    : 'View Sent SMS Text'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-white text-black py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-orange-600 hover:text-white transition-all shadow-xl"
            >
              Return to Home
            </button>
          </div>
        </motion.div>

        {/* EMAIL PREVIEW MODAL */}
        <AnimatePresence>
          {showEmailModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#18181b] border border-white/20 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                  <div className="flex items-center gap-2.5">
                    <Mail className="text-orange-500" size={20} />
                    <div>
                      <h3 className="text-sm font-black uppercase text-white tracking-wider">Dispatched Email Preview</h3>
                      <p className="text-[10px] text-white/40">To: {attendeeEmail}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowEmailModal(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                  {lastBookingInfo.notifications?.email?.htmlContent ? (
                    <div 
                      className="bg-black/80 border border-white/10 rounded-2xl p-4 overflow-x-auto text-left"
                      dangerouslySetInnerHTML={{ __html: lastBookingInfo.notifications.email.htmlContent }}
                    />
                  ) : (
                    <div className="p-8 text-center text-white/40">Email notification dispatches log saved.</div>
                  )}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SMS PREVIEW MODAL */}
        <AnimatePresence>
          {showSmsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#18181b] border border-white/20 rounded-3xl max-w-sm w-full overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                  <div className="flex items-center gap-2">
                    <Smartphone className="text-blue-400" size={18} />
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">SMS Smartphone Notification</h3>
                      <p className="text-[10px] text-white/40">To: {attendeePhone}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSmsModal(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Smartphone Frame Simulation */}
                <div className="p-6 bg-black flex flex-col items-center">
                  <div className="w-full bg-[#27272a] rounded-3xl p-4 border border-white/10 space-y-3 relative shadow-inner">
                    <div className="flex items-center justify-between text-[10px] text-white/40 font-mono pb-2 border-b border-white/10">
                      <span>SWIFT-TXT</span>
                      <span>Just now</span>
                    </div>

                    <div className="bg-blue-600 text-white rounded-2xl rounded-tl-none p-3.5 text-xs font-medium leading-relaxed shadow-lg">
                      {lastBookingInfo.notifications?.sms?.messageText || `🎟️ SWIFT TICKETS: Your ticket ${lastBookingInfo.code} for ${event?.title} is confirmed!`}
                    </div>

                    <div className="text-[9px] text-green-400 font-bold flex items-center gap-1 pt-1">
                      <CheckCircle2 size={12} /> Delivered via SMS Gateway
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
                  <button
                    onClick={() => setShowSmsModal(false)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (loading) return <div className="h-screen flex items-center justify-center">Loading event details...</div>;
  if (!event) return <div className="h-screen flex items-center justify-center">Event not found</div>;

  if (showPasswordPrompt && !isUnlocked) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 p-12 rounded-[3rem] max-w-md w-full text-center space-y-8"
        >
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500 mx-auto">
            <Lock size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tighter uppercase">Private Event</h2>
            <p className="text-white/40 text-sm">This event is private. Please enter the access password provided by the organizer.</p>
          </div>
          <div className="space-y-4">
            <input 
              type="password" 
              placeholder="Enter event password" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-xl font-bold focus:outline-none focus:border-orange-500"
              value={enteredPassword}
              onChange={e => setEnteredPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            />
            <button 
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="w-full bg-orange-600 text-white py-4 rounded-full font-black uppercase tracking-wider hover:bg-orange-500 transition-all disabled:opacity-50"
            >
              {isUnlocking ? 'Checking…' : 'Unlock Event'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Banner */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <img 
          src={event.images?.[activeImage] || event.imageUrl || `https://picsum.photos/seed/${event.id}/1200/800`} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-8 left-8 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all z-10"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="absolute bottom-12 left-0 w-full px-4 md:px-12">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="bg-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/30">
                {event.category || 'Music'}
              </span>
              {event.isPrivate && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1">
                  <Lock size={12} /> Private Event
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase max-w-4xl">{event.title}</h1>

            <div className="flex flex-wrap gap-6 text-white/60 text-sm font-bold">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-orange-500" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-orange-500" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-12">
          {/* Gallery selector */}
          {event.images && event.images.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Event Gallery</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {event.images.map((img, index) => (
                  <button 
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      "relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all",
                      activeImage === index ? "border-orange-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">About The Event</h3>
            <p className="text-white/80 text-lg leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>

          {/* Organizer Info */}
          {event.organizer && (
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Organized By</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black">{event.organizer.name}</p>
                  <p className="text-white/40 text-sm">{event.organizer.email}</p>
                </div>
                {event.organizer.phone && (
                  <span className="bg-white/10 px-4 py-2 rounded-full text-xs font-bold">{event.organizer.phone}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checkout & Booking Panel */}
        <div className="space-y-8">
          <div className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-[2.5rem] space-y-6 shadow-2xl sticky top-28">
            {/* Toggle Booking Mode */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
              <button 
                onClick={() => setBookingType('ticket')}
                className={cn(
                  "flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                  bookingType === 'ticket' ? "bg-orange-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                <TicketIcon size={16} /> Standard Ticket
              </button>
              {event.tableOptions && event.tableOptions.length > 0 && (
                <button 
                  onClick={() => setBookingType('table')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                    bookingType === 'table' ? "bg-orange-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  )}
                >
                  <Armchair size={16} /> Table VIP
                </button>
              )}
            </div>

            {bookingType === 'ticket' ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40">Select Ticket Category</label>
                  <div className="space-y-3">
                    {event.ticketTypes.map((type) => {
                      const isSoldOut = type.sold >= type.capacity;
                      const isSelected = selectedTicketType === type.name;

                      return (
                        <div 
                          key={type.name}
                          onClick={() => !isSoldOut && setSelectedTicketType(type.name)}
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            isSoldOut 
                              ? "opacity-40 border-white/5 bg-white/5 cursor-not-allowed" 
                              : isSelected
                                ? "bg-orange-500/10 border-orange-500 text-white" 
                                : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                          )}
                        >
                          <div>
                            <p className="font-black text-base">{type.name}</p>
                            <p className="text-xs text-white/40">{type.capacity - type.sold} tickets remaining</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-orange-500">${type.price.toFixed(2)}</p>
                            {isSoldOut && <p className="text-[10px] uppercase font-bold text-red-500">Sold Out</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {(() => {
                  const selectedType = event.ticketTypes.find(t => t.name === selectedTicketType);
                  const ticketsLeft = selectedType ? selectedType.capacity - selectedType.sold : 99;
                  const unitPrice = selectedType ? selectedType.price : 0;
                  const discountAmount = unitPrice * ticketQuantity * discount;
                  const subtotal = unitPrice * ticketQuantity;
                  const insuranceFee = addInsurance ? 2 * ticketQuantity : 0;
                  const totalPrice = (subtotal - discountAmount) + insuranceFee;

                  return (
                    <>
                      {/* Ticket Quantity Selector */}
                      <div className="space-y-3 bg-white/5 border border-white/10 p-5 rounded-3xl">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-widest text-white/40">Quantity</label>
                          <span className="text-[10px] text-orange-400 font-bold uppercase">{ticketsLeft} Available</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-1.5">
                            <button
                              type="button"
                              onClick={() => setTicketQuantity(prev => Math.max(1, prev - 1))}
                              disabled={ticketQuantity <= 1}
                              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white disabled:opacity-30 transition-all"
                            >
                              <Minus size={15} />
                            </button>

                            <span className="w-8 text-center text-base font-black text-white">{ticketQuantity}</span>

                            <button
                              type="button"
                              onClick={() => setTicketQuantity(prev => Math.min(ticketsLeft, prev + 1))}
                              disabled={ticketQuantity >= ticketsLeft}
                              className="w-9 h-9 rounded-xl bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white disabled:opacity-30 transition-all"
                            >
                              <Plus size={15} />
                            </button>
                          </div>

                          <div className="flex gap-1 flex-wrap">
                            {[1, 2, 3, 5, 10].map(q => (
                              <button
                                key={q}
                                type="button"
                                disabled={q > ticketsLeft}
                                onClick={() => setTicketQuantity(q)}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-xl text-xs font-black transition-all",
                                  ticketQuantity === q 
                                    ? "bg-orange-600 text-white" 
                                    : "bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-20"
                                )}
                              >
                                {q}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Attendee Form */}
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40">Attendee Details</label>
                        <div className="space-y-3">
                          <input 
                            type="text" 
                            placeholder="Full Name" 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500 text-sm"
                            value={attendeeName}
                            onChange={e => setAttendeeName(e.target.value)}
                          />
                          <input 
                            type="email" 
                            placeholder="Email Address (for QR ticket)" 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500 text-sm"
                            value={attendeeEmail}
                            onChange={e => setAttendeeEmail(e.target.value)}
                          />
                          <input 
                            type="tel" 
                            placeholder="Phone Number (for SMS QR link)" 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500 text-sm"
                            value={attendeePhone}
                            onChange={e => setAttendeePhone(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Payment Provider Selection */}
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40">Select Payment Method</label>
                        <div className="grid grid-cols-3 gap-2.5">
                          <button 
                            type="button"
                            onClick={() => setPaymentProvider('orange_money')}
                            className={cn(
                              "p-3 rounded-2xl border transition-all text-left flex flex-col justify-between",
                              paymentProvider === 'orange_money' ? "bg-orange-500/10 border-orange-500 text-white" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            <div className="font-black text-[11px] uppercase tracking-wider">Orange Money</div>
                            <div className="text-[9px] text-white/40">Liberia</div>
                          </button>

                          <button 
                            type="button"
                            onClick={() => setPaymentProvider('mtn_momo')}
                            className={cn(
                              "p-3 rounded-2xl border transition-all text-left flex flex-col justify-between",
                              paymentProvider === 'mtn_momo' ? "bg-yellow-500/10 border-yellow-500 text-white" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            <div className="font-black text-[11px] uppercase tracking-wider">MTN MoMo</div>
                            <div className="text-[9px] text-white/40">Lonestar Cell</div>
                          </button>

                          <button 
                            type="button"
                            onClick={() => setPaymentProvider('stripe')}
                            className={cn(
                              "p-3 rounded-2xl border transition-all text-left flex flex-col justify-between",
                              paymentProvider === 'stripe' ? "bg-orange-600/20 border-orange-500 text-white shadow-lg" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            <div className="font-black text-[11px] uppercase tracking-wider flex items-center gap-1">
                              <CreditCard size={12} className="text-orange-400 shrink-0" />
                              <span>Stripe Card</span>
                            </div>
                            <div className="text-[9px] text-orange-400 font-bold">Demo Sandbox</div>
                          </button>
                        </div>
                      </div>

                      {/* Render Stripe Card Form when Stripe is selected */}
                      {paymentProvider === 'stripe' && (
                        <StripeCardForm
                          cardNumber={cardNumber}
                          setCardNumber={setCardNumber}
                          expMonth={expMonth}
                          setExpMonth={setExpMonth}
                          expYear={expYear}
                          setExpYear={setExpYear}
                          cvc={cvc}
                          setCvc={setCvc}
                          cardHolderName={cardHolderName}
                          setCardHolderName={setCardHolderName}
                          onAutoFillTestCard={handleAutoFillTestCard}
                        />
                      )}

                      {/* Promo Code */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Promo code (SAVE10)" 
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3.5 focus:outline-none focus:border-orange-500 text-xs"
                            value={promoCode}
                            onChange={e => setPromoCode(e.target.value)}
                          />
                          <button 
                            type="button"
                            onClick={applyPromoCode}
                            className="bg-white/10 px-5 rounded-2xl font-bold hover:bg-white/20 text-xs uppercase"
                          >
                            Apply
                          </button>
                        </div>
                        {discount > 0 && <p className="text-xs text-green-500 font-bold">Discount applied: {discount * 100}% off</p>}
                      </div>

                      {/* Order Summary Box */}
                      <div className="bg-black/40 border border-white/10 p-5 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between text-white/60">
                          <span>{selectedTicketType || 'Ticket'} (${unitPrice.toFixed(2)} × {ticketQuantity})</span>
                          <span className="font-bold text-white">${subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-green-400 font-bold">
                            <span>Promo Discount ({(discount * 100)}%)</span>
                            <span>-${discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {addInsurance && (
                          <div className="flex justify-between text-green-400 font-bold">
                            <span>Insurance ($2.00 × {ticketQuantity})</span>
                            <span>+${insuranceFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="pt-2.5 border-t border-white/10 flex justify-between items-center text-sm font-black">
                          <span className="uppercase text-white/80">Total Payment</span>
                          <span className="text-xl text-orange-400 font-black">${totalPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleBookTicket}
                        disabled={isBooking || !selectedTicketType}
                        className="w-full bg-orange-600 text-white py-4 rounded-full font-black text-sm hover:bg-orange-500 transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50 uppercase tracking-wider"
                      >
                        {isBooking 
                          ? 'Processing & Dispatching Ticket...' 
                          : `BUY ${ticketQuantity} ${ticketQuantity === 1 ? 'TICKET' : 'TICKETS'} NOW ($${totalPrice.toFixed(2)})`}
                      </button>
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Table VIP Booking */
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40">Select Your VIP Table</label>
                  <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5">
                    <div className="grid grid-cols-3 gap-3">
                      {event.tableOptions?.map((table) => (
                        <button
                          key={table.number}
                          disabled={table.isReserved}
                          onClick={() => setSelectedTable(table.number)}
                          className={cn(
                            "relative aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 group",
                            table.isReserved 
                              ? "bg-red-500/5 border-red-500/10 text-red-500/20 cursor-not-allowed" 
                              : selectedTable === table.number
                                ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20"
                                : "bg-white/5 border-white/10 text-white/40 hover:border-white/30 hover:bg-white/10"
                          )}
                        >
                          <Armchair size={22} />
                          <span className="font-black text-xs">Table {table.number}</span>
                          <span className="text-[10px] font-bold">${table.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 focus:outline-none focus:border-orange-500 text-xs"
                    value={attendeeName}
                    onChange={e => setAttendeeName(e.target.value)}
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address (for QR code)" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 focus:outline-none focus:border-orange-500 text-xs"
                    value={attendeeEmail}
                    onChange={e => setAttendeeEmail(e.target.value)}
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number (for SMS QR link)" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 focus:outline-none focus:border-orange-500 text-xs"
                    value={attendeePhone}
                    onChange={e => setAttendeePhone(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleReserveTable}
                  disabled={isBooking || selectedTable === null}
                  className="w-full bg-orange-600 text-white py-4 rounded-full font-black text-sm hover:bg-orange-500 transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50 uppercase tracking-wider"
                >
                  {isBooking ? 'Processing Reservation...' : 'RESERVE VIP TABLE NOW'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
