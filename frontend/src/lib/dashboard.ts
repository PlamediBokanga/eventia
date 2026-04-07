"use client";

import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

export type EventItem = {
  id: number;
  name: string;
  type: string;
  dateTime: string;
  location: string;
  address?: string | null;
  details?: string | null;
  program?: string | null;
  programItems?: Array<{
    id: number;
    timeLabel: string;
    title: string;
    description?: string | null;
    order: number;
  }>;
  invitationMessage?: string | null;
  coverImageUrl?: string | null;
  hostNames?: string | null;
  seatingMode?: "TABLE" | "ZONE" | "NONE";
  logoUrl?: string | null;
  themePreset?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  animationStyle?: string | null;
  drinksEnabled?: boolean;
  guestbookRequiresApproval?: boolean;
  isOwner?: boolean;
  coOrganizerCount?: number;
  tableCount?: number;
  capacityPerTable?: number;
};

export type EventCoOrganizer = {
  id: number;
  organizer: {
    id: number;
    email: string;
    name?: string | null;
  };
  invitedBy: {
    id: number;
    email: string;
    name?: string | null;
  };
  createdAt: string;
};

export type GuestItem = {
  id: number;
  fullName: string;
  lastName?: string | null;
  middleName?: string | null;
  firstName?: string | null;
  sex?: "M" | "F" | null;
  category?: string | null;
  guestType?: "COUPLE" | "MR" | "MME" | "MLLE" | null;
  phone?: string | null;
  email?: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELED";
  plusOneCount?: number;
  allergies?: string | null;
  mealPreference?: string | null;
  invitationUrl?: string | null;
  invitationSentAt?: string | null;
  invitationOpenedAt?: string | null;
  invitationOpenCount?: number;
  table?: { id: number; label: string } | null;
};

export type EventStats = {
  guests: {
    total: number;
    confirmed: number;
    canceled: number;
    pending: number;
  };
  invitations?: {
    total: number;
    sent: number;
  };
  tables: {
    id: number;
    label: string;
    capacity: number;
    guestCount: number;
  }[];
  drinks: {
    id: number;
    name: string;
    category: "ALCOHOLIC" | "SOFT";
    totalQuantity: number;
  }[];
};

export type DrinkOption = {
  id: number;
  name: string;
  category: "ALCOHOLIC" | "SOFT";
  availableQuantity?: number | null;
  maxPerGuest?: number | null;
};

export type GiftRegistryItem = {
  id: number;
  title: string;
  description?: string | null;
  url: string;
  isCashFund: boolean;
  createdAt: string;
};

export type EventMemoryItem = {
  id: number;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  caption?: string | null;
  uploadedByName?: string | null;
  createdAt: string;
};

export type EventChatMessage = {
  id: number;
  senderType: "HOST" | "GUEST";
  senderName: string;
  message: string;
  createdAt: string;
  eventId: number;
  readAt?: string | null;
  guestId?: number | null;
  guest?: {
    id: number;
    fullName?: string | null;
  } | null;
};

export type EventQuickReply = {
  id: number;
  text: string;
  createdAt: string;
};

export type OrganizerProfile = {
  id: number;
  email: string;
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  securityAlerts?: boolean;
  companyName?: string | null;
  jobTitle?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  website?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  createdAt?: string;
};

export type OrganizerStats = {
  totalEvents: number;
  totalGuests: number;
  confirmed: number;
  pending: number;
  canceled: number;
  types: Record<string, number>;
};

export type OrganizerSession = {
  id: string;
  device: string;
  ip?: string | null;
  location?: string | null;
  lastActive?: string | null;
};

const EVENT_STORAGE_KEY = "eventia_selected_event_id";

export function getSelectedEventId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(EVENT_STORAGE_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function setSelectedEventId(eventId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EVENT_STORAGE_KEY, String(eventId));
}

export async function authFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...getAuthHeaders()
    }
  });
}
