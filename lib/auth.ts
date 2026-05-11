import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import fs from "fs";
import path from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import CognitoProvider from "next-auth/providers/cognito";
import { verifyPassword } from "~/utils/hash";
import { userIdFromEmail } from "~/utils/userId";

function usersTableName() {
  return process.env.DYNAMODB_USERS_TABLE || process.env.DYNAMODB_TABLE_USERS;
}

async function findLocalUserByEmail(email: string) {
  const table = usersTableName();
  if (table) {
    const client = new DynamoDBClient({});
    const doc = DynamoDBDocumentClient.from(client);
    try {
      const uid = userIdFromEmail(email);
      const byId = await doc.send(new GetCommand({ TableName: table, Key: { userId: uid } }));
      if (byId.Item) return byId.Item;
      const legacy = await doc.send(new GetCommand({ TableName: table, Key: { email } as any }));
      if (legacy.Item) return legacy.Item;
      const scanned = await doc.send(
        new ScanCommand({
          TableName: table,
          FilterExpression: "email = :e",
          ExpressionAttributeValues: { ":e": email },
          Limit: 5,
        }),
      );
      return scanned.Items?.[0] ?? null;
    } catch (err) {
      return null;
    }
  }
  const usersFile = path.join(process.cwd(), "data", "users.json");
  if (!fs.existsSync(usersFile)) return null;
  const users = JSON.parse(fs.readFileSync(usersFile, "utf-8") || "[]");
  return users.find((u: any) => u.email === email) || null;
}

const cognitoIssuer =
  process.env.AWS_REGION && process.env.AWS_COGNITO_USER_POOL_ID
    ? `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_COGNITO_USER_POOL_ID}`
    : undefined;

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials provider for local sign-in
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    async authorize(credentials) {
      if (!credentials) return null;
      const { email, password } = credentials as { email: string; password: string };
      const user = await findLocalUserByEmail(email);
      if (!user) return null;

      const ok = verifyPassword(password, user.salt, user.passwordHash);
      if (!ok) return null;

      const id = user.userId ?? userIdFromEmail(email);
      return {
        id,
        email: user.email,
        name: user.name,
        role: user.role ?? "student",
        classId: user.classId ?? null,
      };
    },
    }),
    ...(process.env.AWS_COGNITO_CLIENT_ID &&
    cognitoIssuer &&
    process.env.AWS_COGNITO_CLIENT_SECRET
      ? [
          CognitoProvider({
            clientId: process.env.AWS_COGNITO_CLIENT_ID,
            clientSecret: process.env.AWS_COGNITO_CLIENT_SECRET,
            issuer: cognitoIssuer,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user, profile }) {
      if (account) {
        // Credentials provider doesn't include access_token, but Cognito does.
        token.accessToken = (account as any).access_token;
      }

      if (user) {
        token.sub = token.sub ?? (user as any).id;
        token.email = (user as any).email ?? token.email;
        token.name = (user as any).name ?? token.name;
        token.role = (user as any).role ?? token.role ?? "student";
        token.classId = (user as any).classId ?? token.classId ?? null;
      }

      if (profile && !token.role) {
        token.role =
          (profile as any)["custom:role"] ??
          (profile as any)["role"] ??
          (Array.isArray((profile as any)["cognito:groups"]) ? (profile as any)["cognito:groups"][0] : undefined) ??
          token.role;
      }

      return token;
    },
    async session({ session, token }) {
      const t = token as any;

      const userObj = {
        id: t.sub,
        email: t.email ?? session.user?.email,
        name: t.name ?? session.user?.name,
        role: t.role ?? ((session.user as any)?.role ?? "student"),
        classId: t.classId ?? null,
      };

      session.user = userObj as any;
      (session as any).accessToken = t.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
