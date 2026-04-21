package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        Long cartId,
        Long restaurantId,
        String restaurantName,
        int totalItems,
        BigDecimal subtotal,
        List<CartItemResponse> items
) {
}

