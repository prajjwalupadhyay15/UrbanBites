package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.AdminApprovePartnerRequest;
import com.prajjwal.UrbanBites.dto.request.AdminApproveRestaurantRequest;
import com.prajjwal.UrbanBites.dto.request.AdminApproveDeliveryAgentRequest;
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
import com.prajjwal.UrbanBites.dto.response.AdminOrderOpsResponse;
import com.prajjwal.UrbanBites.dto.response.AdminPayoutControlResponse;
import com.prajjwal.UrbanBites.dto.response.AdminPricingRuleResponse;
import com.prajjwal.UrbanBites.dto.response.AdminRefundOpsResponse;
import com.prajjwal.UrbanBites.dto.response.AdminRestaurantResponse;
import com.prajjwal.UrbanBites.dto.response.AdminReviewModerationResponse;
import com.prajjwal.UrbanBites.dto.response.AdminUserResponse;
import com.prajjwal.UrbanBites.dto.response.AdminPartnerApprovalResponse;
import com.prajjwal.UrbanBites.dto.response.AdminRestaurantApprovalResponse;
import com.prajjwal.UrbanBites.dto.response.WithdrawalResponseDto;
import com.prajjwal.UrbanBites.dto.request.AdminProcessWithdrawalRequestDto;
import com.prajjwal.UrbanBites.entity.WithdrawalRequest;
import com.prajjwal.UrbanBites.enums.WithdrawalStatus;
import com.prajjwal.UrbanBites.repository.WithdrawalRequestRepository;
import com.prajjwal.UrbanBites.service.WalletService;
import com.prajjwal.UrbanBites.dto.response.DispatchAssignmentResponse;
import com.prajjwal.UrbanBites.dto.response.WebhookAckResponse;
import com.prajjwal.UrbanBites.entity.DispatchAssignment;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.enums.AdminDisputeStatus;
import com.prajjwal.UrbanBites.service.AdminService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final WalletService walletService;

    public AdminController(AdminService adminService,
                           WithdrawalRequestRepository withdrawalRequestRepository,
                           WalletService walletService) {
        this.adminService = adminService;
        this.withdrawalRequestRepository = withdrawalRequestRepository;
        this.walletService = walletService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> dashboard() {
        return ResponseEntity.ok(adminService.dashboard());
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> users() {
        return ResponseEntity.ok(adminService.listUsers());
    }

    @PatchMapping("/users/{userId}/enabled")
    public ResponseEntity<WebhookAckResponse> setUserEnabled(
            Principal principal,
            @PathVariable Long userId,
            @RequestParam boolean enabled
    ) {
        adminService.setUserEnabled(principal.getName(), userId, enabled);
        return ResponseEntity.ok(new WebhookAckResponse("ok"));
    }

    @GetMapping("/restaurants")
    public ResponseEntity<List<AdminRestaurantResponse>> restaurants() {
        return ResponseEntity.ok(adminService.listRestaurants());
    }

    @PatchMapping("/restaurants/{restaurantId}/active")
    public ResponseEntity<WebhookAckResponse> setRestaurantActive(
            Principal principal,
            @PathVariable Long restaurantId,
            @RequestParam boolean active
    ) {
        adminService.setRestaurantActive(principal.getName(), restaurantId, active);
        return ResponseEntity.ok(new WebhookAckResponse("ok"));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<AdminOrderOpsResponse>> orders() {
        return ResponseEntity.ok(adminService.listOrders());
    }

    @GetMapping("/refunds")
    public ResponseEntity<List<AdminRefundOpsResponse>> refunds() {
        return ResponseEntity.ok(adminService.listRefunds());
    }

    @GetMapping("/pricing-rules")
    public ResponseEntity<List<AdminPricingRuleResponse>> pricingRules() {
        return ResponseEntity.ok(adminService.listPricingRules());
    }

    @GetMapping("/finance/overview")
    public ResponseEntity<AdminFinanceOverviewResponse> financeOverview() {
        return ResponseEntity.ok(adminService.financeOverview());
    }

    @PostMapping("/pricing-rules")
    public ResponseEntity<AdminPricingRuleResponse> createPricingRule(
            Principal principal,
            @Valid @RequestBody AdminUpsertPricingRuleRequest request
    ) {
        return ResponseEntity.ok(adminService.createPricingRule(principal.getName(), request));
    }

    @PatchMapping("/pricing-rules/{pricingRuleId}")
    public ResponseEntity<AdminPricingRuleResponse> updatePricingRule(
            Principal principal,
            @PathVariable Long pricingRuleId,
            @Valid @RequestBody AdminUpsertPricingRuleRequest request
    ) {
        return ResponseEntity.ok(adminService.updatePricingRule(principal.getName(), pricingRuleId, request));
    }

    @PatchMapping("/pricing-rules/{pricingRuleId}/activate")
    public ResponseEntity<WebhookAckResponse> activatePricingRule(
            Principal principal,
            @PathVariable Long pricingRuleId
    ) {
        adminService.activatePricingRule(principal.getName(), pricingRuleId);
        return ResponseEntity.ok(new WebhookAckResponse("ok"));
    }

    @GetMapping("/dispatch/no-agent")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<DispatchAssignmentResponse>> noAgentAssignments() {
        return ResponseEntity.ok(adminService.listNoAgentAssignments().stream().map(this::toDispatchResponse).toList());
    }

    @GetMapping("/disputes")
    public ResponseEntity<List<AdminDisputeCaseResponse>> disputes(
            @RequestParam(required = false) AdminDisputeStatus status
    ) {
        return ResponseEntity.ok(adminService.listDisputes(status));
    }

    @PostMapping("/disputes")
    public ResponseEntity<AdminDisputeCaseResponse> createDispute(
            Principal principal,
            @Valid @RequestBody AdminCreateDisputeRequest request
    ) {
        return ResponseEntity.ok(adminService.createDispute(principal.getName(), request));
    }

    @PatchMapping("/disputes/{disputeId}/status")
    public ResponseEntity<AdminDisputeCaseResponse> updateDisputeStatus(
            Principal principal,
            @PathVariable Long disputeId,
            @Valid @RequestBody AdminUpdateDisputeStatusRequest request
    ) {
        return ResponseEntity.ok(adminService.updateDisputeStatus(principal.getName(), disputeId, request));
    }

    @GetMapping("/coupon-campaigns")
    public ResponseEntity<List<AdminCouponCampaignResponse>> couponCampaigns() {
        return ResponseEntity.ok(adminService.listCouponCampaigns());
    }

    @PostMapping("/coupon-campaigns")
    public ResponseEntity<AdminCouponCampaignResponse> createCouponCampaign(
            Principal principal,
            @Valid @RequestBody AdminCreateCouponCampaignRequest request
    ) {
        return ResponseEntity.ok(adminService.createCouponCampaign(principal.getName(), request));
    }

    @PatchMapping("/coupon-campaigns/{campaignId}/active")
    public ResponseEntity<WebhookAckResponse> setCouponCampaignActive(
            Principal principal,
            @PathVariable Long campaignId,
            @RequestParam boolean active
    ) {
        adminService.setCouponCampaignActive(principal.getName(), campaignId, active);
        return ResponseEntity.ok(new WebhookAckResponse("ok"));
    }

    @GetMapping("/review-moderations")
    public ResponseEntity<List<AdminReviewModerationResponse>> reviewModerations(
            @RequestParam(required = false) String reviewType,
            @RequestParam(required = false) Long reviewId
    ) {
        return ResponseEntity.ok(adminService.listReviewModerations(reviewType, reviewId));
    }

    @PostMapping("/review-moderations")
    public ResponseEntity<AdminReviewModerationResponse> moderateReview(
            Principal principal,
            @Valid @RequestBody AdminModerateReviewRequest request
    ) {
        return ResponseEntity.ok(adminService.moderateReview(principal.getName(), request));
    }

    @GetMapping("/payout-controls")
    public ResponseEntity<List<AdminPayoutControlResponse>> payoutControls() {
        return ResponseEntity.ok(adminService.listPayoutControls());
    }

    @PatchMapping("/restaurants/{restaurantId}/payout-block")
    public ResponseEntity<AdminPayoutControlResponse> setPayoutBlock(
            Principal principal,
            @PathVariable Long restaurantId,
            @Valid @RequestBody AdminSetPayoutBlockRequest request
    ) {
        return ResponseEntity.ok(adminService.setPayoutBlocked(principal.getName(), restaurantId, request));
    }

    @GetMapping("/approvals/pending/partners")
    public ResponseEntity<List<AdminPartnerApprovalResponse>> listPendingPartnerApprovals() {
        return ResponseEntity.ok(adminService.listPendingPartnerApprovals());
    }

    @GetMapping("/approvals/pending/restaurants")
    public ResponseEntity<List<AdminRestaurantApprovalResponse>> listPendingRestaurantApprovals() {
        return ResponseEntity.ok(adminService.listPendingRestaurantApprovals());
    }

    @GetMapping("/approvals/pending/delivery-agents")
    public ResponseEntity<List<AdminPartnerApprovalResponse>> listPendingDeliveryAgentApprovals() {
        return ResponseEntity.ok(adminService.listPendingDeliveryAgentApprovals());
    }

    @PostMapping("/approvals/partners")
    public ResponseEntity<AdminPartnerApprovalResponse> approvePartner(
            Principal principal,
            @Valid @RequestBody AdminApprovePartnerRequest request
    ) {
        return ResponseEntity.ok(adminService.approvePartner(principal.getName(), request));
    }

    @PostMapping("/approvals/restaurants")
    public ResponseEntity<AdminRestaurantApprovalResponse> approveRestaurant(
            Principal principal,
            @Valid @RequestBody AdminApproveRestaurantRequest request
    ) {
        return ResponseEntity.ok(adminService.approveRestaurant(principal.getName(), request));
    }

    @PostMapping("/approvals/delivery-agents")
    public ResponseEntity<AdminPartnerApprovalResponse> approveDeliveryAgent(
            Principal principal,
            @Valid @RequestBody AdminApproveDeliveryAgentRequest request
    ) {
        return ResponseEntity.ok(adminService.approveDeliveryAgent(principal.getName(), request));
    }

    private DispatchAssignmentResponse toDispatchResponse(DispatchAssignment assignment) {
        Order order = assignment.getOrder();
        return new DispatchAssignmentResponse(
                assignment.getId(),
                order.getId(),
                assignment.getAgentUser() == null ? null : assignment.getAgentUser().getId(),
                assignment.getAgentUser() == null ? null : assignment.getAgentUser().getFullName(),
                assignment.getStatus(),
                assignment.getAttemptNumber(),
                assignment.getOfferExpiresAt(),
                order.getRestaurant() != null ? order.getRestaurant().getName() : "Unknown Restaurant",
                order.getRestaurant() != null ? order.getRestaurant().getAddressLine() : "Unknown Address",
                order.getDeliveryAddressLine1(),
                assignment.getAgentPayoutAmount()
        );
    }

    @GetMapping("/withdrawals/pending")
    public ResponseEntity<List<WithdrawalResponseDto>> listPendingWithdrawals() {
        List<WithdrawalResponseDto> pending = withdrawalRequestRepository.findByStatusOrderByCreatedAtDesc(WithdrawalStatus.PENDING)
                .stream()
                .map(this::toWithdrawalDto)
                .toList();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/withdrawals/{requestId}/process")
    public ResponseEntity<WithdrawalResponseDto> processWithdrawal(
            @PathVariable java.util.UUID requestId,
            @Valid @RequestBody AdminProcessWithdrawalRequestDto request
    ) {
        WithdrawalRequest req = walletService.processWithdrawal(requestId, request.getApprove(), request.getAdminRemarks());
        return ResponseEntity.ok(toWithdrawalDto(req));
    }

    private WithdrawalResponseDto toWithdrawalDto(WithdrawalRequest req) {
        return new WithdrawalResponseDto(
                req.getId(),
                req.getUser().getFullName(),
                req.getUser().getEmail(),
                req.getAmount(),
                req.getBankAccountNumber(),
                req.getBankIfsc(),
                req.getStatus(),
                req.getAdminRemarks(),
                req.getCreatedAt(),
                req.getProcessedAt()
        );
    }
}
