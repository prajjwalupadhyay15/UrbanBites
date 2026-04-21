package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderResponse(
        Long orderId,
        OrderStatus status,
        OffsetDateTime createdAt,
        Long restaurantId,
        String restaurantName,
        String customerName,
        String deliveryFullAddress,
        int totalItems,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal packingCharge,
        BigDecimal platformFee,
        BigDecimal taxTotal,
        BigDecimal discountTotal,
        BigDecimal grandTotal,
        Integer etaMinutes,
        OffsetDateTime etaUpdatedAt,
        String pricingRuleVersion,
        PaymentResponse payment,
        List<OrderItemResponse> items
) {
}

