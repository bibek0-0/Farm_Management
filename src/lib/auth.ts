import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import connectDB from '@/lib/db';
import AdminSettings from '@/models/AdminSettings';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          await connectDB();

          let adminDoc = await AdminSettings.findOne();

          // Auto-seed default admin on first run if no settings doc exists
          if (!adminDoc) {
            const passwordHash = await bcryptjs.hash('1234', 12);
            adminDoc = await AdminSettings.create({
              username: 'admin',
              passwordHash,
            });
          }

          // Username check (case-insensitive via stored lowercase)
          if (
            adminDoc.username !==
            (credentials.username as string).toLowerCase().trim()
          ) {
            return null;
          }

          // Password check
          const passwordMatch = await bcryptjs.compare(
            credentials.password as string,
            adminDoc.passwordHash
          );

          if (!passwordMatch) {
            return null;
          }

          return {
            id: adminDoc._id.toString(),
            username: adminDoc.username,
            name: adminDoc.username,
          };
        } catch (error) {
          console.error('[Auth] authorize error:', error);
          return null;
        }
      },
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = (user as { id: string; username: string }).username;
        token.id = (user as { id: string; username: string }).id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { username?: string; id?: string }).username =
          token.username as string;
        (session.user as { username?: string; id?: string }).id =
          token.id as string;
      }
      return session;
    },
  },
});

// Type augmentation so session.user.username is typed everywhere
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// JWT token fields (username, id) are handled via type casting in the jwt callback above.
