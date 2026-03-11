# Database & Security Architecture

This document outlines how data is accessed and secured in the COI project.

## 1. Security Philosophy
The project follows a **Server-Side Authority** model:
- **Cloud Firestore**: Configured as **Read-Only** for the frontend. All modifications must go through the backend API.
- **Firebase Storage**: Requires **Authentication** for uploads. Frontend performs the binary upload, but metadata persistence is handled by the backend.

## 2. Access Patterns

### Frontend (Client SDK)
- **Role**: Data consumption and real-time synchronization.
- **Operations**: `onSnapshot`, `getDoc`, `getDocs`.
- **Constraint**: **NO WRITES** (`setDoc`, `addDoc`, `updateDoc`, `deleteDoc`).
- **Implementation**: Uses `lib/firebase.ts` (Firebase Client SDK).

### Backend (Admin SDK)
- **Role**: Data modification, privileged queries, and validation.
- **Operations**: All CRUD operations, including those bypassing security rules.
- **Constraint**: Must only be called within API routes or server-side helpers.
- **Implementation**: Uses `lib/firebaseAdmin.ts` (Firebase Admin SDK).

## 3. Communication Flow
To modify data, the frontend follows this sequence:
1.  **Request**: Frontend calls a backend API endpoint via `apiFetch`.
2.  **Verify**: Backend verifies the user's identity using `getVerifiedUid` (via `adminAuth`).
3.  **Execute**: Backend performs the database operation using `adminDb`.
4.  **Sync**: Frontend receives real-time updates automatically via existing `onSnapshot` listeners.

## 4. Configuration Files
- `firestore.rules`: Defines the read-only policy for Firestore.
- `storage.rules`: Defines authentication requirements for Storage.
- `firebase.json`: Links these rules to the Firebase project.

## 5. Applying Security Rules
Security rules are configuration files that live on the Firebase backend to protect your database and storage bucket, regardless of where your app is hosted.

After this PR is merged, you can apply these rules in two ways:

### Option A: Firebase CLI (Recommended)
This command **only** uploads the security rules and does not affect your hosting or other services:
```bash
firebase deploy --only firestore:rules,storage:rules
```

### Option B: Firebase Console (Manual)
1. Open your project in the [Firebase Console](https://console.firebase.google.com/).
2. For Firestore: Go to **Firestore Database** > **Rules** and paste the contents of `firestore.rules`.
3. For Storage: Go to **Storage** > **Rules** and paste the contents of `storage.rules`.
