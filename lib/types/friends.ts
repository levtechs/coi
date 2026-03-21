export interface LeaderboardEntry {
  id: string;
  displayName: string;
  weeklyActions: number;
  dailyActions: number;
  actions: number;
  projectCount: number;
  isCurrentUser: boolean;
}

export type FriendshipStatus = "pending" | "accepted";

export interface Friendship {
  id: string;
  users: [string, string];
  status: FriendshipStatus;
  requesterId: string;
  createdAt: string;
  acceptedAt?: string;
}
