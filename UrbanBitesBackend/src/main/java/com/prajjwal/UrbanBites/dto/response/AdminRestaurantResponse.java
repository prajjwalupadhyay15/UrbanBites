package com.prajjwal.UrbanBites.dto.response;

public record AdminRestaurantResponse(
        Long id,
        String name,
        String city,
        Long ownerUserId,
        String ownerEmail,
        boolean openNow,
        boolean active
) {
}

