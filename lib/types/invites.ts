export interface Invite {
  id?: string;
  token: string;
  projectId?: string;
  courseId?: string;
  friendRequest?: boolean;
  requesterId?: string;
  createdBy: string;
  createdAt: string;
  acceptedBy: string[];
}
