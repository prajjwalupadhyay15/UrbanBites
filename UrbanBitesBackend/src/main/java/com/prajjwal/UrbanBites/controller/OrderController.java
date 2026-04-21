package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.SimulatePaymentRequest;
import com.prajjwal.UrbanBites.dto.request.CreatePaymentIntentRequest;
import com.prajjwal.UrbanBites.dto.request.PlaceOrderRequest;
import com.prajjwal.UrbanBites.dto.response.OwnerFinanceSummaryResponse;
import com.prajjwal.UrbanBites.dto.response.OwnerPaymentTransactionResponse;
import com.prajjwal.UrbanBites.dto.response.OrderResponse;
import com.prajjwal.UrbanBites.dto.response.PaymentIntentResponse;
import com.prajjwal.UrbanBites.service.OrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> placeOrder(
            Principal principal,
            @Valid @RequestBody(required = false) PlaceOrderRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeOrder(principal.getName(), request));
    }

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<OrderResponse>> listMyOrders(Principal principal) {
        return ResponseEntity.ok(orderService.listMyOrders(principal.getName()));
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> getMyOrder(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getMyOrder(principal.getName(), orderId));
    }

    @PostMapping("/{orderId}/payment/simulate-success")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> simulatePaymentSuccess(
            Principal principal,
            @PathVariable Long orderId,
            @Valid @RequestBody SimulatePaymentRequest request
    ) {
        return ResponseEntity.ok(orderService.simulatePaymentSuccess(principal.getName(), orderId, request.idempotencyKey()));
    }

    @PostMapping("/{orderId}/payment/simulate-failure")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> simulatePaymentFailure(
            Principal principal,
            @PathVariable Long orderId,
            @Valid @RequestBody SimulatePaymentRequest request
    ) {
        return ResponseEntity.ok(orderService.simulatePaymentFailure(principal.getName(), orderId, request.idempotencyKey()));
    }

    @PostMapping("/{orderId}/payment/intent")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(
            Principal principal,
            @PathVariable Long orderId,
            @Valid @RequestBody CreatePaymentIntentRequest request
    ) {
        return ResponseEntity.ok(orderService.createPaymentIntent(principal.getName(), orderId, request.idempotencyKey()));
    }

    @PostMapping("/admin/{orderId}/payment/refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrderResponse> refundOrderPayment(
            @PathVariable Long orderId,
            @RequestParam @Positive(message = "Refund amount must be positive") java.math.BigDecimal amount,
            @RequestParam @NotBlank String idempotencyKey,
            @RequestParam @NotBlank String reason,
            @RequestPart("evidenceImage") MultipartFile evidenceImage
    ) {
        return ResponseEntity.ok(orderService.refundCapturedPayment(orderId, amount, idempotencyKey, reason, evidenceImage));
    }

    @PostMapping("/{orderId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> cancelMyOrder(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.cancelMyOrder(principal.getName(), orderId));
    }

    @GetMapping("/owner")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<List<OrderResponse>> listOwnerOrders(Principal principal) {
        return ResponseEntity.ok(orderService.listOwnerOrders(principal.getName()));
    }

    @GetMapping("/owner/restaurants/{restaurantId}")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<List<OrderResponse>> listRestaurantOrders(Principal principal, @PathVariable Long restaurantId) {
        return ResponseEntity.ok(orderService.listRestaurantOrders(principal.getName(), restaurantId));
    }

    @GetMapping("/owner/finance/summary")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<OwnerFinanceSummaryResponse> ownerFinanceSummary(Principal principal) {
        return ResponseEntity.ok(orderService.ownerFinanceSummary(principal.getName()));
    }

    @GetMapping("/owner/finance/transactions")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<List<OwnerPaymentTransactionResponse>> ownerFinanceTransactions(Principal principal) {
        return ResponseEntity.ok(orderService.ownerFinanceTransactions(principal.getName()));
    }

    @PostMapping("/owner/{orderId}/preparing")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<OrderResponse> markPreparing(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.markPreparing(principal.getName(), orderId));
    }

    @PostMapping("/owner/{orderId}/accept")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<OrderResponse> markAcceptedByRestaurant(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.markAcceptedByRestaurant(principal.getName(), orderId));
    }

    @PostMapping("/owner/{orderId}/ready-for-pickup")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<OrderResponse> markReadyForPickup(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.markReadyForPickup(principal.getName(), orderId));
    }

    @PostMapping("/owner/{orderId}/cancel")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<OrderResponse> cancelOwnerOrder(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.cancelOwnerOrder(principal.getName(), orderId));
    }

    @PostMapping("/delivery/{orderId}/pickup")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<OrderResponse> markOutForDelivery(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.markOutForDelivery(principal.getName(), orderId));
    }

    @PostMapping("/delivery/{orderId}/delivered")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public ResponseEntity<OrderResponse> markDelivered(Principal principal, @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.markDelivered(principal.getName(), orderId));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrderResponse>> listAllOrders() {
        return ResponseEntity.ok(orderService.listAllOrdersForAdmin());
    }

    @PostMapping("/admin/{orderId}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrderResponse> cancelAdminOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.cancelAdminOrder(orderId));
    }
}

