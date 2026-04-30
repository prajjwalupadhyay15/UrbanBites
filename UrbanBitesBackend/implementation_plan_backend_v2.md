Plan: UrbanBites Backend Blueprint (Implementation-Aware)

This plan is updated to reflect the current backend codebase and provides detailed, module-by-module implementation notes. It includes explicit status labels, implemented details, and pending scope.

Status legend: COMPLETE = fully implemented in code; PARTIAL = some pieces exist; PENDING = not implemented yet.

Checklist (Plan Requirements)

- [x] Map each module to current implementation status.
- [x] Document implemented endpoints and behaviors for each module.
- [x] Document implemented entities and data storage choices.
- [x] Highlight missing/pending scope per module.
- [x] Update phase roadmap to reflect current completion.

Decision lock (implementation baseline for this plan):

Pricing strategy: Hybrid delivery pricing (base + slab + per-km + surge + caps) with packing and platform charges.

Rating granularity: Option B (restaurant-level rating + item-level rating) restricted to delivered orders.

Serviceability model: Option C hybrid (radius prefilter + service-zone include/exclude overrides).

1) System Architecture (Current vs Target)

Architecture style: Layered monolith, modular by domain.

Primary runtime: Spring Boot + Spring Security + Spring Data JPA + STOMP WebSocket.

Current data stores:

- PostgreSQL for all entities (orders, payments, tracking points, OTP, notifications, dispatch, admin ops).

Target data stores:

- MongoDB for high-volume tracking streams and event logs (PENDING).
- Redis for OTP/session/rate-limit/cache/JWT blacklist (PENDING).

Integrations (current):

- Geocoding: OpenStreetMap Nominatim (HTTP).
- Payments: Razorpay (real + mock gateway).
- Email: SMTP templates.
- Push/SMS: mock/no-op senders wired.

2) Module Implementation Status Matrix

COMPLETE:

- Authentication & Authorization
- OTP Service
- Email Service
- User Profile Service
- Address Service
- Restaurant Service
- Menu Service
- Cart Service
- Pricing Engine
- Order Service
- Payment Service
- Delivery/Dispatch Service
- Tracking Service
- Notification Service
- Admin Ops Service
- Approval Workflow

PARTIAL:

- Coupons/Offers (admin campaign management only)
- Reviews/Ratings (admin moderation records only)
- Security Hardening (JWT blacklist + OTP lockouts; Redis rate limiting pending)
- Data Governance/Retention (soft delete exists; export/retention pending)

PENDING:

- Coupon eligibility engine + apply/remove in cart
- Restaurant/item reviews and rating aggregates
- MongoDB tracking timeline
- Redis cache/rate-limit/OTP/JWT blacklist
- Group ordering + settlement system

3) Module Details (Implemented vs Pending)

3.1 Authentication & Authorization (COMPLETE)

Implemented:

- Register/login with email/password.
- Phone OTP login (request + verify).
- JWT access + refresh token issuance.
- Refresh token rotation + revoke on logout.
- Logout supports access token blacklist + refresh token revoke.
- Login alerts and unknown login email notifications.
- RBAC for CUSTOMER/RESTAURANT_OWNER/DELIVERY_AGENT/ADMIN.
- Partner approval defaulting to PENDING for restaurant owners and delivery agents.

Key endpoints:

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/login/request-otp
- POST /api/v1/auth/login/verify-otp
- POST /api/v1/auth/password-reset/request-otp
- POST /api/v1/auth/password-reset/confirm
- POST /api/v1/auth/refresh
- POST /api/v1/auth/email-verification/request-otp
- POST /api/v1/auth/email-verification/verify-otp
- POST /api/v1/auth/logout

Pending:

- Device fingerprint anomaly scoring.
- Redis-backed rate limiting.

3.2 OTP Service (COMPLETE)

Implemented:

- OTP generation for phone verification, phone update, phone login, password reset, and email verification.
- Max attempts + lockout enforcement.
- Resend cooldown to prevent spam.
- Email OTP via SMTP templates; SMS OTP via SmsSender implementation (mock/no-op ready).
- DB-backed OTP store with used/locked/expiry tracking.

Pending:

- Redis-backed OTP cache (optional migration).

3.3 Email Service (COMPLETE)

Implemented:

