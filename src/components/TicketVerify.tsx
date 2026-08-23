import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Calendar, MapPin, User, ChevronLeft, Search } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationResult {
  valid: boolean;
  status: 'VALID' | 'ALREADY_SCANNED' | 'REFUNDED' | 'TRANSFERRED' | 'INVALID';
  message: string;
  ticketCode?: string;
  attendeeName?: string;
  ticketType?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  organizerName?: string;
  scannedAt?: string;
  scannedGate?: string;
}

export default function TicketVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [ticketCodeInput, setTicketCodeInput] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const verifyCode = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) {
      toast.error('Please enter a ticket code');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/tickets/verify/${encodeURIComponent(codeToVerify.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      toast.error('Failed to connect to verification server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      verifyCode(codeParam);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto space-y-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
          <ShieldCheck size={16} /> Swift Official Ticket Verification
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">Verify Ticket Credential</h1>
        <p className="text-white/50 text-sm max-w-lg mx-auto">
          Buying or checking a second-hand ticket in Liberia? Verify instant authenticity, gate status, and holder details below to prevent fraud.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-[#111] border border-white/10 p-6 rounded-[2.5rem] shadow-2xl space-y-4">
        <label className="text-xs font-black uppercase tracking-widest text-white/40 block">Enter Ticket Code (e.g. SWIFT-...)</label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. SWIFT-8X92K-1024"
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-mono font-bold text-lg text-white uppercase focus:outline-none focus:border-orange-500"
            value={ticketCodeInput}
            onChange={(e) => setTicketCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verifyCode(ticketCodeInput)}
          />
          <button
            onClick={() => verifyCode(ticketCodeInput)}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-500 text-white px-8 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
            <span>Verify</span>
          </button>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top Status Banner */}
          {result.valid ? (
            <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-3xl flex items-center gap-4 text-green-400">
              <CheckCircle2 size={40} className="shrink-0" />
              <div>
                <h3 className="text-xl font-black uppercase tracking-wide">100% Genuine & Active Ticket</h3>
                <p className="text-xs text-green-300/80">{result.message}</p>
              </div>
            </div>
          ) : result.status === 'ALREADY_SCANNED' ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-3xl flex items-center gap-4 text-yellow-400">
              <ShieldAlert size={40} className="shrink-0" />
              <div>
                <h3 className="text-xl font-black uppercase tracking-wide">Warning: Already Scanned</h3>
                <p className="text-xs text-yellow-300/80">{result.message}</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-3xl flex items-center gap-4 text-red-400">
              <XCircle size={40} className="shrink-0" />
              <div>
                <h3 className="text-xl font-black uppercase tracking-wide">Invalid / Fraudulent Ticket</h3>
                <p className="text-xs text-red-300/80">{result.message}</p>
              </div>
            </div>
          )}

          {/* Ticket Details Grid */}
          {result.eventTitle && (
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Event Name</span>
                  <p className="text-base font-black text-white">{result.eventTitle}</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Organizer</span>
                  <p className="text-base font-black text-orange-400">{result.organizerName}</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Original Attendee</span>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <User size={14} className="text-orange-500" /> {result.attendeeName}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Ticket Category</span>
                  <p className="text-sm font-bold text-white">{result.ticketType}</p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Event Date & Venue</span>
                  <p className="text-xs font-bold text-white flex items-center gap-1">
                    <Calendar size={13} className="text-orange-500" /> {result.eventDate ? new Date(result.eventDate).toLocaleDateString() : 'TBA'}
                  </p>
                  <p className="text-xs text-white/60 flex items-center gap-1">
                    <MapPin size={13} className="text-orange-500" /> {result.eventLocation}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Unique Code</span>
                  <p className="text-base font-mono font-black text-white tracking-widest">{result.ticketCode}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
