Plan: UrbanBites Backend Blueprint

This draft defines a full backend blueprint for a Zomato/Swiggy-style system using your current Spring Boot foundation (src/main/java/com/prajjwal/UrbanBites) and target document implementation_plan_backend.md. It expands the existing auth/profile/OTP baseline into production-grade modules, data model, APIs, event-driven notifications, geo-search, delivery orchestration, and phased execution so multiple developers can build in parallel with low integration risk.

Decision lock (implementation baseline for this plan):

Pricing strategy: Hybrid delivery pricing (base + slab + per-km + dynamic surge + caps) with explicit packing and platform charges.

Rating granularity: Option B (restaurant-level rating + food-item-level rating) restricted to delivered orders.

Serviceability model: Option C hybrid (radius prefilter + service-zone polygon overrides and explicit include/exclude rules).

1) System Architecture

Architecture style: Layered monolith first (modular by domain), event-driven internally; evolve to microservices only after scaling thresholds.

Primary runtime: Spring Boot + Spring Security + Spring Data JPA + STOMP WebSocket (src/main/java/com/prajjwal/UrbanBites/websocket/WebSocketConfig.java).

Data stores by workload:

PostgreSQL: transactional consistency (users, carts, orders, payments, delivery lifecycle).

MongoDB: high-volume append-only tracking stream (agent location pings, order status timeline, notification event log).

Redis: OTP/session/rate-limit/cache/JWT blacklist.

Integration boundaries:

Maps/Geocoding (Google Maps API), Payments (Razorpay/Stripe), FCM, SMS provider, SMTP email.

Cross-cutting components: centralized exception handling (exception/GlobalExceptionHandler), audit metadata, idempotency keys, observability, retry policies.

2) Core Backend Modules

Authentication Service: registration/login/JWT issuance/refresh/logout, role-based access, device fingerprint + location anomaly detection.

User Profile Service: profile CRUD, email/phone update flows, gender/avatar management, account state flags.

OTP Service: OTP generation/delivery/verification for phone verification, phone update, password reset (Redis-first + DB audit fallback).

Email Service: templated HTML transactional/security email orchestration via JavaMailSender; async queue for non-blocking sends.

Address Service: multi-address CRUD with default address invariant.

Restaurant Service: owner onboarding, KYC/status, operating hours, cuisine/tags, geo metadata, and zone override serviceability setup.

Menu Service: categories, menu items, variants/add-ons, availability windows, stock flags.

Cart Service: cart lifecycle, item merge/update, restaurant conflict handling, and checkout preview with full fee breakup.

Order Service: checkout, order state machine, item and contact snapshot, hybrid fee calculation snapshot (delivery/packing/platform/taxes), cancellation rules, and pricing_rule_version locking.

Payment Service: payment intent/order link, webhook reconciliation, refund orchestration, failure recovery.

Delivery Service: agent availability, assignment workflow, pickup/drop transitions, proof of delivery.

Tracking Service: location ingestion, ETA updates, WebSocket fan-out, timeline persistence to MongoDB.

Coupon Service: eligibility engine, usage caps, expiry, stacking constraints.

Notification Service: channel routing (push/email/SMS/in-app), templates, retry/dead-letter strategy.

Review Service: rating and review posting after delivered orders (restaurant + item), one-review constraints, and moderation hooks.

Admin Service: users/restaurants/orders/disputes/coupons/reporting, operational controls, pricing rule management, and review moderation console.

3) Database Schema Design

Core tables (PostgreSQL): users, addresses, restaurants, menu_categories, menu_items, carts, cart_items, orders, order_items, payments, delivery_agents, deliveries, coupons, coupon_usages, restaurant_reviews, item_reviews, notifications, otp_verifications, email_verification_tokens, password_reset_tokens, service_zones, restaurant_service_zones, pricing_rules, pricing_rule_audits.

Key relationships:

users(1)-to-many(addresses, orders, notifications, restaurant_reviews, item_reviews, coupon_usages).

users(1)-to-1(delivery_agents) for delivery-role operational profile.

restaurants(1)-to-many(menu_categories, menu_items, orders, restaurant_reviews).

carts(1)-to-many(cart_items) and users(1)-to-1-or-many(carts) (single active cart recommended).

orders(1)-to-many(order_items) and orders(1)-to-1(payments, deliveries optional before assignment).

orders(1)-to-many(restaurant_reviews, item_reviews) with strict delivered-order eligibility checks.

order_items(1)-to-1-or-many(item_reviews) depending on edit/version policy.

