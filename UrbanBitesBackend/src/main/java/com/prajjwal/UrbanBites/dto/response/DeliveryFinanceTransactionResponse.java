package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DeliveryFinanceTransactionResponse(
        Long assignmentId,
        Long orderId,
        DispatchAssignmentStatus assignmentStatus,
        String restaurantName,
        BigDecimal earningAmount,
        OffsetDateTime updatedAt
) {
}

