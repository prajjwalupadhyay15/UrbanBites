package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.WalletTransactionReferenceType;
import com.prajjwal.UrbanBites.enums.WalletTransactionType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record WalletTransactionResponse(
        Long id,
        BigDecimal amount,
        WalletTransactionType type,
        WalletTransactionReferenceType referenceType,
        Long referenceId,
        String description,
        OffsetDateTime createdAt
) {
}
