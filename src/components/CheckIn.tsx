import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Camera, CheckCircle2, XCircle, ChevronLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function CheckIn({
  onBack,
  eventId,
  eventTitle,
  gate = 'Main Gate',
}: {
  onBack: () => void;
  eventId?: string;
  eventTitle?: string;
  gate?: string;
}) {
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('manual');
  const [ticketId, setTicketId] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; ticket?: any } | null>(null);

  const handleValidate = async (code: string) => {
    const trimmed = code.trim().toUpperCase();

    if (!trimmed) return;

    setValidating(true);
    setResult(null);

    try {
      // With an event selected this actually admits the holder; without one
      // it is a read-only authenticity check.
      const response = eventId
        ? await fetch('/api/scanner/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ticketCode: trimmed, eventId, gate }),
          })
        : await fetch(
            `/api/tickets/verify/${encodeURIComponent(trimmed)}`,
            { credentials: 'include' },
          );

      const data = await response.json().catch(() => ({}));

      if (!response.ok && !data?.status) {
        throw new Error(data?.error || `Request failed (${response.status})`);
      }

      const success = data?.valid === true;

      setResult({
        success,
        message:
          data?.message ||
          (success ? 'Access Granted' : 'Invalid Ticket'),
        ticket: data?.ticketCode
          ? {
              attendeeName: data.attendeeName,
              ticketType: data.ticketType,
              ticketCode: data.ticketCode,
            }
          : undefined,
      });

      if (success) {
        toast.success('Check-in successful!');
      } else {
        toast.error(data?.message || 'Ticket not accepted');
      }
    } catch (error: any) {
      console.error('Check-in failed:', error);

      setResult({
        success: false,
        message: error?.message || 'Could not reach the server',
      });

      toast.error('Could not reach the verification server');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
      >
        <ChevronLeft size={20} /> Back to Dashboard
      </button>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Ticket Validation</h1>
        <p className="text-white/40">
          {eventTitle
            ? `Admitting attendees to ${eventTitle} at ${gate}.`
            : 'Enter a ticket code to verify it. Select an event on the dashboard to admit attendees.'}
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-8">
        <div className="flex gap-2 p-1 bg-black/40 rounded-full">
          <button 
            onClick={() => setScanMode('camera')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all",
              scanMode === 'camera' ? "bg-white text-black" : "text-white/60 hover:text-white"
            )}
          >
            <Camera size={18} /> Camera Scan
          </button>
          <button 
            onClick={() => setScanMode('manual')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all",
              scanMode === 'manual' ? "bg-white text-black" : "text-white/60 hover:text-white"
            )}
          >
            <Search size={18} /> Manual Entry
          </button>
        </div>

        <AnimatePresence mode="wait">
          {scanMode === 'camera' ? (
            <motion.div 
              key="camera"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="aspect-square bg-black rounded-[2rem] border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent" />
              <QrCode size={64} className="text-white/20 animate-pulse" />
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Scanning for QR Code...</p>
              
              {/* Simulated scan overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-orange-500 rounded-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 animate-[scan_2s_linear_infinite]" />
              </div>
              
              <a
                href="/scanner"
                className="absolute bottom-8 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Open Full Camera Scanner
              </a>
            </motion.div>
          ) : (
            <motion.div 
              key="manual"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <input 
                type="text" 
                placeholder="Enter ticket code (e.g. SWIFT-8X92K-1024)" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-xl font-black uppercase tracking-widest focus:outline-none focus:border-orange-500"
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleValidate(ticketId)}
              />
              <button 
                onClick={() => handleValidate(ticketId)}
                disabled={validating || !ticketId}
                className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-500 transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
              >
                {validating ? 'Validating...' : 'VALIDATE TICKET'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-8 rounded-[2rem] border-2 flex flex-col items-center text-center gap-4",
              result.success ? "bg-green-500/10 border-green-500/50" : "bg-red-500/10 border-red-500/50"
            )}
          >
            {result.success ? (
              <CheckCircle2 size={48} className="text-green-500" />
            ) : (
              <XCircle size={48} className="text-red-500" />
            )}
            <div>
              <h3 className={cn("text-2xl font-black uppercase", result.success ? "text-green-500" : "text-red-500")}>
                {result.message}
              </h3>
              {result.ticket && (
                <div className="mt-4 space-y-1">
                  <p className="font-bold text-lg">{result.ticket.attendeeName}</p>
                  <p className="text-sm text-white/40 uppercase font-black tracking-widest">{result.ticket.ticketType}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
