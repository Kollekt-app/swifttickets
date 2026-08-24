export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  organizerId: string;
  organizerName: string;
  imageUrl: string;
  images?: string[];
  category: 'Music' | 'Club' | 'Beach' | 'Restaurant' | 'Conference' | 'Festival' | 'Nightlife' | 'Workshop';
  ticketTypes: TicketType[];
  tableOptions?: TableOption[];
  status: 'Draft' | 'Published' | 'Cancelled';
  isPrivate?: boolean;
  password?: string;
  schedule?: { time: string; activity: string }[];
  insuranceEnabled?: boolean;
  priorityLevel?: number; // For Featured Events
  featuredUntil?: string;
  viewCount?: number;
  conversionRate?: number;
  /** Public contact block for the event page. */
  organizer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface TicketType {
  name: string;
  price: number;
  capacity: number;
  sold: number;
}

export interface TableOption {
  number: number;
  price: number;
  capacity: number;
  isReserved: boolean;
}

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  qrCode?: string;
  ticketType: string;
  ticketCode: string;
  status: 'Active' | 'Used' | 'Cancelled' | 'Scanned' | 'Refunded';
  deliveryMethod: 'QR' | 'SMS';
  channel: 'Web' | 'Cash';
  scannedAt?: string;
  scannedGate?: string;
  createdAt: string;
  pricePaid: number;
  promoCodeUsed?: string;
  insuranceId?: string;
  /** Denormalised event details, sent with every ticket so the wallet and
   *  scanner can render without a second request. */
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventImageUrl?: string;
  event?: {
    title?: string;
    date?: string;
    location?: string;
    imageUrl?: string;
  };
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'Percentage' | 'Fixed';
  value: number;
  eventId: string;
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
}

export interface Reservation {
  id: string;
  eventId: string;
  userId: string;
  tableNumber: number;
  status: 'Confirmed' | 'Cancelled';
  createdAt: string;
}

export interface UserProfile {
  /** Primary identifier. `id` mirrors it so either spelling works. */
  uid: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'Admin' | 'Organizer' | 'Customer';
  plan?: string; // For Organizers
  balance?: number; // For Organizers
  payoutMethod?: 'MobileMoney' | 'Bank' | 'PayPal';
  payoutDetails?: string;
}

export interface CheckIn {
  id: string;
  ticketId: string;
  scannedBy: string; // User ID of staff
  timestamp: string;
  method: 'QR' | 'Code' | 'Manual';
}

export interface Payout {
  id: string;
  organizerId: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  payoutMethod: string;
  createdAt: string;
  processedAt?: string;
}

export interface EventInsurance {
  id: string;
  eventId: string;
  provider: string;
  coverageAmount: number;
  premium: number;
}

export interface SMSNotification {
  id: string;
  userId: string;
  phone: string;
  message: string;
  type: 'Confirmation' | 'Reminder' | 'Alert';
  status: 'Sent' | 'Failed';
  createdAt: string;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  organizerId: string;
  associatedEvent?: string;
  category?: string;
  location?: string;
  votePrice?: number;
  votePackages?: VotePackage[];
  commissionRate?: number; // e.g. 0.10 for 10% platform fee
  showLiveLeaderboard?: boolean;
  startDate: string;
  endDate: string;
  status: 'Draft' | 'Active' | 'Closed';
  candidates: Candidate[];
}
export interface Candidate {
  id: string;
  contestantNumber?: string; // e.g. "#01", "#02"
  name: string;
  description: string;
  imageUrl: string;
  voteCount: number;
}

export interface Vote {
  id: string;
  competitionId: string;
  candidateId: string;
  userId: string;
  timestamp: string;
}


export interface VotePackage {
  votes: number;
  price: number;
  discountLabel?: string;
}

export interface VoteTransaction {
  id: string;
  competitionId: string;
  competitionTitle: string;
  candidateId: string;
  candidateName: string;
  contestantNumber?: string;
  voterName: string;
  voterPhone: string;
  voteQuantity: number;
  amountPaid: number;
  commissionAmount: number; // 10% platform fee
  organizerEarnings: number; // 90% net payout
  paymentMethod: string;
  reference: string;
  timestamp: string;
}
