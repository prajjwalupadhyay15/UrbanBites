package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;

public record AdminOrderOpsResponse(
        Long orderId,
        OrderStatus status,
        String customerEmail,
        String restaurantName,
        BigDecimal grandTotal
) {
}

