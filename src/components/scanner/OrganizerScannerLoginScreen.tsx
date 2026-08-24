import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Scan, Globe, ChevronRight } from 'lucide-react';
import { UserProfile } from '../../types';

export default function OrganizerScannerLoginScreen({
  user,
  onAuthRequired,
}: {
  user: UserProfile | null;
  onAuthRequired: () => void;
}) {
  const navigate = useNavigate();

  // Admins run gates too, so both roles pass through.
  const canScan = user?.role === 'Organizer' || user?.role === 'Admin';

  const handleLoginClick = () => {
    if (canScan) {
      navigate('/scanner/gate');
    } else {
      onAuthRequired();
    }
  };

  React.useEffect(() => {
    if (canScan) {
      navigate('/scanner/gate');
    }
  }, [canScan, navigate]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-orange-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-orange-600/20"
      >
        <Scan size={48} className="text-white" />
      </motion.div>
      
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Swift Scanner</h1>
      <p className="text-white/60 mb-12 max-w-xs mx-auto">
        Dedicated entry management for event organizers. Scan tickets, manage gates, and track attendance in real-time.
      </p>

      {user && !canScan && (
        <p className="mb-6 max-w-xs mx-auto bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold rounded-2xl px-4 py-3">
          You are signed in as a {user.role}. Gate scanning is limited to
          organizer accounts.
        </p>
      )}

      <button 
        onClick={handleLoginClick}
        className="w-full max-w-xs group bg-white text-black p-6 rounded-[2rem] flex items-center justify-between hover:bg-white/90 transition-all"
      >
        <div className="flex items-center gap-3">
          <Globe size={20} />
          <span className="text-lg font-black uppercase tracking-widest">
            {user ? 'Switch Account' : 'Login as Organizer'}
          </span>
        </div>
        <ChevronRight className="text-black/20 group-hover:translate-x-1 transition-transform" />
      </button>

      <p className="mt-12 text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
        Secure Organizer Access Only
      </p>
    </div>
  );
}
