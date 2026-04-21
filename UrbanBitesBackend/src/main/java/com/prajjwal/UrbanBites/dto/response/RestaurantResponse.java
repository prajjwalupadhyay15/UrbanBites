package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record RestaurantResponse(
        Long id,
        String name,
        String description,
        String imagePath,
        String addressLine,
        String city,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean openNow,
        boolean active,
        BigDecimal avgRating,
        Integer ratingCount,
        Double distanceKm
) {
}

