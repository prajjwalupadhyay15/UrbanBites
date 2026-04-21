package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.config.DispatchProperties;
import com.prajjwal.UrbanBites.dto.response.AgentAvailabilityResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchAssignmentResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchEventResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchMetricsResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryAssignmentItemResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryFinanceSummaryResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryFinanceTransactionResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryOrderDetailsResponse;
import com.prajjwal.UrbanBites.dto.response.DeliveryOrderHistoryResponse;
import com.prajjwal.UrbanBites.entity.DeliveryAgentProfile;
import com.prajjwal.UrbanBites.entity.DispatchAssignment;
import com.prajjwal.UrbanBites.entity.DispatchEvent;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.OrderItem;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import com.prajjwal.UrbanBites.enums.NotificationType;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.DeliveryAgentProfileRepository;
import com.prajjwal.UrbanBites.repository.DispatchAssignmentRepository;
import com.prajjwal.UrbanBites.repository.DispatchEventRepository;
import com.prajjwal.UrbanBites.repository.OrderItemRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DispatchService {

    private static final Logger log = LoggerFactory.getLogger(DispatchService.class);

    private static final Set<DispatchAssignmentStatus> ACTIVE_AGENT_STATUSES =
            EnumSet.of(DispatchAssignmentStatus.OFFERED, DispatchAssignmentStatus.ACCEPTED, DispatchAssignmentStatus.PICKED_UP);

    private static final Set<DispatchAssignmentStatus> TERMINAL_ASSIGNMENT_STATUSES =
            EnumSet.of(DispatchAssignmentStatus.DELIVERED, DispatchAssignmentStatus.CANCELLED);

    private static final Set<DispatchAssignmentStatus> DETAILS_VISIBLE_STATUSES =
            EnumSet.of(DispatchAssignmentStatus.OFFERED, DispatchAssignmentStatus.ACCEPTED, DispatchAssignmentStatus.PICKED_UP);

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final DeliveryAgentProfileRepository deliveryAgentProfileRepository;
    private final DispatchAssignmentRepository dispatchAssignmentRepository;
    private final DispatchEventRepository dispatchEventRepository;
    private final OrderItemRepository orderItemRepository;
    private final DispatchProperties dispatchProperties;
    private final NotificationService notificationService;
    private final RealtimePublisher realtimePublisher;

    public DispatchService(
            UserRepository userRepository,
            OrderRepository orderRepository,
            DeliveryAgentProfileRepository deliveryAgentProfileRepository,
            DispatchAssignmentRepository dispatchAssignmentRepository,
            DispatchEventRepository dispatchEventRepository,
            OrderItemRepository orderItemRepository,
            DispatchProperties dispatchProperties,
            NotificationService notificationService,
            RealtimePublisher realtimePublisher
    ) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.deliveryAgentProfileRepository = deliveryAgentProfileRepository;
        this.dispatchAssignmentRepository = dispatchAssignmentRepository;
        this.dispatchEventRepository = dispatchEventRepository;
        this.orderItemRepository = orderItemRepository;
        this.dispatchProperties = dispatchProperties;
        this.notificationService = notificationService;
        this.realtimePublisher = realtimePublisher;
    }

    @Transactional
    public void triggerDispatchForOrder(Long orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!isDispatchableOrder(order.getStatus())) {
            return;
        }

        DispatchAssignment latest = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDescIdDesc(orderId).orElse(null);
        if (latest != null) {
            if (ACTIVE_AGENT_STATUSES.contains(latest.getStatus()) || TERMINAL_ASSIGNMENT_STATUSES.contains(latest.getStatus())) {
                return;
            }
            if ((DispatchAssignmentStatus.REASSIGNED.equals(latest.getStatus()) || DispatchAssignmentStatus.NO_AGENT_AVAILABLE.equals(latest.getStatus()))
                    && latest.getRetryAfter() != null
                    && OffsetDateTime.now().isBefore(latest.getRetryAfter())) {
                return;
            }
            if (DispatchAssignmentStatus.NO_AGENT_AVAILABLE.equals(latest.getStatus())
                    && latest.getNoAgentRetryUntil() != null
                    && OffsetDateTime.now().isAfter(latest.getNoAgentRetryUntil())) {
                return;
            }
        }

        int nextAttempt = latest == null ? 1 : latest.getAttemptNumber() + 1;
        OffsetDateTime retryUntil = resolveRetryUntil(latest);
        if (nextAttempt > dispatchProperties.maxAttempts()) {
            createNoAgentFallback(order, nextAttempt, retryUntil, "Dispatch attempts exhausted");
            return;
        }

        Set<Long> triedAgentIds = dispatchAssignmentRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .map(DispatchAssignment::getAgentUser)
                .filter(agent -> agent != null)
                .map(User::getId)
                .collect(Collectors.toSet());

        DeliveryAgentProfile selected = selectBestCandidate(order, triedAgentIds);
        if (selected == null) {
            createNoAgentFallback(order, nextAttempt, retryUntil, "No eligible delivery agent available");
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();
        selected.setAvailable(false);
        selected.setLastAssignedAt(now);
        deliveryAgentProfileRepository.save(selected);

        DispatchAssignment assignment = new DispatchAssignment();
        assignment.setOrder(order);
        assignment.setAttemptNumber(nextAttempt);
        assignment.setAgentUser(selected.getUser());
        assignment.setStatus(DispatchAssignmentStatus.UNASSIGNED);
        assignment.setNoAgentRetryUntil(retryUntil);
        assignment.setAgentPayoutAmount(computeAgentPayout(order));
        DispatchAssignment saved = dispatchAssignmentRepository.save(assignment);
        createEvent(saved, DispatchAssignmentStatus.UNASSIGNED, "Dispatch initialized");

        saved.setStatus(DispatchAssignmentStatus.OFFERED);
        saved.setOfferExpiresAt(now.plusSeconds(dispatchProperties.offerTtlSeconds()));
        dispatchAssignmentRepository.save(saved);
        createEvent(saved, DispatchAssignmentStatus.OFFERED, "Offer sent to agent");
    }

    @Transactional
    @Scheduled(fixedDelayString = "${dispatch.timeout-sweep-ms:15000}")
    public void processDispatchScheduled() {
        processExpiredOffers();
        processReassignmentQueue();
        processNoAgentRetryQueue();
        processPickupSlaBreaches();
    }

    @Scheduled(fixedRate = 300000)
    @Transactional
    public void checkAgentHeartbeats() {
        OffsetDateTime timeoutThreshold = OffsetDateTime.now().minusMinutes(5);
        List<DeliveryAgentProfile> staleAgents = deliveryAgentProfileRepository
                .findByOnlineTrueAndLastLocationAtBefore(timeoutThreshold);
        staleAgents.addAll(deliveryAgentProfileRepository.findByOnlineTrueAndLastLocationAtIsNull());
        Set<Long> processedIds = new HashSet<>();

        for (DeliveryAgentProfile agent : staleAgents) {
            if (!processedIds.add(agent.getId())) {
                continue;
            }
            agent.setOnline(false);
            agent.setAvailable(false);
            agent.setActiveShift(false);
            deliveryAgentProfileRepository.save(agent);
            log.warn("Auto-offlined stale agent: {}", agent.getId());
        }
    }

    @Transactional
    public int processExpiredOffers() {
        List<DispatchAssignment> expiredOffers = dispatchAssignmentRepository.findByStatusAndOfferExpiresAtBefore(
                DispatchAssignmentStatus.OFFERED,
                OffsetDateTime.now()
        );

        int processed = 0;
        for (DispatchAssignment expired : expiredOffers) {
            DispatchAssignment latestForOrder = dispatchAssignmentRepository
                    .findTopByOrderIdOrderByCreatedAtDescIdDesc(expired.getOrder().getId())
                    .orElse(null);
            if (latestForOrder == null || !latestForOrder.getId().equals(expired.getId())) {
                continue;
            }
            if (!DispatchAssignmentStatus.OFFERED.equals(latestForOrder.getStatus())) {
                continue;
            }

            OffsetDateTime now = OffsetDateTime.now();
            latestForOrder.setStatus(DispatchAssignmentStatus.TIMED_OUT);
            latestForOrder.setDecisionAt(now);
            dispatchAssignmentRepository.save(latestForOrder);
            createEvent(latestForOrder, DispatchAssignmentStatus.TIMED_OUT, "Offer timed out by scheduler");
            makeAgentAvailable(latestForOrder.getAgentUser(), false);

            latestForOrder.setStatus(DispatchAssignmentStatus.REASSIGNED);
            latestForOrder.setRetryAfter(now.plusSeconds(dispatchProperties.reassignmentCooldownSeconds()));
            dispatchAssignmentRepository.save(latestForOrder);
            createEvent(latestForOrder, DispatchAssignmentStatus.REASSIGNED, "Queued for reassignment after cooldown");
            processed++;
        }

        return processed;
    }

    @Transactional
    public int processReassignmentQueue() {
        List<DispatchAssignment> queued = dispatchAssignmentRepository.findByStatusAndRetryAfterBefore(
                DispatchAssignmentStatus.REASSIGNED,
                OffsetDateTime.now()
        );
        int processed = 0;
        for (DispatchAssignment assignment : queued) {
            triggerDispatchForOrder(assignment.getOrder().getId());
            processed++;
        }
        return processed;
    }

    @Transactional
    public int processNoAgentRetryQueue() {
        List<DispatchAssignment> queued = dispatchAssignmentRepository.findByStatusAndRetryAfterBefore(
                DispatchAssignmentStatus.NO_AGENT_AVAILABLE,
                OffsetDateTime.now()
        );
        int processed = 0;
        OffsetDateTime now = OffsetDateTime.now();
        for (DispatchAssignment assignment : queued) {
            if (assignment.getNoAgentRetryUntil() != null && now.isAfter(assignment.getNoAgentRetryUntil())) {
                continue;
            }
            DispatchAssignment latest = dispatchAssignmentRepository
                    .findTopByOrderIdOrderByCreatedAtDescIdDesc(assignment.getOrder().getId())
                    .orElse(null);
            if (latest == null || !latest.getId().equals(assignment.getId())) {
                continue;
            }
            latest.setStatus(DispatchAssignmentStatus.REASSIGNED);
            latest.setRetryAfter(now);
            dispatchAssignmentRepository.save(latest);
            createEvent(latest, DispatchAssignmentStatus.REASSIGNED, "No-agent fallback retry attempt queued");
            triggerDispatchForOrder(latest.getOrder().getId());
            processed++;
        }
        return processed;
    }

    @Transactional
    public int processPickupSlaBreaches() {
        OffsetDateTime threshold = OffsetDateTime.now().minusSeconds(dispatchProperties.pickupSlaSeconds());
        List<DispatchAssignment> staleAccepted = dispatchAssignmentRepository.findByStatusAndCreatedAtBefore(
                DispatchAssignmentStatus.ACCEPTED,
                threshold
        );

        int processed = 0;
        for (DispatchAssignment assignment : staleAccepted) {
            DispatchAssignment latest = dispatchAssignmentRepository
                    .findTopByOrderIdOrderByCreatedAtDescIdDesc(assignment.getOrder().getId())
                    .orElse(null);
            if (latest == null || !latest.getId().equals(assignment.getId())) {
                continue;
            }
            if (!DispatchAssignmentStatus.ACCEPTED.equals(latest.getStatus())) {
                continue;
            }

            OffsetDateTime now = OffsetDateTime.now();
            latest.setStatus(DispatchAssignmentStatus.REASSIGNED);
            latest.setRetryAfter(now.plusSeconds(dispatchProperties.reassignmentCooldownSeconds()));
            latest.setDecisionAt(now);
            dispatchAssignmentRepository.save(latest);
            createEvent(latest, DispatchAssignmentStatus.REASSIGNED, "SLA watchdog reassign due to delayed pickup");
            makeAgentAvailable(latest.getAgentUser(), false);
            processed++;
        }
        return processed;
    }

    @Transactional
    public AgentAvailabilityResponse updateMyAvailability(String currentEmail, boolean online, boolean available, BigDecimal latitude, BigDecimal longitude) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DeliveryAgentProfile profile = deliveryAgentProfileRepository.findByUserId(agent.getId())
                .orElseGet(() -> {
                    DeliveryAgentProfile created = new DeliveryAgentProfile();
                    created.setUser(agent);
                    return created;
                });

        // Prevent going online if not verified (pending admin approval)
        if (online && !profile.isVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is pending admin approval. You cannot go online yet.");
        }

        boolean normalizedAvailable = online && available;
        profile.setOnline(online);
        profile.setAvailable(normalizedAvailable);
        profile.setActiveShift(online);
        if (latitude != null && longitude != null) {
            profile.setLastLatitude(latitude);
            profile.setLastLongitude(longitude);
            profile.setLastLocationAt(OffsetDateTime.now());
        }
        DeliveryAgentProfile saved = deliveryAgentProfileRepository.save(profile);

        return new AgentAvailabilityResponse(agent.getId(), saved.isOnline(), saved.isAvailable(), saved.getCurrentLoad());
    }

    @Transactional(readOnly = true)
    public DispatchAssignmentResponse getMyCurrentAssignment(String currentEmail) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DispatchAssignment assignment = dispatchAssignmentRepository
                .findTopByAgentUserIdAndStatusInOrderByCreatedAtDesc(agent.getId(), ACTIVE_AGENT_STATUSES)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No active assignment"));

        return toResponse(assignment);
    }

    @Transactional(readOnly = true)
    public DeliveryOrderDetailsResponse getMyCurrentAssignmentDetails(String currentEmail) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DispatchAssignment assignment = dispatchAssignmentRepository
                .findTopByAgentUserIdAndStatusInOrderByCreatedAtDesc(agent.getId(), DETAILS_VISIBLE_STATUSES)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No accepted active assignment"));

        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(assignment.getOrder().getId());
        return toDeliveryOrderDetailsResponse(assignment, items);
    }

    @Transactional(readOnly = true)
    public List<DeliveryOrderHistoryResponse> listMyOrderHistory(String currentEmail, int page, int size) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        int normalizedPage = Math.max(0, page);
        int normalizedSize = Math.min(100, Math.max(1, size));
        PageRequest pageable = PageRequest.of(normalizedPage, normalizedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<DispatchAssignmentStatus> historyStatuses = List.of(
                DispatchAssignmentStatus.DELIVERED,
                DispatchAssignmentStatus.CANCELLED,
                DispatchAssignmentStatus.REJECTED,
                DispatchAssignmentStatus.TIMED_OUT
        );

        return dispatchAssignmentRepository.findByAgentUserIdAndStatusIn(agent.getId(), historyStatuses, pageable)
                .stream()
                .map(this::toDeliveryOrderHistoryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeliveryFinanceSummaryResponse myFinanceSummary(String currentEmail) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        List<DispatchAssignmentStatus> financeStatuses = List.of(DispatchAssignmentStatus.DELIVERED, DispatchAssignmentStatus.CANCELLED);
        List<DispatchAssignment> assignments = dispatchAssignmentRepository
                .findByAgentUserIdAndStatusInOrderByCreatedAtDesc(agent.getId(), financeStatuses);

        long totalAssignments = assignments.size();
        long completedDeliveries = assignments.stream().filter(a -> DispatchAssignmentStatus.DELIVERED.equals(a.getStatus())).count();
        long cancelledAssignments = assignments.stream().filter(a -> DispatchAssignmentStatus.CANCELLED.equals(a.getStatus())).count();

        BigDecimal totalDeliveryFees = assignments.stream()
                .filter(a -> DispatchAssignmentStatus.DELIVERED.equals(a.getStatus()))
                .map(a -> safeMoney(a.getAgentPayoutAmount()))
                .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal average = completedDeliveries == 0
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : totalDeliveryFees.divide(BigDecimal.valueOf(completedDeliveries), 2, RoundingMode.HALF_UP);

        return new DeliveryFinanceSummaryResponse(totalAssignments, completedDeliveries, cancelledAssignments, totalDeliveryFees, average);
    }

    @Transactional(readOnly = true)
    public List<DeliveryFinanceTransactionResponse> myFinanceTransactions(String currentEmail, int page, int size) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        int normalizedPage = Math.max(0, page);
        int normalizedSize = Math.min(100, Math.max(1, size));
        PageRequest pageable = PageRequest.of(normalizedPage, normalizedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<DispatchAssignmentStatus> financeStatuses = List.of(DispatchAssignmentStatus.DELIVERED, DispatchAssignmentStatus.CANCELLED);
        return dispatchAssignmentRepository.findByAgentUserIdAndStatusIn(agent.getId(), financeStatuses, pageable)
                .stream()
                .map(this::toDeliveryFinanceTransactionResponse)
                .toList();
    }

    @Transactional
    public DispatchAssignmentResponse acceptOffer(String currentEmail, Long orderId) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DispatchAssignment assignment = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispatch assignment not found"));

        if (DispatchAssignmentStatus.ACCEPTED.equals(assignment.getStatus())) {
            if (assignment.getAgentUser() != null && assignment.getAgentUser().getId().equals(agent.getId())) {
                return toResponse(assignment);
            }
            throw new ApiException(HttpStatus.CONFLICT, "Assignment already accepted by another agent");
        }

        if (!DispatchAssignmentStatus.OFFERED.equals(assignment.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Offer is not active");
        }
        if (assignment.getOfferExpiresAt() != null && OffsetDateTime.now().isAfter(assignment.getOfferExpiresAt())) {
            OffsetDateTime now = OffsetDateTime.now();
            assignment.setStatus(DispatchAssignmentStatus.TIMED_OUT);
            assignment.setDecisionAt(now);
            dispatchAssignmentRepository.save(assignment);
            createEvent(assignment, DispatchAssignmentStatus.TIMED_OUT, "Offer expired before acceptance");
            makeAgentAvailable(assignment.getAgentUser(), false);

            assignment.setStatus(DispatchAssignmentStatus.REASSIGNED);
            assignment.setRetryAfter(now.plusSeconds(dispatchProperties.reassignmentCooldownSeconds()));
            dispatchAssignmentRepository.save(assignment);
            createEvent(assignment, DispatchAssignmentStatus.REASSIGNED, "Queued for reassignment after late accept");
            throw new ApiException(HttpStatus.BAD_REQUEST, "Offer has expired");
        }
        if (assignment.getAgentUser() == null || !assignment.getAgentUser().getId().equals(agent.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Assignment already in progress for another agent");
        }

        assignment.setStatus(DispatchAssignmentStatus.ACCEPTED);
        assignment.setDecisionAt(OffsetDateTime.now());
        DispatchAssignment saved = dispatchAssignmentRepository.save(assignment);
        createEvent(saved, DispatchAssignmentStatus.ACCEPTED, "Offer accepted by agent");

        deliveryAgentProfileRepository.findByUserId(agent.getId()).ifPresent(profile -> {
            profile.setAvailable(false);
            profile.setCurrentLoad(profile.getCurrentLoad() + 1);
            profile.setLastAssignedAt(OffsetDateTime.now());
            deliveryAgentProfileRepository.save(profile);
        });

        return toResponse(saved);
    }

    @Transactional
    public DispatchAssignmentResponse rejectOffer(String currentEmail, Long orderId) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DispatchAssignment assignment = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispatch assignment not found"));

        if (DispatchAssignmentStatus.REJECTED.equals(assignment.getStatus()) || DispatchAssignmentStatus.REASSIGNED.equals(assignment.getStatus())) {
            if (assignment.getAgentUser() != null && assignment.getAgentUser().getId().equals(agent.getId())) {
                return toResponse(assignment);
            }
        }

        if (!DispatchAssignmentStatus.OFFERED.equals(assignment.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Offer is not active");
        }
        if (assignment.getAgentUser() == null || !assignment.getAgentUser().getId().equals(agent.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Offer does not belong to this agent");
        }

        OffsetDateTime now = OffsetDateTime.now();
        assignment.setStatus(DispatchAssignmentStatus.REJECTED);
        assignment.setDecisionAt(now);
        DispatchAssignment saved = dispatchAssignmentRepository.save(assignment);
        createEvent(saved, DispatchAssignmentStatus.REJECTED, "Offer rejected by agent");
        DispatchAssignmentResponse rejectedResponse = toResponse(saved);
        makeAgentAvailable(agent, false);

        saved.setStatus(DispatchAssignmentStatus.REASSIGNED);
        saved.setRetryAfter(now.plusSeconds(dispatchProperties.reassignmentCooldownSeconds()));
        dispatchAssignmentRepository.save(saved);
        createEvent(saved, DispatchAssignmentStatus.REASSIGNED, "Queued for reassignment after agent rejection");

        return rejectedResponse;
    }

    @Transactional
    public DispatchAssignmentResponse markPickedUp(String currentEmail, Long orderId) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DispatchAssignment assignment = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispatch assignment not found"));

        if (DispatchAssignmentStatus.PICKED_UP.equals(assignment.getStatus())
                && assignment.getAgentUser() != null
                && assignment.getAgentUser().getId().equals(agent.getId())) {
            return toResponse(assignment);
        }

        if (!DispatchAssignmentStatus.ACCEPTED.equals(assignment.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order is not accepted for pickup");
        }
        if (assignment.getAgentUser() == null || !assignment.getAgentUser().getId().equals(agent.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only accepted agent can mark pickup");
        }

        assignment.setStatus(DispatchAssignmentStatus.PICKED_UP);
        assignment.setDecisionAt(OffsetDateTime.now());
        DispatchAssignment saved = dispatchAssignmentRepository.save(assignment);
        createEvent(saved, DispatchAssignmentStatus.PICKED_UP, "Order picked up by agent");
        return toResponse(saved);
    }

    @Transactional
    public DispatchAssignmentResponse markDelivered(String currentEmail, Long orderId) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DispatchAssignment assignment = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispatch assignment not found"));

        if (DispatchAssignmentStatus.DELIVERED.equals(assignment.getStatus())
                && assignment.getAgentUser() != null
                && assignment.getAgentUser().getId().equals(agent.getId())) {
            return toResponse(assignment);
        }

        if (!DispatchAssignmentStatus.PICKED_UP.equals(assignment.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order is not picked up yet");
        }
        if (assignment.getAgentUser() == null || !assignment.getAgentUser().getId().equals(agent.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only picked-up agent can mark delivered");
        }

        assignment.setStatus(DispatchAssignmentStatus.DELIVERED);
        assignment.setDecisionAt(OffsetDateTime.now());
        DispatchAssignment saved = dispatchAssignmentRepository.save(assignment);
        createEvent(saved, DispatchAssignmentStatus.DELIVERED, "Order delivered by agent");
        makeAgentAvailable(agent, true);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public void assertAcceptedAssignmentForAgent(String currentEmail, Long orderId) {
        User agent = getDeliveryAgentByEmail(currentEmail);
        DispatchAssignment assignment = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Dispatch assignment not found"));

        if (!(DispatchAssignmentStatus.ACCEPTED.equals(assignment.getStatus()) || DispatchAssignmentStatus.PICKED_UP.equals(assignment.getStatus()))
                || assignment.getAgentUser() == null
                || !assignment.getAgentUser().getId().equals(agent.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the accepted agent can update this order");
        }
    }

    @Transactional
    public void releaseAgentAfterDelivery(Long orderId) {
        DispatchAssignment assignment = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId)
                .orElse(null);
        if (assignment == null || assignment.getAgentUser() == null) {
            return;
        }
        makeAgentAvailable(assignment.getAgentUser(), true);
    }

    @Transactional
    public void handleOrderCancelled(Long orderId) {
        DispatchAssignment assignment = dispatchAssignmentRepository.findTopByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                .orElse(null);
        if (assignment == null || TERMINAL_ASSIGNMENT_STATUSES.contains(assignment.getStatus())) {
            return;
        }

        assignment.setStatus(DispatchAssignmentStatus.CANCELLED);
        assignment.setDecisionAt(OffsetDateTime.now());
        dispatchAssignmentRepository.save(assignment);
        createEvent(assignment, DispatchAssignmentStatus.CANCELLED, "Assignment cancelled due to order cancellation");
        if (assignment.getAgentUser() != null) {
            makeAgentAvailable(assignment.getAgentUser(), true);
        }
    }

    @Transactional(readOnly = true)
    public List<DispatchEventResponse> getDispatchTimeline(Long orderId) {
        orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        return dispatchEventRepository.findByAssignmentOrderIdOrderByCreatedAtAsc(orderId)
                .stream()
                .map(event -> new DispatchEventResponse(
                        event.getAssignment().getId(),
                        event.getStatus(),
                        event.getEventNote(),
                        event.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DispatchAssignmentResponse> getNoAgentQueue() {
        return dispatchAssignmentRepository.findByStatusAndAdminVisibilityTrueOrderByCreatedAtDesc(DispatchAssignmentStatus.NO_AGENT_AVAILABLE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DispatchMetricsResponse getMetrics(long sinceMinutes) {
        OffsetDateTime since = OffsetDateTime.now().minusMinutes(Math.max(1, sinceMinutes));

        long offered = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.OFFERED, since);
        long accepted = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.ACCEPTED, since);
        long pickedUp = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.PICKED_UP, since);
        long delivered = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.DELIVERED, since);
        long rejected = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.REJECTED, since);
        long timedOut = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.TIMED_OUT, since);
        long reassigned = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.REASSIGNED, since);
        long noAgent = dispatchEventRepository.countByStatusAndCreatedAtAfter(DispatchAssignmentStatus.NO_AGENT_AVAILABLE, since);

        double acceptanceRate = offered == 0 ? 0.0d : ((double) accepted / (double) offered) * 100.0d;

        return new DispatchMetricsResponse(
                offered,
                accepted,
                pickedUp,
                delivered,
                rejected,
                timedOut,
                reassigned,
                noAgent,
                acceptanceRate
        );
    }

    private DeliveryAgentProfile selectBestCandidate(Order order, Set<Long> triedAgentIds) {
        OffsetDateTime staleBefore = OffsetDateTime.now().minusSeconds(dispatchProperties.maxLocationAgeSeconds());

        List<DeliveryAgentProfile> candidates = deliveryAgentProfileRepository
                .findByVerifiedTrueAndOnlineTrueAndAvailableTrueAndActiveShiftTrueOrderByCurrentLoadAscIdAsc();
        if (candidates.isEmpty()) {
            candidates = deliveryAgentProfileRepository.findByOnlineTrueAndAvailableTrueOrderByCurrentLoadAscIdAsc();
        }

        // Selection Algorithm (Multi-variable scoring):
        // 1. Freshness: Must have sent a location ping recently (within maxLocationAgeSeconds).
        // 2. Proximity: Calculates real geographic distance (Haversine km) between agent and restaurant location.
        // 3. Load Balancing: Prefers agents with lowest current active load.
        // 4. Fairness (Round Robin): Prefers agents who have waited the longest since their last assignment.
        List<DeliveryAgentProfile> ranked = candidates.stream()
                .filter(profile -> profile.getUser() != null)
                .filter(profile -> !triedAgentIds.contains(profile.getUser().getId()))
                .sorted(
                        Comparator
                                // Priority 1: Fresh location ping first
                                .comparing((DeliveryAgentProfile p) -> !(p.getLastLocationAt() != null && !p.getLastLocationAt().isBefore(staleBefore)))
                                // Priority 2: Nearest Geographical Distance (Haversine Routing)
                                .thenComparingDouble(p -> distanceKmToRestaurant(order, p, staleBefore))
                                // Priority 3: Least active load
                                .thenComparingInt(DeliveryAgentProfile::getCurrentLoad)
                                // Priority 4: Time elapsed since last assignment (Fairness)
                                .thenComparing(p -> p.getLastAssignedAt() == null ? OffsetDateTime.MIN : p.getLastAssignedAt())
                                // Tie breaker: DB ID
                                .thenComparing(DeliveryAgentProfile::getId)
                )
                .toList();

        DeliveryAgentProfile withFreshLocation = ranked.stream()
                .filter(profile -> profile.getLastLocationAt() != null && !profile.getLastLocationAt().isBefore(staleBefore))
                .findFirst()
                .orElse(null);
        return withFreshLocation != null ? withFreshLocation : ranked.stream().findFirst().orElse(null);
    }

    private double distanceKmToRestaurant(Order order, DeliveryAgentProfile profile, OffsetDateTime staleBefore) {
        if (order == null || order.getRestaurant() == null
                || order.getRestaurant().getLatitude() == null || order.getRestaurant().getLongitude() == null) {
            return Double.MAX_VALUE;
        }
        if (profile.getLastLocationAt() == null || profile.getLastLocationAt().isBefore(staleBefore)
                || profile.getLastLatitude() == null || profile.getLastLongitude() == null) {
            return Double.MAX_VALUE;
        }

        return haversineKm(
                profile.getLastLatitude(),
                profile.getLastLongitude(),
                order.getRestaurant().getLatitude(),
                order.getRestaurant().getLongitude()
        );
    }

    private double haversineKm(BigDecimal lat1, BigDecimal lon1, BigDecimal lat2, BigDecimal lon2) {
        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLon = Math.toRadians(lon2.doubleValue() - lon1.doubleValue());
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1.doubleValue()))
                * Math.cos(Math.toRadians(lat2.doubleValue()))
                * Math.pow(Math.sin(dLon / 2), 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371.0d * c;
    }

    private OffsetDateTime resolveRetryUntil(DispatchAssignment latest) {
        if (latest != null && latest.getNoAgentRetryUntil() != null) {
            return latest.getNoAgentRetryUntil();
        }
        return OffsetDateTime.now().plusSeconds(dispatchProperties.noAgentRetryWindowSeconds());
    }

    private void createNoAgentFallback(Order order, int attempt, OffsetDateTime retryUntil, String note) {
        OffsetDateTime now = OffsetDateTime.now();
        DispatchAssignment noAgent = new DispatchAssignment();
        noAgent.setOrder(order);
        noAgent.setAttemptNumber(attempt);
        noAgent.setStatus(DispatchAssignmentStatus.NO_AGENT_AVAILABLE);
        noAgent.setAdminVisibility(true);
        noAgent.setRetryAfter(now.plusSeconds(dispatchProperties.noAgentRetryIntervalSeconds()));
        noAgent.setNoAgentRetryUntil(retryUntil);
        DispatchAssignment saved = dispatchAssignmentRepository.save(noAgent);
        createEvent(saved, DispatchAssignmentStatus.NO_AGENT_AVAILABLE, note);
        if (order.getUser() != null) {
            notificationService.publish(
                    order.getUser(),
                    NotificationType.DELIVERY_NO_AGENT_AVAILABLE,
                    "dispatch:no-agent:order:" + order.getId() + ":attempt:" + attempt,
                    "Delivery partner assignment delayed",
                    "We are still searching for a delivery partner for order #" + order.getId() + ".",
                    "Order #" + order.getId(),
                    true
            );
        }
    }

    private boolean isDispatchableOrder(OrderStatus status) {
        return OrderStatus.CONFIRMED.equals(status)
                || OrderStatus.ACCEPTED_BY_RESTAURANT.equals(status)
                || OrderStatus.PREPARING.equals(status)
                || OrderStatus.READY_FOR_PICKUP.equals(status);
    }

    private void createEvent(DispatchAssignment assignment, DispatchAssignmentStatus status, String note) {
        DispatchEvent event = new DispatchEvent();
        event.setAssignment(assignment);
        event.setStatus(status);
        event.setEventNote(note);
        DispatchEvent saved = dispatchEventRepository.save(event);

        DispatchEventResponse response = new DispatchEventResponse(
                assignment.getId(),
                saved.getStatus(),
                saved.getEventNote(),
                saved.getCreatedAt()
        );
        realtimePublisher.publishDispatchUpdate(assignment.getOrder().getId(), "DISPATCH_" + saved.getStatus().name(), response);
        if (assignment.getAgentUser() != null) {
            realtimePublisher.publishAgentOffer(assignment.getAgentUser().getId(), "AGENT_" + saved.getStatus().name(), response);
        }
    }

    private DispatchAssignmentResponse toResponse(DispatchAssignment assignment) {
        User agent = assignment.getAgentUser();
        return new DispatchAssignmentResponse(
                assignment.getId(),
                assignment.getOrder().getId(),
                agent == null ? null : agent.getId(),
                agent == null ? null : agent.getFullName(),
                assignment.getStatus(),
                assignment.getAttemptNumber(),
                assignment.getOfferExpiresAt()
        );
    }

    private DeliveryOrderDetailsResponse toDeliveryOrderDetailsResponse(DispatchAssignment assignment, List<OrderItem> orderItems) {
        Order order = assignment.getOrder();
        List<DeliveryAssignmentItemResponse> items = orderItems.stream()
                .map(item -> new DeliveryAssignmentItemResponse(
                        item.getId(),
                        item.getItemName(),
                        item.getQuantity(),
                        safeMoney(item.getLineTotal()),
                        item.isVeg(),
                        item.getNotes()
                ))
                .toList();

        return new DeliveryOrderDetailsResponse(
                assignment.getId(),
                assignment.getStatus(),
                order.getId(),
                order.getStatus(),
                order.getCreatedAt(),
                order.getRestaurant() == null ? null : order.getRestaurant().getName(),
                buildRestaurantAddress(order),
                order.getRestaurant() == null ? null : order.getRestaurant().getLatitude(),
                order.getRestaurant() == null ? null : order.getRestaurant().getLongitude(),
                order.getDeliveryContactName(),
                order.getDeliveryContactPhone(),
                buildDeliveryAddress(order),
                order.getDeliveryLatitude(),
                order.getDeliveryLongitude(),
                order.getTotalItems(),
                safeMoney(order.getGrandTotal()),
                safeMoney(order.getDeliveryFee()),
                items
        );
    }

    private DeliveryOrderHistoryResponse toDeliveryOrderHistoryResponse(DispatchAssignment assignment) {
        Order order = assignment.getOrder();
        return new DeliveryOrderHistoryResponse(
                assignment.getId(),
                assignment.getStatus(),
                order.getId(),
                order.getStatus(),
                assignment.getUpdatedAt(),
                order.getRestaurant() == null ? null : order.getRestaurant().getName(),
                order.getDeliveryContactName(),
                order.getTotalItems(),
                safeMoney(order.getGrandTotal()),
                safeMoney(order.getDeliveryFee())
        );
    }

    private DeliveryFinanceTransactionResponse toDeliveryFinanceTransactionResponse(DispatchAssignment assignment) {
        Order order = assignment.getOrder();
        BigDecimal amount = DispatchAssignmentStatus.DELIVERED.equals(assignment.getStatus())
                ? safeMoney(assignment.getAgentPayoutAmount())
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return new DeliveryFinanceTransactionResponse(
                assignment.getId(),
                order.getId(),
                assignment.getStatus(),
                order.getRestaurant() == null ? null : order.getRestaurant().getName(),
                amount,
                assignment.getUpdatedAt()
        );
    }

    private BigDecimal safeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal computeAgentPayout(Order order) {
        if (order == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal payout = safeMoney(order.getDeliveryFee());
        return payout.compareTo(BigDecimal.ZERO) < 0
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : payout;
    }

    private String buildRestaurantAddress(Order order) {
        if (order == null || order.getRestaurant() == null) {
            return null;
        }
        String addressLine = order.getRestaurant().getAddressLine();
        String city = order.getRestaurant().getCity();
        if (addressLine == null || addressLine.isBlank()) {
            return city;
        }
        if (city == null || city.isBlank()) {
            return addressLine;
        }
        return addressLine + ", " + city;
    }

    private String buildDeliveryAddress(Order order) {
        if (order == null) {
            return null;
        }
        StringBuilder fullAddress = new StringBuilder();
        appendAddressPart(fullAddress, order.getDeliveryAddressLine1());
        appendAddressPart(fullAddress, order.getDeliveryAddressLine2());
        appendAddressPart(fullAddress, order.getDeliveryCity());
        appendAddressPart(fullAddress, order.getDeliveryState());
        appendAddressPart(fullAddress, order.getDeliveryPincode());
        return fullAddress.toString();
    }

    private void appendAddressPart(StringBuilder fullAddress, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        if (!fullAddress.isEmpty()) {
            fullAddress.append(", ");
        }
        fullAddress.append(value.trim());
    }

    private User getDeliveryAgentByEmail(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (!Role.DELIVERY_AGENT.equals(user.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Delivery agent role is required");
        }
        return user;
    }

    private void makeAgentAvailable(User agent, boolean deliveryCompleted) {
        deliveryAgentProfileRepository.findByUserId(agent.getId()).ifPresent(profile -> {
            profile.setAvailable(profile.isOnline());
            if (deliveryCompleted) {
                profile.setCurrentLoad(Math.max(0, profile.getCurrentLoad() - 1));
            }
            deliveryAgentProfileRepository.save(profile);
        });
    }
}



