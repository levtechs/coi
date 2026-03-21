import { TimestampType } from "@/lib/types/timestamp";

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: TimestampType;
  updatedAt: TimestampType;
  parentId: string | null;
  upvotes: string[];
  downvotes: string[];
  replies: string[];
}

export interface CommentWithAuthor extends Omit<Comment, "replies"> {
  author: {
    id: string;
    displayName: string;
    email: string;
  };
  replies: string[];
}

export interface CommentTree extends Omit<Comment, "replies"> {
  author: {
    id: string;
    displayName: string;
    email: string;
  };
  replies: CommentTree[];
}

export interface CreateCommentData {
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  content: string;
}
