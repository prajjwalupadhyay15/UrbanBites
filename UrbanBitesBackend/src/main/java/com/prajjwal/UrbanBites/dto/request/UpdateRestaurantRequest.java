package com.prajjwal.UrbanBites.dto.request;

import java.math.BigDecimal;

public record UpdateRestaurantRequest(
        String name,
        String description,
        String addressLine,
        String city,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean openNow,
        boolean active
) {
}

