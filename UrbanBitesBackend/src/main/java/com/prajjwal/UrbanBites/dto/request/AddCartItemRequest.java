package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddCartItemRequest(
        @NotNull Long menuItemId,
        @Min(1) int quantity,
        @Size(max = 255) String notes
) {
}