restaurants(many)-to-many(service_zones) via restaurant_service_zones for zone include/exclude overrides.

coupons(1)-to-many(coupon_usages).

Important denormalized snapshots in orders:

delivery_contact_name, delivery_contact_phone, full delivery address snapshot, line-item price snapshot, delivery_distance_km, delivery_fee, packing_charge, platform_fee, tax_total, discount_total, surge_multiplier, and pricing_rule_version.

Token/OTP strategy:

Keep otp_verifications, email_verification_tokens, password_reset_tokens with expires_at, used_at, attempt_count, and purpose-specific indexes.

Indexing priorities:

Geo lookup on restaurant coordinates (PostGIS or lat/lng + geospatial extension).

Frequent lookups: user email/phone, active cart by user, order by user/status/date, agent availability by zone, coupon code validity, discovery by geohash/zone, and review aggregates by restaurant/item.

Migration approach: continue Flyway versioning in src/main/resources/db/migration with additive, reversible-safe scripts.

4) API Design

Auth: register/login/refresh/logout, forgot password request+confirm, email verification request+confirm, suspicious login confirm.

Profile & Address: get/update profile, upload avatar URL, phone OTP request/verify, address CRUD + set default.

Restaurant & Menu: discovery endpoints, owner restaurant CRUD, menu category/item CRUD, public menu fetch.

Cart & Checkout: cart add/update/remove/clear, apply/remove coupon, checkout preview (distance + fee breakup + pricing_rule_version + serviceability verdict), place order.

Orders: order creation, order detail, user order history, cancel request, reorder.

Payments: create payment intent/order, verify status, webhook endpoint, refund request/status.

Delivery & Tracking: agent availability toggle, accept/reject assignment, pickup/drop updates, live location stream.

Reviews & Notifications: create/list restaurant reviews, create/list item reviews, edit-within-window, mark notification read, fetch unread count.

Admin: dashboard aggregates, user/restaurant moderation, payout/refund controls, coupon campaign management.

5) Location-Based Restaurant Search Algorithm (Multi-Restaurant Discovery)

Candidate fetch: return multiple restaurants within configurable radius from user lat/lng (e.g., 3--10 km), never a single-restaurant response model.

Serviceability model (Option C hybrid):

Step 1 (radius prefilter): shortlist restaurants by configurable max-distance and open status.

Step 2 (zone overrides): apply polygon include/exclude rules from service_zones and restaurant_service_zones; zone rule has higher precedence than radius.

Fallback: when map routing/geocoding is degraded, use cached geohash-distance buckets + last-known zone mapping and mark ETA confidence.

Filters: open-now, cuisine, veg/non-veg, cost bracket, rating threshold, serviceability.

Ranking score (weighted): distance + delivery ETA + rating + popularity + promoted weight.

Pagination: cursor-based for stable ordering under concurrent updates.

Cache strategy: Redis cache by rounded geohash + filter signature with short TTL; invalidate on restaurant/menu/status/zone changes.

6) Pricing and Fee Calculation Engine (Hybrid)

Goal: ensure delivery charges increase with restaurant-to-delivery distance while remaining configurable, auditable, and capped.

Inputs: distance_km, time_slot, demand_bucket, weather_flag, restaurant_packing_policy, cart_subtotal, coupon effects.

Delivery fee formula (hybrid):

delivery_fee_raw = base_fee + slab_fee(distance_km) + per_km_rate * max(0, distance_km - slab_km_cutoff)

delivery_fee_surge = delivery_fee_raw * surge_multiplier(time_slot, demand_bucket, weather_flag)

delivery_fee_final = clamp(delivery_fee_surge, min_delivery_fee, max_delivery_fee)

Distance behavior requirement: delivery_fee_final must be non-decreasing across distance bands unless an explicit free-delivery campaign applies.

Packing charge:

packing_charge = sum(item_qty * item_packing_fee) when item-level packing is enabled; otherwise apply restaurant-level packing policy (fixed or percentage with min/max cap).

Platform fee:

platform_fee = fixed_amount or percent_of_subtotal as per active pricing_rules record.

Free delivery rule:

if eligible_subtotal >= free_delivery_threshold and no exclusion rule, set delivery_fee_final = 0 while keeping packing/platform/tax as applicable.

Tax and rounding:

Apply taxes on configured taxable components only; use deterministic rounding at component-level then order-level total.

Snapshot and audit:

Persist full fee components, applied rule IDs, and pricing_rule_version in orders for reconciliation/refund correctness.

7) Delivery Agent Assignment Algorithm

Eligibility pool: online + available + verified + in service zone + active shift.

Scoring: pickup distance, current load, historical acceptance rate, completion SLA, fairness weight.

Dispatch flow: top-N ranked agents -> sequential/batched offer -> timeout -> fallback escalation.

State transitions: UNASSIGNED -> OFFERED -> ACCEPTED -> PICKED_UP -> DELIVERED with cancellation branches.

Resilience: dead-letter and retry when no agent available; auto-reassignment on no-movement SLA breach.

8) Real-Time Tracking System

Ingress: agent app sends location pings (5--10 sec) to tracking endpoint.

Processing: validate order-agent mapping, smooth noisy GPS points, persist to MongoDB timeline.

Broadcast: STOMP topics for customer/order/admin views; private channels for sensitive updates.

ETA engine: rolling ETA recalculation using route distance + traffic heuristics.

Fallback: if WebSocket unavailable, expose polling endpoint for latest tracking snapshot.

9) Payment Workflow

Order pre-create: create order in PENDING_PAYMENT with immutable pricing snapshot (including delivery/packing/platform/tax and pricing_rule_version).

Payment intent: create Razorpay/Stripe order/intention, attach idempotency key.

Verification: trust webhook as source of truth; client callback treated as provisional.

Post-payment actions: success -> confirm order + trigger notifications + start assignment; failure -> release cart and notify user.

Refunds: support full/partial refunds with status sync and confirmation notifications.

10) Order and Payment State Machine Guarantees

Define explicit transition matrix with actor ownership and idempotency key requirement:

Order: CREATED -> PENDING_PAYMENT -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED.

Payment: INITIATED -> AUTHORIZED -> CAPTURED or FAILED -> REFUNDED_PARTIAL/REFUNDED_FULL.

Guard rules: reject invalid transitions, enforce replay-safe webhook handling, and run periodic reconciliation for gateway/order mismatch.

Cancellation/refund policy matrix must map each order stage to allowed cancellation actor, refund percentage, and SLA.

11) Notification System

Channels: email, push (FCM), SMS (OTP/security), in-app notifications table.

Routing policy: mandatory security alerts via email+push; OTP via SMS (+optional email fallback).

Event triggers: auth events, order lifecycle, payment/refund, delivery milestones, promotions.

Reliability: async queue, retry with exponential backoff, dead-letter logging, idempotent event keys.

12) Email Service Architecture

Core design: EmailSender abstraction in service/ with template rendering utility in util/.

Template set (target): verification_email.html, password_reset.html, login_alert.html, order_confirmation.html, order_delivered.html, payment_receipt.html, refund_confirmation.html.

Security emails: account verification, password reset, new device/location login, suspicious login, activation link.

Order emails: confirmation, receipt, delivered confirmation, payment success/failure, refund confirmation.

Token model: dedicated email_verification_tokens and password_reset_tokens with one-time use + expiry + revocation semantics.

13) Review Integrity and Moderation Controls

Eligibility: allow review creation only for delivered orders linked to authenticated user.

Granularity (Option B): collect both restaurant_rating and item_rating with optional text/media attachments.

Uniqueness: one active restaurant review per order and one active item review per order_item.

Edit policy: allow edits within configurable window (e.g., 30 minutes) while preserving immutable audit history.

Moderation: auto-flag profanity/spam/abuse patterns, auto-hide above threshold, and queue for admin review.

Aggregates: maintain weighted rating summaries for restaurants and items with anti-fraud signals (burst checks, device correlation).

14) Security Design

Access control: RBAC for CUSTOMER, RESTAURANT_OWNER, DELIVERY_AGENT, ADMIN (enums/Role).

Auth hardening: short-lived access JWT + refresh token rotation, Redis JWT blacklist on logout/revocation.

Rate limiting: Redis-based per-IP/per-user policies on login, OTP request, password reset.

OTP hardening: 6-digit OTP, 5-minute expiry, max-attempt lock, resend cooldown, replay prevention.

Transport/security headers: HTTPS-only, CORS allowlist, secure headers, strict input validation.

Audit: persistent login metadata, device/location fingerprint deltas, admin action audit trails.

15) Data Governance and Compliance

PII handling: encrypt sensitive fields at rest where feasible (phone, address fragments, device fingerprints) and enforce least-privilege access.

Retention: define TTL/retention windows for OTP/token/login metadata/notifications and archival process for old orders.

Audit controls: immutable admin action logs with actor_id, timestamp, before/after metadata, and reason code.

Delete/export support: plan user data export and account deletion workflows aligned with legal obligations.

16) Operational SLOs and Phase Exit Criteria

