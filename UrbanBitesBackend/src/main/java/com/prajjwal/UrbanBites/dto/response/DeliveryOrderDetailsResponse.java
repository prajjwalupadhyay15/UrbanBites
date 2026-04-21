package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record DeliveryOrderDetailsResponse(
        Long assignmentId,
        DispatchAssignmentStatus assignmentStatus,
        Long orderId,
        OrderStatus orderStatus,
        OffsetDateTime orderCreatedAt,
        String restaurantName,
        String restaurantAddress,
        BigDecimal restaurantLatitude,
        BigDecimal restaurantLongitude,
        String customerName,
        String customerPhone,
        String deliveryAddress,
        BigDecimal deliveryLatitude,
        BigDecimal deliveryLongitude,
        int totalItems,
        BigDecimal grandTotal,
        BigDecimal deliveryFee,
        List<DeliveryAssignmentItemResponse> items
) {
}

