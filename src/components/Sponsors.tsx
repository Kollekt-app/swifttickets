import React from 'react';
import { motion } from 'motion/react';
import { Handshake, Star, Award, ShieldCheck } from 'lucide-react';

export default function Sponsors() {
  const sponsorTiers = [
    {
      name: 'Platinum',
      description: 'Maximum visibility across all platforms and events.',
      icon: <Star className="text-yellow-500" size={32} />,
      sponsors: ['Lonestar MTN', 'Orange Liberia', 'Farmington Hotel']
    },
    {
      name: 'Gold',
      description: 'High-level exposure and dedicated marketing support.',
      icon: <Award className="text-gray-300" size={32} />,
      sponsors: ['UBA Liberia', 'Ecobank', 'CBL']
    },
    {
      name: 'Silver',
      description: 'Strategic placement and brand recognition.',
      icon: <ShieldCheck className="text-orange-500" size={32} />,
      sponsors: ['TotalEnergies', 'LPRC', 'NASSCORP']
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-4"
        >
          <Handshake size={14} /> Our Partners
        </motion.div>
        <h1 className="text-6xl font-black tracking-tighter uppercase mb-6">Sponsors & Partners</h1>
        <p className="text-white/40 max-w-2xl mx-auto text-lg">
          We work with Liberia's leading brands to deliver world-class event experiences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {sponsorTiers.map((tier, idx) => (
          <motion.div 
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all"
          >
            <div className="mb-6">{tier.icon}</div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">{tier.name} Tiers</h2>
            <p className="text-white/40 text-sm mb-8">{tier.description}</p>
            
            <div className="space-y-4">
              {tier.sponsors.map(sponsor => (
                <div key={sponsor} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <span className="font-bold">{sponsor}</span>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 bg-orange-600 rounded-[3rem] p-12 text-center">
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Become a Sponsor</h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          Partner with Swift Tickets to reach thousands of event-goers across Liberia.
        </p>
        <button className="bg-white text-black px-12 py-4 rounded-full font-black uppercase tracking-widest hover:bg-white/90 transition-all">
          Download Media Kit
        </button>
      </div>
    </div>
  );
}
