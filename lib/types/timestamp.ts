import { Timestamp } from "firebase/firestore";

export type TimestampType = Timestamp | { seconds: number; nanoseconds: number } | Date | string;
