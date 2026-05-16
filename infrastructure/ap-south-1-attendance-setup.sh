#!/usr/bin/env bash
set -euo pipefail

# AWS Infra bootstrap for Smart Attendance System in ap-south-1 (Mumbai)
# Creates:
# - S3 bucket (private) for reports
# - DynamoDB tables: Users, Attendance, Sessions (TTL), Leaves, Notifications
# - SNS topic (SMS)
# - SES sender identity verification helper (EMAIL still requires console or token-based verification)
# - Notes about Cognito (user pool + 3 groups) are handled by CDK/CLI below
#
# Requirements:
# - AWS CLI v2 installed and configured: aws configure (credentials)
# - IAM permissions to create resources
#
# Usage:
#   REGION=ap-south-1 ./ap-south-1-attendance-setup.sh \
#      --bucket-name <your-bucket> \
#      --users-table Users \
#      --attendance-table Attendance \
#      --sessions-table Sessions \
#      --leaves-table Leaves \
#      --notifications-table Notifications \
#      --sns-topic-name attendance-alerts \
#      --ses-from-email <you@domain> \
#      --cognito-domain <unique-domain-prefix> \
#      --cognito-pool-name attendance-user-pool
#

REGION="${REGION:-ap-south-1}"

BUCKET_NAME=""
USERS_TABLE="Users"
ATTENDANCE_TABLE="Attendance"
SESSIONS_TABLE="Sessions"
LEAVES_TABLE="Leaves"
NOTIFICATIONS_TABLE="Notifications"
SNS_TOPIC_NAME="attendance-alerts"
SES_FROM_EMAIL=""
COGNITO_DOMAIN=""
COGNITO_POOL_NAME="attendance-user-pool"

# parse args
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --bucket-name) BUCKET_NAME="$2"; shift; shift ;;
    --users-table) USERS_TABLE="$2"; shift; shift ;;
    --attendance-table) ATTENDANCE_TABLE="$2"; shift; shift ;;
    --sessions-table) SESSIONS_TABLE="$2"; shift; shift ;;
    --leaves-table) LEAVES_TABLE="$2"; shift; shift ;;
    --notifications-table) NOTIFICATIONS_TABLE="$2"; shift; shift ;;
    --sns-topic-name) SNS_TOPIC_NAME="$2"; shift; shift ;;
    --ses-from-email) SES_FROM_EMAIL="$2"; shift; shift ;;
    --cognito-domain) COGNITO_DOMAIN="$2"; shift; shift ;;
    --cognito-pool-name) COGNITO_POOL_NAME="$2"; shift; shift ;;
    -h|--help)
      echo "Usage: ...";
      exit 0;
      ;;
    *)
      echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$BUCKET_NAME" ]]; then
  echo "--bucket-name is required"; exit 1
fi
if [[ -z "$SES_FROM_EMAIL" ]]; then
  echo "--ses-from-email is required"; exit 1
fi
if [[ -z "$COGNITO_DOMAIN" ]]; then
  echo "--cognito-domain is required"; exit 1
fi

echo "==> Using region: $REGION"

# ---------- S3 ----------
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "==> Creating S3 bucket: $BUCKET_NAME"
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME"
  else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"
  fi
fi

# Make it private
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region "$REGION"

# Enable default encryption (SSE-S3)
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --region "$REGION" >/dev/null

echo "==> S3 ready"

# ---------- DynamoDB ----------
create_table_if_not_exists() {
  local table="$1"; shift
  local pk_name="$1"; shift
  local pk_type="$1"; shift
  local sk_name="$1"; shift
  local sk_type="$1"; shift
  local ttl_attr="$1"; shift

  if aws dynamodb describe-table --table-name "$table" --region "$REGION" >/dev/null 2>&1; then
    echo "==> DynamoDB table exists: $table"
    return 0
  fi

  echo "==> Creating DynamoDB table: $table"

  if [[ "$sk_name" == "" ]]; then
    aws dynamodb create-table \
      --table-name "$table" \
      --region "$REGION" \
      --attribute-definitions "AttributeName=$pk_name,AttributeType=$pk_type" \
      --key-schema "AttributeName=$pk_name,KeyType=HASH" \
      --billing-mode PAY_PER_REQUEST
  else
    aws dynamodb create-table \
      --table-name "$table" \
      --region "$REGION" \
      --attribute-definitions "AttributeName=$pk_name,AttributeType=$pk_type" "AttributeName=$sk_name,AttributeType=$sk_type" \
      --key-schema "AttributeName=$pk_name,KeyType=HASH" "AttributeName=$sk_name,KeyType=RANGE" \
      --billing-mode PAY_PER_REQUEST
  fi

  # wait
  aws dynamodb wait table-exists --table-name "$table" --region "$REGION"

  # enable TTL if provided
  if [[ -n "$ttl_attr" ]]; then
    aws dynamodb update-time-to-live \
      --table-name "$table" \
      --region "$REGION" \
      --time-to-live-specification "Enabled=true,AttributeName=$ttl_attr" >/dev/null
  fi
}

# Users: PK userId (string). No SK.
create_table_if_not_exists "$USERS_TABLE" "userId" "S" "" "" "" 

# Attendance: PK classId (string), SK date#studentId (string)
create_table_if_not_exists "$ATTENDANCE_TABLE" "classId" "S" "sortKey" "S" ""

# Sessions: PK sessionId (string), no SK needed. TTL uses expiresAt (number)
create_table_if_not_exists "$SESSIONS_TABLE" "sessionId" "S" "" "" "expiresAt"

