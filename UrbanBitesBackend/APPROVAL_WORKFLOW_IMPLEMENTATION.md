# Admin Approval Workflow Implementation - Backend Summary

## Overview
Implemented a complete admin approval workflow for:
1. **Restaurant Owners** - Approval status for partner account creation
2. **Restaurants** - Admin must approve restaurant before it becomes discoverable
3. **Delivery Agents** - Approval and verification required before agent can go online

## Key Changes

### 1. New Enum
- **`ApprovalStatus.java`** - PENDING, APPROVED, REJECTED states

### 2. Entity Updates

#### User Entity (`User.java`)
- Added `approvalStatus` field (enum: ApprovalStatus) - tracks partner approval
- Added `approvalRejectionReason` field (String) - reason for rejection if applicable
- Auto-set to PENDING for RESTAURANT_OWNER and DELIVERY_AGENT roles on registration

#### Restaurant Entity (`Restaurant.java`)
- Added `approvalStatus` field (String) - PENDING, APPROVED, REJECTED
- Added `approvalRejectionReason` field (String) - reason for rejection
- Default created with status=PENDING, active=false (will activate only when approved)

#### DeliveryAgentProfile Entity (`DeliveryAgentProfile.java`)
- Changed `verified` field default from true to false (now means PENDING approval)
- Added `approvalRejectionReason` field (String)

### 3. Database Migration
- **`V20__add_partner_approval_workflow.sql`**
  - Added columns to users table: approval_status, approval_rejection_reason
  - Added columns to restaurants table: approval_status, approval_rejection_reason
  - Added column to delivery_agent_profiles table: approval_rejection_reason
  - Changed restaurant active default from true to false
  - Created indexes for approval queries

### 4. Repository Updates

#### UserRepository
- Added method: `findByRoleAndApprovalStatusOrderByCreatedAtDesc()` - list pending partners

#### RestaurantRepository
- Added method: `findByApprovalStatusOrderByCreatedAtDesc()` - list pending restaurants

### 5. Service Layer Updates

#### AuthService (`AuthService.java`)
- Modified `register()` to set `approvalStatus=PENDING` for partner roles
- Sends appropriate signup email indicating pending admin review

#### RestaurantService (`RestaurantService.java`)
- Modified `createMyRestaurant()` to:
  - Set `approvalStatus=PENDING`
  - Set `active=false` (not discoverable until approved)
  - Updated email to indicate pending admin review
- Modified `discoverByLocation()` to filter by `approvalStatus=APPROVED` only

#### DispatchService (`DispatchService.java`)
- Modified `updateMyAvailability()` to:
  - Prevent agents with `verified=false` from going online
  - Returns 403 FORBIDDEN if agent not approved

#### AdminService (`AdminService.java`)
- Added `listPendingPartnerApprovals()` - lists restaurant owners pending approval
- Added `listPendingRestaurantApprovals()` - lists restaurants pending approval
- Added `listPendingDeliveryAgentApprovals()` - lists delivery agents pending approval
- Added `approvePartner()` - approve/reject restaurant owner or delivery agent
- Added `approveRestaurant()` - approve/reject restaurant (sets active=true on approval)
- Added `approveDeliveryAgent()` - approve/reject delivery agent (sets verified=true on approval)
- All methods include audit logging via `audit()` method

### 6. New DTOs

#### Request DTOs
- **`AdminApprovePartnerRequest.java`** - userId, approved (bool), rejectionReason
- **`AdminApproveRestaurantRequest.java`** - restaurantId, approved (bool), rejectionReason
- **`AdminApproveDeliveryAgentRequest.java`** - userId, approved (bool), rejectionReason

#### Response DTOs
- **`AdminPartnerApprovalResponse.java`** - Returns partner user details with approval status
- **`AdminRestaurantApprovalResponse.java`** - Returns restaurant details with approval status

### 7. Controller Updates

#### AdminController (`AdminController.java`)
New admin endpoints:

```
GET  /api/v1/admin/approvals/pending/partners
GET  /api/v1/admin/approvals/pending/restaurants
GET  /api/v1/admin/approvals/pending/delivery-agents
POST /api/v1/admin/approvals/partners
POST /api/v1/admin/approvals/restaurants
POST /api/v1/admin/approvals/delivery-agents
```

## Workflow Details

### Restaurant Owner Registration
1. Owner registers with role=RESTAURANT_OWNER
2. User created with approvalStatus=PENDING, enabled=true
3. Owner can login but cannot create restaurants until approval
4. Admin approves → approvalStatus=APPROVED

### Restaurant Creation
1. Approved restaurant owner creates restaurant
2. Restaurant created with approvalStatus=PENDING, active=false (not discoverable)
3. Restaurant appears in owner's dashboard but not in customer discovery
4. Admin approves → approvalStatus=APPROVED, active=true (now discoverable)
5. Admin rejects → approvalStatus=REJECTED, owner notified

### Delivery Agent Registration & Approval
1. Agent registers with role=DELIVERY_AGENT
2. User created with approvalStatus=PENDING
3. DeliveryAgentProfile created with verified=false
4. Agent tries to go online → FORBIDDEN error "pending admin approval"
5. Admin approves → User approvalStatus=APPROVED, DeliveryAgentProfile verified=true
6. Agent can now go online and accept deliveries

## Security Benefits

- ✅ Prevents unverified partners from accessing platform features
- ✅ Admin review gate before restaurants go live
- ✅ Prevents unverified delivery agents from accepting orders
- ✅ Maintains audit trail of all approval decisions
- ✅ Separate approval workflow from user enabled/disabled suspension
- ✅ Rejection reasons tracked for compliance

## Migration Path

Existing users/restaurants:
- Restaurants currently active will remain active
- New records created after migration default to PENDING
- Admins must approve new restaurant and delivery agent accounts
- Consider backfill policy for existing active users

## Testing Recommendations

1. Test new partner registration flows (PENDING state)
2. Test admin approval endpoints (approve, reject, reason capture)
3. Verify discovery filters only show APPROVED restaurants
4. Verify delivery agents cannot go online when not verified
5. Verify audit logging captures all approval decisions
6. Test rejection reason persistence and retrieval


