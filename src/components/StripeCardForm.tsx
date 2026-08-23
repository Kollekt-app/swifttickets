import React from 'react';
import { CreditCard, Lock, Zap, ShieldCheck } from 'lucide-react';

interface StripeCardFormProps {
  cardNumber: string;
  setCardNumber: (val: string) => void;
  expMonth: string;
  setExpMonth: (val: string) => void;
  expYear: string;
  setExpYear: (val: string) => void;
  cvc: string;
  setCvc: (val: string) => void;
  cardHolderName: string;
  setCardHolderName: (val: string) => void;
  onAutoFillTestCard: () => void;
}

export default function StripeCardForm({
  cardNumber,
  setCardNumber,
  expMonth,
  setExpMonth,
  expYear,
  setExpYear,
  cvc,
  setCvc,
  cardHolderName,
  setCardHolderName,
  onAutoFillTestCard,
}: StripeCardFormProps) {
  // Format card number as 0000 0000 0000 0000
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 16) raw = raw.slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 4) raw = raw.slice(0, 4);
    setCvc(raw);
  };

  return (
    <div className="bg-black/40 border border-orange-500/30 rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold">
            <CreditCard size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Stripe Payment Sandbox</h4>
            <p className="text-[10px] text-white/40">Secure Credit / Debit Card Checkout</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAutoFillTestCard}
          className="flex items-center gap-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-400 px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all"
        >
          <Zap size={13} className="fill-orange-400" />
          <span>Fill Test Card</span>
        </button>
      </div>

      {/* Cardholder Name */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Cardholder Name</label>
        <input
          type="text"
          placeholder="e.g. Alex Johnson"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
          value={cardHolderName}
          onChange={e => setCardHolderName(e.target.value)}
        />
      </div>

      {/* Card Number */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Card Number</label>
          <span className="text-[10px] text-orange-400 font-extrabold">Demo: 4242...</span>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="4242 4242 4242 4242"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white tracking-widest font-mono focus:outline-none focus:border-orange-500 pr-10"
            value={cardNumber}
            onChange={handleCardNumberChange}
          />
          <Lock size={14} className="absolute right-3 top-3 text-white/30" />
        </div>
      </div>

      {/* Expiry & CVC */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Exp Month</label>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
            value={expMonth}
            onChange={e => setExpMonth(e.target.value)}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0');
              return <option key={m} value={m} className="bg-[#18181b] text-white">{m}</option>;
            })}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Exp Year</label>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
            value={expYear}
            onChange={e => setExpYear(e.target.value)}
          >
            {['26', '27', '28', '29', '30', '31'].map(y => (
              <option key={y} value={y} className="bg-[#18181b] text-white">20{y}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">CVC Code</label>
          <input
            type="password"
            placeholder="123"
            maxLength={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500 text-center"
            value={cvc}
            onChange={handleCvcChange}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 text-[10px] text-white/40">
        <ShieldCheck size={14} className="text-green-400 shrink-0" />
        <span>End-to-End Encrypted via Stripe API & Test Cards Supported</span>
      </div>
    </div>
  );
}
