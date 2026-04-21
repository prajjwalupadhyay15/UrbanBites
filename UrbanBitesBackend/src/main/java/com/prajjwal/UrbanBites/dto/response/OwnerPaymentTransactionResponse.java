package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record OwnerPaymentTransactionResponse(
        Long orderId,
        Long restaurantId,
        String restaurantName,
        OrderStatus orderStatus,
        PaymentStatus paymentStatus,
        BigDecimal amount,
        BigDecimal refundedAmount,
        BigDecimal netAmount,
        String currency,
        String providerPaymentId,
        OffsetDateTime orderCreatedAt
) {
}

