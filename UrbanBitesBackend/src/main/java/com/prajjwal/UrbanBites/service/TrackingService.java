package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.config.TrackingProperties;
import com.prajjwal.UrbanBites.dto.request.TrackingLocationPingRequest;
import com.prajjwal.UrbanBites.dto.response.TrackingPointResponse;
import com.prajjwal.UrbanBites.dto.response.TrackingSnapshotResponse;
import com.prajjwal.UrbanBites.entity.DeliveryAgentProfile;
import com.prajjwal.UrbanBites.entity.DispatchAssignment;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.OrderTrackingPoint;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.DeliveryAgentProfileRepository;
import com.prajjwal.UrbanBites.repository.DispatchAssignmentRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.OrderTrackingPointRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrackingService {

    private static final Set<DispatchAssignmentStatus> TRACKABLE_AGENT_STATUSES =
            EnumSet.of(DispatchAssignmentStatus.ACCEPTED, DispatchAssignmentStatus.PICKED_UP);

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderTrackingPointRepository orderTrackingPointRepository;
    private final DispatchService dispatchService;
    private final DispatchAssignmentRepository dispatchAssignmentRepository;
    private final DeliveryAgentProfileRepository deliveryAgentProfileRepository;
    private final TrackingProperties trackingProperties;
    private final SimpMessagingTemplate messagingTemplate;

    public TrackingService(
            UserRepository userRepository,
            OrderRepository orderRepository,
            OrderTrackingPointRepository orderTrackingPointRepository,
            DispatchService dispatchService,
            DispatchAssignmentRepository dispatchAssignmentRepository,
            DeliveryAgentProfileRepository deliveryAgentProfileRepository,
            TrackingProperties trackingProperties,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.orderTrackingPointRepository = orderTrackingPointRepository;
        this.dispatchService = dispatchService;
        this.dispatchAssignmentRepository = dispatchAssignmentRepository;
        this.deliveryAgentProfileRepository = deliveryAgentProfileRepository;
        this.trackingProperties = trackingProperties;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public TrackingSnapshotResponse ingestLocationPing(String currentEmail, Long orderId, TrackingLocationPingRequest request) {
        dispatchService.assertAcceptedAssignmentForAgent(currentEmail, orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        User agent = getUserByEmail(currentEmail);
        OffsetDateTime now = OffsetDateTime.now();

        TrackingSnapshotResponse previous = orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId)
                .map(p -> toSnapshot(p, order))
                .orElse(null);

        // Sample location updates to avoid noisy client GPS spam in production traffic.
        if (shouldSkipPing(previous, now)) {
            return previous;
        }

        BigDecimal latitude = normalizeCoordinate(previous == null ? null : previous.latitude(), request.latitude(), true);
        BigDecimal longitude = normalizeCoordinate(previous == null ? null : previous.longitude(), request.longitude(), false);
        if (previous != null) {
            double jumpKm = haversineKm(previous.latitude(), previous.longitude(), latitude, longitude);
            if (jumpKm > trackingProperties.maxJumpKm()) {
                latitude = previous.latitude();
                longitude = previous.longitude();
            }
        }

        Integer etaMinutes = computeEtaMinutes(latitude, longitude, order.getDeliveryLatitude(), order.getDeliveryLongitude(), request.speedKmph());
        OrderTrackingPoint point = new OrderTrackingPoint();
        point.setOrderId(orderId);
        point.setAgentUserId(agent.getId());
        point.setLatitude(latitude);
        point.setLongitude(longitude);
        point.setSpeedKmph(request.speedKmph());
        point.setEtaMinutes(etaMinutes);
        point.setOrderStatus(order.getStatus());
        point.setCreatedAt(now);
        orderTrackingPointRepository.save(point);

        order.setEtaMinutes(etaMinutes);
        order.setEtaUpdatedAt(now);
        orderRepository.save(order);

        TrackingSnapshotResponse snapshot = toSnapshot(point, order);
        if (shouldEmitUpdate(previous, snapshot)) {
            messagingTemplate.convertAndSend("/topic/orders/" + orderId + "/tracking", snapshot);
        }
        return snapshot;
    }

    @Transactional(readOnly = true)
    public TrackingSnapshotResponse getLatestSnapshot(String currentEmail, Long orderId) {
        assertTrackingAccess(currentEmail, orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        return orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(orderId)
                .map(point -> toSnapshot(point, order))
                .orElseGet(() -> buildFallbackSnapshot(order));
    }

    @Transactional(readOnly = true)
    public List<TrackingPointResponse> getTimeline(String currentEmail, Long orderId) {
        assertTrackingAccess(currentEmail, orderId);
        int limit = Math.max(1, trackingProperties.maxTimelinePoints());
        List<OrderTrackingPoint> points = orderTrackingPointRepository.findTop200ByOrderIdOrderByCreatedAtDesc(orderId);
        return points.stream()
                .limit(limit)
                .map(point -> new TrackingPointResponse(
                        point.getLatitude(),
                        point.getLongitude(),
                        point.getSpeedKmph(),
                        point.getEtaMinutes(),
                        point.getOrderStatus(),
                        point.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public TrackingSnapshotResponse ingestLocationPingForActiveAssignment(String currentEmail, TrackingLocationPingRequest request) {
        User agent = getUserByEmail(currentEmail);
        if (!Role.DELIVERY_AGENT.equals(agent.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only delivery agents can publish live location");
        }

        DispatchAssignment assignment = dispatchAssignmentRepository
                .findTopByAgentUserIdAndStatusInOrderByCreatedAtDesc(agent.getId(), TRACKABLE_AGENT_STATUSES)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "No active accepted delivery assignment found"));

        return ingestLocationPing(currentEmail, assignment.getOrder().getId(), request);
    }

    private boolean shouldSkipPing(TrackingSnapshotResponse previous, OffsetDateTime now) {
        if (previous == null || previous.capturedAt() == null) {
            return false;
        }
        int minIntervalSeconds = Math.max(0, trackingProperties.minPingIntervalSeconds());
        return now.isBefore(previous.capturedAt().plusSeconds(minIntervalSeconds));
    }

    private boolean shouldEmitUpdate(TrackingSnapshotResponse previous, TrackingSnapshotResponse current) {
        if (previous == null) {
            return true;
        }
        if (previous.orderStatus() != current.orderStatus()) {
            return true;
        }

        double movedMeters = haversineKm(
                previous.latitude(),
                previous.longitude(),
                current.latitude(),
                current.longitude()) * 1000.0d;
        if (movedMeters >= Math.max(0.0d, trackingProperties.minEmitDistanceMeters())) {
            return true;
        }

        Integer prevEta = previous.etaMinutes();
        Integer currEta = current.etaMinutes();
        if (prevEta == null || currEta == null) {
            return false;
        }
        int etaDelta = Math.abs(currEta - prevEta);
        return etaDelta >= Math.max(0, trackingProperties.minEmitEtaDeltaMinutes());
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void assertTrackingAccess(String currentEmail, Long orderId) {
        User user = getUserByEmail(currentEmail);
        if (Role.ADMIN.equals(user.getRole())) {
            orderRepository.findById(orderId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
            return;
        }
        if (Role.CUSTOMER.equals(user.getRole())) {
            orderRepository.findByIdAndUserId(orderId, user.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Not allowed to access tracking for this order"));
            return;
        }
        if (Role.RESTAURANT_OWNER.equals(user.getRole())) {
            orderRepository.findByIdAndRestaurantOwnerId(orderId, user.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Not allowed to access tracking for this order"));
            return;
        }
        if (Role.DELIVERY_AGENT.equals(user.getRole())) {
            dispatchService.assertAcceptedAssignmentForAgent(currentEmail, orderId);
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "Not allowed to access tracking for this order");
    }

    private Integer computeEtaMinutes(
            BigDecimal agentLatitude,
            BigDecimal agentLongitude,
            BigDecimal destinationLatitude,
            BigDecimal destinationLongitude,
            BigDecimal speedKmph
    ) {
        if (destinationLatitude == null || destinationLongitude == null) {
            return null;
        }
        double distanceKm = haversineKm(agentLatitude, agentLongitude, destinationLatitude, destinationLongitude);
        double speed = speedKmph == null || speedKmph.compareTo(BigDecimal.ZERO) <= 0
                ? trackingProperties.assumedSpeedKmph()
                : speedKmph.doubleValue();
        if (speed <= 0.0d) {
            return null;
        }
        int minutes = (int) Math.ceil((distanceKm / speed) * 60.0d);
        return Math.max(1, minutes);
    }

    private BigDecimal normalizeCoordinate(BigDecimal previous, BigDecimal incoming, boolean latitude) {
        if (previous == null) {
            return incoming.setScale(7, RoundingMode.HALF_UP);
        }
        double alpha = Math.max(0.0d, Math.min(1.0d, trackingProperties.smoothingAlpha()));
        double value = alpha * incoming.doubleValue() + (1.0d - alpha) * previous.doubleValue();
        double clamped = latitude
                ? Math.max(-90.0d, Math.min(90.0d, value))
                : Math.max(-180.0d, Math.min(180.0d, value));
        return BigDecimal.valueOf(clamped).setScale(7, RoundingMode.HALF_UP);
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

    private TrackingSnapshotResponse toSnapshot(OrderTrackingPoint point, Order order) {
        AgentContactInfo contactInfo = getAgentContactInfo(point.getAgentUserId());
        return new TrackingSnapshotResponse(
                point.getOrderId(),
                point.getAgentUserId(),
                contactInfo.name(),
                contactInfo.phone(),
                point.getLatitude(),
                point.getLongitude(),
                order.getRestaurant() != null ? order.getRestaurant().getLatitude() : null,
                order.getRestaurant() != null ? order.getRestaurant().getLongitude() : null,
                order.getDeliveryLatitude(),
                order.getDeliveryLongitude(),
                point.getEtaMinutes(),
                point.getOrderStatus(),
                point.getCreatedAt()
        );
    }

    private TrackingSnapshotResponse buildFallbackSnapshot(Order order) {
        DispatchAssignment assignment = dispatchAssignmentRepository
                .findTopByOrderIdAndStatusInOrderByCreatedAtDesc(order.getId(), TRACKABLE_AGENT_STATUSES)
                .orElse(null);

        Long agentUserId = assignment != null && assignment.getAgentUser() != null
                ? assignment.getAgentUser().getId()
                : null;
        AgentContactInfo contactInfo = getAgentContactInfo(agentUserId);
        DeliveryAgentProfile profile = agentUserId != null
                ? deliveryAgentProfileRepository.findByUserId(agentUserId).orElse(null)
                : null;

        return new TrackingSnapshotResponse(
                order.getId(),
                agentUserId,
                contactInfo.name(),
                contactInfo.phone(),
                profile != null ? profile.getLastLatitude() : null,
                profile != null ? profile.getLastLongitude() : null,
                order.getRestaurant() != null ? order.getRestaurant().getLatitude() : null,
                order.getRestaurant() != null ? order.getRestaurant().getLongitude() : null,
                order.getDeliveryLatitude(),
                order.getDeliveryLongitude(),
                order.getEtaMinutes(),
                order.getStatus(),
                resolveFallbackCapturedAt(order, profile, assignment)
        );
    }

    private OffsetDateTime resolveFallbackCapturedAt(Order order, DeliveryAgentProfile profile, DispatchAssignment assignment) {
        if (profile != null && profile.getLastLocationAt() != null) {
            return profile.getLastLocationAt();
        }
        if (assignment != null && assignment.getUpdatedAt() != null) {
            return assignment.getUpdatedAt();
        }
        if (assignment != null && assignment.getCreatedAt() != null) {
            return assignment.getCreatedAt();
        }
        if (order.getEtaUpdatedAt() != null) {
            return order.getEtaUpdatedAt();
        }
        return OffsetDateTime.now();
    }

    private AgentContactInfo getAgentContactInfo(Long agentUserId) {
        if (agentUserId == null) {
            return AgentContactInfo.EMPTY;
        }
        return userRepository.findById(agentUserId)
                .map(user -> new AgentContactInfo(user.getFullName(), user.getPhone()))
                .orElse(AgentContactInfo.EMPTY);
    }

    private record AgentContactInfo(String name, String phone) {
        private static final AgentContactInfo EMPTY = new AgentContactInfo(null, null);
    }
}

