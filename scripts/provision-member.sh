#!/bin/bash
# =============================================================
# provision-member.sh
# Manually provision a single member + profile.
# Used for: Bubble migration, comped accounts, demo profiles.
#
# Usage:
#   ADMIN_SECRET=your_secret bash scripts/provision-member.sh
#
# Edit the variables below before running.
# =============================================================

API="https://helper-id-v8uev.ondigitalocean.app/api"

# ---- Edit these ----
EMAIL="member@example.com"
CODE="ABCDEF"
PIN="123456"
FIRST_NAME="First"
LAST_NAME="Last"
SKIP_EMAIL=false          # true = no email sent (demo/test profiles)
# --------------------

curl -X POST "$API/admin/provision" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"email\": \"$EMAIL\",
    \"code\": \"$CODE\",
    \"pin\": \"$PIN\",
    \"skipEmail\": $SKIP_EMAIL,
    \"profile\": {
      \"first_name\": \"$FIRST_NAME\",
      \"last_name\": \"$LAST_NAME\"
    }
  }"
