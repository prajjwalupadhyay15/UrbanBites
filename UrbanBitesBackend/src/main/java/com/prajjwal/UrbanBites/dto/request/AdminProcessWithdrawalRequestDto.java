package com.prajjwal.UrbanBites.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminProcessWithdrawalRequestDto {
    @NotNull(message = "Approve flag is required")
    private Boolean approve;
    private String adminRemarks;
}
