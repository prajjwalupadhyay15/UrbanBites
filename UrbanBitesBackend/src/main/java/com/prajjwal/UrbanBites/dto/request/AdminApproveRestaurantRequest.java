package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotNull;

public record AdminApproveRestaurantRequest(
        @NotNull(message = "restaurantId is required") Long restaurantId,
        @NotNull(message = "approved is required") Boolean approved,
        String rejectionReason
) {
}

