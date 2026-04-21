package com.prajjwal.UrbanBites.dto.request;

import java.math.BigDecimal;

public record CreateServiceZoneRequest(
        String name,
        BigDecimal minLatitude,
        BigDecimal maxLatitude,
        BigDecimal minLongitude,
        BigDecimal maxLongitude,
        boolean active
) {
}

