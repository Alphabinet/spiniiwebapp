// lib/auth.ts
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const authConfig: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt", // or remove if you’re not managing sessions
    maxAge: 0, // expires immediately
  },
  callbacks: {
    async session() {
      return null; // disables session object
    },
  },
};

export default authConfig;
