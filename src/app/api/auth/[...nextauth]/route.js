// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import InstagramProvider from "next-auth/providers/instagram";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();

        // Look up customer in Supabase
        const { data: customer, error } = await supabaseAdmin
          .from("customers")
          .select("id, email, password_hash, first_name, last_name, display_name, image_url")
          .eq("email", email)
          .single();

        if (error || !customer) {
          return null;
        }

        // OAuth-only accounts don't have a password
        if (!customer.password_hash) {
          return null;
        }

        // Verify password
        const isValid = await bcrypt.compare(
          credentials.password,
          customer.password_hash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: customer.id,
          email: customer.email,
          name: customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(" "),
          image: customer.image_url || null,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        try {
          const email = user.email?.toLowerCase().trim();
          const firstName = user.name?.split(" ")[0] || "User";
          const lastName = user.name?.split(" ").slice(1).join(" ") || "";
          const displayName = user.name || email;

          // Upsert customer into Supabase
          await supabaseAdmin.from("customers").upsert(
            {
              email,
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
              image_url: user.image || null,
              auth_provider: "google",
            },
            { onConflict: "email" }
          );

          return true;
        } catch (error) {
          console.error("Error upserting Google customer:", error);
          return false;
        }
      }

      if (account.provider === "instagram") {
        try {
          const email = user.email || `${user.id}@instagram.com`;
          const firstName = user.name?.split(" ")[0] || "Instagram";
          const lastName = user.name?.split(" ").slice(1).join(" ") || "User";
          const displayName = user.name || email;

          // Upsert customer into Supabase
          await supabaseAdmin.from("customers").upsert(
            {
              email: email.toLowerCase().trim(),
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
              image_url: user.image || null,
              auth_provider: "instagram",
            },
            { onConflict: "email" }
          );

          return true;
        } catch (error) {
          console.error("Instagram sign-in error:", error);
          return false;
        }
      }

      // CredentialsProvider — already verified in authorize()
      return true;
    },

    async jwt({ token, account, user }) {
      if (account && user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.image = token.picture;
      session.user.id = token.id;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
