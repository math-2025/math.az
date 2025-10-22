"use client";

import { app } from "./config";
import { getFirestore } from "firebase/firestore";

// This is a wrapper component that initializes Firebase for client components.
// It should be used to wrap pages or layouts that need access to Firebase services.
export function AppWrapper({ children }: { children: React.ReactNode }) {
  // Initialize Firestore
  getFirestore(app);

  return <>{children}</>;
}
