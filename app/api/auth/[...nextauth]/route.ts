import NextAuth from "next-auth";
import authOptions from "~/lib/auth";

// NextAuth supports route handlers for App Router via GET/POST exports.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };


