package com.prajjwal.UrbanBites.dto.request;

import com.prajjwal.UrbanBites.enums.Role;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email String email,
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Phone must be 10 to 15 digits and may start with +") String phone,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(min = 2, max = 120) String fullName,
        @NotNull Role role
) {
    @AssertTrue(message = "Exactly one of email or phone must be provided")
    public boolean hasSingleIdentifier() {
        boolean hasEmail = hasText(email);
        boolean hasPhone = hasText(phone);
        return hasEmail ^ hasPhone;
    }

    public RegisterRequest(String email, String password, String fullName, Role role) {
        this(email, null, password, fullName, role);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

