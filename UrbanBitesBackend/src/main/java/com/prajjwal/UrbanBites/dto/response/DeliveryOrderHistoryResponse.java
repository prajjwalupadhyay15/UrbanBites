package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DeliveryOrderHistoryResponse(
        Long assignmentId,
        DispatchAssignmentStatus assignmentStatus,
        Long orderId,
        OrderStatus orderStatus,
        OffsetDateTime updatedAt,
        String restaurantName,
        String customerName,
        int totalItems,
        BigDecimal grandTotal,
        BigDecimal deliveryFee
) {
}

