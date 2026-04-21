package com.prajjwal.UrbanBites.dto.request;

import java.math.BigDecimal;

public record CreateRestaurantRequest(
        String name,
        String description,
        String addressLine,
        String city,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean openNow
) {
}

