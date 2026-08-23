import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, ChevronDown, X, Check, Sparkles, Camera } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DeviceImagePickerProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  presetCategory?: 'competition' | 'contestant' | 'event';
  className?: string;
}

const PRESET_COMPETITION_IMAGES = [
  { name: 'DJ Battle & Stage', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80' },
  { name: 'Beauty Pageant & Crown', url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80' },
  { name: 'Gospel & Concert Stage', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80' },
  { name: 'Beach Fest & Outdoor Event', url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80' },
  { name: 'Talent Hunt & Mic', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80' },
  { name: 'Sports & Gaming Arena', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80' }
];

const PRESET_CONTESTANT_IMAGES = [
  { name: 'Male Artist / DJ (#01)', url: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&q=80' },
  { name: 'Female Pageant Queen (#02)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' },
  { name: 'Male Performer (#03)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
  { name: 'Female Advocate (#04)', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80' },
  { name: 'Female Ambassador (#05)', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80' },
  { name: 'Young Creator / Talent', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80' }
];

export default function DeviceImagePicker({
  value,
  onChange,
  label = 'Photo / Banner Image',
  presetCategory = 'competition',
  className
}: DeviceImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const presets = presetCategory === 'contestant' ? PRESET_CONTESTANT_IMAGES : PRESET_COMPETITION_IMAGES;

  // Handle Device File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, WEBP).');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[9px] font-bold text-orange-400 hover:underline uppercase"
          >
            {showUrlInput ? 'Hide URL Link' : 'Paste Image URL'}
          </button>
        </div>
      )}

      {/* Main Uploader Box */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3">
        {/* Preview & Action Bar */}
        <div className="flex items-center gap-3">
          {/* Thumbnail Preview */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 group">
            {value ? (
              <img src={value} alt="Selected" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20">
                <ImageIcon size={20} />
              </div>
            )}
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                title="Remove photo"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            {/* Upload Button + Device Trigger */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Upload size={14} /> Upload from Device
              </button>
            </div>

            {/* Dropdown Preset Selector */}
            <div className="relative">
              <select
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 font-bold focus:outline-none focus:border-orange-500 appearance-none cursor-pointer pr-8"
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(e.target.value);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select from Sample Photos Dropdown...</option>
                {presets.map((p, idx) => (
                  <option key={idx} value={p.url} className="bg-[#1a1a1a] text-white">
                    📷 {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Optional Manual URL Input */}
        {showUrlInput && (
          <div className="pt-2 border-t border-white/10">
            <input
              type="url"
              placeholder="Or paste direct image URL (https://...)"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
