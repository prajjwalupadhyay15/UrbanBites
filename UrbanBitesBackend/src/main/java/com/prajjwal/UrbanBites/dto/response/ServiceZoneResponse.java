package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record ServiceZoneResponse(
        Long id,
        String name,
        BigDecimal minLatitude,
        BigDecimal maxLatitude,
        BigDecimal minLongitude,
        BigDecimal maxLongitude,
        boolean active
) {
}

