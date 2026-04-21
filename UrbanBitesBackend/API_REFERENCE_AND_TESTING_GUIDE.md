# Admin Approval Workflow - API Reference & Testing Guide

## API Endpoints

### 1. List Pending Approvals

#### Get Pending Partner Approvals
```
GET /api/v1/admin/approvals/pending/partners
Authorization: Bearer {admin_token}
```
**Response:** `List<User>` with approval status
```json
[
  {
    "id": 1,
    "email": "owner@restaurant.com",
    "fullName": "John Owner",
    "role": "RESTAURANT_OWNER",
    "approvalStatus": "PENDING",
    "approvalRejectionReason": null,
    "createdAt": "2026-04-10T10:00:00+00:00"
  }
]
```

#### Get Pending Restaurant Approvals
```
GET /api/v1/admin/approvals/pending/restaurants
Authorization: Bearer {admin_token}
```
**Response:** `List<Restaurant>` with approval status
```json
[
  {
    "id": 1,
    "name": "Pizza Palace",
    "city": "New York",
    "ownerId": 1,
    "ownerEmail": "owner@restaurant.com",
    "approvalStatus": "PENDING",
    "approvalRejectionReason": null,
    "createdAt": "2026-04-10T10:05:00+00:00"
  }
]
```

#### Get Pending Delivery Agent Approvals
```
GET /api/v1/admin/approvals/pending/delivery-agents
Authorization: Bearer {admin_token}
```
**Response:** `List<User>` with approval status (Role: DELIVERY_AGENT)
```json
[
  {
    "id": 2,
    "email": "agent@delivery.com",
    "fullName": "John Agent",
    "role": "DELIVERY_AGENT",
    "approvalStatus": "PENDING",
    "approvalRejectionReason": null,
    "createdAt": "2026-04-10T10:10:00+00:00"
  }
]
```

---

### 2. Approve/Reject Partners

#### Approve/Reject Restaurant Owner or Delivery Agent User
```
POST /api/v1/admin/approvals/partners
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "userId": 1,
  "approved": true,
  "rejectionReason": null
}
```

**Success Response (200):**
```json
{
  "userId": 1,
  "email": "owner@restaurant.com",
  "fullName": "John Owner",
  "role": "RESTAURANT_OWNER",
  "approvalStatus": "APPROVED",
  "approvalRejectionReason": null,
  "createdAt": "2026-04-10T10:00:00+00:00"
}
```

**Rejection Example:**
```json
{
  "userId": 1,
  "approved": false,
  "rejectionReason": "Incomplete documentation. Please resubmit with valid business license."
}
```

---

### 3. Approve/Reject Restaurants

#### Approve/Reject Restaurant
```
POST /api/v1/admin/approvals/restaurants
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "restaurantId": 1,
  "approved": true,
  "rejectionReason": null
}
```

**Success Response (200):**
```json
{
  "restaurantId": 1,
  "name": "Pizza Palace",
  "city": "New York",
  "ownerId": 1,
  "ownerEmail": "owner@restaurant.com",
  "approvalStatus": "APPROVED",
  "approvalRejectionReason": null,
  "createdAt": "2026-04-10T10:05:00+00:00"
}
```

**Note:** On approval, `is_active` is set to `true` and restaurant becomes discoverable.

---

### 4. Approve/Reject Delivery Agents

#### Approve/Reject Delivery Agent
```
POST /api/v1/admin/approvals/delivery-agents
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "userId": 2,
  "approved": true,
  "rejectionReason": null
}
```

**Success Response (200):**
```json
{
  "userId": 2,
  "email": "agent@delivery.com",
  "fullName": "John Agent",
  "role": "DELIVERY_AGENT",
  "approvalStatus": "APPROVED",
  "approvalRejectionReason": null,
  "createdAt": "2026-04-10T10:10:00+00:00"
}
```

**Note:** On approval, `DeliveryAgentProfile.verified` is set to `true`, allowing agent to go online.

---

## Error Responses

### 403 Forbidden - Delivery Agent Not Approved
**When:** Agent tries to go online before approval
```
POST /api/v1/dispatch/agent/availability
{
  "online": true,
  "available": true,
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Response:**
```json
{
  "status": 403,
  "message": "Your account is pending admin approval. You cannot go online yet.",
  "timestamp": "2026-04-10T10:15:00+00:00"
}
```

---

## Testing Scenarios

### Scenario 1: Restaurant Owner Approval Flow
```bash
# 1. Owner registers
POST /api/v1/auth/register
{
  "email": "owner@test.com",
  "password": "SecurePass123!",
  "fullName": "Jane Restaurant Owner",
  "role": "RESTAURANT_OWNER"
}
# Response: User created with approvalStatus=PENDING, enabled=true

# 2. Admin checks pending partners
GET /api/v1/admin/approvals/pending/partners
# Response: Shows Jane in PENDING status

# 3. Admin approves partner
POST /api/v1/admin/approvals/partners
{
  "userId": {jane_user_id},
  "approved": true
}
# Response: approvalStatus=APPROVED

# 4. Approved owner can now create restaurant
POST /api/v1/restaurants/me
{
  "name": "Jane's Pizza",
  "addressLine": "123 Main St",
  "city": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "openNow": true,
  "image": {file}
}
# Response: Restaurant created with approvalStatus=PENDING, active=false

