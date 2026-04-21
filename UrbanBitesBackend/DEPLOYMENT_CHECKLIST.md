# Admin Approval Workflow - Deployment Checklist

## ✅ Implementation Complete

### Backend Changes Summary
- **Status**: ✓ COMPILED & READY
- **Exit Code**: 0
- **Compilation Date**: 2026-04-10

---

## Pre-Deployment Checklist

### 1. Database Migration
- [ ] Run Flyway migration V20__add_partner_approval_workflow.sql
- [ ] Verify new columns added to users table:
  - [ ] `approval_status` VARCHAR(30)
  - [ ] `approval_rejection_reason` VARCHAR(500)
- [ ] Verify new columns added to restaurants table:
  - [ ] `approval_status` VARCHAR(30) DEFAULT 'PENDING'
  - [ ] `approval_rejection_reason` VARCHAR(500)
- [ ] Verify new column added to delivery_agent_profiles table:
  - [ ] `approval_rejection_reason` VARCHAR(500)
- [ ] Verify indexes created:
  - [ ] `idx_users_approval_status`
  - [ ] `idx_restaurants_approval_status`
  - [ ] `idx_delivery_agent_profiles_verified`
  - [ ] `idx_restaurants_active_approved`

### 2. Code Deployment
- [ ] Pull latest code from repository
- [ ] Build backend: `mvn clean package -DskipTests`
- [ ] Verify build succeeds with no errors
- [ ] Deploy WAR/JAR to application server
- [ ] Restart application

### 3. Configuration Review
- [ ] Review email templates for partner approval notifications
- [ ] Configure admin notification settings
- [ ] Test email sending for partner sign-ups
- [ ] Verify WebSocket endpoints for real-time updates

### 4. Data Migration Strategy

#### Option A: Grandfather Existing Users (Recommended for soft launch)
```sql
-- Mark all existing restaurant owners as approved
UPDATE users SET approval_status = 'APPROVED' 
WHERE role = 'RESTAURANT_OWNER' AND approval_status IS NULL;

-- Mark all existing active restaurants as approved
UPDATE restaurants SET approval_status = 'APPROVED', is_active = true 
WHERE approval_status = 'PENDING' AND is_active = true;

-- Mark all existing delivery agents as verified
UPDATE delivery_agent_profiles SET verified = true 
WHERE verified = false;
```

#### Option B: Require Re-approval (Stricter compliance)
```sql
-- Set all existing partners to PENDING
UPDATE users SET approval_status = 'PENDING'
WHERE role IN ('RESTAURANT_OWNER', 'DELIVERY_AGENT') AND approval_status IS NULL;

-- Set all existing restaurants to PENDING
UPDATE restaurants SET approval_status = 'PENDING', is_active = false
WHERE approval_status IS NULL;

-- Set all existing agents to unverified
UPDATE delivery_agent_profiles SET verified = false WHERE verified = true;
```

#### Option C: Gradual Rollout (Recommended for production)
```sql
-- Only new registrations are subject to approval
-- Existing users/restaurants continue to work as before
-- Set all existing to approved
UPDATE users SET approval_status = 'APPROVED' WHERE approval_status IS NULL;
UPDATE restaurants SET approval_status = 'APPROVED' WHERE approval_status IS NULL;
UPDATE delivery_agent_profiles SET verified = true WHERE verified = false;
```

---

## Post-Deployment Testing

### 1. Admin Console Testing
- [ ] Access admin dashboard at `/api/v1/admin/dashboard`
- [ ] Navigate to approval queues:
  - [ ] GET `/api/v1/admin/approvals/pending/partners` → returns pending owners
  - [ ] GET `/api/v1/admin/approvals/pending/restaurants` → returns pending restaurants
  - [ ] GET `/api/v1/admin/approvals/pending/delivery-agents` → returns pending agents

### 2. Partner Registration Flow
- [ ] Register new restaurant owner → verify user created with `approvalStatus=PENDING`
- [ ] Register new delivery agent → verify user created with `approvalStatus=PENDING`
- [ ] Verify email sent to partners indicating pending review

### 3. Admin Approval Actions
- [ ] Approve restaurant owner:
  - [ ] POST `/api/v1/admin/approvals/partners` with `approved=true`
  - [ ] Verify user has `approvalStatus=APPROVED`
  - [ ] Owner can now create restaurants
  
- [ ] Reject restaurant owner:
  - [ ] POST `/api/v1/admin/approvals/partners` with `approved=false, rejectionReason="..."`
  - [ ] Verify `approvalStatus=REJECTED`, `approvalRejectionReason` populated
  - [ ] Owner receives rejection notification

- [ ] Approve restaurant:
  - [ ] POST `/api/v1/admin/approvals/restaurants` with `approved=true`
  - [ ] Verify `approvalStatus=APPROVED`, `is_active=true`
  - [ ] Restaurant appears in discovery endpoint
  
- [ ] Reject restaurant:
  - [ ] POST `/api/v1/admin/approvals/restaurants` with `approved=false, rejectionReason="..."`
  - [ ] Verify restaurant NOT in discovery
  - [ ] Owner receives notification

- [ ] Approve delivery agent:
  - [ ] POST `/api/v1/admin/approvals/delivery-agents` with `approved=true`
  - [ ] Verify agent's `DeliveryAgentProfile.verified=true`
  - [ ] Agent can go online
  
- [ ] Reject delivery agent:
  - [ ] POST `/api/v1/admin/approvals/delivery-agents` with `approved=false`
  - [ ] Verify agent cannot go online
  - [ ] Agent receives notification with rejection reason

