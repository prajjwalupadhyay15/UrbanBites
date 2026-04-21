package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.PaymentStatus;
import java.math.BigDecimal;

public record PaymentIntentResponse(
        Long orderId,
        Long paymentId,
        String razorpayOrderId,
        String razorpayKeyId,
        BigDecimal amount,
        String currency,
        PaymentStatus paymentStatus,
        String idempotencyKey
) {
}

