import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const isValidUser = credentials.username === process.env.ADMIN_USERNAME;
        if (!isValidUser) return null;

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          process.env.ADMIN_PASSWORD_HASH!
        );
        if (!isValidPassword) return null;

        return { id: "admin", name: "Admin" };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
});
