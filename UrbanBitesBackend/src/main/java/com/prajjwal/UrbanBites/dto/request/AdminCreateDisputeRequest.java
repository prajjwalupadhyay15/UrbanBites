package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.AdminDisputeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminCreateDisputeRequest(
        @NotNull Long orderId,
        @NotNull AdminDisputeType type,
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Size(max = 1200) String description
) {
}

