package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.PaymentStatus;
import java.math.BigDecimal;

public record PaymentResponse(
        Long paymentId,
        PaymentStatus status,
        BigDecimal amount,
        String currency,
        String idempotencyKey,
        String providerOrderId,
        String providerPaymentId,
        BigDecimal refundedAmount,
        String refundReason,
        String refundEvidenceImagePath
) {
}

