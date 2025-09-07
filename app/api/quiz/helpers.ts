import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";

import { Card } from "@/lib/types";

export const createQuizFromCards = async (cards: Card[]) => {
    return  "some_quiz_id";
}