Core SLOs (initial targets): checkout preview p95 < 400 ms, order placement success >= 99.5%, webhook reconciliation delay < 2 minutes, tracking staleness < 15 seconds under normal load.

Phase exit gates: each roadmap phase closes only when API contract tests, migration verification, observability dashboards, and rollback notes are complete.

Runbooks: document no-agent-available, payment mismatch, notification backlog, and map-provider degradation playbooks.

17) Clean Folder Structure

Keep flat layer directories only: config, security, websocket, controller, service, repository, entity, dto, enums, exception, util.

DTO separation: dto/request and dto/response (already aligned).

No nested module folders: avoid service/auth or controller/order; use class naming conventions instead (AuthService, OrderService, AdminController).

Conventions: one domain concern per class, consistent suffixes (Entity, Repository, Service, Controller, Request, Response).

18) Development Roadmap

Phase 1: project baseline + auth hardening completion (JWT refresh, logout blacklist, RBAC checks).

Phase 2: email verification + OTP platform (SMS integration + token tables).

Phase 3: user profile + addresses + avatar flow.

Phase 4: restaurant onboarding + menu management + zone override setup.

Phase 5: cart and hybrid pricing engine (distance slabs + per-km + surge + packing/platform charges).

Phase 6: order placement + strict order/payment state transition matrix.

Phase 7: payment gateway integration + webhooks + refunds.

Phase 8: production-grade delivery orchestration (agent onboarding, availability/shift control, smart assignment, offer timeout + reassignment, dispatch audit trail, and SLA-safe fallback handling).

Phase 9: real-time tracking (WebSocket + Mongo timelines).

Phase 10: coupons/offers engine.

Phase 11: notification orchestration + expanded email templates.

Phase 12: restaurant + item reviews/ratings with delivered-order gating and moderation hooks.

Phase 13: admin dashboard and operational tooling.

Phase 14: performance tuning, security hardening, compliance controls, test coverage expansion, and production readiness.

Phase 15: smart group ordering and decision system (collaborative recommendations, shared cart, single-payer checkout, and settlement tracking).

18.1) Phase 8 Upgrade: Delivery Orchestration (Zomato/Swiggy-style)

Objective: move from basic assignment to resilient dispatch orchestration that remains correct under retries, concurrency, timeouts, and real-world agent variability.

Scope (MVP, mandatory):

- Agent onboarding profile with verification status, transport type, active shift, and availability toggle.
- Assignment state machine: UNASSIGNED -> OFFERED -> ACCEPTED -> PICKED_UP -> DELIVERED, with REJECTED/TIMEOUT/REASSIGNED branches.
- Auto-dispatch trigger only after payment-confirmed order state.
- Offer timeout and cascading reassignment policy (configurable attempts and cooldown).
- Concurrency-safe accept flow (single winner guarantee; reject double-accept race).
- No-agent fallback path (queue + retry window + admin visibility flag).
- Immutable dispatch event log (offer, accept, reject, timeout, reassign, complete).

Scope (Hardening, strongly recommended in same phase if capacity permits):

- Assignment scoring beyond distance: zone eligibility, active load, recent acceptance rate, and fairness rotation.
- Stale location guardrails (max location age threshold before assignment eligibility).
- Agent dropout recovery (accepted but offline/no-movement SLA -> auto-reassign).
- Delivery proof at completion (OTP or proof artifact hooks) with dispute-ready audit metadata.
- SLA watchdog jobs and metrics (offer latency p95, acceptance rate, reassign count, no-agent incidence).

API/Workflow expectations:

- Agent APIs: go-online/go-offline, current assignment fetch, accept offer, reject offer, pickup confirmation, delivered confirmation.
- System workflow: CONFIRMED order -> dispatch candidate selection -> timed offer -> accept/reassign loop -> terminal delivery state.
- Idempotency for all write actions (offer responses, pickup/delivered confirmations, reassignment triggers).

Edge cases to explicitly handle:

- Two agents attempt to accept same offer.
- Offer expires while agent submits acceptance.
- Agent goes offline after acceptance but before pickup.
- Restaurant prep delay invalidates earlier ETA assumptions.
- Customer cancellation while assignment is in progress.
- Payment/refund state conflicts with delivery progression.

Phase 8 acceptance criteria:

- Assignment correctness under concurrent accept tests (single-winner invariant always holds).
- End-to-end dispatch lifecycle tests including timeout/reassignment and no-agent fallback.
- Audit trail completeness for every assignment transition.
- Operational dashboard metrics available for assignment latency and failure causes.