# 5. Admin checks pending restaurants
GET /api/v1/admin/approvals/pending/restaurants
# Response: Shows Jane's Pizza in PENDING status

# 6. Admin approves restaurant
POST /api/v1/admin/approvals/restaurants
{
  "restaurantId": {restaurant_id},
  "approved": true
}
# Response: approvalStatus=APPROVED, active=true

# 7. Customer can now discover restaurant
GET /api/v1/restaurants/discovery?latitude=40.7128&longitude=-74.0060
# Response: Jane's Pizza now appears in results
```

### Scenario 2: Delivery Agent Approval Flow
```bash
# 1. Agent registers
POST /api/v1/auth/register
{
  "email": "agent@test.com",
  "password": "SecurePass123!",
  "fullName": "John Delivery Agent",
  "role": "DELIVERY_AGENT"
}
# Response: User created with approvalStatus=PENDING
# Response: DeliveryAgentProfile created with verified=false

# 2. Agent tries to go online (should fail)
POST /api/v1/dispatch/agent/availability
{
  "online": true,
  "available": true,
  "latitude": 40.7128,
  "longitude": -74.0060
}
# Response: 403 FORBIDDEN - "Your account is pending admin approval. You cannot go online yet."

# 3. Admin checks pending agents
GET /api/v1/admin/approvals/pending/delivery-agents
# Response: Shows John in PENDING status

# 4. Admin approves agent
POST /api/v1/admin/approvals/delivery-agents
{
  "userId": {john_user_id},
  "approved": true
}
# Response: approvalStatus=APPROVED, verified=true

# 5. Agent can now go online
POST /api/v1/dispatch/agent/availability
{
  "online": true,
  "available": true,
  "latitude": 40.7128,
  "longitude": -74.0060
}
# Response: 200 OK - AgentAvailabilityResponse with online=true, available=true
```

### Scenario 3: Rejection with Reason
```bash
# Admin rejects restaurant with reason
POST /api/v1/admin/approvals/restaurants
{
  "restaurantId": {restaurant_id},
  "approved": false,
  "rejectionReason": "Location is outside service zone. Please verify address and resubmit."
}
# Response: approvalStatus=REJECTED, approvalRejectionReason populated
# Owner receives notification/email with rejection reason

# Owner can view rejection reason
GET /api/v1/restaurants/me
# Response: Shows restaurant with approvalStatus=REJECTED, reason in approvalRejectionReason
# Owner can update restaurant and resubmit for approval
```

---

## Database State Verification

### Check User Approval Status
```sql
SELECT id, email, full_name, role, approval_status, approval_rejection_reason, enabled, created_at
FROM users
WHERE role IN ('RESTAURANT_OWNER', 'DELIVERY_AGENT')
ORDER BY created_at DESC;
```

### Check Restaurant Approval Status
```sql
SELECT id, name, city, owner_id, approval_status, approval_rejection_reason, is_active, created_at
FROM restaurants
ORDER BY created_at DESC;
```

### Check Delivery Agent Profile Verification
```sql
SELECT dap.id, dap.user_id, dap.verified, dap.online, dap.approval_rejection_reason, u.email
FROM delivery_agent_profiles dap
JOIN users u ON dap.user_id = u.id
ORDER BY dap.created_at DESC;
```

---

## Audit Trail

All approval decisions are logged in the `admin_action_audits` table:

```sql
SELECT *
FROM admin_action_audits
WHERE entity_type IN ('USER', 'RESTAURANT')
  AND action LIKE 'PARTNER_APPROVAL_%'
ORDER BY created_at DESC;
```

**Example Audit Entry:**
- Action: `DELIVERY_AGENT_APPROVAL_APPROVED`
- Entity Type: `USER`
- Entity ID: `2`
- Before: `{"approvalStatus":"PENDING"}`
- After: `{"approvalStatus":"APPROVED"}`
- Reason: `null`
- Actor: `admin@urbanbites.com`
- Created At: `2026-04-10T10:15:00+00:00`

---

## Migration Notes

### After Running V20__add_partner_approval_workflow.sql

1. **Existing Active Restaurants:** Will retain `active=true` status
2. **New Restaurants:** Will default to `approval_status=PENDING, active=false`
3. **Existing Delivery Agents:** Will have `verified=true` (no change)
4. **New Delivery Agents:** Will default to `verified=false` (pending approval)

### Backfill Policy Recommendation

For production rollout:
- Option A: Grandfather all existing approved restaurants/agents (set approval_status=APPROVED)
- Option B: Require re-approval for all partners (stricter, more audit-friendly)
- Option C: Only enforce approval for new registrations (gradual rollout)

---

## Common Issues & Troubleshooting

### Issue: Restaurant doesn't appear in discovery after approval
**Solution:** Verify:
1. `approval_status = 'APPROVED'`
2. `is_active = true`
3. `is_open_now = true`
4. Restaurant location is within a service zone or radius matches query

### Issue: Delivery agent cannot go online
**Check:**
1. `DeliveryAgentProfile.verified = true`
2. Admin approved the agent
3. Check error message for specific reason

### Issue: Restaurant owner cannot create restaurant
**Check:**
1. User has `approval_status = 'APPROVED'`
2. User role is `RESTAURANT_OWNER`
3. User is `enabled = true`

