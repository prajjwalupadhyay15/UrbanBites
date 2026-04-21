package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LoginRequest(
        @Email String email,
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone must be 10 to 15 digits and may start with +") String phone,
        @NotBlank String password
) {
    @AssertTrue(message = "Exactly one of email or phone must be provided")
    public boolean hasSingleIdentifier() {
        boolean hasEmail = hasText(email);
        boolean hasPhone = hasText(phone);
        return hasEmail ^ hasPhone;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

