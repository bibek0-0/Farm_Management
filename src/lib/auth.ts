import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import connectDB from '@/lib/db';
import AdminSettings, { UserRole } from '@/models/AdminSettings';

/**
 * Ensures both Upper Admin (bibek) and standard Admin (admin)
 * exist in the database with their respective roles.
 */
async function ensureDefaultAccounts() {
  try {
    // 1. Ensure Upper Admin (bibek) exists
    const bibekDoc = await AdminSettings.findOne({ username: 'bibek' });
    if (!bibekDoc) {
      const passwordHash = await bcryptjs.hash('bib@k2005', 12);
      await AdminSettings.create({
        username: 'bibek',
        passwordHash,
        role: 'upper_admin',
        name: 'bibek',
      });
    } else if (bibekDoc.role !== 'upper_admin') {
      bibekDoc.role = 'upper_admin';
      await bibekDoc.save();
    }

    // 2. Ensure Admin (admin) exists
    const adminDoc = await AdminSettings.findOne({ username: 'admin' });
    if (!adminDoc) {
      const passwordHash = await bcryptjs.hash('1234', 12);
      await AdminSettings.create({
        username: 'admin',
        passwordHash,
        role: 'admin',
        name: 'Admin',
      });
    } else if (!adminDoc.role) {
      adminDoc.role = 'admin';
      await adminDoc.save();
    }
  } catch (err) {
    console.error('[Auth] Error verifying default accounts:', err);
  }
}

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
          await ensureDefaultAccounts();

          const inputUsername = (credentials.username as string).toLowerCase().trim();
          const userDoc = await AdminSettings.findOne({ username: inputUsername });

          if (!userDoc) {
            return null;
          }

          // Password check
          const passwordMatch = await bcryptjs.compare(
            credentials.password as string,
            userDoc.passwordHash
          );

          if (!passwordMatch) {
            return null;
          }

          const role: UserRole = userDoc.role || (userDoc.username === 'bibek' ? 'upper_admin' : 'admin');

          return {
            id: userDoc._id.toString(),
            username: userDoc.username,
            name: userDoc.name || userDoc.username,
            role: role,
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
        const u = user as { id: string; username: string; role?: UserRole; name?: string | null };
        token.username = u.username;
        token.id = u.id;
        token.role = u.role || 'admin';
        token.name = u.name || u.username;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.username = token.username as string;
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || 'admin';
        session.user.name = (token.name as string) || (token.username as string);
      }
      return session;
    },
  },
});

// Type augmentation so session.user fields are typed everywhere
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    role: UserRole;
    name?: string | null;
  }
}
