package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PlaceOrderRequest(
        Long addressId,
        @Size(min = 2, max = 120) String recipientName,
        @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Invalid phone number") String recipientPhone
) {
}

