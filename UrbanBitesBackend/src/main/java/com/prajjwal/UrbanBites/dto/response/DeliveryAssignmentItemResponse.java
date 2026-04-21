package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record DeliveryAssignmentItemResponse(
        Long itemId,
        String itemName,
        int quantity,
        BigDecimal lineTotal,
        boolean veg,
        String notes
) {
}