### 4. Discovery/Dispatch Gating
- [ ] Non-approved restaurants DO NOT appear in discovery
- [ ] Approved restaurants appear in discovery
- [ ] Non-verified agents cannot go online (403 FORBIDDEN)
- [ ] Verified agents can go online
- [ ] Dispatch assignments only use verified agents

### 5. Audit Trail Verification
- [ ] Query `admin_action_audits` table
- [ ] Verify approval/rejection actions logged with:
  - [ ] Actor (admin email)
  - [ ] Entity type (USER/RESTAURANT)
  - [ ] Action (APPROVAL_APPROVED/REJECTED)
  - [ ] Before/After JSON
  - [ ] Rejection reason (if applicable)

---

## Monitoring & Alerts

### Key Metrics to Monitor
- [ ] Number of pending partner approvals
- [ ] Number of pending restaurant approvals
- [ ] Approval rate (approved vs rejected)
- [ ] Time-to-approval average
- [ ] Failed approval actions

### Alert Thresholds
- [ ] Alert if pending approvals > 100
- [ ] Alert if approval rejection rate > 30%
- [ ] Alert if approval API response time > 2s
- [ ] Alert on approval action errors

---

## Rollback Plan

If issues arise, execute rollback:

### Database Rollback
```bash
# Reset all approval statuses to pre-approval state
UPDATE users SET approval_status = 'APPROVED' WHERE role IN ('RESTAURANT_OWNER', 'DELIVERY_AGENT');
UPDATE restaurants SET approval_status = 'APPROVED', is_active = true;
UPDATE delivery_agent_profiles SET verified = true;

# Drop new columns (if needed)
ALTER TABLE users DROP COLUMN approval_status, DROP COLUMN approval_rejection_reason;
ALTER TABLE restaurants DROP COLUMN approval_status, DROP COLUMN approval_rejection_reason;
ALTER TABLE delivery_agent_profiles DROP COLUMN approval_rejection_reason;
```

### Code Rollback
```bash
# Revert to previous deployment
git revert <commit-hash>
mvn clean package -DskipTests
# Redeploy previous version
```

---

## Files Changed Summary

### New Files Created
1. **Enum**
   - `ApprovalStatus.java` - PENDING, APPROVED, REJECTED states

2. **DTOs (Request)**
   - `AdminApprovePartnerRequest.java`
   - `AdminApproveRestaurantRequest.java`
   - `AdminApproveDeliveryAgentRequest.java`

3. **DTOs (Response)**
   - `AdminPartnerApprovalResponse.java`
   - `AdminRestaurantApprovalResponse.java`

4. **Database**
   - `V20__add_partner_approval_workflow.sql` - Flyway migration

5. **Documentation**
   - `APPROVAL_WORKFLOW_IMPLEMENTATION.md` - Technical overview
   - `API_REFERENCE_AND_TESTING_GUIDE.md` - Complete API reference

### Modified Files
1. **Entities**
   - `User.java` - Added approvalStatus, approvalRejectionReason
   - `Restaurant.java` - Added approvalStatus, approvalRejectionReason, getCreatedAt(), getUpdatedAt()
   - `DeliveryAgentProfile.java` - Changed verified default to false, added approvalRejectionReason

2. **Services**
   - `AuthService.java` - Set PENDING approval status for partners on registration
   - `RestaurantService.java` - Create restaurants with PENDING status, filter discovery by APPROVED
   - `DispatchService.java` - Prevent non-verified agents from going online
   - `AdminService.java` - Added approval methods and listing methods

3. **Controllers**
   - `AdminController.java` - Added 6 new endpoints for approval workflow

4. **Repositories**
   - `UserRepository.java` - Added findByRoleAndApprovalStatusOrderByCreatedAtDesc()
   - `RestaurantRepository.java` - Added findByApprovalStatusOrderByCreatedAtDesc()

---

## Documentation Location

- **Implementation Guide**: `UrbanBitesBackend/APPROVAL_WORKFLOW_IMPLEMENTATION.md`
- **API Reference**: `UrbanBitesBackend/API_REFERENCE_AND_TESTING_GUIDE.md`
- **Deployment Checklist**: This file

---

## Success Criteria

After deployment, verify:
- ✓ All new registrations default to PENDING approval
- ✓ Pending partners appear in admin queues
- ✓ Admin can approve/reject with reasons
- ✓ Approved restaurants appear in discovery
- ✓ Non-verified agents cannot go online
- ✓ All approval actions are audited
- ✓ Email notifications sent appropriately
- ✓ No regression in existing functionality

---

## Support & Troubleshooting

### Common Issues

1. **"Pending approvals not showing up"**
   - Check: Users have `approval_status = 'PENDING'`
   - Check: Migration V20 ran successfully
   - Check: Admin user has ADMIN role

2. **"Restaurant still discoverable after rejection"**
   - Check: `approval_status = 'REJECTED'`
   - Check: `is_active = false`
   - Check: Discovery filter checking `approvalStatus='APPROVED'`

3. **"Delivery agent can go online when not verified"**
   - Check: Migration changed default verified to false
   - Check: Agent profile verified=true after approval
   - Check: `updateMyAvailability()` checking verified status

---

## Contact & Escalation

- **Backend Lead**: [Assign contact]
- **Database Admin**: [Assign contact]
- **DevOps**: [Assign contact]
- **Product Manager**: [Assign contact]

