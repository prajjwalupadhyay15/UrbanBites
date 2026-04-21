package com.prajjwal.UrbanBites.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;

import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.NotificationChannel;
import com.prajjwal.UrbanBites.enums.NotificationType;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.repository.NotificationJobRepository;
import com.prajjwal.UrbanBites.repository.NotificationRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@SpringBootTest
class NotificationServiceTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationJobRepository notificationJobRepository;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    private User user;

    @BeforeEach
    void setUp() {
        notificationJobRepository.deleteAll();
        notificationRepository.deleteAll();
        userRepository.deleteAll();

        User seed = new User();
        seed.setEmail("notify-test@urbanbites.com");
        seed.setPasswordHash("test-hash");
        seed.setFullName("Notify Tester");
        seed.setRole(Role.CUSTOMER);
        seed.setEnabled(true);
        user = userRepository.save(seed);
    }

    @Test
    void publishCreatesNotificationAndJobAndSupportsReadFlow() {
        notificationService.publish(
                user,
                NotificationType.ORDER_CONFIRMED,
                "order:confirmed:test:1",
                "Order confirmed",
                "Order #1 is confirmed",
                "Order #1",
                true
        );

        assertEquals(1, notificationRepository.count());
        assertEquals(2, notificationJobRepository.count());
        assertTrue(notificationJobRepository.findAll().stream().anyMatch(job -> NotificationChannel.EMAIL.equals(job.getChannel())));
        assertTrue(notificationJobRepository.findAll().stream().anyMatch(job -> NotificationChannel.PUSH.equals(job.getChannel())));
        assertEquals(1, notificationService.getUnreadCount(user.getEmail()));

        Long notificationId = notificationRepository.findAll().getFirst().getId();
        notificationService.markRead(user.getEmail(), notificationId);

        assertEquals(0, notificationService.getUnreadCount(user.getEmail()));
        assertNotNull(notificationRepository.findAll().getFirst().getReadAt());

        notificationService.markAllRead(user.getEmail());

        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/users/" + user.getId() + "/notifications"), any(Object.class));

        int processed = notificationService.processDueJobs();
        assertEquals(2, processed);
    }

    @Test
    void publishIsIdempotentForSameEventAndChannelRecipient() {
        notificationService.publish(
                user,
                NotificationType.ORDER_CONFIRMED,
                "order:confirmed:test:dedupe",
                "Order confirmed",
                "Order is confirmed",
                "Order #2",
                true
        );
        notificationService.publish(
                user,
                NotificationType.ORDER_CONFIRMED,
                "order:confirmed:test:dedupe",
                "Order confirmed",
                "Order is confirmed",
                "Order #2",
                true
        );

        assertEquals(1, notificationRepository.count());
        assertEquals(2, notificationJobRepository.count());
    }

    @Test
    void ownerActionRequired_withoutEmail_stillCreatesPushJob() {
        notificationService.publish(
                user,
                NotificationType.ORDER_OWNER_ACTION_REQUIRED,
                "order:owner:action-required:test:1",
                "New order needs action",
                "Order #101 is confirmed. Please accept or reject it.",
                "Order #101",
                false
        );

        assertEquals(1, notificationRepository.count());
        assertEquals(1, notificationJobRepository.count());
        assertTrue(notificationJobRepository.findAll().stream().anyMatch(job -> NotificationChannel.PUSH.equals(job.getChannel())));
    }
}

