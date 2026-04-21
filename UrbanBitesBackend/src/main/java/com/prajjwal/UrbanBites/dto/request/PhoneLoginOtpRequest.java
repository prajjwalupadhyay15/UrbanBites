package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PhoneLoginOtpRequest(
        @NotBlank @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone must be 10 to 15 digits and may start with +") String phone
) {
}

