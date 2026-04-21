package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;

public record PasswordResetOtpRequest(
        @Email String email,
        @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Invalid phone number") String phone
) {

    @AssertTrue(message = "Either email or phone is required")
    @SuppressWarnings("unused")
    public boolean hasIdentifier() {
        return hasText(email) || hasText(phone);
    }

    @AssertTrue(message = "Provide only one of email or phone")
    @SuppressWarnings("unused")
    public boolean hasOnlyOneIdentifier() {
        return hasText(email) ^ hasText(phone);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

