package com.prajjwal.UrbanBites.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.UrbanBitesApplication;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.ApprovalStatus;
import com.prajjwal.UrbanBites.entity.PricingRule;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.entity.DeliveryAgentProfile;
import com.prajjwal.UrbanBites.enums.PackingPolicyType;
import com.prajjwal.UrbanBites.enums.PlatformFeeType;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.repository.PricingRuleRepository;
import com.prajjwal.UrbanBites.repository.DeliveryAgentProfileRepository;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.annotation.DirtiesContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = UrbanBitesApplication.class)
@AutoConfigureMockMvc
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PricingRuleRepository pricingRuleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private DeliveryAgentProfileRepository deliveryAgentProfileRepository;

    @Test
    void placeOrder_createsPendingPaymentAndSnapshot() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.phase6@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Order Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Paneer Meal", "219.00");

        String customerToken = registerAndGetAccessToken("customer.order.phase6@example.com", Role.CUSTOMER);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 2);

        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.pricingRuleVersion").value("v1"))
                .andExpect(jsonPath("$.restaurantId").value(restaurantId))
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.payment.status").value("INITIATED"))
                .andExpect(jsonPath("$.items[0].menuItemId").value(menuItemId));
    }

    @Test
    void paymentSuccess_transitionToConfirmed() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.pay@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Payment Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Rice Bowl", "179.00");

        String customerToken = registerAndGetAccessToken("customer.order.pay@example.com", Role.CUSTOMER);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-order-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.payment.status").value("CAPTURED"))
                .andExpect(jsonPath("$.payment.idempotencyKey").value("idem-order-1"));

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-order-2"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Order is not awaiting payment"));

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].type").value(hasItem("ORDER_OWNER_ACTION_REQUIRED")));
    }

    @Test
    void cancelPendingPaymentOrder_marksOrderCancelled() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.cancel@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Cancel Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Cancel Meal", "149.00");

        String customerToken = registerAndGetAccessToken("customer.order.cancel@example.com", Role.CUSTOMER);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/cancel", orderId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.payment.status").value("FAILED"));

        mockMvc.perform(get("/api/v1/orders/{orderId}", orderId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void paymentFailure_transitionToCancelled() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.fail@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Failure Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Failure Meal", "109.00");

        String customerToken = registerAndGetAccessToken("customer.order.fail@example.com", Role.CUSTOMER);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-failure", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-fail-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.payment.status").value("FAILED"));
    }

    @Test
    void createPaymentIntent_returnsRazorpayOrderMetadata() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.intent@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Intent Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Intent Meal", "159.00");

        String customerToken = registerAndGetAccessToken("customer.order.intent@example.com", Role.CUSTOMER);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/intent", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-intent-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(orderId))
                .andExpect(jsonPath("$.paymentStatus").value("INITIATED"))
                .andExpect(jsonPath("$.razorpayOrderId").isNotEmpty());
    }

    @Test
    void webhookCaptured_confirmsPendingOrder() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.webhook@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Webhook Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Webhook Meal", "189.00");

        String customerToken = registerAndGetAccessToken("customer.order.webhook@example.com", Role.CUSTOMER);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        MvcResult intentResult = mockMvc.perform(post("/api/v1/orders/{orderId}/payment/intent", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-webhook-1"))))
                .andExpect(status().isOk())
                .andReturn();

        String providerOrderId = objectMapper.readTree(intentResult.getResponse().getContentAsString()).get("razorpayOrderId").asText();

        String webhookPayload = objectMapper.writeValueAsString(Map.of(
                "id", "evt_capture_1",
                "event", "payment.captured",
                "payload", Map.of(
                        "payment", Map.of(
                                "entity", Map.of(
                                        "id", "pay_mock_1",
                                        "order_id", providerOrderId
                                )
                        )
                )
        ));

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "test-signature")
                        .content(webhookPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("processed"));

        mockMvc.perform(get("/api/v1/orders/{orderId}", orderId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.payment.status").value("CAPTURED"))
                .andExpect(jsonPath("$.payment.providerOrderId").value(providerOrderId))
                .andExpect(jsonPath("$.payment.providerPaymentId").value("pay_mock_1"));

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].type").value(hasItem("ORDER_OWNER_ACTION_REQUIRED")));
    }

    @Test
    void webhookDuplicateEvent_returnsDuplicateAck() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.dup@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Dup Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Dup Meal", "169.00");

        String customerToken = registerAndGetAccessToken("customer.order.dup@example.com", Role.CUSTOMER);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        MvcResult intentResult = mockMvc.perform(post("/api/v1/orders/{orderId}/payment/intent", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-dup-1"))))
                .andExpect(status().isOk())
                .andReturn();

        String providerOrderId = objectMapper.readTree(intentResult.getResponse().getContentAsString()).get("razorpayOrderId").asText();

        String webhookPayload = objectMapper.writeValueAsString(Map.of(
                "id", "evt_dup_1",
                "event", "payment.captured",
                "payload", Map.of(
                        "payment", Map.of(
                                "entity", Map.of(
                                        "id", "pay_dup_1",
                                        "order_id", providerOrderId
                                )
                        )
                )
        ));

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "test-signature")
                        .content(webhookPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("processed"));

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "test-signature")
                        .content(webhookPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("duplicate"));
    }

    @Test
    void adminRefund_partialThenFull_withIdempotentReplay() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.refund@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Refund Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Refund Meal", "229.00");

        String customerToken = registerAndGetAccessToken("customer.order.refund@example.com", Role.CUSTOMER);
        String adminToken = registerAndGetAccessToken("admin.order.refund@example.com", Role.ADMIN);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        MvcResult intentResult = mockMvc.perform(post("/api/v1/orders/{orderId}/payment/intent", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-refund-intent"))))
                .andExpect(status().isOk())
                .andReturn();

        String providerOrderId = objectMapper.readTree(intentResult.getResponse().getContentAsString()).get("razorpayOrderId").asText();

        String capturePayload = objectMapper.writeValueAsString(Map.of(
                "id", "evt_refund_capture_1",
                "event", "payment.captured",
                "payload", Map.of(
                        "payment", Map.of(
                                "entity", Map.of(
                                        "id", "pay_refund_1",
                                        "order_id", providerOrderId
                                )
                        )
                )
        ));

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "test-signature")
                        .content(capturePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("processed"));

        MvcResult partialRefund = performRefund(
                adminToken,
                orderId,
                20.00,
                "refund-key-1",
                "Customer requested partial refund",
                "evidence-1.jpg"
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payment.status").value("REFUNDED_PARTIAL"))
                .andExpect(jsonPath("$.payment.refundedAmount").value(20.00))
                .andExpect(jsonPath("$.payment.refundReason").value("Customer requested partial refund"))
                .andExpect(jsonPath("$.payment.refundEvidenceImagePath").value(org.hamcrest.Matchers.containsString("/api/v1/images/refund-evidence/")))
                .andReturn();

        JsonNode partialRefundJson = objectMapper.readTree(partialRefund.getResponse().getContentAsString());
        double totalAmount = partialRefundJson.get("payment").get("amount").asDouble();
        double remaining = Math.round((totalAmount - 20.00) * 100.0d) / 100.0d;

        performRefund(
                adminToken,
                orderId,
                remaining,
                "refund-key-2",
                "Final adjustment",
                "evidence-2.jpg"
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payment.status").value("REFUNDED_FULL"))
                .andExpect(jsonPath("$.payment.refundedAmount").value(totalAmount));

        performRefund(
                adminToken,
                orderId,
                remaining,
                "refund-key-2",
                "Replay",
                "evidence-3.jpg"
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payment.status").value("REFUNDED_FULL"));
    }

    @Test
    void adminRefund_requiresReasonAndEvidenceImage() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.refund.validation@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Refund Validation Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Refund Validation Meal", "209.00");

        String customerToken = registerAndGetAccessToken("customer.order.refund.validation@example.com", Role.CUSTOMER);
        String adminToken = registerAndGetAccessToken("admin.order.refund.validation@example.com", Role.ADMIN);
        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();
        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        MvcResult intentResult = mockMvc.perform(post("/api/v1/orders/{orderId}/payment/intent", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-refund-validation-intent"))))
                .andExpect(status().isOk())
                .andReturn();
        String providerOrderId = objectMapper.readTree(intentResult.getResponse().getContentAsString()).get("razorpayOrderId").asText();

        String capturePayload = objectMapper.writeValueAsString(Map.of(
                "id", "evt_refund_validation_capture_1",
                "event", "payment.captured",
                "payload", Map.of(
                        "payment", Map.of(
                                "entity", Map.of(
                                        "id", "pay_refund_validation_1",
                                        "order_id", providerOrderId
                                )
                        )
                )
        ));

        mockMvc.perform(post("/api/v1/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "test-signature")
                        .content(capturePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("processed"));

        MockMultipartFile image = new MockMultipartFile(
                "evidenceImage",
                "refund-evidence.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "mock-image-bytes".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/v1/orders/admin/{orderId}/payment/refund", orderId)
                        .file(image)
                        .param("amount", "10.00")
                        .param("idempotencyKey", "refund-missing-reason")
                        .param("reason", "   ")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Refund reason is required"));

        mockMvc.perform(multipart("/api/v1/orders/admin/{orderId}/payment/refund", orderId)
                        .param("amount", "10.00")
                        .param("idempotencyKey", "refund-missing-image")
                        .param("reason", "Food was tampered")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fullLifecycle_ownerAndDeliveryAgentTransitions_success() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.lifecycle@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Lifecycle Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Lifecycle Meal", "199.00");

        String customerToken = registerAndGetAccessToken("customer.order.lifecycle@example.com", Role.CUSTOMER);
        String deliveryToken = registerAndGetAccessToken("delivery.order.lifecycle@example.com", Role.DELIVERY_AGENT);

        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + deliveryToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "online", true,
                                "available", true,
                                "latitude", 18.5310,
                                "longitude", 73.8470
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.online").value(true));

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-lifecycle-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(get("/api/v1/dispatch/agent/assignments/current")
                        .header("Authorization", "Bearer " + deliveryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(orderId))
                .andExpect(jsonPath("$.status").value("OFFERED"));

        mockMvc.perform(post("/api/v1/dispatch/orders/{orderId}/accept", orderId)
                        .header("Authorization", "Bearer " + deliveryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(post("/api/v1/orders/owner/{orderId}/accept", orderId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED_BY_RESTAURANT"));

        mockMvc.perform(post("/api/v1/orders/owner/{orderId}/preparing", orderId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARING"));

        mockMvc.perform(post("/api/v1/orders/owner/{orderId}/ready-for-pickup", orderId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY_FOR_PICKUP"));

        mockMvc.perform(post("/api/v1/orders/delivery/{orderId}/pickup", orderId)
                        .header("Authorization", "Bearer " + deliveryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OUT_FOR_DELIVERY"));

        mockMvc.perform(post("/api/v1/orders/delivery/{orderId}/delivered", orderId)
                        .header("Authorization", "Bearer " + deliveryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));

        mockMvc.perform(post("/api/v1/orders/{orderId}/cancel", orderId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid order state transition"));
    }

    @Test
    void dispatchReject_reassignsToNextAvailableAgent() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.dispatch.reassign@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Reassign Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Reassign Meal", "199.00");

        String customerToken = registerAndGetAccessToken("customer.order.dispatch.reassign@example.com", Role.CUSTOMER);
        String agentOneToken = registerAndGetAccessToken("delivery.one.dispatch.reassign@example.com", Role.DELIVERY_AGENT);
        String agentTwoToken = registerAndGetAccessToken("delivery.two.dispatch.reassign@example.com", Role.DELIVERY_AGENT);

        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + agentOneToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("online", true, "available", true))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + agentTwoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("online", true, "available", true))))
                .andExpect(status().isOk());

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-reassign-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(get("/api/v1/dispatch/agent/assignments/current")
                        .header("Authorization", "Bearer " + agentOneToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(orderId))
                .andExpect(jsonPath("$.status").value("OFFERED"));

        mockMvc.perform(post("/api/v1/dispatch/orders/{orderId}/reject", orderId)
                        .header("Authorization", "Bearer " + agentOneToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        boolean reassigned = false;
        for (int i = 0; i < 12; i++) {
            MvcResult assignmentResult = mockMvc.perform(get("/api/v1/dispatch/agent/assignments/current")
                            .header("Authorization", "Bearer " + agentTwoToken))
                    .andReturn();
            if (assignmentResult.getResponse().getStatus() == 200) {
                JsonNode assignmentJson = objectMapper.readTree(assignmentResult.getResponse().getContentAsString());
                if (orderId.equals(assignmentJson.get("orderId").asLong())
                        && "OFFERED".equals(assignmentJson.get("status").asText())) {
                    reassigned = true;
                    break;
                }
            }
            Thread.sleep(250L);
        }

        org.junit.jupiter.api.Assertions.assertTrue(reassigned);
    }

    @Test
    @DirtiesContext(methodMode = DirtiesContext.MethodMode.BEFORE_METHOD)
    void dispatchTimeoutSweep_reassignsOffer_andExposesTimeline() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.dispatch.timeout@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Timeout Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Timeout Meal", "209.00");

        String customerToken = registerAndGetAccessToken("customer.order.dispatch.timeout@example.com", Role.CUSTOMER);
        String agentOneToken = registerAndGetAccessToken("delivery.one.dispatch.timeout@example.com", Role.DELIVERY_AGENT);
        String agentTwoToken = registerAndGetAccessToken("delivery.two.dispatch.timeout@example.com", Role.DELIVERY_AGENT);
        String adminToken = registerAndGetAccessToken("admin.order.dispatch.timeout@example.com", Role.ADMIN);

        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + agentOneToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "online", true,
                                "available", true,
                                "latitude", 18.5310,
                                "longitude", 73.8470
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + agentTwoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "online", true,
                                "available", true,
                                "latitude", 18.5305,
                                "longitude", 73.8465
                        ))))
                .andExpect(status().isOk());

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();
        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-timeout-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(get("/api/v1/dispatch/agent/assignments/current")
                        .header("Authorization", "Bearer " + agentOneToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(orderId))
                .andExpect(jsonPath("$.status").value("OFFERED"));

        Thread.sleep(1200L);

        mockMvc.perform(post("/api/v1/dispatch/admin/process-timeouts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processedCount").isNumber());

        boolean reassigned = false;
        for (int i = 0; i < 10; i++) {
            MvcResult assignmentResult = mockMvc.perform(get("/api/v1/dispatch/agent/assignments/current")
                            .header("Authorization", "Bearer " + agentTwoToken))
                    .andReturn();

            if (assignmentResult.getResponse().getStatus() == 200) {
                JsonNode assignmentJson = objectMapper.readTree(assignmentResult.getResponse().getContentAsString());
                if (orderId.equals(assignmentJson.get("orderId").asLong())
                        && "OFFERED".equals(assignmentJson.get("status").asText())) {
                    reassigned = true;
                    break;
                }
            }
            Thread.sleep(250L);
        }

        org.junit.jupiter.api.Assertions.assertTrue(reassigned);

        mockMvc.perform(get("/api/v1/dispatch/admin/orders/{orderId}/timeline", orderId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("UNASSIGNED"))
                .andExpect(jsonPath("$[1].status").value("OFFERED"))
                .andExpect(jsonPath("$[2].status").value("TIMED_OUT"));
    }

    @Test
    @DirtiesContext(methodMode = DirtiesContext.MethodMode.BEFORE_METHOD)
    void concurrentAccept_singleWinnerInvariant() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.dispatch.race@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Race Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Race Meal", "199.00");

        String customerToken = registerAndGetAccessToken("customer.order.dispatch.race@example.com", Role.CUSTOMER);
        String agentOneToken = registerAndGetAccessToken("delivery.one.dispatch.race@example.com", Role.DELIVERY_AGENT);
        String agentTwoToken = registerAndGetAccessToken("delivery.two.dispatch.race@example.com", Role.DELIVERY_AGENT);
        String adminToken = registerAndGetAccessToken("admin.order.dispatch.race@example.com", Role.ADMIN);

        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + agentOneToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("online", true, "available", true, "latitude", 18.5310, "longitude", 73.8470))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + agentTwoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("online", true, "available", true, "latitude", 18.5305, "longitude", 73.8465))))
                .andExpect(status().isOk());

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();
        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-race-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        int agentOneStatus = mockMvc.perform(get("/api/v1/dispatch/agent/assignments/current")
                        .header("Authorization", "Bearer " + agentOneToken))
                .andReturn().getResponse().getStatus();
        int agentTwoStatus = mockMvc.perform(get("/api/v1/dispatch/agent/assignments/current")
                        .header("Authorization", "Bearer " + agentTwoToken))
                .andReturn().getResponse().getStatus();

        String offeredToken = agentOneStatus == 200 ? agentOneToken : agentTwoToken;
        String losingToken = agentOneStatus == 200 ? agentTwoToken : agentOneToken;

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        CompletableFuture<Integer> winnerAttempt = CompletableFuture.supplyAsync(() -> {
            try {
                ready.countDown();
                start.await(5, TimeUnit.SECONDS);
                return mockMvc.perform(post("/api/v1/dispatch/orders/{orderId}/accept", orderId)
                                .header("Authorization", "Bearer " + offeredToken))
                        .andReturn().getResponse().getStatus();
            } catch (Exception ex) {
                throw new RuntimeException(ex);
            }
        }, executor);

        CompletableFuture<Integer> loserAttempt = CompletableFuture.supplyAsync(() -> {
            try {
                ready.countDown();
                start.await(5, TimeUnit.SECONDS);
                return mockMvc.perform(post("/api/v1/dispatch/orders/{orderId}/accept", orderId)
                                .header("Authorization", "Bearer " + losingToken))
                        .andReturn().getResponse().getStatus();
            } catch (Exception ex) {
                throw new RuntimeException(ex);
            }
        }, executor);

        ready.await(5, TimeUnit.SECONDS);
        start.countDown();

        int winnerCode = winnerAttempt.get(5, TimeUnit.SECONDS);
        int loserCode = loserAttempt.get(5, TimeUnit.SECONDS);
        executor.shutdownNow();

        org.junit.jupiter.api.Assertions.assertEquals(200, winnerCode);
        org.junit.jupiter.api.Assertions.assertEquals(409, loserCode);

        mockMvc.perform(post("/api/v1/dispatch/orders/{orderId}/accept", orderId)
                        .header("Authorization", "Bearer " + offeredToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        MvcResult timelineResult = mockMvc.perform(get("/api/v1/dispatch/admin/orders/{orderId}/timeline", orderId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode timeline = objectMapper.readTree(timelineResult.getResponse().getContentAsString());
        long acceptedEvents = 0;
        for (JsonNode event : timeline) {
            if ("ACCEPTED".equals(event.get("status").asText())) {
                acceptedEvents++;
            }
        }
        org.junit.jupiter.api.Assertions.assertEquals(1, acceptedEvents);
    }

    @Test
    @DirtiesContext(methodMode = DirtiesContext.MethodMode.BEFORE_METHOD)
    void noAgentFallback_visibleInAdminQueue_andMetrics() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.dispatch.noagent@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "No Agent Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "No Agent Meal", "199.00");

        String customerToken = registerAndGetAccessToken("customer.order.dispatch.noagent@example.com", Role.CUSTOMER);
        String adminToken = registerAndGetAccessToken("admin.order.dispatch.noagent@example.com", Role.ADMIN);

        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();
        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-no-agent-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        boolean queued = false;
        for (int i = 0; i < 10; i++) {
            MvcResult queueResult = mockMvc.perform(get("/api/v1/dispatch/admin/no-agent-queue")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode queue = objectMapper.readTree(queueResult.getResponse().getContentAsString());
            if (queue.isArray() && queue.size() > 0 && orderId.equals(queue.get(0).get("orderId").asLong())) {
                queued = true;
                break;
            }
            Thread.sleep(250L);
        }
        org.junit.jupiter.api.Assertions.assertTrue(queued);

        mockMvc.perform(get("/api/v1/dispatch/admin/metrics")
                        .param("sinceMinutes", "120")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noAgentCount").isNumber());
    }

    @Test
    @DirtiesContext(methodMode = DirtiesContext.MethodMode.BEFORE_METHOD)
    void dispatchTimeline_includesPickupAndDeliveredEvents() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.order.dispatch.timeline@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Timeline Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Timeline Meal", "199.00");

        String customerToken = registerAndGetAccessToken("customer.order.dispatch.timeline@example.com", Role.CUSTOMER);
        String deliveryToken = registerAndGetAccessToken("delivery.order.dispatch.timeline@example.com", Role.DELIVERY_AGENT);
        String adminToken = registerAndGetAccessToken("admin.order.dispatch.timeline@example.com", Role.ADMIN);

        addDefaultAddress(customerToken, "18.5310", "73.8470");
        addCartItem(customerToken, menuItemId, 1);

        mockMvc.perform(post("/api/v1/dispatch/agent/availability")
                        .header("Authorization", "Bearer " + deliveryToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("online", true, "available", true, "latitude", 18.5310, "longitude", 73.8470))))
                .andExpect(status().isOk());

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isCreated())
                .andReturn();
        Long orderId = objectMapper.readTree(orderResult.getResponse().getContentAsString()).get("orderId").asLong();

        mockMvc.perform(post("/api/v1/orders/{orderId}/payment/simulate-success", orderId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idempotencyKey", "idem-timeline-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(post("/api/v1/dispatch/orders/{orderId}/accept", orderId)
                        .header("Authorization", "Bearer " + deliveryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(post("/api/v1/orders/owner/{orderId}/accept", orderId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED_BY_RESTAURANT"));

        mockMvc.perform(post("/api/v1/orders/owner/{orderId}/preparing", orderId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/orders/owner/{orderId}/ready-for-pickup", orderId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/orders/delivery/{orderId}/pickup", orderId)
                        .header("Authorization", "Bearer " + deliveryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OUT_FOR_DELIVERY"));

        mockMvc.perform(post("/api/v1/orders/delivery/{orderId}/delivered", orderId)
                        .header("Authorization", "Bearer " + deliveryToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));

        mockMvc.perform(get("/api/v1/dispatch/admin/orders/{orderId}/timeline", orderId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].status").value(org.hamcrest.Matchers.hasItems(
                        "OFFERED", "ACCEPTED", "PICKED_UP", "DELIVERED"
                )));
    }

    private String registerAndGetAccessToken(String email, Role role) throws Exception {
        RegisterRequest request = new RegisterRequest(email, "TestPass123", "Order Test User", role);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        markUserAsVerifiedForTests(email, role);
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private void markUserAsVerifiedForTests(String email, Role role) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("Registered test user not found: " + email));
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        if (Role.RESTAURANT_OWNER.equals(role) || Role.DELIVERY_AGENT.equals(role)) {
            user.setApprovalStatus(ApprovalStatus.APPROVED);
        }
        userRepository.save(user);

        if (Role.DELIVERY_AGENT.equals(role)) {
            DeliveryAgentProfile profile = deliveryAgentProfileRepository.findByUserId(user.getId())
                    .orElseGet(() -> {
                        DeliveryAgentProfile created = new DeliveryAgentProfile();
                        created.setUser(user);
                        return created;
                    });
            profile.setVerified(true);
            deliveryAgentProfileRepository.save(profile);
        }
    }

    private Long createRestaurant(String ownerToken, String name, String latitude, String longitude) throws Exception {
        MockMultipartFile restaurantImage = new MockMultipartFile(
                "image",
                "restaurant.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-restaurant-image".getBytes(StandardCharsets.UTF_8)
        );

        MvcResult restaurantResult = mockMvc.perform(multipart("/api/v1/restaurants/me")
                        .file(restaurantImage)
                        .param("name", name)
                        .param("description", "Restaurant for order tests")
                        .param("addressLine", "MG Road")
                        .param("city", "Pune")
                        .param("latitude", latitude)
                        .param("longitude", longitude)
                        .param("openNow", "true")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode restaurantJson = objectMapper.readTree(restaurantResult.getResponse().getContentAsString());
        Long restaurantId = restaurantJson.get("id").asLong();
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new IllegalStateException("Created restaurant not found: " + restaurantId));
        restaurant.setActive(true);
        restaurantRepository.save(restaurant);
        return restaurantId;
    }

    private Long createMenuItem(String ownerToken, Long restaurantId, String name, String price) throws Exception {
        MockMultipartFile menuImage = new MockMultipartFile(
                "image",
                "menu.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-menu-image".getBytes(StandardCharsets.UTF_8)
        );

        MvcResult menuResult = mockMvc.perform(multipart("/api/v1/restaurants/me/{restaurantId}/menu", restaurantId)
                        .file(menuImage)
                        .param("name", name)
                        .param("description", "Menu item for order tests")
                        .param("price", price)
                        .param("veg", "true")
                        .param("available", "true")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(menuResult.getResponse().getContentAsString()).get("id").asLong();
    }

    private void addDefaultAddress(String customerToken, String latitude, String longitude) throws Exception {
        mockMvc.perform(post("/api/v1/users/me/addresses")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "label", "Home",
                                "line1", "Street 1",
                                "city", "Pune",
                                "state", "MH",
                                "pincode", "411001",
                                "latitude", Double.parseDouble(latitude),
                                "longitude", Double.parseDouble(longitude),
                                "contactName", "Order Customer",
                                "contactPhone", "9998882222",
                                "isDefault", true
                        ))))
                .andExpect(status().isCreated());
    }

    private void addCartItem(String customerToken, Long menuItemId, int quantity) throws Exception {
        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", quantity
                        ))))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions performRefund(
            String adminToken,
            Long orderId,
            double amount,
            String idempotencyKey,
            String reason,
            String imageName
    ) throws Exception {
        MockMultipartFile evidence = new MockMultipartFile(
                "evidenceImage",
                imageName,
                MediaType.IMAGE_JPEG_VALUE,
                ("evidence-" + idempotencyKey).getBytes(StandardCharsets.UTF_8)
        );

        return mockMvc.perform(multipart("/api/v1/orders/admin/{orderId}/payment/refund", orderId)
                .file(evidence)
                .param("amount", String.format(java.util.Locale.ROOT, "%.2f", amount))
                .param("idempotencyKey", idempotencyKey)
                .param("reason", reason)
                .header("Authorization", "Bearer " + adminToken));
    }

    private void ensureActivePricingRule() {
        if (pricingRuleRepository.findTopByActiveTrueOrderByVersionDesc().isPresent()) {
            return;
        }

        PricingRule rule = new PricingRule();
        rule.setVersion("v1");
        rule.setActive(true);
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
        pricingRuleRepository.save(rule);
    }
}


