package com.prajjwal.UrbanBites.admin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.UrbanBitesApplication;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.entity.PricingRule;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.Payment;
import com.prajjwal.UrbanBites.enums.AdminDisputeType;
import com.prajjwal.UrbanBites.enums.AdminReviewModerationStatus;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.PaymentStatus;
import com.prajjwal.UrbanBites.enums.PackingPolicyType;
import com.prajjwal.UrbanBites.enums.PlatformFeeType;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.PaymentRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleRepository;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = UrbanBitesApplication.class)
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private PricingRuleRepository pricingRuleRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Test
    void adminEndpoints_forbiddenForNonAdmin() throws Exception {
        String customerToken = registerAndToken(Role.CUSTOMER);

        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanDisableUserAndSeeDashboard() throws Exception {
        String adminToken = registerAndToken(Role.ADMIN);
        String customerEmail = uniqueEmail("customer");
        register(customerEmail, Role.CUSTOMER);

        User targetUser = userRepository.findByEmailIgnoreCase(customerEmail).orElseThrow();

        mockMvc.perform(patch("/api/v1/admin/users/{userId}/enabled", targetUser.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .param("enabled", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));

        MvcResult usersResult = mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode users = objectMapper.readTree(usersResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
        boolean disabledFound = false;
        for (JsonNode user : users) {
            if (customerEmail.equalsIgnoreCase(user.path("email").asText())) {
                disabledFound = !user.path("enabled").asBoolean(true);
                break;
            }
        }
        assertTrue(disabledFound);

        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").isNumber())
                .andExpect(jsonPath("$.activeUsers").isNumber())
                .andExpect(jsonPath("$.capturedRevenue").exists());
    }

    @Test
    void adminCanToggleRestaurantAndActivatePricingRule() throws Exception {
        String adminToken = registerAndToken(Role.ADMIN);

        User owner = register(uniqueEmail("owner"), Role.RESTAURANT_OWNER);
        Restaurant restaurant = new Restaurant();
        restaurant.setOwner(owner);
        restaurant.setName("Admin Test Restaurant");
        restaurant.setDescription("Test");
        restaurant.setAddressLine("Street 1");
        restaurant.setCity("Pune");
        restaurant.setLatitude(BigDecimal.valueOf(18.5204));
        restaurant.setLongitude(BigDecimal.valueOf(73.8567));
        restaurant.setOpenNow(true);
        restaurant.setActive(true);
        restaurant.setImagePath("/api/v1/images/restaurants/test.jpg");
        Restaurant savedRestaurant = restaurantRepository.save(restaurant);

        mockMvc.perform(patch("/api/v1/admin/restaurants/{restaurantId}/active", savedRestaurant.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .param("active", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));

        Restaurant updatedRestaurant = restaurantRepository.findById(savedRestaurant.getId()).orElseThrow();
        assertFalse(updatedRestaurant.isActive());

        PricingRule rule1 = pricingRuleRepository.save(buildRule("admin-v1", true));
        PricingRule rule2 = pricingRuleRepository.save(buildRule("admin-v2", false));

        mockMvc.perform(patch("/api/v1/admin/pricing-rules/{pricingRuleId}/activate", rule2.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));

        PricingRule refreshedRule1 = pricingRuleRepository.findById(rule1.getId()).orElseThrow();
        PricingRule refreshedRule2 = pricingRuleRepository.findById(rule2.getId()).orElseThrow();
        assertFalse(refreshedRule1.isActive());
        assertTrue(refreshedRule2.isActive());

        MvcResult pricingResult = mockMvc.perform(get("/api/v1/admin/pricing-rules")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode pricingRules = objectMapper.readTree(pricingResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertTrue(pricingRules.isArray());
        assertNotNull(pricingRules.get(0));
    }

    @Test
    void adminCanManageDisputesCouponsModerationAndPayoutControls() throws Exception {
        String adminToken = registerAndToken(Role.ADMIN);

        User customer = register(uniqueEmail("buyer"), Role.CUSTOMER);
        User owner = register(uniqueEmail("owner"), Role.RESTAURANT_OWNER);
        Restaurant restaurant = restaurantRepository.save(buildRestaurant(owner, "Ops Restaurant"));

        Order order = buildOrder(customer, restaurant);
        Order savedOrder = orderRepository.save(order);

        Payment payment = new Payment();
        payment.setOrder(savedOrder);
        payment.setStatus(PaymentStatus.REFUNDED_PARTIAL);
        payment.setAmount(BigDecimal.valueOf(400));
        payment.setCurrency("INR");
        payment.setIdempotencyKey("adm-ref-" + UUID.randomUUID());
        payment.setProviderPaymentId("pay_" + UUID.randomUUID());
        payment.setRefundedAmount(BigDecimal.valueOf(100));
        payment.setRefundReason("duplicate charge");
        payment.setRefundEvidenceImagePath("/api/v1/images/refund-evidence/sample.jpg");
        paymentRepository.save(payment);

        String createDisputeJson = """
                {
                  "orderId": %d,
                  "type": "%s",
                  "title": "Delivery issue",
                  "description": "Customer reported late delivery"
                }
                """.formatted(savedOrder.getId(), AdminDisputeType.DELIVERY.name());

        MvcResult disputeResult = mockMvc.perform(post("/api/v1/admin/disputes")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDisputeJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andReturn();

        Long disputeId = objectMapper.readTree(disputeResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("id")
                .asLong();

        mockMvc.perform(patch("/api/v1/admin/disputes/{disputeId}/status", disputeId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "RESOLVED",
                                  "resolutionNote": "Validated and compensated"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        mockMvc.perform(post("/api/v1/admin/coupon-campaigns")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "ADMIN25",
                                  "description": "Ops campaign",
                                  "discountPercent": 25.0,
                                  "maxUses": 500,
                                  "startsAt": "2030-01-01T00:00:00Z",
                                  "endsAt": "2030-01-31T00:00:00Z",
                                  "active": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("ADMIN25"));

        mockMvc.perform(post("/api/v1/admin/review-moderations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reviewType": "RESTAURANT",
                                  "reviewId": 101,
                                  "status": "%s",
                                  "reason": "Abusive language"
                                }
                                """.formatted(AdminReviewModerationStatus.HIDDEN.name())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"));

        mockMvc.perform(patch("/api/v1/admin/restaurants/{restaurantId}/payout-block", restaurant.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "blocked": true,
                                  "reason": "KYC revalidation"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(true));

        mockMvc.perform(get("/api/v1/admin/refunds")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].paymentStatus").exists());

        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openDisputes").isNumber())
                .andExpect(jsonPath("$.refundedPayments").isNumber())
                .andExpect(jsonPath("$.payoutsBlockedRestaurants").isNumber());
    }

    private String registerAndToken(Role role) throws Exception {
        String email = uniqueEmail(role.name().toLowerCase());
        RegisterRequest request = new RegisterRequest(email, "TestPass123", "Admin Phase", role);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("accessToken")
                .asText();
    }

    private User register(String email, Role role) throws Exception {
        RegisterRequest request = new RegisterRequest(email, "TestPass123", "Admin Phase", role);
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
        return userRepository.findByEmailIgnoreCase(email).orElseThrow();
    }

    private PricingRule buildRule(String version, boolean active) {
        PricingRule rule = new PricingRule();
        rule.setVersion(version);
        rule.setActive(active);
        rule.setBaseFee(BigDecimal.valueOf(20));
        rule.setSlabKmCutoff(BigDecimal.valueOf(3));
        rule.setSlabFee(BigDecimal.valueOf(10));
        rule.setPerKmRate(BigDecimal.valueOf(8));
        rule.setSurgePeakMultiplier(BigDecimal.valueOf(1.2));
        rule.setSurgeRainMultiplier(BigDecimal.valueOf(1.1));
        rule.setMinDeliveryFee(BigDecimal.valueOf(15));
        rule.setMaxDeliveryFee(BigDecimal.valueOf(120));
        rule.setFreeDeliveryThreshold(BigDecimal.valueOf(299));
        rule.setPlatformFeeType(PlatformFeeType.FIXED);
        rule.setPlatformFeeValue(BigDecimal.valueOf(5));
        rule.setTaxPercent(BigDecimal.valueOf(5));
        rule.setPackingPolicy(PackingPolicyType.ITEM_LEVEL);
        rule.setPackingValue(BigDecimal.ZERO);
        return rule;
    }

    private Restaurant buildRestaurant(User owner, String name) {
        Restaurant restaurant = new Restaurant();
        restaurant.setOwner(owner);
        restaurant.setName(name);
        restaurant.setDescription("Test");
        restaurant.setAddressLine("Street 1");
        restaurant.setCity("Pune");
        restaurant.setLatitude(BigDecimal.valueOf(18.5204));
        restaurant.setLongitude(BigDecimal.valueOf(73.8567));
        restaurant.setOpenNow(true);
        restaurant.setActive(true);
        restaurant.setImagePath("/api/v1/images/restaurants/test.jpg");
        return restaurant;
    }

    private Order buildOrder(User customer, Restaurant restaurant) {
        Order order = new Order();
        order.setUser(customer);
        order.setRestaurant(restaurant);
        order.setStatus(OrderStatus.DELIVERED);
        order.setPricingRuleVersion("v1");
        order.setDeliveryContactName("Buyer");
        order.setDeliveryContactPhone("9999999999");
        order.setDeliveryAddressLine1("Street 10");
        order.setDeliveryAddressLine2("Area");
        order.setDeliveryCity("Pune");
        order.setDeliveryState("MH");
        order.setDeliveryPincode("411001");
        order.setDeliveryLatitude(BigDecimal.valueOf(18.5204));
        order.setDeliveryLongitude(BigDecimal.valueOf(73.8567));
        order.setDeliveryDistanceKm(BigDecimal.valueOf(2.4));
        order.setTotalItems(2);
        order.setSubtotal(BigDecimal.valueOf(350));
        order.setDeliveryFee(BigDecimal.valueOf(30));
        order.setPackingCharge(BigDecimal.valueOf(10));
        order.setPlatformFee(BigDecimal.valueOf(5));
        order.setTaxTotal(BigDecimal.valueOf(5));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setGrandTotal(BigDecimal.valueOf(400));
        order.setEtaMinutes(30);
        order.setEtaUpdatedAt(OffsetDateTime.now());
        return order;
    }

    private String uniqueEmail(String prefix) {
        return prefix + "." + UUID.randomUUID() + "@example.com";
    }
}