- SMTP sender abstraction with HTML templates.
- Templates: verification, password reset, login alert, order confirmation, order delivered, payment receipt, refund confirmation, partner/restaurant approval status.
- Email dispatch integrated with Notification jobs.

Pending:

- Template versioning and template admin management.

3.4 User Profile Service (COMPLETE)

Implemented:

- Get profile (/users/me).
- Update profile with avatar upload (multipart).
- Phone OTP request + verify for phone binding.
- Change password with validation.
- Soft delete profile with identity scrubbing and refresh token revoke.

Key endpoints:

- GET /api/v1/users/me
- PUT /api/v1/users/me
- POST /api/v1/users/me/phone/request-otp
- POST /api/v1/users/me/phone/verify-otp
- PUT /api/v1/users/me/password
- DELETE /api/v1/users/me

3.5 Address Service (COMPLETE)

Implemented:

- Address CRUD with default address invariant.
- Optional lat/lng; geocoding fallback to Nominatim.
- Default address auto-assigned for first address.

Key endpoints:

- GET /api/v1/users/me/addresses
- POST /api/v1/users/me/addresses
- PUT /api/v1/users/me/addresses/{addressId}
- DELETE /api/v1/users/me/addresses/{addressId}
- PATCH /api/v1/users/me/addresses/{addressId}/default

3.6 Restaurant Service (COMPLETE)

Implemented:

- Owner restaurant CRUD with image upload.
- Approval gating: restaurants created PENDING + inactive until admin approval.
- Restaurant discovery by location and filters (veg/non-veg, price bracket, rating).
- Search by restaurant name/description/city + menu item match.
- Service zones with include/exclude overrides.

Key endpoints:

- POST /api/v1/restaurants/me
- PUT /api/v1/restaurants/me/{restaurantId}
- DELETE /api/v1/restaurants/me/{restaurantId}
- GET /api/v1/restaurants/me
- GET /api/v1/restaurants/{id}
- GET /api/v1/restaurants/discovery
- GET /api/v1/restaurants/search
- POST /api/v1/restaurants/zones
- GET /api/v1/restaurants/zones
- POST /api/v1/restaurants/me/{restaurantId}/zones

Pending:

- Pagination/cursoring for discovery.
- Cache layer for geo discovery.

3.7 Menu Service (COMPLETE)

Implemented:

- Menu item CRUD with image upload.
- Owner menu listing and public menu listing.
- Availability and category tagging.

Key endpoints:

- POST /api/v1/restaurants/me/{restaurantId}/menu
- PUT /api/v1/restaurants/me/{restaurantId}/menu/{menuItemId}
- DELETE /api/v1/restaurants/me/{restaurantId}/menu/{menuItemId}
- GET /api/v1/restaurants/me/{restaurantId}/menu
- GET /api/v1/restaurants/{restaurantId}/menu

3.8 Cart Service (COMPLETE)

Implemented:

- Single restaurant cart constraint.
- Add/update/remove/clear cart items.
- Checkout preview with distance + fee breakup.
- Realtime cart events via WebSocket publisher.

Key endpoints:

- GET /api/v1/cart
- POST /api/v1/cart/items
- PUT /api/v1/cart/items/{itemId}
- DELETE /api/v1/cart/items/{itemId}
- DELETE /api/v1/cart/clear
- POST /api/v1/cart/checkout-preview

Pending:

- Coupon apply/remove.

3.9 Pricing Engine (COMPLETE)

Implemented:

- Base fee + slab fee + per-km fee.
- Surge multipliers for peak/rain flags.
- Min/max delivery fee clamp.
- Packing charge by policy (item/fixed/percent).
- Platform fee by policy (fixed/percent).
- Tax calculation from configured percent.
- Free delivery threshold.

Pending:

- Dynamic demand bucket integration.
- Weather signal integration.
- Coupon-based adjustments.

3.10 Order Service (COMPLETE)

Implemented:

- Place order from cart with pricing snapshot.
- Order state transitions: CREATED -> PENDING_PAYMENT -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED.
- Cancellation flows (customer/owner/admin) with refund handling.
- Owner finance summary + transaction list.
- Payment intent creation and simulation endpoints for local testing.
- Dispatch trigger on payment success.

Key endpoints:

- POST /api/v1/orders
- GET /api/v1/orders
- GET /api/v1/orders/{orderId}
- POST /api/v1/orders/{orderId}/cancel
- POST /api/v1/orders/{orderId}/payment/intent
- POST /api/v1/orders/{orderId}/payment/simulate-success
- POST /api/v1/orders/{orderId}/payment/simulate-failure
- GET /api/v1/orders/owner
- GET /api/v1/orders/owner/restaurants/{restaurantId}
- GET /api/v1/orders/owner/finance/summary
- GET /api/v1/orders/owner/finance/transactions
- POST /api/v1/orders/owner/{orderId}/accept
- POST /api/v1/orders/owner/{orderId}/preparing
- POST /api/v1/orders/owner/{orderId}/ready-for-pickup
- POST /api/v1/orders/owner/{orderId}/cancel
- POST /api/v1/orders/delivery/{orderId}/pickup
- POST /api/v1/orders/delivery/{orderId}/delivered
- GET /api/v1/orders/admin
- POST /api/v1/orders/admin/{orderId}/cancel
- POST /api/v1/orders/admin/{orderId}/payment/refund

3.11 Payment Service (COMPLETE)

Implemented:

- Razorpay order creation and webhook verification.
- Payment status transitions: INITIATED -> AUTHORIZED -> CAPTURED/FAILED -> REFUNDED_PARTIAL/REFUNDED_FULL.
- Refund creation with evidence capture and idempotency key.
- Mock gateway for local/dev.

Key endpoints:

- POST /api/v1/payments/webhook

3.12 Delivery/Dispatch Service (COMPLETE)

Implemented:

- Agent onboarding profile and availability toggles.
- Offer/accept/reject flow with timeout and reassignment.
- No-agent fallback queue + admin visibility.
- Dispatch event timeline and metrics.
- Agent finance summary and transactions.

Key endpoints:

- POST /api/v1/dispatch/agent/availability
- GET /api/v1/dispatch/agent/assignments/current
- GET /api/v1/dispatch/agent/assignments/current/details
- GET /api/v1/dispatch/agent/orders/history
- GET /api/v1/dispatch/agent/finance/summary
- GET /api/v1/dispatch/agent/finance/transactions
- POST /api/v1/dispatch/orders/{orderId}/accept
- POST /api/v1/dispatch/orders/{orderId}/reject
- POST /api/v1/dispatch/orders/{orderId}/pickup
- POST /api/v1/dispatch/orders/{orderId}/delivered
- POST /api/v1/dispatch/admin/process-timeouts
- GET /api/v1/dispatch/admin/orders/{orderId}/timeline
- GET /api/v1/dispatch/admin/no-agent-queue
- GET /api/v1/dispatch/admin/metrics

3.13 Tracking Service (COMPLETE)

Implemented:

- Live location pings and ETA updates.
- Timeline and snapshot endpoints.
- WebSocket broadcast for tracking updates.
- Access checks for customer/owner/agent/admin.

Key endpoints:

- POST /api/v1/tracking/orders/{orderId}/ping
- GET /api/v1/tracking/orders/{orderId}/snapshot
- GET /api/v1/tracking/orders/{orderId}/timeline

Pending:

- MongoDB tracking timeline store.

3.14 Notification Service (COMPLETE)

Implemented:

- In-app notifications table.
- Async notification job queue with retry and DLQ.
- Email/push/SMS dispatch via sender abstractions.
- Realtime publish for UI updates.

Key endpoints:

- GET /api/v1/notifications
- GET /api/v1/notifications/unread-count
- PATCH /api/v1/notifications/{notificationId}/read
- PATCH /api/v1/notifications/read-all
- POST /api/v1/notifications/admin/dlq/{jobId}/retry

3.15 Admin Service (COMPLETE)

Implemented:

- Dashboard aggregates and finance overview.
- User enable/disable.
- Restaurant active toggle.
- Pricing rule CRUD + activation.
- Dispute tracking + resolution.
- Coupon campaign CRUD.
- Review moderation records.
- Payout control (block/unblock).
- Partner/restaurant/delivery agent approval workflow.

Key endpoints:

- GET /api/v1/admin/dashboard
- GET /api/v1/admin/users
- PATCH /api/v1/admin/users/{userId}/enabled
- GET /api/v1/admin/restaurants
- PATCH /api/v1/admin/restaurants/{restaurantId}/active
- GET /api/v1/admin/orders
- GET /api/v1/admin/refunds
- GET /api/v1/admin/pricing-rules
- POST /api/v1/admin/pricing-rules
- PATCH /api/v1/admin/pricing-rules/{pricingRuleId}
- PATCH /api/v1/admin/pricing-rules/{pricingRuleId}/activate
- GET /api/v1/admin/finance/overview
- GET /api/v1/admin/disputes
- POST /api/v1/admin/disputes
- PATCH /api/v1/admin/disputes/{disputeId}/status
- GET /api/v1/admin/coupon-campaigns
- POST /api/v1/admin/coupon-campaigns
- PATCH /api/v1/admin/coupon-campaigns/{campaignId}/active
- GET /api/v1/admin/review-moderations
- POST /api/v1/admin/review-moderations
- GET /api/v1/admin/payout-controls
- PATCH /api/v1/admin/restaurants/{restaurantId}/payout-block
- GET /api/v1/admin/approvals/pending/partners
- GET /api/v1/admin/approvals/pending/restaurants
- GET /api/v1/admin/approvals/pending/delivery-agents
- POST /api/v1/admin/approvals/partners
- POST /api/v1/admin/approvals/restaurants
- POST /api/v1/admin/approvals/delivery-agents

3.16 Coupons/Offers (PARTIAL)

Implemented:

- Admin coupon campaigns with schedule, discount percent, and activation.

Pending:

- Coupon eligibility engine.
- Cart apply/remove coupon APIs.
- Coupon usage tracking per user/order.

3.17 Reviews/Ratings (PARTIAL)

Implemented:

- Admin review moderation records (scaffolding only).

Pending:

- Restaurant and item review entities.
- Review create/edit/list APIs.
- Rating aggregates and delivered-order gating.

3.18 Security Hardening (PARTIAL)

Implemented:

- JWT access/refresh + blacklist table.
- OTP attempt lockout and cooldown.

Pending:

- Redis rate limiting.
- Device fingerprint anomalies.
- Security headers hardening checklist.

3.19 Data Governance (PARTIAL)

Implemented:

- Soft delete of user accounts.

Pending:

- Data retention and TTL policies.
- Export/delete workflows.
- PII encryption at rest.

4) Database Schema (Implemented vs Planned)

Implemented entities (PostgreSQL):

- users, refresh_tokens, token_blacklist_entries
- otp_verifications
- addresses
- restaurants, service_zones, restaurant_service_zones
- menu_items
- carts, cart_items
- orders, order_items
- payments
- delivery_agent_profiles
- dispatch_assignments, dispatch_events
- order_tracking_points
- notifications, notification_jobs
- pricing_rules, pricing_rule_audits
- admin_action_audits, admin_dispute_cases, admin_coupon_campaigns, admin_review_moderations, admin_payout_controls

Planned (not implemented yet):

- coupons, coupon_usages
- restaurant_reviews, item_reviews
- email_verification_tokens, password_reset_tokens (OTP currently covers these)
- deliveries (separate entity), delivery proofs

5) Development Roadmap (Updated Status)

Phase 1: Auth foundation + JWT refresh + blacklist - COMPLETE.

Phase 2: Email verification + OTP platform - COMPLETE.

Phase 3: Profile + addresses + avatar flow - COMPLETE.

Phase 4: Restaurant onboarding + menu + zones - COMPLETE.

Phase 5: Cart + pricing engine - COMPLETE.

Phase 6: Orders + state transition rules - COMPLETE.

Phase 7: Payment gateway + webhooks + refunds - COMPLETE.

Phase 8: Delivery orchestration (dispatch) - COMPLETE.

Phase 9: Real-time tracking - COMPLETE (Postgres timeline; Mongo pending).

Phase 10: Coupons/offers - PARTIAL (admin campaigns only).

Phase 11: Notifications + email templates - COMPLETE.

Phase 12: Reviews/ratings - PENDING.

Phase 13: Admin dashboard/ops - COMPLETE.

Phase 14: Performance/security/compliance hardening - PARTIAL.

Phase 15: Group ordering + settlement - PENDING.

6) Next Implementation Steps (Actionable)

1. Build customer-facing coupon apply/remove and usage tracking (Phase 10 completion).
2. Add review entities + APIs and rating aggregates (Phase 12).
3. Introduce Redis for rate limits/OTP cache/JWT blacklist; migrate OTP storage if desired.
4. Optional: migrate tracking timeline to MongoDB for scale.
5. Implement data retention + export/delete workflows (Phase 14).

