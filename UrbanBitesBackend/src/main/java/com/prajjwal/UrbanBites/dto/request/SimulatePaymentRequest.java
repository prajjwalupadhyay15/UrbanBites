package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SimulatePaymentRequest(
        @NotBlank @Size(max = 80) String idempotencyKey
) {
}

