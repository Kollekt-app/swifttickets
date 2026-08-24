/**
 * Prisma rows use ids and Date objects; the React app expects `uid`, ISO
 * strings and nested arrays. Everything crossing the wire goes through here.
 */

const iso = (value: Date | null | undefined): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

/**
 * Never hand the client an empty image URL — `<img src="">` makes the browser
 * re-request the current page. Fall back to a stable per-record placeholder.
 */
const image = (value: string | null | undefined, seed: string): string =>
  value && value.trim()
    ? value
    : `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800`;

export const publicUser = (user: any) => ({
  uid: user.id,
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone ?? undefined,
  role: user.role,
  plan: user.plan ?? undefined,
  payoutMethod: user.payoutMethod ?? undefined,
  payoutDetails: user.payoutDetails ?? undefined,
  createdAt: iso(user.createdAt),
});

export const publicEvent = (event: any) => ({
  id: event.id,
  title: event.title,
  description: event.description,
  date: iso(event.date),
  endDate: iso(event.endDate),
  location: event.location,
  organizerId: event.organizerId,
  organizerName: event.organizer?.name ?? 'Swift Organizer',
  organizer: event.organizer
    ? {
        name: event.organizer.name,
        email: event.organizer.email ?? undefined,
        phone: event.organizer.phone ?? undefined,
      }
    : undefined,
  imageUrl: image(event.imageUrl, event.id),
  images: event.images ?? [],
  category: event.category,
  status: event.status,
  isPrivate: event.isPrivate,
  // The password hash never leaves the server; the client only needs to know
  // that a password is required.
  schedule: event.schedule ?? undefined,
  insuranceEnabled: event.insuranceEnabled,
  priorityLevel: event.priorityLevel,
  featuredUntil: iso(event.featuredUntil),
  viewCount: event.viewCount,
  conversionRate: event.conversionRate ?? undefined,
  ticketTypes: (event.ticketTypes ?? []).map((type: any) => ({
    name: type.name,
    price: type.price,
    capacity: type.capacity,
    sold: type.sold,
  })),
  tableOptions: (event.tableOptions ?? []).map((table: any) => ({
    number: table.number,
    price: table.price,
    capacity: table.capacity,
    isReserved: table.isReserved,
  })),
});

export const publicTicket = (ticket: any) => ({
  id: ticket.id,
  eventId: ticket.eventId,
  userId: ticket.userId ?? undefined,
  attendeeName: ticket.attendeeName,
  attendeeEmail: ticket.attendeeEmail,
  attendeePhone: ticket.attendeePhone ?? undefined,
  ticketType: ticket.ticketType,
  ticketCode: ticket.ticketCode,
  qrCode: ticket.ticketCode,
  status: ticket.status,
  deliveryMethod: ticket.deliveryMethod,
  channel: ticket.channel,
  scannedAt: iso(ticket.scannedAt),
  scannedGate: ticket.scannedGate ?? undefined,
  createdAt: iso(ticket.createdAt),
  pricePaid: ticket.pricePaid,
  promoCodeUsed: ticket.promoCodeUsed ?? undefined,
  insuranceId: ticket.insuranceId ?? undefined,
  eventTitle: ticket.event?.title,
  eventDate: iso(ticket.event?.date),
  eventLocation: ticket.event?.location,
  eventImageUrl: ticket.event ? image(ticket.event.imageUrl, ticket.eventId) : undefined,
  event: ticket.event
    ? {
        title: ticket.event.title,
        date: iso(ticket.event.date),
        location: ticket.event.location,
        imageUrl: image(ticket.event.imageUrl, ticket.eventId),
      }
    : undefined,
});

export const publicWithdrawal = (withdrawal: any) => ({
  id: withdrawal.id,
  organizerId: withdrawal.organizerId,
  organizerName: withdrawal.organizer?.name ?? 'Unknown organizer',
  amount: withdrawal.amount,
  provider: withdrawal.provider,
  phone: withdrawal.phone,
  status: withdrawal.status,
  createdAt: iso(withdrawal.createdAt),
  processedAt: iso(withdrawal.processedAt),
});

export const publicTransaction = (transaction: any) => ({
  id: transaction.id,
  type: transaction.type,
  amount: transaction.amount,
  description: transaction.description,
  reference: transaction.reference,
  createdAt: iso(transaction.createdAt),
});

export const publicCandidate = (candidate: any) => ({
  id: candidate.id,
  contestantNumber: candidate.contestantNumber ?? undefined,
  name: candidate.name,
  description: candidate.description,
  imageUrl: image(candidate.imageUrl, candidate.id),
  voteCount: candidate.voteCount,
});

export const publicCompetition = (competition: any) => ({
  id: competition.id,
  title: competition.title,
  description: competition.description,
  imageUrl: image(competition.imageUrl, competition.id),
  organizerId: competition.organizerId,
  associatedEvent: competition.associatedEvent ?? undefined,
  category: competition.category ?? undefined,
  location: competition.location ?? undefined,
  votePrice: competition.votePrice,
  votePackages: competition.votePackages ?? undefined,
  commissionRate: competition.commissionRate,
  showLiveLeaderboard: competition.showLiveLeaderboard,
  startDate: iso(competition.startDate),
  endDate: iso(competition.endDate),
  status: competition.status,
  candidates: (competition.candidates ?? []).map(publicCandidate),
});

export const publicVoteTransaction = (vote: any) => ({
  id: vote.id,
  competitionId: vote.competitionId,
  competitionTitle: vote.competition?.title ?? '',
  candidateId: vote.candidateId,
  candidateName: vote.candidate?.name ?? '',
  contestantNumber: vote.candidate?.contestantNumber ?? undefined,
  voterName: vote.voterName,
  voterPhone: vote.voterPhone,
  voteQuantity: vote.voteQuantity,
  amountPaid: vote.amountPaid,
  commissionAmount: vote.commissionAmount,
  organizerEarnings: vote.organizerEarnings,
  paymentMethod: vote.paymentMethod,
  reference: vote.reference,
  timestamp: iso(vote.createdAt),
});
