package com.prajjwal.UrbanBites.tracking;

import com.prajjwal.UrbanBites.config.TrackingProperties;
import com.prajjwal.UrbanBites.dto.request.TrackingLocationPingRequest;
import com.prajjwal.UrbanBites.dto.response.TrackingSnapshotResponse;
import com.prajjwal.UrbanBites.entity.DeliveryAgentProfile;
import com.prajjwal.UrbanBites.entity.DispatchAssignment;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.OrderTrackingPoint;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.DeliveryAgentProfileRepository;
import com.prajjwal.UrbanBites.repository.DispatchAssignmentRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.OrderTrackingPointRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.service.DispatchService;
import com.prajjwal.UrbanBites.service.TrackingService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrackingServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderTrackingPointRepository orderTrackingPointRepository;

    @Mock
    private DispatchService dispatchService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private DispatchAssignmentRepository dispatchAssignmentRepository;

    @Mock
    private DeliveryAgentProfileRepository deliveryAgentProfileRepository;

    private TrackingService trackingService;

    @BeforeEach
    void setUp() {
        trackingService = new TrackingService(
                userRepository,
                orderRepository,
                orderTrackingPointRepository,
                dispatchService,
                dispatchAssignmentRepository,
                deliveryAgentProfileRepository,
                new TrackingProperties(25.0d, 100, 0.6d, 2.5d, 2, 20.0d, 1),
                messagingTemplate
        );
    }

    @Test
    void ingestLocationPing_persistsPoint_updatesEta_andBroadcasts() {
        User agent = deliveryAgent(88L, "agent@example.com");
        Order order = trackedOrder(101L, 18.5300, 73.8500, OrderStatus.OUT_FOR_DELIVERY);

        when(userRepository.findByEmailIgnoreCase("agent@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findById(101L)).thenReturn(Optional.of(order));
        when(orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(101L)).thenReturn(Optional.empty());

        TrackingSnapshotResponse response = trackingService.ingestLocationPing(
                "agent@example.com",
                101L,
                new TrackingLocationPingRequest(new BigDecimal("18.5200000"), new BigDecimal("73.8400000"), new BigDecimal("30"))
        );

        verify(dispatchService).assertAcceptedAssignmentForAgent("agent@example.com", 101L);

        ArgumentCaptor<OrderTrackingPoint> pointCaptor = ArgumentCaptor.forClass(OrderTrackingPoint.class);
        verify(orderTrackingPointRepository).save(pointCaptor.capture());
        OrderTrackingPoint savedPoint = pointCaptor.getValue();

        Assertions.assertEquals(101L, savedPoint.getOrderId());
        Assertions.assertEquals(88L, savedPoint.getAgentUserId());
        Assertions.assertNotNull(savedPoint.getEtaMinutes());
        Assertions.assertTrue(savedPoint.getEtaMinutes() > 0);
        Assertions.assertEquals(savedPoint.getEtaMinutes(), response.etaMinutes());
        verify(orderRepository).save(order);
        verify(messagingTemplate).convertAndSend(eq("/topic/orders/101/tracking"), any(TrackingSnapshotResponse.class));
    }

    @Test
    void getLatestSnapshot_customerOfOrder_canFetch() {
        User customer = customer(17L, "customer@example.com");
        User agent = deliveryAgent(44L, "agent44@example.com");
        agent.setPhone("9991112222");
        Order order = trackedOrder(300L, 18.5300, 73.8500, OrderStatus.OUT_FOR_DELIVERY);
        OrderTrackingPoint point = new OrderTrackingPoint();
        point.setOrderId(300L);
        point.setAgentUserId(44L);
        point.setLatitude(new BigDecimal("18.5210000"));
        point.setLongitude(new BigDecimal("73.8420000"));
        point.setEtaMinutes(9);
        point.setOrderStatus(OrderStatus.OUT_FOR_DELIVERY);
        point.setCreatedAt(OffsetDateTime.now());

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(userRepository.findById(44L)).thenReturn(Optional.of(agent));
        when(orderRepository.findByIdAndUserId(300L, 17L)).thenReturn(Optional.of(order));
        when(orderRepository.findById(300L)).thenReturn(Optional.of(order));
        when(orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(300L)).thenReturn(Optional.of(point));

        TrackingSnapshotResponse response = trackingService.getLatestSnapshot("customer@example.com", 300L);

        Assertions.assertEquals(300L, response.orderId());
        Assertions.assertEquals(44L, response.agentUserId());
        Assertions.assertEquals("Delivery Agent", response.agentName());
        Assertions.assertEquals("9991112222", response.agentPhone());
        Assertions.assertEquals(9, response.etaMinutes());
    }

    @Test
    void getLatestSnapshot_withoutTrackingPoint_returnsFallbackFromAssignedAgentProfile() {
        User customer = customer(17L, "customer@example.com");
        User agent = deliveryAgent(44L, "agent44@example.com");
        agent.setPhone("9991112222");
        Order order = trackedOrder(300L, 18.5300, 73.8500, OrderStatus.OUT_FOR_DELIVERY);

        DispatchAssignment assignment = new DispatchAssignment();
        assignment.setOrder(order);
        assignment.setAgentUser(agent);
        assignment.setStatus(DispatchAssignmentStatus.PICKED_UP);

        DeliveryAgentProfile profile = new DeliveryAgentProfile();
        profile.setLastLatitude(new BigDecimal("18.5500000"));
        profile.setLastLongitude(new BigDecimal("73.8600000"));
        profile.setLastLocationAt(OffsetDateTime.now().minusMinutes(1));

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(userRepository.findById(44L)).thenReturn(Optional.of(agent));
        when(orderRepository.findByIdAndUserId(300L, 17L)).thenReturn(Optional.of(order));
        when(orderRepository.findById(300L)).thenReturn(Optional.of(order));
        when(orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(300L)).thenReturn(Optional.empty());
        when(dispatchAssignmentRepository.findTopByOrderIdAndStatusInOrderByCreatedAtDesc(
                eq(300L),
                eq(EnumSet.of(DispatchAssignmentStatus.ACCEPTED, DispatchAssignmentStatus.PICKED_UP))
        )).thenReturn(Optional.of(assignment));
        when(deliveryAgentProfileRepository.findByUserId(44L)).thenReturn(Optional.of(profile));

        TrackingSnapshotResponse response = trackingService.getLatestSnapshot("customer@example.com", 300L);

        Assertions.assertEquals(300L, response.orderId());
        Assertions.assertEquals(44L, response.agentUserId());
        Assertions.assertEquals("Delivery Agent", response.agentName());
        Assertions.assertEquals("9991112222", response.agentPhone());
        Assertions.assertEquals(new BigDecimal("18.5500000"), response.latitude());
        Assertions.assertEquals(new BigDecimal("73.8600000"), response.longitude());
    }

    @Test
    void getLatestSnapshot_withoutTrackingPointAndAssignment_returnsBaselineSnapshot() {
        User customer = customer(17L, "customer@example.com");
        Order order = trackedOrder(300L, 18.5300, 73.8500, OrderStatus.OUT_FOR_DELIVERY);

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(customer));
        when(orderRepository.findByIdAndUserId(300L, 17L)).thenReturn(Optional.of(order));
        when(orderRepository.findById(300L)).thenReturn(Optional.of(order));
        when(orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(300L)).thenReturn(Optional.empty());
        when(dispatchAssignmentRepository.findTopByOrderIdAndStatusInOrderByCreatedAtDesc(
                eq(300L),
                eq(EnumSet.of(DispatchAssignmentStatus.ACCEPTED, DispatchAssignmentStatus.PICKED_UP))
        )).thenReturn(Optional.empty());

        TrackingSnapshotResponse response = trackingService.getLatestSnapshot("customer@example.com", 300L);

        Assertions.assertEquals(300L, response.orderId());
        Assertions.assertNull(response.agentUserId());
        Assertions.assertNull(response.agentName());
        Assertions.assertNull(response.agentPhone());
        Assertions.assertNull(response.latitude());
        Assertions.assertNull(response.longitude());
        Assertions.assertEquals(OrderStatus.OUT_FOR_DELIVERY, response.orderStatus());
    }

    @Test
    void getLatestSnapshot_otherCustomer_forbidden() {
        User customer = customer(99L, "other@example.com");
        when(userRepository.findByEmailIgnoreCase("other@example.com")).thenReturn(Optional.of(customer));
        when(orderRepository.findByIdAndUserId(300L, 99L)).thenReturn(Optional.empty());

        ApiException ex = Assertions.assertThrows(
                ApiException.class,
                () -> trackingService.getLatestSnapshot("other@example.com", 300L)
        );

        Assertions.assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void ingestLocationPingForActiveAssignment_resolvesOrder_andBroadcasts() {
        User agent = deliveryAgent(88L, "agent@example.com");
        Order order = trackedOrder(205L, 18.5300, 73.8500, OrderStatus.OUT_FOR_DELIVERY);

        DispatchAssignment assignment = new DispatchAssignment();
        assignment.setOrder(order);
        assignment.setAgentUser(agent);
        assignment.setStatus(DispatchAssignmentStatus.ACCEPTED);

        when(userRepository.findByEmailIgnoreCase("agent@example.com")).thenReturn(Optional.of(agent));
        when(dispatchAssignmentRepository.findTopByAgentUserIdAndStatusInOrderByCreatedAtDesc(
                eq(88L),
                eq(EnumSet.of(DispatchAssignmentStatus.ACCEPTED, DispatchAssignmentStatus.PICKED_UP))
        )).thenReturn(Optional.of(assignment));
        when(orderRepository.findById(205L)).thenReturn(Optional.of(order));
        when(orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(205L)).thenReturn(Optional.empty());

        TrackingSnapshotResponse response = trackingService.ingestLocationPingForActiveAssignment(
                "agent@example.com",
                new TrackingLocationPingRequest(new BigDecimal("18.5200000"), new BigDecimal("73.8400000"), new BigDecimal("30"))
        );

        verify(dispatchService).assertAcceptedAssignmentForAgent("agent@example.com", 205L);
        verify(messagingTemplate).convertAndSend(eq("/topic/orders/205/tracking"), any(TrackingSnapshotResponse.class));
        Assertions.assertEquals(205L, response.orderId());
        Assertions.assertEquals(88L, response.agentUserId());
    }

    @Test
    void ingestLocationPing_rapidPingWithinMinInterval_returnsPreviousSnapshot() {
        User agent = deliveryAgent(88L, "agent@example.com");
        Order order = trackedOrder(777L, 18.5300, 73.8500, OrderStatus.OUT_FOR_DELIVERY);

        OrderTrackingPoint latest = new OrderTrackingPoint();
        latest.setOrderId(777L);
        latest.setAgentUserId(88L);
        latest.setLatitude(new BigDecimal("18.5200000"));
        latest.setLongitude(new BigDecimal("73.8400000"));
        latest.setEtaMinutes(4);
        latest.setOrderStatus(OrderStatus.OUT_FOR_DELIVERY);
        latest.setCreatedAt(OffsetDateTime.now().minusSeconds(1));

        when(userRepository.findByEmailIgnoreCase("agent@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findById(777L)).thenReturn(Optional.of(order));
        when(orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(777L)).thenReturn(Optional.of(latest));

        TrackingSnapshotResponse response = trackingService.ingestLocationPing(
                "agent@example.com",
                777L,
                new TrackingLocationPingRequest(new BigDecimal("18.5210000"), new BigDecimal("73.8410000"), new BigDecimal("25"))
        );

        verify(dispatchService).assertAcceptedAssignmentForAgent("agent@example.com", 777L);
        Assertions.assertEquals(777L, response.orderId());
        Assertions.assertEquals(new BigDecimal("18.5200000"), response.latitude());
        Assertions.assertEquals(new BigDecimal("73.8400000"), response.longitude());
        verify(orderTrackingPointRepository).findTopByOrderIdOrderByCreatedAtDesc(777L);
    }

    @Test
    void ingestLocationPing_belowEmitThresholds_persistsWithoutBroadcast() {
        User agent = deliveryAgent(88L, "agent@example.com");
        Order order = trackedOrder(909L, 18.5300, 73.8500, OrderStatus.OUT_FOR_DELIVERY);

        OrderTrackingPoint latest = new OrderTrackingPoint();
        latest.setOrderId(909L);
        latest.setAgentUserId(88L);
        latest.setLatitude(new BigDecimal("18.5200000"));
        latest.setLongitude(new BigDecimal("73.8400000"));
        latest.setEtaMinutes(4);
        latest.setOrderStatus(OrderStatus.OUT_FOR_DELIVERY);
        latest.setCreatedAt(OffsetDateTime.now().minusSeconds(5));

        when(userRepository.findByEmailIgnoreCase("agent@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findById(909L)).thenReturn(Optional.of(order));
        when(orderTrackingPointRepository.findTopByOrderIdOrderByCreatedAtDesc(909L)).thenReturn(Optional.of(latest));

        trackingService.ingestLocationPing(
                "agent@example.com",
                909L,
                new TrackingLocationPingRequest(new BigDecimal("18.5200100"), new BigDecimal("73.8400100"), new BigDecimal("25"))
        );

        verify(orderTrackingPointRepository).save(any(OrderTrackingPoint.class));
        verify(orderRepository).save(order);
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/orders/909/tracking"), any(TrackingSnapshotResponse.class));
    }

    private User deliveryAgent(Long id, String email) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", id);
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setFullName("Delivery Agent");
        user.setRole(Role.DELIVERY_AGENT);
        return user;
    }

    private User customer(Long id, String email) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", id);
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setFullName("Customer");
        user.setRole(Role.CUSTOMER);
        return user;
    }

    private Order trackedOrder(Long id, double deliveryLat, double deliveryLon, OrderStatus status) {
        Order order = new Order();
        ReflectionTestUtils.setField(order, "id", id);
        order.setStatus(status);
        order.setDeliveryLatitude(BigDecimal.valueOf(deliveryLat));
        order.setDeliveryLongitude(BigDecimal.valueOf(deliveryLon));
        order.setDeliveryDistanceKm(BigDecimal.ONE);
        order.setSubtotal(BigDecimal.TEN);
        order.setDeliveryFee(BigDecimal.ONE);
        order.setPackingCharge(BigDecimal.ONE);
        order.setPlatformFee(BigDecimal.ONE);
        order.setTaxTotal(BigDecimal.ONE);
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setGrandTotal(BigDecimal.TEN);
        order.setPricingRuleVersion("v1");
        order.setDeliveryContactName("Customer");
        order.setDeliveryContactPhone("9999999999");
        order.setDeliveryAddressLine1("Line 1");
        order.setDeliveryCity("Pune");
        order.setDeliveryState("MH");
        order.setDeliveryPincode("411001");
        return order;
    }
}

