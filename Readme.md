#  Cloud-Based Attendance Management System

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-skin&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?style=flat-skin&logo=react&logoColor=white)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-skin&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![AWS SDK](https://img.shields.io/badge/AWS_SDK-v3-orange?style=flat-skin&logo=amazonwebservices&logoColor=white)](https://aws.amazon.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-729B1B?style=flat-skin&logo=vitest&logoColor=white)](https://vitest.dev/)

A modern, cloud-native attendance monitoring platform designed for higher education institutions. Built on Next.js 16 (App Router), React 19, and Tailwind CSS, the application leverages AWS services (Amplify, DynamoDB, Cognito, S3, SES, and SNS) to provide secure, automated, and tamper-proof attendance workflows.

---

## 🚀 Key Features by User Role

### 👨‍💼 Admin Console
*   **Operational Overview Dashboard:** Live KPI tiles displaying active rosters, today's average attendance rate, and counts of low-attendance flags.
*   **Student Roster Manager:** Support for CSV imports and bulk management.
*   **Insights Center:** Single-click generation of cross-college CSV and PDF attendance reports stored securely in Amazon S3.

### 👩‍🏫 Teacher Workspace
*   **Session Scheduler:** Access scheduled daily classes and initiate checking-in routines.
*   **Dynamic QR Code Generator:** Renders signed, rotating QR codes that automatically refresh to prevent offline spoofing or attendance sharing.
*   **Roster Grid:** Interactively check, uncheck, or manually override student statuses.
*   **Leave inbox:** Dashboard to review, approve, or reject student-submitted leave requests.

### 🧑‍🎓 Student Portal
*   **Smart Attendance Check-In:** Scan rotating teacher QR codes with a built-in mobile-responsive camera scanner.
*   **Auto-Mark Attendance:** Automatic silent check-ins if connected to the campus Wi-Fi IP range.
*   **Personal Dashboard:** Individual attendance breakdown by subject, tracking progress indicators against the target 75% attendance threshold.
*   **Leave Application Form:** Submit leave requests directly to teachers, attaching date ranges and justifications.
*   **Risk Alerts:** Auto-dismissible banners warning students if their attendance falls below 75% in any subject.

---

## 🔒 Security & Validation Architecture

### 1. Dynamic Rotating QR Codes (Anti-Spoofing)
To prevent students from sharing static screenshots of QR codes from outside the classroom, the QR payload incorporates an HMAC-SHA256 signature calculated from the `sessionId` and a rotating 30-second window:
*   **Rotating Validity Window:** Each QR signature is valid only for a 30-second epoch.
*   **Timing-Safe Verifications:** Validated on the backend using `crypto.timingSafeEqual` to safeguard against timing side-channel attacks.

### 2. Location-Based IP Restriction (WiFi Geofencing)
Attendance check-ins verify that requests originate from within campus boundaries. The API parses client IP addresses (resolving `x-forwarded-for` and `x-real-ip` headers) and matches them against the institutional network subnet (`COLLEGE_IP_RANGE`) using CIDR block validation:
```
[Client Request] ──> [Extract Client IP] ──> [Validate against COLLEGE_IP_RANGE CIDR] ──> [Process Check-In]
```

### 3. Serverless Automated Notifications (Low-Attendance Alerter)
An AWS Lambda function (`lambda/notifyLowAttendance.ts`) is designed to run periodically (via Amazon EventBridge):
*   Iteratively scans student profiles in the database.
*   Calculates their attendance percentage over the past 30 days.
*   If a student's attendance drops below 75%, it alerts parents and students via verified transactional channels using **Amazon SES** (Email) and **Amazon SNS** (SMS).

---

## 📂 Project Directory Structure

```text
├── app/                  # Next.js App Router (pages and API endpoints)
│   ├── (auth)/           # Authentication layout and route groups
│   ├── api/              # Role-restricted REST API endpoints
│   ├── dashboard/        # Dashboards partitioned by admin, teacher, student
│   ├── globals.css       # Core styling & Tailwind imports
│   └── layout.tsx        # Top-level application layout
├── components/           # Reusable UI components (QR scanner, navigation, charts)
├── data/                 # Sample rosters and mock fixtures
├── infrastructure/       # Shell scripts for AWS resource bootstrapping
├── lambda/               # AWS Lambda serverless routines
├── lib/                  # Application core helpers (AWS clients, IP check, QR validation)
├── public/               # Static assets & public media files
├── tests/                # Testing suites (Vitest configurations)
├── types/                # Shared TypeScript models and interfaces
└── utils/                # General utility helper files
```

---

## ⚙️ Environment Variables Config

Create a `.env.local` file at the root of the project. A template is provided in `.env.local.example`:

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| **`NEXTAUTH_SECRET`** | Secret key used to encrypt and sign NextAuth cookies/tokens | *Secure random string* |
| **`NEXTAUTH_URL`** | The canonical URL of your local or hosted application | `http://localhost:3000` |
| **`AWS_REGION`** | AWS target deployment region | `ap-south-1` (Mumbai) |
| **`AWS_ACCESS_KEY_ID`** | AWS credentials for local DynamoDB/S3 operations | *Your IAM Access Key ID* |
| **`AWS_SECRET_ACCESS_KEY`** | AWS credentials for local DynamoDB/S3 operations | *Your IAM Secret Access Key* |
| **`AWS_COGNITO_CLIENT_ID`** | The client ID generated for your Cognito Web App client | *Cognito Client ID* |
| **`AWS_COGNITO_CLIENT_SECRET`**| The client secret generated for your Cognito Web App client | *Cognito Client Secret* |
| **`AWS_COGNITO_USER_POOL_ID`** | Cognito User Pool ID | `ap-south-1_xxxxxxxxx` |
| **`AWS_S3_BUCKET_NAME`** | Target S3 bucket for uploading/serving generated PDF/CSV reports | *Your bucket name* |
| **`AWS_SES_FROM_EMAIL`** | Transactional verified sender email address in AWS SES | `verified-sender@yourdomain.com` |
| **`AWS_SNS_TOPIC_ARN`** | Target Amazon SNS Topic ARN for SMS alerts | `arn:aws:sns:ap-south-1:xxxxxx:alerts` |
| **`DYNAMODB_USERS_TABLE`** | DynamoDB table storing users, profiles, and roles | `Users` |
| **`DYNAMODB_ATTENDANCE_TABLE`**| DynamoDB table tracking attendance events | `Attendance` |
| **`DYNAMODB_SESSIONS_TABLE`** | DynamoDB table storing NextAuth active sessions | `Sessions` |
| **`DYNAMODB_LEAVES_TABLE`** | DynamoDB table storing student leave submissions | `Leaves` |
| **`DYNAMODB_NOTIFICATIONS_TABLE`**| DynamoDB table storing sent notification logs | `Notifications` |
| **`COLLEGE_IP_RANGE`** | CIDR mask of your institution's WiFi network (for geofencing) | `10.0.0.0/8` or `192.168.1.0/24` |
| **`QR_SECRET`** | Private HMAC key used to generate and sign rotating QR codes | *Secure random string* |

---

## 🛠️ AWS Infrastructure Setup

You can bootstrap all needed AWS services (Cognito User Pools, Groups, App Clients, DynamoDB tables, SNS topics, S3 buckets, and KMS policies) in `ap-south-1` by running the provided bootstrap script:

```bash
# Give execute permissions
chmod +x infrastructure/ap-south-1-attendance-setup.sh

# Run script
REGION=ap-south-1 ./infrastructure/ap-south-1-attendance-setup.sh \
  --bucket-name your-private-attendance-reports-bucket \
  --ses-from-email sender@yourcollege.edu \
  --cognito-domain your-attendance-portal \
  --cognito-pool-name attendance-user-pool
```

> [!NOTE]
> AWS SES email verification requires confirming the verification email sent to the email provided in the `--ses-from-email` parameter before AWS will allow outbound messages.

---

## 💻 Local Development

1.  **Install dependencies:**
    ```bash
    npm ci
    ```

2.  **Start development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

3.  **Run Unit/Integration Tests:**
    ```bash
    npm run test
    ```

---

## 🚀 AWS Amplify Hosting Deployment

Configure Next.js SSR deployment in AWS Amplify Console using the following settings:

1.  Connect your repository (GitHub/GitLab/etc.) to AWS Amplify.
2.  Use the configurations declared in `amplify.yml` at the repository root.
3.  Inject all keys in the **Environment Variables** tab under App Settings (e.g., `NEXTAUTH_SECRET`, `AWS_COGNITO_CLIENT_ID`, `COLLEGE_IP_RANGE`, etc.).
