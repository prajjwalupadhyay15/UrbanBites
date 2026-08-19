package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.WithdrawalStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalResponseDto {
    private UUID id;
    private String userName;
    private String userEmail;
    private BigDecimal amount;
    private String bankAccountNumber;
    private String bankIfsc;
    private WithdrawalStatus status;
    private String adminRemarks;
    private OffsetDateTime createdAt;
    private OffsetDateTime processedAt;
}