19) Phase 15: Smart Group Ordering & Decision System

Objective: add collaborative group ordering with recommendation support, a shared cart, one-click single-payer checkout, and post-order split settlement, while keeping all existing modules backward compatible.

1) Group Management

Core actions: create group, join group via shareable link, join group via QR.

Lifecycle states: ACTIVE, LOCKED, COMPLETED.

Core entities: Group and GroupMember.

Recommended fields:

Group(id, host_user_id, join_code, state, restaurant_id nullable, created_at, updated_at).

GroupMember(id, group_id, user_id, role, joined_at, is_active).

2) Group Preference Aggregation

Aggregate member preferences across cuisine, veg/non-veg, and budget bands.

Use order history signals when available to improve profile quality.

Build a group profile response with:

- preferred cuisines (ranked)
- average budget range
- dietary mix (veg/non-veg ratio)

Refresh profile on member join/leave and optionally on explicit recompute.

3) Group Decision Engine (Core)

Fetch candidate restaurants inside configurable discovery radius (default 3 km).

Rank using weighted score:

final_score = w1(preference_match) + w2(rating) + w3(delivery_time_score) + w4(price_compatibility)

Weights must be configurable via application properties.

Return only top 3 restaurants.

Each recommendation must include:

- matchPercentage
- whyThisRestaurant (short explanation string)

4) Shared Cart System

Support multi-user shared cart where each cart item is tagged with userId.

Operations: add item, update quantity, remove item, fetch full cart.

MVP constraint: one cart maps to one restaurant only.

Core entities: GroupCart and GroupCartItem.

Recommended fields:

GroupCart(id, group_id, restaurant_id, state, locked_at).

GroupCartItem(id, group_cart_id, menu_item_id, quantity, added_by_user_id, unit_price_snapshot, notes).

5) Group Checkout

Before checkout, lock the cart to stop concurrent edits.

Compute per-user contribution from item ownership and fee allocation policy.

Host (or selected user) sets payerUserId as the single payer for gateway payment.

Persist immutable checkout snapshot for reconciliation and settlement generation.

6) Payment Handling

Reuse existing Payment Service (Razorpay/Stripe integration path stays unchanged).

Single payer model only: exactly one user pays full group amount.

No multi-user concurrent payment capture in MVP.

On success, continue through current Order Service placement path.

7) Split Settlement System

Generate settlement records after successful payment.

Entity:

GroupSettlement(id, group_id, order_id, from_user_id, to_user_id, amount, status, created_at, settled_at).

Purpose: track who owes whom and current settlement progress.

8) UPI Settlement Support

Generate UPI deep links:

upi://pay?pa={upiId}&am={amount}

Allow manual settlement confirmation using Mark as Paid action.

Keep settlement status auditable with timestamps and actor metadata.

9) APIs

Group:

POST /group/create
POST /group/join
GET /group/{id}

Recommendations:

GET /group/{id}/recommendations

Cart:

POST /group/{id}/cart/add
GET /group/{id}/cart
DELETE /group/{id}/cart/{itemId}

Checkout:

POST /group/{id}/checkout

Settlement:

GET /group/{id}/settlements
POST /group/{id}/settlement/pay
GET /group/{id}/upi-link

10) UX Flow (MVP)

Create group -> members join -> top 3 recommendations shown -> members add items to shared cart -> cart locked -> checkout -> one user pays -> others settle dues.

11) Integration Notes

Reuse existing Restaurant Service for discovery and metadata.

Reuse Cart Service logic where possible for item, pricing, and validation flows.

Reuse Order Service for final order creation and lifecycle transitions.

Reuse Payment Service for gateway orchestration and webhook reconciliation.

Reuse Notification Service for group events (join, lock, payment success, settlement reminders).

No breaking changes to existing non-group modules.

12) Challenges and Solutions

Real-time sync challenge: start with short-interval polling; move to WebSocket push in a later enhancement iteration.

Payment complexity challenge: avoid partial multi-payer edge cases with strict single payer model.

Recommendation accuracy challenge: keep scoring weights configurable and tune using usage analytics.

13) Future Enhancements

Add group voting system for restaurant/menu decisions.

Add decision timer with auto-finalization rules.

Add in-group chat for coordination.

Add multi-restaurant ordering in a future phase (explicitly out of MVP).

Steps

Finalize this blueprint content for implementation_plan_backend.md and approve section scope/order.

Freeze schema contracts and migration naming plan in src/main/resources/db/migration.

Approve API boundary list for controller/ and DTO naming in dto/request + dto/response.

Approve phase ownership and parallelization strategy across services.
