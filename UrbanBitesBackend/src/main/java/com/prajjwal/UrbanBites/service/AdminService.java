package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.AdminCreateCouponCampaignRequest;
import com.prajjwal.UrbanBites.dto.request.AdminCreateDisputeRequest;
import com.prajjwal.UrbanBites.dto.request.AdminModerateReviewRequest;
import com.prajjwal.UrbanBites.dto.request.AdminSetPayoutBlockRequest;
import com.prajjwal.UrbanBites.dto.request.AdminUpsertPricingRuleRequest;
import com.prajjwal.UrbanBites.dto.request.AdminUpdateDisputeStatusRequest;
import com.prajjwal.UrbanBites.dto.response.AdminCouponCampaignResponse;
import com.prajjwal.UrbanBites.dto.response.AdminDashboardResponse;
import com.prajjwal.UrbanBites.dto.response.AdminDisputeCaseResponse;
import com.prajjwal.UrbanBites.dto.response.AdminFinanceOverviewResponse;
import com.prajjwal.UrbanBites.dto.response.AdminPayoutControlResponse;
import com.prajjwal.UrbanBites.dto.response.AdminPricingRuleResponse;
import com.prajjwal.UrbanBites.dto.response.AdminRefundOpsResponse;
import com.prajjwal.UrbanBites.dto.response.AdminRestaurantResponse;
import com.prajjwal.UrbanBites.dto.response.AdminReviewModerationResponse;
import com.prajjwal.UrbanBites.dto.response.AdminToggleEventResponse;
import com.prajjwal.UrbanBites.dto.response.AdminUserResponse;
import com.prajjwal.UrbanBites.dto.response.AdminOrderOpsResponse;
import com.prajjwal.UrbanBites.entity.AdminActionAudit;
import com.prajjwal.UrbanBites.entity.AdminCouponCampaign;
import com.prajjwal.UrbanBites.entity.AdminDisputeCase;
import com.prajjwal.UrbanBites.entity.AdminPayoutControl;
import com.prajjwal.UrbanBites.entity.AdminReviewModeration;
import com.prajjwal.UrbanBites.entity.DispatchAssignment;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.Payment;
import com.prajjwal.UrbanBites.entity.PricingRule;
import com.prajjwal.UrbanBites.entity.PricingRuleAudit;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.AdminDisputeStatus;
import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.NotificationType;
import com.prajjwal.UrbanBites.enums.PaymentStatus;
import com.prajjwal.UrbanBites.enums.PackingPolicyType;
import com.prajjwal.UrbanBites.enums.PlatformFeeType;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.AdminActionAuditRepository;
import com.prajjwal.UrbanBites.repository.AdminCouponCampaignRepository;
import com.prajjwal.UrbanBites.repository.AdminDisputeCaseRepository;
import com.prajjwal.UrbanBites.repository.AdminPayoutControlRepository;
import com.prajjwal.UrbanBites.repository.AdminReviewModerationRepository;
import com.prajjwal.UrbanBites.repository.DispatchAssignmentRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.PaymentRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleAuditRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleRepository;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.repository.DeliveryAgentProfileRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final RestaurantRepository restaurantRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final PricingRuleAuditRepository pricingRuleAuditRepository;
    private final DispatchAssignmentRepository dispatchAssignmentRepository;
    private final DeliveryAgentProfileRepository deliveryAgentProfileRepository;
    private final AdminDisputeCaseRepository adminDisputeCaseRepository;
    private final AdminCouponCampaignRepository adminCouponCampaignRepository;
    private final AdminReviewModerationRepository adminReviewModerationRepository;
    private final AdminPayoutControlRepository adminPayoutControlRepository;
    private final AdminActionAuditRepository adminActionAuditRepository;
    private final NotificationService notificationService;
    private final RealtimePublisher realtimePublisher;
    private final SimpMessagingTemplate messagingTemplate;

    public AdminService(
            UserRepository userRepository,
            RestaurantRepository restaurantRepository,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            PricingRuleRepository pricingRuleRepository,
            PricingRuleAuditRepository pricingRuleAuditRepository,
            DispatchAssignmentRepository dispatchAssignmentRepository,
            DeliveryAgentProfileRepository deliveryAgentProfileRepository,
            AdminDisputeCaseRepository adminDisputeCaseRepository,
            AdminCouponCampaignRepository adminCouponCampaignRepository,
            AdminReviewModerationRepository adminReviewModerationRepository,
            AdminPayoutControlRepository adminPayoutControlRepository,
            AdminActionAuditRepository adminActionAuditRepository,
            NotificationService notificationService,
            RealtimePublisher realtimePublisher,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.userRepository = userRepository;
        this.restaurantRepository = restaurantRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.pricingRuleAuditRepository = pricingRuleAuditRepository;
        this.dispatchAssignmentRepository = dispatchAssignmentRepository;
        this.deliveryAgentProfileRepository = deliveryAgentProfileRepository;
        this.adminDisputeCaseRepository = adminDisputeCaseRepository;
        this.adminCouponCampaignRepository = adminCouponCampaignRepository;
        this.adminReviewModerationRepository = adminReviewModerationRepository;
        this.adminPayoutControlRepository = adminPayoutControlRepository;
        this.adminActionAuditRepository = adminActionAuditRepository;
        this.notificationService = notificationService;
        this.realtimePublisher = realtimePublisher;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse dashboard() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.findAll().stream().filter(User::isEnabled).count();
        long totalRestaurants = restaurantRepository.count();
        long activeRestaurants = restaurantRepository.findAll().stream().filter(Restaurant::isActive).count();
        long totalOrders = orderRepository.count();
        long deliveredOrders = orderRepository.findAll().stream()
                .filter(order -> OrderStatus.DELIVERED.equals(order.getStatus()))
                .count();
        long cancelledOrders = orderRepository.findAll().stream()
                .filter(order -> OrderStatus.CANCELLED.equals(order.getStatus()))
                .count();

        BigDecimal capturedRevenue = paymentRepository.findAll().stream()
                .filter(payment -> PaymentStatus.CAPTURED.equals(payment.getStatus()))
                .map(payment -> payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long refundedPayments = paymentRepository.findAll().stream()
                .filter(payment -> PaymentStatus.REFUNDED_FULL.equals(payment.getStatus())
                        || PaymentStatus.REFUNDED_PARTIAL.equals(payment.getStatus()))
                .count();

        long openDisputes = adminDisputeCaseRepository.findAll().stream()
                .filter(dispute -> AdminDisputeStatus.OPEN.equals(dispute.getStatus())
                        || AdminDisputeStatus.IN_REVIEW.equals(dispute.getStatus()))
                .count();

        long payoutsBlockedRestaurants = adminPayoutControlRepository.findAll().stream()
                .filter(AdminPayoutControl::isPayoutsBlocked)
                .count();

        long visibleNoAgentAssignments = dispatchAssignmentRepository
                .findByStatusAndAdminVisibilityTrueOrderByCreatedAtDesc(DispatchAssignmentStatus.NO_AGENT_AVAILABLE)
                .size();

        return new AdminDashboardResponse(
                totalUsers,
                activeUsers,
                totalRestaurants,
                activeRestaurants,
                totalOrders,
                deliveredOrders,
                cancelledOrders,
                capturedRevenue,
                refundedPayments,
                openDisputes,
                payoutsBlockedRestaurants,
                visibleNoAgentAssignments
        );
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getId).reversed())
                .map(user -> new AdminUserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getFullName(),
                        user.getRole(),
                        user.isEnabled(),
                        user.isEmailVerified(),
                        user.isPhoneVerified(),
                        user.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public void setUserEnabled(String actorEmail, Long userId, boolean enabled) {
        User actor = getUserByEmail(actorEmail);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        boolean before = user.isEnabled();
        user.setEnabled(enabled);
        userRepository.save(user);
        audit(
                "USER_ENABLED_UPDATED",
                "USER",
                user.getId(),
                "{\"enabled\":" + before + "}",
                "{\"enabled\":" + enabled + "}",
                null,
                actor
        );

        if (before != enabled) {
            publishToggleEvent(
                    "USER",
                    user.getId(),
                    "enabled",
                    before,
                    enabled,
                    actor.getEmail()
            );
        }
    }

    @Transactional(readOnly = true)
    public List<AdminRestaurantResponse> listRestaurants() {
        return restaurantRepository.findAll().stream()
                .sorted(Comparator.comparing(Restaurant::getId).reversed())
                .map(restaurant -> new AdminRestaurantResponse(
                        restaurant.getId(),
                        restaurant.getName(),
                        restaurant.getCity(),
                        restaurant.getOwner() == null ? null : restaurant.getOwner().getId(),
                        restaurant.getOwner() == null ? null : restaurant.getOwner().getEmail(),
                        restaurant.isOpenNow(),
                        restaurant.isActive()
                ))
                .toList();
    }

    @Transactional
    public void setRestaurantActive(String actorEmail, Long restaurantId, boolean active) {
        User actor = getUserByEmail(actorEmail);
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));
        boolean before = restaurant.isActive();
        restaurant.setActive(active);
        restaurantRepository.save(restaurant);
        audit(
                "RESTAURANT_ACTIVE_UPDATED",
                "RESTAURANT",
                restaurant.getId(),
                "{\"active\":" + before + "}",
                "{\"active\":" + active + "}",
                null,
                actor
        );

        if (before != active) {
            publishToggleEvent(
                    "RESTAURANT",
                    restaurant.getId(),
                    "active",
                    before,
                    active,
                    actor.getEmail()
            );
        }
    }

    @Transactional(readOnly = true)
    public List<AdminOrderOpsResponse> listOrders() {
        return orderRepository.findAll().stream()
                .sorted(Comparator.comparing(Order::getId).reversed())
                .map(order -> new AdminOrderOpsResponse(
                        order.getId(),
                        order.getStatus(),
                        order.getUser().getEmail(),
                        order.getRestaurant().getName(),
                        order.getGrandTotal()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminRefundOpsResponse> listRefunds() {
        return paymentRepository.findAll().stream()
                .filter(payment -> PaymentStatus.REFUNDED_FULL.equals(payment.getStatus())
                        || PaymentStatus.REFUNDED_PARTIAL.equals(payment.getStatus()))
                .sorted(Comparator.comparing(Payment::getId).reversed())
                .map(payment -> new AdminRefundOpsResponse(
                        payment.getOrder().getId(),
                        payment.getId(),
                        payment.getStatus(),
                        payment.getAmount(),
                        payment.getRefundedAmount(),
                        payment.getRefundReason(),
                        payment.getRefundEvidenceImagePath()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminFinanceOverviewResponse financeOverview() {
        List<Order> orders = orderRepository.findAll();
        List<Payment> payments = paymentRepository.findAll();
        List<DispatchAssignment> assignments = dispatchAssignmentRepository.findAll();

        BigDecimal capturedPayments = payments.stream()
                .filter(payment -> PaymentStatus.CAPTURED.equals(payment.getStatus())
                        || PaymentStatus.REFUNDED_FULL.equals(payment.getStatus())
                        || PaymentStatus.REFUNDED_PARTIAL.equals(payment.getStatus()))
                .map(payment -> money(payment.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal refundedAmount = payments.stream()
                .map(payment -> money(payment.getRefundedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal subtotalTotal = orders.stream().map(order -> money(order.getSubtotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal packingTotal = orders.stream().map(order -> money(order.getPackingCharge())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxTotal = orders.stream().map(order -> money(order.getTaxTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal platformFeeTotal = orders.stream().map(order -> money(order.getPlatformFee())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal deliveryFeeTotal = orders.stream().map(order -> money(order.getDeliveryFee())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discountTotal = orders.stream().map(order -> money(order.getDiscountTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal restaurantEarnings = subtotalTotal
                .add(packingTotal)
                .add(taxTotal)
                .subtract(discountTotal);

        BigDecimal agentPayoutTotal = assignments.stream()
                .filter(assignment -> DispatchAssignmentStatus.DELIVERED.equals(assignment.getStatus()))
                .map(assignment -> money(assignment.getAgentPayoutAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal urbanBitesGross = platformFeeTotal.add(deliveryFeeTotal);

        return new AdminFinanceOverviewResponse(
                scale(capturedPayments),
                scale(refundedAmount),
                scale(capturedPayments.subtract(refundedAmount)),
                scale(subtotalTotal),
                scale(packingTotal),
                scale(taxTotal),
                scale(platformFeeTotal),
                scale(deliveryFeeTotal),
                scale(discountTotal),
                scale(restaurantEarnings),
                scale(agentPayoutTotal),
                scale(urbanBitesGross),
                scale(urbanBitesGross.subtract(agentPayoutTotal))
        );
    }

    @Transactional(readOnly = true)
    public List<AdminPricingRuleResponse> listPricingRules() {
        return pricingRuleRepository.findAll().stream()
                .sorted(Comparator.comparing(PricingRule::getId).reversed())
                .map(this::toPricingRuleResponse)
                .toList();
    }

    @Transactional
    public AdminPricingRuleResponse createPricingRule(String actorEmail, AdminUpsertPricingRuleRequest request) {
        User actor = getUserByEmail(actorEmail);
        String version = normalizeVersion(request.version());
        if (pricingRuleRepository.existsByVersionIgnoreCase(version)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Pricing rule version already exists");
        }

        validatePricingRequest(request);

        PricingRule rule = new PricingRule();
        applyPricingRule(rule, request, version);
        persistActiveState(rule, request.active());

        PricingRule saved = pricingRuleRepository.save(rule);
        audit(
                "PRICING_RULE_CREATED",
                "PRICING_RULE",
                saved.getId(),
                null,
                "{\"version\":\"" + saved.getVersion() + "\",\"active\":" + saved.isActive() + "}",
                null,
                actor
        );

        return toPricingRuleResponse(saved);
    }

    @Transactional
    public AdminPricingRuleResponse updatePricingRule(
            String actorEmail,
            Long pricingRuleId,
            AdminUpsertPricingRuleRequest request
    ) {
        User actor = getUserByEmail(actorEmail);
        PricingRule rule = pricingRuleRepository.findById(pricingRuleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Pricing rule not found"));

        String version = normalizeVersion(request.version());
        boolean versionChanged = !rule.getVersion().equalsIgnoreCase(version);
        if (versionChanged && pricingRuleRepository.existsByVersionIgnoreCase(version)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Pricing rule version already exists");
        }

        validatePricingRequest(request);
        String beforeJson = "{\"version\":\"" + rule.getVersion() + "\",\"active\":" + rule.isActive() + "}";

        applyPricingRule(rule, request, version);
        persistActiveState(rule, request.active());

        PricingRule saved = pricingRuleRepository.save(rule);
        audit(
                "PRICING_RULE_UPDATED",
                "PRICING_RULE",
                saved.getId(),
                beforeJson,
                "{\"version\":\"" + saved.getVersion() + "\",\"active\":" + saved.isActive() + "}",
                null,
                actor
        );

        return toPricingRuleResponse(saved);
    }

    @Transactional
    public void activatePricingRule(String actorEmail, Long pricingRuleId) {
        PricingRule target = pricingRuleRepository.findById(pricingRuleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Pricing rule not found"));
        boolean targetWasActive = target.isActive();

        User actor = getUserByEmail(actorEmail);

        List<PricingRule> allRules = pricingRuleRepository.findAll();
        for (PricingRule rule : allRules) {
            rule.setActive(rule.getId().equals(target.getId()));
        }
        pricingRuleRepository.saveAll(allRules);

        PricingRuleAudit audit = new PricingRuleAudit();
        audit.setPricingRule(target);
        audit.setAction("ACTIVATE");
        audit.setActorUser(actor);
        audit.setBeforeJson("{\"active\":" + targetWasActive + "}");
        audit.setAfterJson("{\"active\":true}");
        pricingRuleAuditRepository.save(audit);

        this.audit(
                "PRICING_RULE_ACTIVATED",
                "PRICING_RULE",
                target.getId(),
                "{\"active\":" + targetWasActive + "}",
                "{\"active\":true}",
                null,
                actor
        );
    }

    @Transactional(readOnly = true)
    public List<AdminDisputeCaseResponse> listDisputes(AdminDisputeStatus status) {
        List<AdminDisputeCase> disputes = status == null
                ? adminDisputeCaseRepository.findAll()
                : adminDisputeCaseRepository.findByStatusOrderByCreatedAtDesc(status);
        return disputes.stream()
                .sorted(Comparator.comparing(AdminDisputeCase::getId).reversed())
                .map(this::toDisputeResponse)
                .toList();
    }

    @Transactional
    public AdminDisputeCaseResponse createDispute(String actorEmail, AdminCreateDisputeRequest request) {
        User actor = getUserByEmail(actorEmail);
        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        AdminDisputeCase dispute = new AdminDisputeCase();
        dispute.setOrder(order);
        dispute.setCreatedByUser(actor);
        dispute.setType(request.type());
        dispute.setStatus(AdminDisputeStatus.OPEN);
        dispute.setTitle(request.title().trim());
        dispute.setDescription(request.description().trim());
        AdminDisputeCase saved = adminDisputeCaseRepository.save(dispute);

        audit("DISPUTE_CREATED", "DISPUTE", saved.getId(), null,
                "{\"status\":\"OPEN\"}", request.title().trim(), actor);
        return toDisputeResponse(saved);
    }

    @Transactional
    public AdminDisputeCaseResponse updateDisputeStatus(
            String actorEmail,
            Long disputeId,
            AdminUpdateDisputeStatusRequest request
    ) {
        User actor = getUserByEmail(actorEmail);
        AdminDisputeCase dispute = adminDisputeCaseRepository.findById(disputeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispute not found"));

        AdminDisputeStatus before = dispute.getStatus();
        dispute.setStatus(request.status());
        String note = request.resolutionNote() == null ? null : request.resolutionNote().trim();
        dispute.setResolutionNote(note);
        if (AdminDisputeStatus.RESOLVED.equals(request.status()) || AdminDisputeStatus.REJECTED.equals(request.status())) {
            dispute.setResolvedAt(java.time.OffsetDateTime.now());
        } else {
            dispute.setResolvedAt(null);
        }
        AdminDisputeCase saved = adminDisputeCaseRepository.save(dispute);

        audit(
                "DISPUTE_STATUS_UPDATED",
                "DISPUTE",
                saved.getId(),
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + request.status() + "\"}",
                note,
                actor
        );

        return toDisputeResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AdminCouponCampaignResponse> listCouponCampaigns() {
        return adminCouponCampaignRepository.findAll().stream()
                .sorted(Comparator.comparing(AdminCouponCampaign::getId).reversed())
                .map(this::toCouponResponse)
                .toList();
    }

    @Transactional
    public AdminCouponCampaignResponse createCouponCampaign(String actorEmail, AdminCreateCouponCampaignRequest request) {
        User actor = getUserByEmail(actorEmail);

        if (request.maxUses() != null && request.maxUses() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "maxUses must be positive when provided");
        }
        if (request.endsAt().isBefore(request.startsAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "endsAt must be after startsAt");
        }

        String normalizedCode = request.code().trim().toUpperCase(Locale.ROOT);
        adminCouponCampaignRepository.findByCodeIgnoreCase(normalizedCode)
                .ifPresent(existing -> {
                    throw new ApiException(HttpStatus.CONFLICT, "Coupon code already exists");
                });

        AdminCouponCampaign campaign = new AdminCouponCampaign();
        campaign.setCode(normalizedCode);
        campaign.setDescription(request.description().trim());
        campaign.setDiscountPercent(request.discountPercent());
        campaign.setMaxUses(request.maxUses());
        campaign.setStartsAt(request.startsAt());
        campaign.setEndsAt(request.endsAt());
        campaign.setActive(request.active());
        campaign.setCreatedByUser(actor);

        AdminCouponCampaign saved = adminCouponCampaignRepository.save(campaign);
        audit("COUPON_CAMPAIGN_CREATED", "COUPON_CAMPAIGN", saved.getId(), null,
                "{\"active\":" + saved.isActive() + "}", saved.getDescription(), actor);
        return toCouponResponse(saved);
    }

    @Transactional
    public void setCouponCampaignActive(String actorEmail, Long campaignId, boolean active) {
        User actor = getUserByEmail(actorEmail);
        AdminCouponCampaign campaign = adminCouponCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon campaign not found"));

        boolean before = campaign.isActive();
        campaign.setActive(active);
        adminCouponCampaignRepository.save(campaign);

        audit(
                "COUPON_CAMPAIGN_ACTIVE_UPDATED",
                "COUPON_CAMPAIGN",
                campaign.getId(),
                "{\"active\":" + before + "}",
                "{\"active\":" + active + "}",
                null,
                actor
        );
    }

    @Transactional(readOnly = true)
    public List<AdminReviewModerationResponse> listReviewModerations(String reviewType, Long reviewId) {
        List<AdminReviewModeration> list = reviewType == null || reviewId == null
                ? adminReviewModerationRepository.findAll()
                : adminReviewModerationRepository.findByTargetReviewTypeIgnoreCaseAndTargetReviewIdOrderByCreatedAtDesc(reviewType, reviewId);

        return list.stream()
                .sorted(Comparator.comparing(AdminReviewModeration::getId).reversed())
                .map(this::toModerationResponse)
                .toList();
    }

    @Transactional
    public AdminReviewModerationResponse moderateReview(String actorEmail, AdminModerateReviewRequest request) {
        User actor = getUserByEmail(actorEmail);

        AdminReviewModeration moderation = new AdminReviewModeration();
        moderation.setTargetReviewType(request.reviewType().trim().toUpperCase(Locale.ROOT));
        moderation.setTargetReviewId(request.reviewId());
        moderation.setStatus(request.status());
        moderation.setReason(request.reason().trim());
        moderation.setModeratedByUser(actor);

        AdminReviewModeration saved = adminReviewModerationRepository.save(moderation);
        audit(
                "REVIEW_MODERATED",
                "REVIEW",
                saved.getTargetReviewId(),
                null,
                "{\"status\":\"" + saved.getStatus() + "\"}",
                saved.getReason(),
                actor
        );
        return toModerationResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AdminPayoutControlResponse> listPayoutControls() {
        return adminPayoutControlRepository.findAll().stream()
                .sorted(Comparator.comparing(AdminPayoutControl::getId).reversed())
                .map(this::toPayoutResponse)
                .toList();
    }

    @Transactional
    public AdminPayoutControlResponse setPayoutBlocked(String actorEmail, Long restaurantId, AdminSetPayoutBlockRequest request) {
        User actor = getUserByEmail(actorEmail);
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));

        String reason = request.reason() == null ? null : request.reason().trim();
        if (request.blocked() && (reason == null || reason.isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reason is required when blocking payouts");
        }

        AdminPayoutControl control = adminPayoutControlRepository.findByRestaurantId(restaurantId)
                .orElseGet(() -> {
                    AdminPayoutControl fresh = new AdminPayoutControl();
                    fresh.setRestaurant(restaurant);
                    return fresh;
                });

        boolean before = control.isPayoutsBlocked();
        control.setPayoutsBlocked(request.blocked());
        control.setReason(reason);
        control.setUpdatedByUser(actor);
        AdminPayoutControl saved = adminPayoutControlRepository.save(control);

        audit(
                "PAYOUT_BLOCK_UPDATED",
                "RESTAURANT",
                restaurantId,
                "{\"blocked\":" + before + "}",
                "{\"blocked\":" + request.blocked() + "}",
                reason,
                actor
        );

        return toPayoutResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DispatchAssignment> listNoAgentAssignments() {
        return dispatchAssignmentRepository.findByStatusAndAdminVisibilityTrueOrderByCreatedAtDesc(
                DispatchAssignmentStatus.NO_AGENT_AVAILABLE
        );
    }

    private AdminPricingRuleResponse toPricingRuleResponse(PricingRule rule) {
        return new AdminPricingRuleResponse(
                rule.getId(),
                rule.getVersion(),
                rule.isActive(),
                rule.getBaseFee(),
                rule.getSlabKmCutoff(),
                rule.getSlabFee(),
                rule.getPerKmRate(),
                rule.getSurgePeakMultiplier(),
                rule.getSurgeRainMultiplier(),
                rule.getMinDeliveryFee(),
                rule.getMaxDeliveryFee(),
                rule.getFreeDeliveryThreshold(),
                rule.getPlatformFeeType(),
                rule.getPlatformFeeValue(),
                rule.getTaxPercent(),
                rule.getPackingPolicy(),
                rule.getPackingValue()
        );
    }

    private void applyPricingRule(PricingRule rule, AdminUpsertPricingRuleRequest request, String version) {
        rule.setVersion(version);
        rule.setBaseFee(scale(request.baseFee()));
        rule.setSlabKmCutoff(scale(request.slabKmCutoff()));
        rule.setSlabFee(scale(request.slabFee()));
        rule.setPerKmRate(scale(request.perKmRate()));
        rule.setSurgePeakMultiplier(scale(request.surgePeakMultiplier(), 3));
        rule.setSurgeRainMultiplier(scale(request.surgeRainMultiplier(), 3));
        rule.setMinDeliveryFee(scale(request.minDeliveryFee()));
        rule.setMaxDeliveryFee(scale(request.maxDeliveryFee()));
        rule.setFreeDeliveryThreshold(request.freeDeliveryThreshold() == null ? null : scale(request.freeDeliveryThreshold()));
        rule.setPlatformFeeType(request.platformFeeType());
        rule.setPlatformFeeValue(scale(request.platformFeeValue()));
        rule.setTaxPercent(scale(request.taxPercent(), 3));
        rule.setPackingPolicy(request.packingPolicy());
        rule.setPackingValue(scale(request.packingValue()));
    }

    private void persistActiveState(PricingRule targetRule, boolean shouldBeActive) {
        if (shouldBeActive) {
            List<PricingRule> allRules = pricingRuleRepository.findAll();
            for (PricingRule candidate : allRules) {
                candidate.setActive(candidate.getId() != null && candidate.getId().equals(targetRule.getId()));
            }
            targetRule.setActive(true);
            pricingRuleRepository.saveAll(allRules);
            return;
        }
        targetRule.setActive(false);
    }

    private void validatePricingRequest(AdminUpsertPricingRuleRequest request) {
        if (request.maxDeliveryFee().compareTo(request.minDeliveryFee()) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "maxDeliveryFee must be greater than or equal to minDeliveryFee");
        }
        if (request.freeDeliveryThreshold() != null && request.freeDeliveryThreshold().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "freeDeliveryThreshold cannot be negative");
        }
        if (PlatformFeeType.PERCENT.equals(request.platformFeeType())
                && request.platformFeeValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "platformFeeValue percent cannot exceed 100");
        }
        if (PackingPolicyType.PERCENT.equals(request.packingPolicy())
                && request.packingValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "packingValue percent cannot exceed 100");
        }
    }

    private String normalizeVersion(String version) {
        String normalized = normalizeText(version, null);
        if (normalized == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "version is required");
        }
        return normalized;
    }

    private BigDecimal money(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : amount.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal scale(BigDecimal value) {
        return scale(value, 2);
    }

    private BigDecimal scale(BigDecimal value, int digits) {
        return (value == null ? BigDecimal.ZERO : value).setScale(digits, RoundingMode.HALF_UP);
    }

    private AdminDisputeCaseResponse toDisputeResponse(AdminDisputeCase dispute) {
        return new AdminDisputeCaseResponse(
                dispute.getId(),
                dispute.getOrder().getId(),
                dispute.getType(),
                dispute.getStatus(),
                dispute.getTitle(),
                dispute.getDescription(),
                dispute.getResolutionNote(),
                dispute.getCreatedByUser().getEmail(),
                dispute.getCreatedAt(),
                dispute.getResolvedAt()
        );
    }

    private AdminCouponCampaignResponse toCouponResponse(AdminCouponCampaign campaign) {
        return new AdminCouponCampaignResponse(
                campaign.getId(),
                campaign.getCode(),
                campaign.getDescription(),
                campaign.getDiscountPercent(),
                campaign.getMaxUses(),
                campaign.isActive(),
                campaign.getStartsAt(),
                campaign.getEndsAt()
        );
    }

    private AdminReviewModerationResponse toModerationResponse(AdminReviewModeration moderation) {
        return new AdminReviewModerationResponse(
                moderation.getId(),
                moderation.getTargetReviewType(),
                moderation.getTargetReviewId(),
                moderation.getStatus(),
                moderation.getReason(),
                moderation.getModeratedByUser().getEmail(),
                moderation.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<com.prajjwal.UrbanBites.dto.response.AdminPartnerApprovalResponse> listPendingPartnerApprovals() {
        // Find pending restaurant owners and delivery agents
        return userRepository.findByRoleAndApprovalStatusOrderByCreatedAtDesc(
                com.prajjwal.UrbanBites.enums.Role.RESTAURANT_OWNER,
                com.prajjwal.UrbanBites.enums.ApprovalStatus.PENDING
        ).stream().map(this::toPartnerApprovalResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<com.prajjwal.UrbanBites.dto.response.AdminRestaurantApprovalResponse> listPendingRestaurantApprovals() {
        return restaurantRepository.findByApprovalStatusOrderByCreatedAtDesc("PENDING")
                .stream().map(this::toRestaurantApprovalResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<com.prajjwal.UrbanBites.dto.response.AdminPartnerApprovalResponse> listPendingDeliveryAgentApprovals() {
        return userRepository.findByRoleAndApprovalStatusOrderByCreatedAtDesc(
                com.prajjwal.UrbanBites.enums.Role.DELIVERY_AGENT,
                com.prajjwal.UrbanBites.enums.ApprovalStatus.PENDING
        ).stream().map(this::toPartnerApprovalResponse).toList();
    }

    @Transactional
    public com.prajjwal.UrbanBites.dto.response.AdminPartnerApprovalResponse approvePartner(
            String actorEmail,
            com.prajjwal.UrbanBites.dto.request.AdminApprovePartnerRequest request
    ) {
        User actor = getUserByEmail(actorEmail);
        User partner = userRepository.findById(request.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (!com.prajjwal.UrbanBites.enums.Role.RESTAURANT_OWNER.equals(partner.getRole())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only restaurant owners can be approved from this endpoint");
        }

        boolean approved = Boolean.TRUE.equals(request.approved());

        com.prajjwal.UrbanBites.enums.ApprovalStatus newStatus = approved
            ? com.prajjwal.UrbanBites.enums.ApprovalStatus.APPROVED 
            : com.prajjwal.UrbanBites.enums.ApprovalStatus.REJECTED;

        String normalizedReason = normalizeText(request.rejectionReason(), null);
        if (!approved && normalizedReason == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "rejectionReason is required when rejected");
        }

        partner.setApprovalStatus(newStatus);
        partner.setApprovalRejectionReason(approved ? null : normalizedReason);
        User updated = userRepository.save(partner);

        audit(
                "PARTNER_APPROVAL_" + (approved ? "APPROVED" : "REJECTED"),
                "USER",
                partner.getId(),
                "{\"approvalStatus\":\"PENDING\"}",
                "{\"approvalStatus\":\"" + newStatus + "\"}",
                normalizedReason,
                actor
        );

        publishPartnerApprovalRealtime(updated, approved, normalizedReason);

        return toPartnerApprovalResponse(updated);
    }

    @Transactional
    public com.prajjwal.UrbanBites.dto.response.AdminRestaurantApprovalResponse approveRestaurant(
            String actorEmail,
            com.prajjwal.UrbanBites.dto.request.AdminApproveRestaurantRequest request
    ) {
        User actor = getUserByEmail(actorEmail);
        Restaurant restaurant = restaurantRepository.findById(request.restaurantId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));

        boolean approved = Boolean.TRUE.equals(request.approved());
        String newStatus = approved ? "APPROVED" : "REJECTED";
        String normalizedReason = normalizeText(request.rejectionReason(), null);
        if (!approved && normalizedReason == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "rejectionReason is required when rejected");
        }

        restaurant.setApprovalStatus(newStatus);
        if (!approved) {
            restaurant.setApprovalRejectionReason(normalizedReason);
            restaurant.setActive(false);
        } else {
            restaurant.setActive(true);
            restaurant.setApprovalRejectionReason(null);
        }
        Restaurant updated = restaurantRepository.save(restaurant);

        audit(
                "RESTAURANT_APPROVAL_" + (approved ? "APPROVED" : "REJECTED"),
                "RESTAURANT",
                restaurant.getId(),
                "{\"approvalStatus\":\"PENDING\"}",
                "{\"approvalStatus\":\"" + newStatus + "\"}",
                normalizedReason,
                actor
        );

        publishRestaurantApprovalRealtime(updated, approved, normalizedReason);

        return toRestaurantApprovalResponse(updated);
    }

    @Transactional
    public com.prajjwal.UrbanBites.dto.response.AdminPartnerApprovalResponse approveDeliveryAgent(
            String actorEmail,
            com.prajjwal.UrbanBites.dto.request.AdminApproveDeliveryAgentRequest request
    ) {
        User actor = getUserByEmail(actorEmail);
        User agent = userRepository.findById(request.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (!com.prajjwal.UrbanBites.enums.Role.DELIVERY_AGENT.equals(agent.getRole())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only delivery agents can be approved");
        }

        boolean approved = Boolean.TRUE.equals(request.approved());

        com.prajjwal.UrbanBites.enums.ApprovalStatus newStatus = approved
            ? com.prajjwal.UrbanBites.enums.ApprovalStatus.APPROVED 
            : com.prajjwal.UrbanBites.enums.ApprovalStatus.REJECTED;

        String normalizedReason = normalizeText(request.rejectionReason(), null);
        if (!approved && normalizedReason == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "rejectionReason is required when rejected");
        }

        agent.setApprovalStatus(newStatus);
        agent.setApprovalRejectionReason(approved ? null : normalizedReason);
        User updated = userRepository.save(agent);

        // Also update delivery agent profile verified flag
        deliveryAgentProfileRepository.findByUserId(agent.getId()).ifPresent(profile -> {
            profile.setVerified(approved);
            if (!approved) {
                profile.setApprovalRejectionReason(normalizedReason);
                profile.setOnline(false);
                profile.setAvailable(false);
                profile.setActiveShift(false);
            } else {
                profile.setApprovalRejectionReason(null);
            }
            deliveryAgentProfileRepository.save(profile);
        });

        audit(
                "DELIVERY_AGENT_APPROVAL_" + (approved ? "APPROVED" : "REJECTED"),
                "USER",
                agent.getId(),
                "{\"approvalStatus\":\"PENDING\"}",
                "{\"approvalStatus\":\"" + newStatus + "\"}",
                normalizedReason,
                actor
        );

        publishDeliveryAgentApprovalRealtime(updated, approved, normalizedReason);

        return toPartnerApprovalResponse(updated);
    }

    private AdminPayoutControlResponse toPayoutResponse(AdminPayoutControl control) {
        return new AdminPayoutControlResponse(
                control.getRestaurant().getId(),
                control.getRestaurant().getName(),
                control.isPayoutsBlocked(),
                control.getReason(),
                control.getUpdatedByUser() == null ? null : control.getUpdatedByUser().getEmail(),
                control.getUpdatedAt()
        );
    }

    private com.prajjwal.UrbanBites.dto.response.AdminPartnerApprovalResponse toPartnerApprovalResponse(User user) {
        return new com.prajjwal.UrbanBites.dto.response.AdminPartnerApprovalResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getApprovalStatus(),
                user.getApprovalRejectionReason(),
                user.getCreatedAt()
        );
    }

    private com.prajjwal.UrbanBites.dto.response.AdminRestaurantApprovalResponse toRestaurantApprovalResponse(Restaurant restaurant) {
        return new com.prajjwal.UrbanBites.dto.response.AdminRestaurantApprovalResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getCity(),
                restaurant.getOwner() == null ? null : restaurant.getOwner().getId(),
                restaurant.getOwner() == null ? null : restaurant.getOwner().getEmail(),
                restaurant.getApprovalStatus(),
                restaurant.getApprovalRejectionReason(),
                restaurant.getCreatedAt()
        );
    }

    private void publishPartnerApprovalRealtime(User partner, boolean approved, String rejectionReason) {
        NotificationType notificationType = approved
                ? NotificationType.PARTNER_APPROVAL_APPROVED
                : NotificationType.PARTNER_APPROVAL_REJECTED;
        String title = approved ? "Partner account approved" : "Partner account review update";
        String message = approved
                ? "Your UrbanBites partner account has been approved. You can now continue onboarding."
                : "Your UrbanBites partner account was rejected. Please review the reason and resubmit.";
        String reference = approved ? "Approved by admin" : normalizeText(rejectionReason, "No reason provided");
        notificationService.publish(
                partner,
                notificationType,
                "approval:partner:" + partner.getId() + ":" + approved,
                title,
                message,
                reference,
                true
        );
        realtimePublisher.publishApprovalUpdate(
                "partner",
                partner.getId(),
                notificationType.name(),
                new ApprovalRealtimePayload("PARTNER", partner.getId(), partner.getRole().name(), approved ? "APPROVED" : "REJECTED", normalizeText(rejectionReason, null), OffsetDateTime.now())
        );
    }

    private void publishRestaurantApprovalRealtime(Restaurant restaurant, boolean approved, String rejectionReason) {
        User owner = restaurant.getOwner();
        if (owner == null) {
            return;
        }
        NotificationType notificationType = approved
                ? NotificationType.RESTAURANT_APPROVAL_APPROVED
                : NotificationType.RESTAURANT_APPROVAL_REJECTED;
        String title = approved ? "Restaurant approved" : "Restaurant review update";
        String message = approved
                ? "Your restaurant has been approved and is now visible to customers."
                : "Your restaurant was rejected. Please review the reason and resubmit.";
        String reference = approved ? restaurant.getName() : normalizeText(rejectionReason, "No reason provided");
        notificationService.publish(
                owner,
                notificationType,
                "approval:restaurant:" + restaurant.getId() + ":" + approved,
                title,
                message,
                reference,
                true
        );
        realtimePublisher.publishApprovalUpdate(
                "restaurant",
                restaurant.getId(),
                notificationType.name(),
                new ApprovalRealtimePayload("RESTAURANT", restaurant.getId(), String.valueOf(owner.getId()), approved ? "APPROVED" : "REJECTED", normalizeText(rejectionReason, null), OffsetDateTime.now())
        );
    }

    private void publishDeliveryAgentApprovalRealtime(User agent, boolean approved, String rejectionReason) {
        NotificationType notificationType = approved
                ? NotificationType.DELIVERY_AGENT_APPROVAL_APPROVED
                : NotificationType.DELIVERY_AGENT_APPROVAL_REJECTED;
        String title = approved ? "Delivery agent profile approved" : "Delivery agent review update";
        String message = approved
                ? "Your delivery agent account has been approved. You can now go online."
                : "Your delivery agent account was rejected. Please review the reason and resubmit.";
        String reference = approved ? "Approved by admin" : normalizeText(rejectionReason, "No reason provided");
        notificationService.publish(
                agent,
                notificationType,
                "approval:delivery-agent:" + agent.getId() + ":" + approved,
                title,
                message,
                reference,
                true
        );
        realtimePublisher.publishApprovalUpdate(
                "delivery-agent",
                agent.getId(),
                notificationType.name(),
                new ApprovalRealtimePayload("DELIVERY_AGENT", agent.getId(), agent.getRole().name(), approved ? "APPROVED" : "REJECTED", normalizeText(rejectionReason, null), OffsetDateTime.now())
        );
    }

    private String normalizeText(String value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? fallback : normalized;
    }

    private record ApprovalRealtimePayload(
            String scope,
            Long subjectId,
            String subjectLabel,
            String status,
            String rejectionReason,
            OffsetDateTime updatedAt
    ) {
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void audit(
            String action,
            String entityType,
            Long entityId,
            String beforeJson,
            String afterJson,
            String reason,
            User actor
    ) {
        AdminActionAudit audit = new AdminActionAudit();
        audit.setActorUser(actor);
        audit.setAction(action);
        audit.setEntityType(entityType);
        audit.setEntityId(entityId);
        audit.setBeforeJson(beforeJson);
        audit.setAfterJson(afterJson);
        audit.setReason(reason);
        adminActionAuditRepository.save(audit);
    }

    private void publishToggleEvent(
            String entityType,
            Long entityId,
            String field,
            boolean previousValue,
            boolean newValue,
            String actorEmail
    ) {
        AdminToggleEventResponse event = new AdminToggleEventResponse(
                entityType,
                entityId,
                field,
                previousValue,
                newValue,
                actorEmail,
                OffsetDateTime.now()
        );

        messagingTemplate.convertAndSend("/topic/admin/console/toggles", event);
        messagingTemplate.convertAndSend("/topic/admin/" + entityType.toLowerCase(Locale.ROOT) + "/" + entityId + "/" + field, event);
    }
}
