package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AdminCouponCampaignResponse(
        Long id,
        String code,
        String description,
        BigDecimal discountPercent,
        Integer maxUses,
        boolean active,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt
) {
}

