package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record OwnerFinanceSummaryResponse(
        long totalOrders,
        long successfulPayments,
        long pendingPayments,
        long failedPayments,
        BigDecimal totalCapturedAmount,
        BigDecimal totalRefundedAmount,
        BigDecimal netRevenueAmount
) {
}

