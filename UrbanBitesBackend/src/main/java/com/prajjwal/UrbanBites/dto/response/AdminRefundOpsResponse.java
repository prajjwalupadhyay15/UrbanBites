package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.PaymentStatus;
import java.math.BigDecimal;

public record AdminRefundOpsResponse(
        Long orderId,
        Long paymentId,
        PaymentStatus paymentStatus,
        BigDecimal amount,
        BigDecimal refundedAmount,
        String refundReason,
        String refundEvidenceImagePath
) {
}

