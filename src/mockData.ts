import { Event, UserProfile, Ticket, Reservation, Payout, Competition } from './types';

export const MOCK_EVENTS: Event[] = [];

export const MOCK_USER: UserProfile = {
  uid: 'mock-admin-123',
  name: 'Mock Administrator',
  email: 'admin@mock.swift',
  role: 'Admin',
  phone: '+231 88 000 0000'
};

export const MOCK_TICKETS: Ticket[] = [];

export const MOCK_RESERVATIONS: Reservation[] = [];

export const MOCK_PAYOUTS: Payout[] = [];

export const MOCK_COMPETITIONS: Competition[] = [];
