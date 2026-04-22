package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record MenuItemResponse(
        Long id,
        Long restaurantId,
        String name,
        String description,
        BigDecimal price,
        String imagePath,
        boolean veg,
        boolean available,
        String category
) {
}

