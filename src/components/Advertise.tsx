import React from 'react';
import { motion } from 'motion/react';
import { Megaphone, BarChart, Users, Globe, Smartphone, MessageSquare } from 'lucide-react';

export default function Advertise() {
  const adOptions = [
    {
      title: 'Banner Ads',
      description: 'High-visibility banners on the homepage and event details pages.',
      icon: <Globe className="text-orange-500" size={32} />
    },
    {
      title: 'Social Media Promotion',
      description: 'Reach our followers on Instagram, Facebook, and Twitter.',
      icon: <Users className="text-orange-500" size={32} />
    },
    {
      title: 'Email Newsletters',
      description: 'Direct engagement with ticket buyers through our weekly event digests.',
      icon: <Globe className="text-orange-500" size={32} />
    },
    {
      title: 'Featured Events',
      description: 'Boost your event to the top of the search results.',
      icon: <Megaphone className="text-orange-500" size={32} />
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
          <Megaphone size={14} /> Brand Partnerships
        </motion.div>
        <h1 className="text-6xl font-black tracking-tighter uppercase mb-6">Advertise with Swift</h1>
        <p className="text-white/40 max-w-2xl mx-auto text-lg">
          Connect your brand with the most active event-goers in Liberia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        {adOptions.map((option, idx) => (
          <motion.div 
            key={option.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all"
          >
            <div className="mb-6">{option.icon}</div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">{option.title}</h2>
            <p className="text-white/40 text-sm">{option.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Why Advertise with Us?</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Targeted Audience</h3>
                <p className="text-white/40 text-sm">Reach young, tech-savvy, and active consumers in Liberia.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                <BarChart size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Data-Driven Insights</h3>
                <p className="text-white/40 text-sm">Get detailed reports on impressions, clicks, and engagement.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Request a Quote</h2>
          <p className="text-white/40 mb-8">
            Tell us about your brand and advertising goals.
          </p>
          <form className="space-y-4">
            <input 
              type="text" 
              placeholder="Brand Name" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
            />
            <input 
              type="email" 
              placeholder="Email Address" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
            />
            <textarea 
              placeholder="Tell us about your campaign..." 
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-orange-500"
            />
            <button className="w-full bg-orange-600 text-white py-4 rounded-full font-black uppercase tracking-widest hover:bg-orange-700 transition-all">
              Send Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
