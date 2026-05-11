import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.AWS_REGION || "us-east-1";
const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID || "";

const client = new CognitoIdentityProviderClient({ region: REGION });

export async function getUserByUsername(username: string) {
  const cmd = new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: username });
  return client.send(cmd);
}

export async function createUser(username: string, temporaryPassword: string, attributes: Record<string, string> = {}) {
  const UserAttributes = Object.entries(attributes).map(([Name, Value]) => ({ Name, Value }));
  const cmd = new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    TemporaryPassword: temporaryPassword,
    UserAttributes,
    MessageAction: "SUPPRESS",
  });
  return client.send(cmd);
}

export async function updateUserAttributes(username: string, attributes: Record<string, string>) {
  const UserAttributes = Object.entries(attributes).map(([Name, Value]) => ({ Name, Value }));
  const cmd = new AdminUpdateUserAttributesCommand({ UserPoolId: USER_POOL_ID, Username: username, UserAttributes });
  return client.send(cmd);
}

export default client;
