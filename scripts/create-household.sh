#!/bin/bash
# =============================================================
# create-household.sh
# Creates a household record and sets the guardian/admin member.
# Run this first, then run link-household.sh with the returned ID.
#
# Usage:
#   ADMIN_SECRET=your_secret bash scripts/create-household.sh
#
# Edit the variables below before running.
# =============================================================

API="https://helper-id-v8uev.ondigitalocean.app/api"

# ---- Edit these ----
ADMIN_MEMBER_ID="member-uuid-here"   # members.id of the guardian
HOUSEHOLD_NAME="Family Name"
# --------------------

curl -X POST "$API/admin/create-household" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"adminMemberId\": \"$ADMIN_MEMBER_ID\",
    \"name\": \"$HOUSEHOLD_NAME\"
  }"
