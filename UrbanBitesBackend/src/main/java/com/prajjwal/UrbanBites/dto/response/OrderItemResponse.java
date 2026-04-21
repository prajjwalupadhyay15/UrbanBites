package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long menuItemId,
        String itemName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String notes,
        boolean veg
) {
}

