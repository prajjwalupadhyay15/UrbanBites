package com.prajjwal.UrbanBites.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.prajjwal.UrbanBites.dto.response.CartResponse;
import com.prajjwal.UrbanBites.dto.response.DispatchEventResponse;
import com.prajjwal.UrbanBites.dto.response.NotificationResponse;
import com.prajjwal.UrbanBites.dto.response.OrderResponse;
import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class RealtimePublisherTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private RealtimePublisher realtimePublisher;

    @BeforeEach
    void setUp() {
        realtimePublisher = new RealtimePublisher(messagingTemplate);
    }

    @Test
    void publishUserCart_sendsToUserCartTopic() {
        CartResponse snapshot = new CartResponse(20L, 2L, "Store", 1, BigDecimal.TEN, List.of());

        realtimePublisher.publishUserCart(5L, 20L, "cart_updated", snapshot);

        verify(messagingTemplate).convertAndSend(eq("/topic/users/5/cart"), any(Object.class));
    }

    @Test
    void publishOrderUpdate_sendsToOrderStatusTopic() {
        OrderResponse snapshot = new OrderResponse(
                99L,
                OrderStatus.CONFIRMED,
                OffsetDateTime.now(),
                12L,
                "Restaurant",
                "Customer",
                "Line 1, City, State, 560001",
                2,
                BigDecimal.TEN,
                BigDecimal.ONE,
                BigDecimal.ONE,
                BigDecimal.ONE,
                BigDecimal.ONE,
                BigDecimal.ZERO,
                BigDecimal.TEN,
                12,
                OffsetDateTime.now(),
                "v1",
                null,
                List.of()
        );

        realtimePublisher.publishOrderUpdate(99L, "order_confirmed", snapshot);

        verify(messagingTemplate).convertAndSend(eq("/topic/orders/99/status"), any(Object.class));
    }

    @Test
    void publishDispatchUpdate_sendsToDispatchTopic() {
        DispatchEventResponse snapshot = new DispatchEventResponse(8L, DispatchAssignmentStatus.OFFERED, "Offer sent", OffsetDateTime.now());

        realtimePublisher.publishDispatchUpdate(71L, "dispatch_offered", snapshot);

        verify(messagingTemplate).convertAndSend(eq("/topic/orders/71/dispatch"), any(Object.class));
    }

    @Test
    void publishUserNotification_sendsToNotificationsTopic() {
        NotificationResponse snapshot = new NotificationResponse(
                41L,
                com.prajjwal.UrbanBites.enums.NotificationType.ORDER_CONFIRMED,
                "Order confirmed",
                "Your order was confirmed",
                "Order #41",
                OffsetDateTime.now(),
                null
        );

        realtimePublisher.publishUserNotification(22L, "notification_created", snapshot);

        verify(messagingTemplate).convertAndSend(eq("/topic/users/22/notifications"), any(Object.class));
    }
}



