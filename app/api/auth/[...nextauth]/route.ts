import NextAuth from "next-auth";
import authOptions from "~/lib/auth";

// NextAuth supports route handlers for App Router via GET/POST exports.
// Avoid `as any` here so TypeScript/ESLint can validate the handler shape.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

