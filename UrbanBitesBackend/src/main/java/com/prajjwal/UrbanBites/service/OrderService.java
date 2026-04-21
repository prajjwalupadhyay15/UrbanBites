package com.prajjwal.UrbanBites.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.config.RazorpayProperties;
import com.prajjwal.UrbanBites.dto.request.PlaceOrderRequest;
import com.prajjwal.UrbanBites.dto.response.PaymentIntentResponse;
import com.prajjwal.UrbanBites.dto.response.FeeBreakupResponse;
import com.prajjwal.UrbanBites.dto.response.OwnerFinanceSummaryResponse;
import com.prajjwal.UrbanBites.dto.response.OwnerPaymentTransactionResponse;
import com.prajjwal.UrbanBites.dto.response.OrderItemResponse;
import com.prajjwal.UrbanBites.dto.response.OrderResponse;
import com.prajjwal.UrbanBites.dto.response.PaymentResponse;
import com.prajjwal.UrbanBites.dto.response.CartResponse;
import com.prajjwal.UrbanBites.entity.Address;
import com.prajjwal.UrbanBites.entity.Cart;
import com.prajjwal.UrbanBites.entity.CartItem;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.OrderItem;
import com.prajjwal.UrbanBites.entity.Payment;
import com.prajjwal.UrbanBites.entity.PricingRule;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.NotificationType;
import com.prajjwal.UrbanBites.enums.CartState;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.PaymentStatus;
import com.prajjwal.UrbanBites.enums.TransitionActor;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.AddressRepository;
import com.prajjwal.UrbanBites.repository.CartItemRepository;
import com.prajjwal.UrbanBites.repository.CartRepository;
import com.prajjwal.UrbanBites.repository.OrderItemRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.PaymentRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleRepository;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class OrderService {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final AddressRepository addressRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final RestaurantRepository restaurantRepository;
    private final PricingEngineService pricingEngineService;
    private final OrderStateTransitionService orderStateTransitionService;
    private final PaymentGatewayClient paymentGatewayClient;
    private final RazorpayProperties razorpayProperties;
    private final ObjectMapper objectMapper;
    private final ImageStorageService imageStorageService;
    private final DispatchService dispatchService;
    private final NotificationService notificationService;
    private final RealtimePublisher realtimePublisher;
    private final GeocodingService geocodingService;

    public OrderService(
            UserRepository userRepository,
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            AddressRepository addressRepository,
            PricingRuleRepository pricingRuleRepository,
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            PaymentRepository paymentRepository,
            RestaurantRepository restaurantRepository,
            PricingEngineService pricingEngineService,
            OrderStateTransitionService orderStateTransitionService,
            PaymentGatewayClient paymentGatewayClient,
            RazorpayProperties razorpayProperties,
            ObjectMapper objectMapper,
            ImageStorageService imageStorageService,
            DispatchService dispatchService,
            NotificationService notificationService,
            RealtimePublisher realtimePublisher,
            GeocodingService geocodingService
    ) {
        this.userRepository = userRepository;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.addressRepository = addressRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
        this.restaurantRepository = restaurantRepository;
        this.pricingEngineService = pricingEngineService;
        this.orderStateTransitionService = orderStateTransitionService;
        this.paymentGatewayClient = paymentGatewayClient;
        this.razorpayProperties = razorpayProperties;
        this.objectMapper = objectMapper;
        this.imageStorageService = imageStorageService;
        this.dispatchService = dispatchService;
        this.notificationService = notificationService;
        this.realtimePublisher = realtimePublisher;
        this.geocodingService = geocodingService;
    }

    @Transactional
    public OrderResponse placeOrder(String currentEmail) {
        return placeOrder(currentEmail, null);
    }

    @Transactional
    public OrderResponse placeOrder(String currentEmail, PlaceOrderRequest request) {
        User user = getUserByEmail(currentEmail);

        Cart cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty"));

        List<CartItem> cartItems = cartItemRepository.findByCartIdOrderByIdDesc(cart.getId());
        if (cartItems.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        Address selectedAddress = resolveAddressForOrder(user.getId(), request == null ? null : request.addressId());
        GeocodingService.Coordinates orderCoordinates = ensureCoordinates(selectedAddress);

        PricingRule rule = pricingRuleRepository.findTopByActiveTrueOrderByVersionDesc()
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No active pricing rule"));

        BigDecimal subtotal = cartItems.stream()
                .map(item -> item.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal itemLevelPackingTotal = cartItems.stream()
                .map(item -> item.getItemPackingFeeSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal deliveryDistanceKm = haversineKm(
                orderCoordinates.latitude(),
                orderCoordinates.longitude(),
                cart.getRestaurant().getLatitude(),
                cart.getRestaurant().getLongitude()
        );

        FeeBreakupResponse fees = pricingEngineService.preview(
                rule,
                subtotal,
                itemLevelPackingTotal,
                deliveryDistanceKm,
                false,
                false
        );

        Order order = new Order();
        order.setUser(user);
        order.setRestaurant(cart.getRestaurant());
        order.setStatus(OrderStatus.CREATED);
        order.setPricingRuleVersion(rule.getVersion());
        order.setDeliveryContactName(resolveRecipientName(request, selectedAddress));
        order.setDeliveryContactPhone(resolveRecipientPhone(request, selectedAddress));
        order.setDeliveryAddressLine1(selectedAddress.getLine1());
        order.setDeliveryAddressLine2(selectedAddress.getLine2());
        order.setDeliveryCity(selectedAddress.getCity());
        order.setDeliveryState(selectedAddress.getState());
        order.setDeliveryPincode(selectedAddress.getPincode());
        order.setDeliveryLatitude(orderCoordinates.latitude());
        order.setDeliveryLongitude(orderCoordinates.longitude());
        order.setDeliveryDistanceKm(fees.distanceKm());
        order.setTotalItems(cartItems.stream().mapToInt(CartItem::getQuantity).sum());
        order.setSubtotal(fees.subtotal());
        order.setDeliveryFee(fees.deliveryFee());
        order.setPackingCharge(fees.packingCharge());
        order.setPlatformFee(fees.platformFee());
        order.setTaxTotal(fees.tax());
        order.setDiscountTotal(fees.discount());
        order.setGrandTotal(fees.grandTotal());

        Order savedOrder = orderRepository.save(order);

        List<OrderItem> orderItems = cartItems.stream().map(item -> {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(savedOrder);
            orderItem.setMenuItemId(item.getMenuItem().getId());
            orderItem.setItemName(item.getMenuItem().getName());
            orderItem.setQuantity(item.getQuantity());
            orderItem.setUnitPriceSnapshot(item.getUnitPriceSnapshot().setScale(2, RoundingMode.HALF_UP));
            orderItem.setLineTotal(item.getUnitPriceSnapshot()
                    .multiply(BigDecimal.valueOf(item.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP));
            orderItem.setNotes(item.getNotes());
            orderItem.setVeg(item.getMenuItem().isVeg());
            return orderItem;
        }).toList();
        orderItemRepository.saveAll(orderItems);

        Payment payment = new Payment();
        payment.setOrder(savedOrder);
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setAmount(savedOrder.getGrandTotal());
        payment.setCurrency("INR");
        payment.setIdempotencyKey("init-" + UUID.randomUUID());
        payment.setRefundedAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        paymentRepository.save(payment);

        orderStateTransitionService.assertOrderTransition(OrderStatus.CREATED, OrderStatus.PENDING_PAYMENT, TransitionActor.SYSTEM);
        savedOrder.setStatus(OrderStatus.PENDING_PAYMENT);
        orderRepository.save(savedOrder);

        cartItemRepository.deleteByCartId(cart.getId());
        cart.setState(CartState.CHECKED_OUT);
        cartRepository.save(cart);
        realtimePublisher.publishUserCart(
                user.getId(),
                cart.getId(),
                "CART_CHECKED_OUT",
                new CartResponse(null, null, null, 0, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), List.of())
        );

        OrderResponse response = toOrderResponse(savedOrder, orderItems, payment);
        publishOrderRealtime(response, "ORDER_PENDING_PAYMENT");
        return response;
    }

    private Address resolveAddressForOrder(Long userId, Long requestedAddressId) {
        if (requestedAddressId != null) {
            return addressRepository.findByIdAndUserId(requestedAddressId, userId)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected address not found"));
        }
        return addressRepository.findTopByUserIdAndIsDefaultTrue(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Default address not found"));
    }

    private GeocodingService.Coordinates ensureCoordinates(Address address) {
        if (address.getLatitude() != null && address.getLongitude() != null) {
            return new GeocodingService.Coordinates(address.getLatitude(), address.getLongitude());
        }

        GeocodingService.Coordinates resolved = geocodingService.geocodeAddress(
                address.getLine1(),
                address.getLine2(),
                address.getCity(),
                address.getState(),
                address.getPincode()
        );

        address.setLatitude(resolved.latitude());
        address.setLongitude(resolved.longitude());
        addressRepository.save(address);
        return resolved;
    }

    private String resolveRecipientName(PlaceOrderRequest request, Address selectedAddress) {
        if (request == null || request.recipientName() == null) {
            return selectedAddress.getContactName();
        }
        return request.recipientName().trim();
    }

    private String resolveRecipientPhone(PlaceOrderRequest request, Address selectedAddress) {
        if (request == null || request.recipientPhone() == null) {
            return selectedAddress.getContactPhone();
        }
        return request.recipientPhone().trim();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listMyOrders(String currentEmail) {
        User user = getUserByEmail(currentEmail);
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getMyOrder(String currentEmail, Long orderId) {
        User user = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        return toOrderResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listOwnerOrders(String currentEmail) {
        User owner = getUserByEmail(currentEmail);
        return orderRepository.findByRestaurantOwnerIdOrderByCreatedAtDesc(owner.getId())
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listRestaurantOrders(String currentEmail, Long restaurantId) {
        assertOwnedRestaurant(currentEmail, restaurantId);
        return orderRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId)
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OwnerFinanceSummaryResponse ownerFinanceSummary(String currentEmail) {
        User owner = getUserByEmail(currentEmail);
        List<Order> ownerOrders = orderRepository.findByRestaurantOwnerIdOrderByCreatedAtDesc(owner.getId());
        Map<Long, Payment> paymentsByOrderId = paymentsByOrderId(ownerOrders);

        long successfulPayments = 0;
        long pendingPayments = 0;
        long failedPayments = 0;
        BigDecimal totalCapturedAmount = BigDecimal.ZERO;
        BigDecimal totalRefundedAmount = BigDecimal.ZERO;

        for (Order order : ownerOrders) {
            Payment payment = paymentsByOrderId.get(order.getId());
            if (payment == null) {
                continue;
            }

            if (isSuccessfulPayment(payment.getStatus())) {
                successfulPayments++;
                totalCapturedAmount = totalCapturedAmount.add(scaleMoney(payment.getAmount()));
                totalRefundedAmount = totalRefundedAmount.add(scaleMoney(payment.getRefundedAmount()));
            } else if (PaymentStatus.INITIATED.equals(payment.getStatus()) || PaymentStatus.AUTHORIZED.equals(payment.getStatus())) {
                pendingPayments++;
            } else if (PaymentStatus.FAILED.equals(payment.getStatus())) {
                failedPayments++;
            }
        }

        BigDecimal netRevenueAmount = totalCapturedAmount.subtract(totalRefundedAmount).setScale(2, RoundingMode.HALF_UP);

        return new OwnerFinanceSummaryResponse(
                ownerOrders.size(),
                successfulPayments,
                pendingPayments,
                failedPayments,
                totalCapturedAmount.setScale(2, RoundingMode.HALF_UP),
                totalRefundedAmount.setScale(2, RoundingMode.HALF_UP),
                netRevenueAmount
        );
    }

    @Transactional(readOnly = true)
    public List<OwnerPaymentTransactionResponse> ownerFinanceTransactions(String currentEmail) {
        User owner = getUserByEmail(currentEmail);
        List<Order> ownerOrders = orderRepository.findByRestaurantOwnerIdOrderByCreatedAtDesc(owner.getId());
        Map<Long, Payment> paymentsByOrderId = paymentsByOrderId(ownerOrders);

        return ownerOrders.stream()
                .map(order -> {
                    Payment payment = paymentsByOrderId.get(order.getId());
                    if (payment == null) {
                        return null;
                    }

                    BigDecimal amount = scaleMoney(payment.getAmount());
                    BigDecimal refundedAmount = scaleMoney(payment.getRefundedAmount());
                    BigDecimal netAmount = amount.subtract(refundedAmount).setScale(2, RoundingMode.HALF_UP);

                    return new OwnerPaymentTransactionResponse(
                            order.getId(),
                            order.getRestaurant().getId(),
                            order.getRestaurant().getName(),
                            order.getStatus(),
                            payment.getStatus(),
                            amount,
                            refundedAmount,
                            netAmount,
                            payment.getCurrency(),
                            payment.getProviderPaymentId(),
                            order.getCreatedAt()
                    );
                })
                .filter(transaction -> transaction != null)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listAllOrdersForAdmin() {
        return orderRepository.findAll().stream().map(this::toOrderResponse).toList();
    }

    @Transactional
    public OrderResponse simulatePaymentSuccess(String currentEmail, Long orderId, String idempotencyKey) {
        User user = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));

        String normalizedKey = idempotencyKey.trim();
        if (PaymentStatus.CAPTURED.equals(payment.getStatus()) && normalizedKey.equals(payment.getIdempotencyKey())) {
            return toOrderResponse(order, orderItemRepository.findByOrderIdOrderByIdAsc(order.getId()), payment);
        }

        if (!OrderStatus.PENDING_PAYMENT.equals(order.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order is not awaiting payment");
        }

        orderStateTransitionService.assertPaymentTransition(payment.getStatus(), PaymentStatus.CAPTURED);
        payment.setStatus(PaymentStatus.CAPTURED);
        payment.setIdempotencyKey(normalizedKey);
        payment.setProviderReference("SIM-" + normalizedKey);
        paymentRepository.save(payment);

        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.CONFIRMED, TransitionActor.SYSTEM);
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
        publishOrderNotification(
                order,
                NotificationType.PAYMENT_SUCCESS,
                "Payment successful",
                "We received your payment for order #" + order.getId() + ".",
                "Order #" + order.getId(),
                true,
                "payment:captured:order:" + order.getId()
        );
        publishOrderNotification(
                order,
                NotificationType.ORDER_CONFIRMED,
                "Order confirmed",
                "Your order #" + order.getId() + " is confirmed and will be prepared soon.",
                "Order #" + order.getId(),
                true,
                "order:confirmed:order:" + order.getId()
        );
        publishOwnerActionRequiredNotification(order, "order:owner:action-required:order:" + order.getId());
        dispatchService.triggerDispatchForOrder(order.getId());

        OrderResponse response = toOrderResponse(order, orderItemRepository.findByOrderIdOrderByIdAsc(order.getId()), payment);
        publishOrderRealtime(response, "ORDER_CONFIRMED");
        if (order.getRestaurant() != null && order.getRestaurant().getOwner() != null) {
            realtimePublisher.publishOwnerOrder(order.getRestaurant().getOwner().getId(), "NEW_ORDER", response);
        }
        return response;
    }

    @Transactional
    public OrderResponse simulatePaymentFailure(String currentEmail, Long orderId, String idempotencyKey) {
        User user = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));

        String normalizedKey = idempotencyKey.trim();
        if (PaymentStatus.FAILED.equals(payment.getStatus()) && normalizedKey.equals(payment.getIdempotencyKey())) {
            return toOrderResponse(order, orderItemRepository.findByOrderIdOrderByIdAsc(order.getId()), payment);
        }

        if (!OrderStatus.PENDING_PAYMENT.equals(order.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order is not awaiting payment");
        }

        orderStateTransitionService.assertPaymentTransition(payment.getStatus(), PaymentStatus.FAILED);
        payment.setStatus(PaymentStatus.FAILED);
        payment.setIdempotencyKey(normalizedKey);
        payment.setProviderReference("SIM-FAIL-" + normalizedKey);
        paymentRepository.save(payment);

        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.CANCELLED, TransitionActor.SYSTEM);
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        publishOrderNotification(
                order,
                NotificationType.PAYMENT_FAILURE,
                "Payment failed",
                "Payment failed for order #" + order.getId() + ". Please try again.",
                "Order #" + order.getId(),
                true,
                "payment:failed:order:" + order.getId()
        );
        publishOrderNotification(
                order,
                NotificationType.ORDER_CANCELLED,
                "Order cancelled",
                "Order #" + order.getId() + " was cancelled because payment did not complete.",
                "Order #" + order.getId(),
                true,
                "order:cancelled:order:" + order.getId() + ":payment"
        );

        OrderResponse response = toOrderResponse(order, orderItemRepository.findByOrderIdOrderByIdAsc(order.getId()), payment);
        publishOrderRealtime(response, "ORDER_CANCELLED");
        return response;
    }

    @Transactional
    public PaymentIntentResponse createPaymentIntent(String currentEmail, Long orderId, String idempotencyKey) {
        User user = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!OrderStatus.PENDING_PAYMENT.equals(order.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order is not awaiting payment");
        }

        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));

        String normalizedKey = idempotencyKey.trim();
        if (normalizedKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "idempotencyKey cannot be blank");
        }

        if (payment.getProviderOrderId() != null && normalizedKey.equals(payment.getIdempotencyKey())) {
            return toPaymentIntentResponse(order, payment);
        }

        PaymentGatewayClient.GatewayOrder gatewayOrder = paymentGatewayClient.createOrder(
                "order-" + order.getId(),
                payment.getAmount(),
                payment.getCurrency(),
                normalizedKey
        );

        payment.setProviderOrderId(gatewayOrder.orderId());
        payment.setProviderReference(gatewayOrder.orderId());
        payment.setIdempotencyKey(normalizedKey);
        paymentRepository.save(payment);

        return toPaymentIntentResponse(order, payment);
    }

    @Transactional
    public String handleRazorpayWebhook(String payload, String signature) {
        if (!paymentGatewayClient.verifyWebhookSignature(payload, signature)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Razorpay webhook signature");
        }

        JsonNode root = parseWebhookPayload(payload);
        String eventId = readText(root, "id");
        String event = readText(root, "event").toLowerCase(Locale.ROOT);

        if (eventId == null || eventId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Missing webhook event id");
        }

        switch (event) {
            case "payment.authorized" -> {
                String providerPaymentId = readText(root, "payload", "payment", "entity", "id");
                String providerOrderId = readText(root, "payload", "payment", "entity", "order_id");
                Payment payment = getPaymentByProviderRefs(providerOrderId, providerPaymentId);

                if (eventId.equals(payment.getLastWebhookEventId())) {
                    return "duplicate";
                }

                orderStateTransitionService.assertPaymentTransition(payment.getStatus(), PaymentStatus.AUTHORIZED);
                payment.setStatus(PaymentStatus.AUTHORIZED);
                payment.setProviderPaymentId(providerPaymentId);
                payment.setLastWebhookEventId(eventId);
                paymentRepository.save(payment);
                return "processed";
            }
            case "payment.captured" -> {
                String providerPaymentId = readText(root, "payload", "payment", "entity", "id");
                String providerOrderId = readText(root, "payload", "payment", "entity", "order_id");
                Payment payment = getPaymentByProviderRefs(providerOrderId, providerPaymentId);

                if (eventId.equals(payment.getLastWebhookEventId())) {
                    return "duplicate";
                }

                if (!PaymentStatus.CAPTURED.equals(payment.getStatus())) {
                    orderStateTransitionService.assertPaymentTransition(payment.getStatus(), PaymentStatus.CAPTURED);
                    payment.setStatus(PaymentStatus.CAPTURED);
                }
                payment.setProviderPaymentId(providerPaymentId);
                payment.setProviderReference(providerPaymentId);
                payment.setLastWebhookEventId(eventId);
                paymentRepository.save(payment);

                Order order = payment.getOrder();
                if (OrderStatus.PENDING_PAYMENT.equals(order.getStatus())) {
                    orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.CONFIRMED, TransitionActor.SYSTEM);
                    order.setStatus(OrderStatus.CONFIRMED);
                    orderRepository.save(order);
                    publishOrderNotification(
                            order,
                            NotificationType.PAYMENT_SUCCESS,
                            "Payment successful",
                            "We received your payment for order #" + order.getId() + ".",
                            "Order #" + order.getId(),
                            true,
                            "payment:webhook:captured:order:" + order.getId()
                    );
                    publishOrderNotification(
                            order,
                            NotificationType.ORDER_CONFIRMED,
                            "Order confirmed",
                            "Your order #" + order.getId() + " is confirmed and will be prepared soon.",
                            "Order #" + order.getId(),
                            true,
                            "order:webhook:confirmed:order:" + order.getId()
                    );
                    publishOwnerActionRequiredNotification(order, "order:webhook:owner:action-required:order:" + order.getId());
                    dispatchService.triggerDispatchForOrder(order.getId());
                    OrderResponse response = toOrderResponse(order);
                    publishOrderRealtime(response, "ORDER_CONFIRMED");
                    if (order.getRestaurant() != null && order.getRestaurant().getOwner() != null) {
                        realtimePublisher.publishOwnerOrder(order.getRestaurant().getOwner().getId(), "NEW_ORDER", response);
                    }
                }
                return "processed";
            }
            case "payment.failed" -> {
                String providerPaymentId = readText(root, "payload", "payment", "entity", "id");
                String providerOrderId = readText(root, "payload", "payment", "entity", "order_id");
                Payment payment = getPaymentByProviderRefs(providerOrderId, providerPaymentId);

                if (eventId.equals(payment.getLastWebhookEventId())) {
                    return "duplicate";
                }

                if (!PaymentStatus.FAILED.equals(payment.getStatus())) {
                    orderStateTransitionService.assertPaymentTransition(payment.getStatus(), PaymentStatus.FAILED);
                    payment.setStatus(PaymentStatus.FAILED);
                }
                payment.setProviderPaymentId(providerPaymentId);
                payment.setProviderReference(providerPaymentId);
                payment.setLastWebhookEventId(eventId);
                paymentRepository.save(payment);

                Order order = payment.getOrder();
                if (OrderStatus.PENDING_PAYMENT.equals(order.getStatus())) {
                    orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.CANCELLED, TransitionActor.SYSTEM);
                    order.setStatus(OrderStatus.CANCELLED);
                    orderRepository.save(order);
                    publishOrderNotification(
                            order,
                            NotificationType.PAYMENT_FAILURE,
                            "Payment failed",
                            "Payment failed for order #" + order.getId() + ". Please try again.",
                            "Order #" + order.getId(),
                            true,
                            "payment:webhook:failed:order:" + order.getId()
                    );
                    publishOrderNotification(
                            order,
                            NotificationType.ORDER_CANCELLED,
                            "Order cancelled",
                            "Order #" + order.getId() + " was cancelled because payment did not complete.",
                            "Order #" + order.getId(),
                            true,
                            "order:webhook:cancelled:order:" + order.getId()
                    );
                    publishOrderRealtime(toOrderResponse(order), "ORDER_CANCELLED");
                }
                return "processed";
            }
            case "refund.processed" -> {
                String providerPaymentId = readText(root, "payload", "refund", "entity", "payment_id");
                long refundSubunits = readLong(root, "payload", "refund", "entity", "amount");
                BigDecimal refundAmount = BigDecimal.valueOf(refundSubunits)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

                Payment payment = paymentRepository.findByProviderPaymentId(providerPaymentId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found for provider payment id"));

                if (eventId.equals(payment.getLastWebhookEventId())) {
                    return "duplicate";
                }

                BigDecimal existing = payment.getRefundedAmount() == null ? BigDecimal.ZERO : payment.getRefundedAmount();
                BigDecimal cumulative = existing.add(refundAmount).setScale(2, RoundingMode.HALF_UP);
                payment.setRefundedAmount(cumulative);
                payment.setStatus(cumulative.compareTo(payment.getAmount().setScale(2, RoundingMode.HALF_UP)) >= 0
                        ? PaymentStatus.REFUNDED_FULL
                        : PaymentStatus.REFUNDED_PARTIAL);
                payment.setLastWebhookEventId(eventId);
                paymentRepository.save(payment);
                publishOrderNotification(
                        payment.getOrder(),
                        NotificationType.REFUND_PROCESSED,
                        "Refund processed",
                        "Refund of INR " + refundAmount + " has been processed for order #" + payment.getOrder().getId() + ".",
                        "Order #" + payment.getOrder().getId(),
                        true,
                        "payment:webhook:refund:order:" + payment.getOrder().getId() + ":" + eventId
                );
                return "processed";
            }
            default -> {
                return "ignored";
            }
        }
    }

    @Transactional
    public OrderResponse refundCapturedPayment(Long orderId, BigDecimal refundAmount, String idempotencyKey, String reason, MultipartFile evidenceImage) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "idempotencyKey is required");
        }

        String normalizedKey = idempotencyKey.trim();
        if (normalizedKey.equals(payment.getIdempotencyKey())) {
            return toOrderResponse(order);
        }

        if (reason == null || reason.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Refund reason is required");
        }

        String normalizedReason = reason.trim();
        if (normalizedReason.length() > 255) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Refund reason must be at most 255 characters");
        }

        String existingEvidenceImagePath = payment.getRefundEvidenceImagePath();
        String evidenceImagePath = imageStorageService.saveRefundEvidenceImage(evidenceImage);

        if (!PaymentStatus.CAPTURED.equals(payment.getStatus()) && !PaymentStatus.REFUNDED_PARTIAL.equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only captured payments can be refunded");
        }

        if (payment.getProviderPaymentId() == null || payment.getProviderPaymentId().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Provider payment id is missing");
        }

        BigDecimal normalizedAmount = refundAmount.setScale(2, RoundingMode.HALF_UP);
        BigDecimal existingRefund = payment.getRefundedAmount() == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : payment.getRefundedAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal refundable = payment.getAmount().setScale(2, RoundingMode.HALF_UP).subtract(existingRefund);

        if (normalizedAmount.compareTo(BigDecimal.ZERO) <= 0 || normalizedAmount.compareTo(refundable) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Refund amount exceeds refundable balance");
        }

        paymentGatewayClient.createRefund(
                payment.getProviderPaymentId(),
                normalizedAmount,
                "refund-order-" + order.getId(),
                normalizedReason
        );

        BigDecimal updatedRefund = existingRefund.add(normalizedAmount).setScale(2, RoundingMode.HALF_UP);
        PaymentStatus targetStatus = updatedRefund.compareTo(payment.getAmount().setScale(2, RoundingMode.HALF_UP)) >= 0
                ? PaymentStatus.REFUNDED_FULL
                : PaymentStatus.REFUNDED_PARTIAL;

        orderStateTransitionService.assertPaymentTransition(payment.getStatus(), targetStatus);
        payment.setRefundedAmount(updatedRefund);
        payment.setStatus(targetStatus);
        payment.setIdempotencyKey(normalizedKey);
        payment.setRefundReason(normalizedReason);
        payment.setRefundEvidenceImagePath(evidenceImagePath);
        paymentRepository.save(payment);
        if (existingEvidenceImagePath != null && !existingEvidenceImagePath.equals(evidenceImagePath)) {
            imageStorageService.deleteImage(existingEvidenceImagePath);
        }
        publishOrderNotification(
                order,
                NotificationType.REFUND_PROCESSED,
                "Refund processed",
                "Refund of INR " + normalizedAmount + " has been initiated for order #" + order.getId() + ".",
                "Order #" + order.getId(),
                true,
                "payment:refund:order:" + order.getId() + ":" + normalizedKey
        );

        return toOrderResponse(order);
    }

    @Transactional
    public OrderResponse cancelMyOrder(String currentEmail, Long orderId) {
        User user = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        return cancelOrder(order, TransitionActor.CUSTOMER);
    }

    @Transactional
    public OrderResponse cancelOwnerOrder(String currentEmail, Long orderId) {
        User owner = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndRestaurantOwnerId(orderId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        return cancelOrder(order, TransitionActor.RESTAURANT_OWNER);
    }

    @Transactional
    public OrderResponse cancelAdminOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        return cancelOrder(order, TransitionActor.ADMIN);
    }

    @Transactional
    public OrderResponse markPreparing(String currentEmail, Long orderId) {
        User owner = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndRestaurantOwnerId(orderId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.PREPARING, TransitionActor.RESTAURANT_OWNER);
        order.setStatus(OrderStatus.PREPARING);
        orderRepository.save(order);
        publishOrderNotification(
                order,
                NotificationType.ORDER_PREPARING,
                "Order is being prepared",
                "Restaurant has started preparing order #" + order.getId() + ".",
                "Order #" + order.getId(),
                true,
                "order:preparing:order:" + order.getId()
        );
        OrderResponse response = toOrderResponse(order);
        publishOrderRealtime(response, "ORDER_PREPARING");
        return response;
    }

    @Transactional
    public OrderResponse markAcceptedByRestaurant(String currentEmail, Long orderId) {
        User owner = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndRestaurantOwnerId(orderId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.ACCEPTED_BY_RESTAURANT, TransitionActor.RESTAURANT_OWNER);
        order.setStatus(OrderStatus.ACCEPTED_BY_RESTAURANT);
        orderRepository.save(order);
        publishOrderNotification(
                order,
                NotificationType.ORDER_ACCEPTED_BY_RESTAURANT,
                "Restaurant accepted your order",
                "Restaurant accepted order #" + order.getId() + " and will start preparing it shortly.",
                "Order #" + order.getId(),
                true,
                "order:accepted-by-restaurant:order:" + order.getId()
        );
        OrderResponse response = toOrderResponse(order);
        publishOrderRealtime(response, "ORDER_ACCEPTED_BY_RESTAURANT");
        return response;
    }

    @Transactional
    public OrderResponse markReadyForPickup(String currentEmail, Long orderId) {
        User owner = getUserByEmail(currentEmail);
        Order order = orderRepository.findByIdAndRestaurantOwnerId(orderId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.READY_FOR_PICKUP, TransitionActor.RESTAURANT_OWNER);
        order.setStatus(OrderStatus.READY_FOR_PICKUP);
        orderRepository.save(order);
        publishOrderNotification(
                order,
                NotificationType.ORDER_READY_FOR_PICKUP,
                "Order ready for pickup",
                "Order #" + order.getId() + " is packed and ready for pickup.",
                "Order #" + order.getId(),
                true,
                "order:ready-for-pickup:order:" + order.getId()
        );
        OrderResponse response = toOrderResponse(order);
        publishOrderRealtime(response, "ORDER_READY_FOR_PICKUP");
        return response;
    }

    @Transactional
    public OrderResponse markOutForDelivery(String currentEmail, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        dispatchService.markPickedUp(currentEmail, orderId);

        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.OUT_FOR_DELIVERY, TransitionActor.DELIVERY_AGENT);
        order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
        orderRepository.save(order);
        publishOrderNotification(
                order,
                NotificationType.ORDER_OUT_FOR_DELIVERY,
                "Order out for delivery",
                "Order #" + order.getId() + " is on the way.",
                "Order #" + order.getId(),
                true,
                "order:out-for-delivery:order:" + order.getId()
        );
        OrderResponse response = toOrderResponse(order);
        publishOrderRealtime(response, "ORDER_OUT_FOR_DELIVERY");
        return response;
    }

    @Transactional
    public OrderResponse markDelivered(String currentEmail, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        dispatchService.markDelivered(currentEmail, orderId);

        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.DELIVERED, TransitionActor.DELIVERY_AGENT);
        order.setStatus(OrderStatus.DELIVERED);
        orderRepository.save(order);
        publishOrderNotification(
                order,
                NotificationType.ORDER_DELIVERED,
                "Order delivered",
                "Order #" + order.getId() + " was delivered successfully.",
                "Order #" + order.getId(),
                true,
                "order:delivered:order:" + order.getId()
        );
        OrderResponse response = toOrderResponse(order);
        publishOrderRealtime(response, "ORDER_DELIVERED");
        return response;
    }

    private OrderResponse cancelOrder(Order order, TransitionActor actor) {
        orderStateTransitionService.assertOrderTransition(order.getStatus(), OrderStatus.CANCELLED, actor);

        paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
            if (PaymentStatus.CAPTURED.equals(payment.getStatus())) {
                if (payment.getProviderPaymentId() == null || payment.getProviderPaymentId().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Provider payment id is missing");
                }

                BigDecimal alreadyRefunded = payment.getRefundedAmount() == null
                        ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                        : payment.getRefundedAmount().setScale(2, RoundingMode.HALF_UP);
                BigDecimal refundable = payment.getAmount().setScale(2, RoundingMode.HALF_UP).subtract(alreadyRefunded);
                if (refundable.compareTo(BigDecimal.ZERO) > 0) {
                    paymentGatewayClient.createRefund(
                            payment.getProviderPaymentId(),
                            refundable,
                            "cancel-order-" + order.getId(),
                            "Order cancelled"
                    );
                    orderStateTransitionService.assertPaymentTransition(payment.getStatus(), PaymentStatus.REFUNDED_FULL);
                    payment.setRefundedAmount(payment.getAmount().setScale(2, RoundingMode.HALF_UP));
                    payment.setStatus(PaymentStatus.REFUNDED_FULL);
                    paymentRepository.save(payment);
                }
            }
        });

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        dispatchService.handleOrderCancelled(order.getId());
        publishOrderNotification(
                order,
                NotificationType.ORDER_CANCELLED,
                "Order cancelled",
                "Order #" + order.getId() + " has been cancelled.",
                "Order #" + order.getId(),
                true,
                "order:cancelled:order:" + order.getId() + ":actor:" + actor.name()
        );

        paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
            if (PaymentStatus.INITIATED.equals(payment.getStatus()) || PaymentStatus.AUTHORIZED.equals(payment.getStatus())) {
                orderStateTransitionService.assertPaymentTransition(payment.getStatus(), PaymentStatus.FAILED);
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
            }
        });

        OrderResponse response = toOrderResponse(order);
        publishOrderRealtime(response, "ORDER_CANCELLED");
        return response;
    }

    private void assertOwnedRestaurant(String currentEmail, Long restaurantId) {
        User owner = getUserByEmail(currentEmail);
        restaurantRepository.findByIdAndOwnerId(restaurantId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));
    }

    private OrderResponse toOrderResponse(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId());
        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));
        return toOrderResponse(order, items, payment);
    }

    private OrderResponse toOrderResponse(Order order, List<OrderItem> orderItems, Payment payment) {
        List<OrderItemResponse> itemResponses = orderItems.stream()
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getMenuItemId(),
                        item.getItemName(),
                        item.getQuantity(),
                        item.getUnitPriceSnapshot().setScale(2, RoundingMode.HALF_UP),
                        item.getLineTotal().setScale(2, RoundingMode.HALF_UP),
                        item.getNotes(),
                        item.isVeg()
                ))
                .toList();

        PaymentResponse paymentResponse = new PaymentResponse(
                payment.getId(),
                payment.getStatus(),
                payment.getAmount().setScale(2, RoundingMode.HALF_UP),
                payment.getCurrency(),
                payment.getIdempotencyKey(),
                payment.getProviderOrderId(),
                payment.getProviderPaymentId(),
                (payment.getRefundedAmount() == null ? BigDecimal.ZERO : payment.getRefundedAmount()).setScale(2, RoundingMode.HALF_UP),
                payment.getRefundReason(),
                payment.getRefundEvidenceImagePath()
        );

        return new OrderResponse(
                order.getId(),
                order.getStatus(),
                order.getCreatedAt(),
                order.getRestaurant().getId(),
                order.getRestaurant().getName(),
                order.getUser().getFullName(),
                buildDeliveryFullAddress(order),
                order.getTotalItems(),
                order.getSubtotal().setScale(2, RoundingMode.HALF_UP),
                order.getDeliveryFee().setScale(2, RoundingMode.HALF_UP),
                order.getPackingCharge().setScale(2, RoundingMode.HALF_UP),
                order.getPlatformFee().setScale(2, RoundingMode.HALF_UP),
                order.getTaxTotal().setScale(2, RoundingMode.HALF_UP),
                order.getDiscountTotal().setScale(2, RoundingMode.HALF_UP),
                order.getGrandTotal().setScale(2, RoundingMode.HALF_UP),
                order.getEtaMinutes(),
                order.getEtaUpdatedAt(),
                order.getPricingRuleVersion(),
                paymentResponse,
                itemResponses
        );
    }

    private String buildDeliveryFullAddress(Order order) {
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

    private PaymentIntentResponse toPaymentIntentResponse(Order order, Payment payment) {
        return new PaymentIntentResponse(
                order.getId(),
                payment.getId(),
                payment.getProviderOrderId(),
                razorpayProperties.keyId(),
                payment.getAmount().setScale(2, RoundingMode.HALF_UP),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getIdempotencyKey()
        );
    }

    private Payment getPaymentByProviderRefs(String providerOrderId, String providerPaymentId) {
        if (providerOrderId != null && !providerOrderId.isBlank()) {
            return paymentRepository.findByProviderOrderId(providerOrderId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found for provider order id"));
        }

        if (providerPaymentId != null && !providerPaymentId.isBlank()) {
            return paymentRepository.findByProviderPaymentId(providerPaymentId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found for provider payment id"));
        }

        throw new ApiException(HttpStatus.BAD_REQUEST, "Missing provider payment references");
    }

    private JsonNode parseWebhookPayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid webhook payload");
        }
    }

    private String readText(JsonNode node, String... path) {
        JsonNode current = node;
        for (String segment : path) {
            current = current.path(segment);
        }

        if (current.isMissingNode() || current.isNull()) {
            return null;
        }
        return current.asText();
    }

    private long readLong(JsonNode node, String... path) {
        JsonNode current = node;
        for (String segment : path) {
            current = current.path(segment);
        }

        if (!current.isNumber()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid webhook amount");
        }
        return current.asLong();
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Map<Long, Payment> paymentsByOrderId(List<Order> orders) {
        List<Long> orderIds = orders.stream().map(Order::getId).toList();
        if (orderIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Payment> paymentsByOrderId = new HashMap<>();
        for (Payment payment : paymentRepository.findByOrderIdIn(orderIds)) {
            paymentsByOrderId.put(payment.getOrder().getId(), payment);
        }
        return paymentsByOrderId;
    }

    private boolean isSuccessfulPayment(PaymentStatus status) {
        return PaymentStatus.CAPTURED.equals(status)
                || PaymentStatus.REFUNDED_PARTIAL.equals(status)
                || PaymentStatus.REFUNDED_FULL.equals(status);
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        return Optional.ofNullable(value)
                .orElse(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private void publishOrderNotification(
            Order order,
            NotificationType type,
            String title,
            String message,
            String referenceLabel,
            boolean sendEmail,
            String eventKey
    ) {
        if (order == null || order.getUser() == null) {
            return;
        }
        notificationService.publish(order.getUser(), type, eventKey, title, message, referenceLabel, sendEmail);
    }

    private void publishOrderRealtime(OrderResponse response, String eventType) {
        if (response == null || response.orderId() == null) {
            return;
        }
        realtimePublisher.publishOrderUpdate(response.orderId(), eventType, response);
    }

    private void publishOwnerActionRequiredNotification(Order order, String eventKey) {
        if (order == null || order.getRestaurant() == null || order.getRestaurant().getOwner() == null) {
            return;
        }

        notificationService.publish(
                order.getRestaurant().getOwner(),
                NotificationType.ORDER_OWNER_ACTION_REQUIRED,
                eventKey,
                "New order needs action",
                "Order #" + order.getId() + " is confirmed. Please accept or reject it.",
                "Order #" + order.getId(),
                false
        );
    }

    private BigDecimal haversineKm(BigDecimal lat1, BigDecimal lon1, BigDecimal lat2, BigDecimal lon2) {
        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLon = Math.toRadians(lon2.doubleValue() - lon1.doubleValue());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1.doubleValue()))
                * Math.cos(Math.toRadians(lat2.doubleValue()))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double distance = 6371.0d * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        return BigDecimal.valueOf(distance).setScale(2, RoundingMode.HALF_UP);
    }
}

