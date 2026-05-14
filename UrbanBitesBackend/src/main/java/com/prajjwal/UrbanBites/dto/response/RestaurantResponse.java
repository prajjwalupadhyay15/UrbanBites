package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;
import java.util.List;

import com.prajjwal.UrbanBites.enums.ApprovalStatus;

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
        Double distanceKm,
        List<String> categories,
        ApprovalStatus approvalStatus
) {
}

