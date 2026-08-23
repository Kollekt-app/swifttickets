import { useState, useEffect, useMemo } from 'react';
import { Event, UserProfile } from '../types';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Music, 
  Utensils, 
  Waves, 
  GlassWater, 
  ChevronRight, 
  Star, 
  TrendingUp, 
  Clock, 
  Sparkles,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

import { MOCK_EVENTS } from '../mockData';

interface HomeProps {
  user: UserProfile | null;
  onAuthRequired: () => void;
}

export default function Home({ user, onAuthRequired }: HomeProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'upcoming' | 'popular' | 'recent'>('featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);

  const categories = [
    { name: 'All', icon: null },
    { name: 'Music', icon: <Music size={14} /> },
    { name: 'Nightlife', icon: <GlassWater size={14} /> },
    { name: 'Beach', icon: <Waves size={14} /> },
    { name: 'Restaurant', icon: <Utensils size={14} /> },
    { name: 'Conference', icon: <Sparkles size={14} /> },
  ];

  const getPriceRange = (event: Event) => {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return 'Free';
    const prices = event.ticketTypes.map(t => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min}` : `$${min} - $${max}`;
  };

  const sortedAndFilteredEvents = useMemo(() => {
    let filtered = events.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                           e.location.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
      
      const prices = e.ticketTypes?.map(t => Number(t.price)).filter(p => p >= 0) || [];

const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

const matchesPrice =
  minPrice >= priceRange[0] &&
  minPrice <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    });

    switch (sortBy) {
      case 'featured':
        return [...filtered].sort((a, b) => (b.priorityLevel || 0) - (a.priorityLevel || 0));
      case 'upcoming':
        return [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'popular':
        return [...filtered].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      case 'recent':
        return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      default:
        return filtered;
    }
  }, [events, search, activeCategory, sortBy, priceRange]);

  const featuredEvents = useMemo(() => 
    events.filter(e => (e.priorityLevel || 0) > 0).slice(0, 3)
  , [events]);

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero Section */}
      <section className="py-20 text-center relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.9]">
            THE <span className="text-orange-600 italic">PULSE</span> OF <br /> LIBERIA'S EVENTS
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10">
            The ultimate platform for concerts, nightlife, and conferences. 
            Discover and book tickets seamlessly on the web.
          </p>

          {!user && (
            <div className="flex justify-center mb-12">
              <button 
                onClick={onAuthRequired}
                className="group relative px-8 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-sm hover:bg-orange-600 hover:text-white transition-all overflow-hidden"
              >
                <span className="relative z-10">Get Started Now</span>
                <div className="absolute inset-0 bg-orange-600 translate-y-full group-hover:translate-y-0 transition-transform" />
              </button>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-3xl mx-auto">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input 
                type="text" 
                placeholder="Search events, venues, or locations..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 focus:outline-none focus:border-orange-500 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-6 py-4">
              <Filter size={18} className="text-orange-500" />
              <select 
                className="bg-transparent text-sm font-bold focus:outline-none"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="upcoming">Upcoming</option>
                <option value="popular">Popular</option>
                <option value="recent">Recent</option>
              </select>
            </div>
          </div>
        </motion.div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-600/10 blur-[120px] rounded-full -z-10" />
      </section>

      {/* Featured Events (Monetization) */}
      {featuredEvents.length > 0 && search === '' && activeCategory === 'All' && (
        <section className="mb-20">
          <div className="flex items-center gap-2 mb-8">
            <Star className="text-orange-500 fill-orange-500" size={20} />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Featured Events</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredEvents.map((event) => (
              <Link key={event.id} to={`/event/${event.id}`} className="group relative aspect-[16/9] rounded-[2rem] overflow-hidden border border-white/10">
                <img 
                  src={event.imageUrl} 
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-orange-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Featured</span>
                    <span className="text-white/60 text-xs font-bold">{event.category}</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-orange-500 transition-colors">{event.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Discovery Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border border-transparent",
                activeCategory === cat.name 
                  ? "bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/20" 
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              {cat.icon}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[400px] bg-white/5 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : sortedAndFilteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedAndFilteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/event/${event.id}`} className="group block h-full">
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden h-full transition-all hover:border-orange-500/50 hover:-translate-y-2">
                  <div className="relative h-72 overflow-hidden">
                    <img 
                      src={event.imageUrl || `https://picsum.photos/seed/${event.id}/800/600`} 
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {event.category}
                    </div>
                    {event.priorityLevel && event.priorityLevel > 0 && (
                      <div className="absolute top-6 right-6 bg-orange-600 p-2 rounded-full shadow-lg">
                        <Star size={14} className="fill-white" />
                      </div>
                    )}
                    <div className="absolute bottom-6 right-6 bg-white text-black px-5 py-1.5 rounded-full text-sm font-black shadow-xl">
                      {getPriceRange(event)}
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <h3 className="text-2xl font-black tracking-tight mb-4 group-hover:text-orange-500 transition-colors leading-tight">
                      {event.title}
                    </h3>
                    <div className="flex flex-col gap-3 text-white/40 text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-orange-500">
                          <Calendar size={14} />
                        </div>
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-orange-500">
                          <MapPin size={14} />
                        </div>
                        {event.location}
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={12} className="text-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                          {event.viewCount ? `${(event.viewCount / 1000).toFixed(1)}k views` : 'New Event'}
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-600 transition-colors group-hover:scale-110">
                        <ChevronRight size={24} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <p className="text-white/40 text-lg font-bold uppercase tracking-widest">No events found matching your criteria.</p>
          <button 
            onClick={() => { setSearch(''); setActiveCategory('All'); setSortBy('featured'); }}
            className="mt-6 text-orange-500 font-black uppercase tracking-widest text-xs hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Pagination (Mock) */}
      <div className="mt-20 flex items-center justify-center gap-4">
        <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors">1</button>
        <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">2</button>
        <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors">3</button>
        <button className="px-6 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors font-bold uppercase tracking-widest text-xs">Next</button>
      </div>
    </div>
  );
}
