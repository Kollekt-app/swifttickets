import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, Plus, MapPin } from 'lucide-react';
import { UserProfile } from '../../types';

export default function SelectGateScreen({ 
  user, 
  onGateSelect 
}: { 
  user: UserProfile | null, 
  onGateSelect: (gate: string) => void 
}) {
  const navigate = useNavigate();
  const [customGate, setCustomGate] = useState('');

  const gates = ['Gate 1', 'Gate 2', 'VIP', 'Backstage'];

  const handleGateClick = (gate: string) => {
    onGateSelect(gate);
    navigate('/scanner/events');
  };

  const handleCustomGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customGate.trim()) {
      onGateSelect(customGate.trim());
      navigate('/scanner/events');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
          <MapPin size={32} />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Select Gate</h1>
        <p className="text-white/40 text-sm">Choose the entry point you are managing</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {gates.map((gate) => (
          <button 
            key={gate}
            onClick={() => handleGateClick(gate)}
            className="w-full group bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all text-left"
          >
            <span className="text-xl font-bold">{gate}</span>
            <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      <div className="pt-8 border-t border-white/10">
        <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Custom Gate</p>
        <form onSubmit={handleCustomGateSubmit} className="flex gap-3">
          <input 
            type="text" 
            value={customGate}
            onChange={(e) => setCustomGate(e.target.value)}
            placeholder="Enter gate name..."
            className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button 
            type="submit"
            className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center hover:bg-orange-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}
