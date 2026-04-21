package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmRequest(
        @Email String email,
        @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Invalid phone number") String phone,
        @NotBlank @Pattern(regexp = "\\d{6}") String otp,
        @NotBlank @Size(min = 8, max = 100) @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,100}$",
                message = "Password must contain letters and numbers"
        ) String newPassword
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

