package com.prajjwal.UrbanBites.dto.response;

import com.prajjwal.UrbanBites.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TrackingPointResponse(
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal speedKmph,
        Integer etaMinutes,
        OrderStatus orderStatus,
        OffsetDateTime capturedAt
) {
}

