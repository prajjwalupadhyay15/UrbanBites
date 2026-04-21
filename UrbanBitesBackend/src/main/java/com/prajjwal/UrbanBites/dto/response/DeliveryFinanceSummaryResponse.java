package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record DeliveryFinanceSummaryResponse(
        long totalAssignments,
        long completedDeliveries,
        long cancelledAssignments,
        BigDecimal totalDeliveryFees,
        BigDecimal averageFeePerCompletedDelivery
) {
}

