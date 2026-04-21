package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePaymentIntentRequest(
        @NotBlank @Size(max = 80) String idempotencyKey
) {
}

