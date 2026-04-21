package com.prajjwal.UrbanBites.dto.request;

import java.math.BigDecimal;

public record UpdateMenuItemRequest(
        String name,
        String description,
        BigDecimal price,
        boolean veg,
        boolean available
) {
}