# Leaves: PK leaveId (string), SK studentId (string)
create_table_if_not_exists "$LEAVES_TABLE" "leaveId" "S" "studentId" "S" ""

# Notifications: PK userId (string), SK sentAt (string or number). We'll use S.
create_table_if_not_exists "$NOTIFICATIONS_TABLE" "userId" "S" "sentAt" "S" ""

echo "==> DynamoDB tables ready"

# ---------- SNS ----------
SNS_TOPIC_ARN=$(aws sns list-topics --region "$REGION" --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn[0]" --output text)
if [[ "$SNS_TOPIC_ARN" == "None" || -z "$SNS_TOPIC_ARN" ]]; then
  echo "==> Creating SNS topic: $SNS_TOPIC_NAME"
  SNS_TOPIC_ARN=$(aws sns create-topic --name "$SNS_TOPIC_NAME" --region "$REGION" --query "TopicArn" --output text)
fi

echo "==> SNS topic ARN: $SNS_TOPIC_ARN"

# ---------- SES verification instructions ----------
# Note: SES verification requires email/domain identity verification; automation is limited.
# We print out exact Console steps.

echo "==> SES setup"
echo "To verify sender identity for $SES_FROM_EMAIL in SES (Mumbai/ap-south-1):"
echo "1) Go to AWS Console -> SES -> Email addresses -> Add identity"
echo "2) Choose Email address, enter: $SES_FROM_EMAIL"
echo "3) Confirm the verification email you will receive"
echo "4) After verification, set AWS_SES_FROM_EMAIL=$SES_FROM_EMAIL"

# ---------- Cognito (User Pool + 3 groups) ----------
# For correctness, Cognito is easiest with AWS CLI v2 using admin create-user-pool.
# This script creates the user pool and 3 groups.

echo "==> Cognito setup"

POOL_ID=$(aws cognito-idp list-user-pools --region "$REGION" --max-results 60 --query "UserPools[?Name=='$COGNITO_POOL_NAME'].Id | [0]" --output text)
if [[ "$POOL_ID" == "None" || -z "$POOL_ID" ]]; then
  echo "==> Creating Cognito User Pool: $COGNITO_POOL_NAME"

  POOL_ID=$(aws cognito-idp create-user-pool \
    --region "$REGION" \
    --pool-name "$COGNITO_POOL_NAME" \
    --username-attributes email \
    --auto-verified-attributes email \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false,"TemporaryPasswordValidityDays":7}}' \
    --query "UserPool.Id" --output text)
fi

echo "==> Cognito PoolId: $POOL_ID"

# Create app client
APP_CLIENT_ID=$(aws cognito-idp list-user-pool-clients --region "$REGION" --user-pool-id "$POOL_ID" --query "UserPoolClients[?ClientName=='attendance-web'].ClientId | [0]" --output text)
if [[ "$APP_CLIENT_ID" == "None" || -z "$APP_CLIENT_ID" ]]; then
  APP_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --region "$REGION" \
    --user-pool-id "$POOL_ID" \
    --client-name attendance-web \
    --generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH \
    --allowed-o-auth-flows code \
    --allowed-o-auth-scopes 'openid email profile' \
    --supported-identity-providers COGNITO \
    --query "UserPoolClient.ClientId" --output text)
fi

# Get secret for app client (required by your NextAuth provider)
APP_CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client --region "$REGION" --user-pool-id "$POOL_ID" --client-id "$APP_CLIENT_ID" --query "UserPoolClient.ClientSecret" --output text)

echo "==> Cognito App Client: $APP_CLIENT_ID"
echo "==> Cognito App Client Secret: (save this securely)"

# Create 3 groups
create_group_if_missing() {
  local group_name="$1"; shift
  if aws cognito-idp get-group --region "$REGION" --user-pool-id "$POOL_ID" --group-name "$group_name" >/dev/null 2>&1; then
    echo "==> Group exists: $group_name"
  else
    echo "==> Creating group: $group_name"
    aws cognito-idp create-group \
      --region "$REGION" \
      --user-pool-id "$POOL_ID" \
      --group-name "$group_name" \
      --description "$group_name group"
  fi
}

create_group_if_missing "Admin"
create_group_if_missing "Teacher"
create_group_if_missing "Student"

# Important: your app expects role values: admin/teacher/student
# Cognito group names may differ; ensure your JWT mapping puts custom:role or role claim.
# If using Cognito groups, update token mapping so your app reads the right role.

cat <<EOF

==== DONE (Infrastructure created/available) ====

Copy these into .env.local:
- AWS_REGION=$REGION
- AWS_COGNITO_USER_POOL_ID=$POOL_ID
- AWS_COGNITO_CLIENT_ID=$APP_CLIENT_ID
- AWS_COGNITO_CLIENT_SECRET=$APP_CLIENT_SECRET
- AWS_SNS_TOPIC_ARN=$SNS_TOPIC_ARN
- AWS_SES_FROM_EMAIL=$SES_FROM_EMAIL
- AWS_S3_BUCKET_NAME=$BUCKET_NAME
- DYNAMODB table env vars (if your app uses them)
  * DYNAMODB_USERS_TABLE=$USERS_TABLE
  * DYNAMODB_ATTENDANCE_TABLE=$ATTENDANCE_TABLE
  * DYNAMODB_SESSIONS_TABLE=$SESSIONS_TABLE
  * DYNAMODB_LEAVES_TABLE=$LEAVES_TABLE  (only if used by code)
  * DYNAMODB_NOTIFICATIONS_TABLE=$NOTIFICATIONS_TABLE (only if used by code)

EOF


