package com.prajjwal.UrbanBites.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.repository.AdminActionAuditRepository;
import com.prajjwal.UrbanBites.repository.AdminCouponCampaignRepository;
import com.prajjwal.UrbanBites.repository.AdminDisputeCaseRepository;
import com.prajjwal.UrbanBites.repository.AdminPayoutControlRepository;
import com.prajjwal.UrbanBites.repository.AdminReviewModerationRepository;
import com.prajjwal.UrbanBites.repository.DeliveryAgentProfileRepository;
import com.prajjwal.UrbanBites.repository.DispatchAssignmentRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.PaymentRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleAuditRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleRepository;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.service.AdminService;
import com.prajjwal.UrbanBites.service.NotificationService;
import com.prajjwal.UrbanBites.service.RealtimePublisher;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class AdminServiceRealtimeTest {

    @Mock private UserRepository userRepository;
    @Mock private RestaurantRepository restaurantRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PricingRuleRepository pricingRuleRepository;
    @Mock private PricingRuleAuditRepository pricingRuleAuditRepository;
    @Mock private DispatchAssignmentRepository dispatchAssignmentRepository;
    @Mock private DeliveryAgentProfileRepository deliveryAgentProfileRepository;
    @Mock private AdminDisputeCaseRepository adminDisputeCaseRepository;
    @Mock private AdminCouponCampaignRepository adminCouponCampaignRepository;
    @Mock private AdminReviewModerationRepository adminReviewModerationRepository;
    @Mock private AdminPayoutControlRepository adminPayoutControlRepository;
    @Mock private AdminActionAuditRepository adminActionAuditRepository;
    @Mock private NotificationService notificationService;
    @Mock private RealtimePublisher realtimePublisher;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(
                userRepository,
                restaurantRepository,
                orderRepository,
                paymentRepository,
                pricingRuleRepository,
                pricingRuleAuditRepository,
                dispatchAssignmentRepository,
                deliveryAgentProfileRepository,
                adminDisputeCaseRepository,
                adminCouponCampaignRepository,
                adminReviewModerationRepository,
                adminPayoutControlRepository,
                adminActionAuditRepository,
                notificationService,
                realtimePublisher,
                messagingTemplate
        );
    }

    @Test
    void setUserEnabled_publishesRealtimeEventWhenValueChanges() {
        User admin = adminUser("admin@example.com");
        User target = new User();
        target.setEmail("owner@example.com");
        target.setRole(Role.RESTAURANT_OWNER);
        target.setEnabled(true);

        when(userRepository.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(admin));
        when(userRepository.findById(11L)).thenReturn(Optional.of(target));

        adminService.setUserEnabled("admin@example.com", 11L, false);

        verify(messagingTemplate).convertAndSend(eq("/topic/admin/console/toggles"), any(Object.class));
        verify(messagingTemplate).convertAndSend(startsWith("/topic/admin/user/"), any(Object.class));
    }

    @Test
    void setUserEnabled_doesNotPublishWhenValueUnchanged() {
        User admin = adminUser("admin@example.com");
        User target = new User();
        target.setEnabled(true);

        when(userRepository.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(admin));
        when(userRepository.findById(12L)).thenReturn(Optional.of(target));

        adminService.setUserEnabled("admin@example.com", 12L, true);

        verify(messagingTemplate, never()).convertAndSend(eq("/topic/admin/console/toggles"), any(Object.class));
    }

    @Test
    void setRestaurantActive_publishesRealtimeEventWhenValueChanges() {
        User admin = adminUser("admin@example.com");
        Restaurant restaurant = new Restaurant();
        restaurant.setActive(true);

        when(userRepository.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(admin));
        when(restaurantRepository.findById(9L)).thenReturn(Optional.of(restaurant));

        adminService.setRestaurantActive("admin@example.com", 9L, false);

        verify(messagingTemplate).convertAndSend(eq("/topic/admin/console/toggles"), any(Object.class));
        verify(messagingTemplate).convertAndSend(startsWith("/topic/admin/restaurant/"), any(Object.class));
    }

    private User adminUser(String email) {
        User admin = new User();
        admin.setEmail(email);
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);
        return admin;
    }
}



