import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { isAllowedIdentity } from "@/lib/access-policy";
import { getServerEnv } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "not-configured",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "not-configured",
    }),
  ],
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        return false;
      }

      const env = getServerEnv();
      const subjectId = typeof profile?.sub === "string" ? profile.sub : user.id;
      return isAllowedIdentity({ email: user.email, subjectId }, env);
    },
    async jwt({ profile, token }) {
      if (typeof profile?.sub === "string") {
        token.providerSubject = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.providerSubject = token.providerSubject;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export default NextAuth(authOptions);
