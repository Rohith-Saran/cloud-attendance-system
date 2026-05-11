This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

## Deployment (AWS Amplify)

Quick steps to deploy to AWS Amplify Console:

- Connect this repository to AWS Amplify (Create app → Connect repository).
- Use the provided build settings (`amplify.yml` at repository root).
- Add the required environment variables in Amplify Console (App settings → Environment variables):
	- `NEXTAUTH_SECRET`
	- `NEXTAUTH_URL`
	- `AWS_REGION`
	- `AWS_ACCESS_KEY_ID`
	- `AWS_SECRET_ACCESS_KEY`
	- `AWS_COGNITO_CLIENT_ID`
	- `AWS_COGNITO_USER_POOL_ID`
	- `AWS_S3_BUCKET_NAME`
	- `AWS_SES_FROM_EMAIL`
	- `AWS_SNS_TOPIC_ARN`
	- `COLLEGE_IP_RANGE`
	- `QR_SECRET`
	- `DYNAMODB_USERS_TABLE` (optional)
	- `DYNAMODB_ATTENDANCE_TABLE` (optional)
	- `DYNAMODB_SESSIONS_TABLE` (optional)

Local build and run:

```bash
npm ci
npm run dev
```

Notes:
- For server-side features (DynamoDB, SES, SNS, Cognito) ensure the Amplify app has appropriate IAM credentials.
- The `amplify.yml` in repo is a minimal configuration; adjust build artifacts and caching for your workflow.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
