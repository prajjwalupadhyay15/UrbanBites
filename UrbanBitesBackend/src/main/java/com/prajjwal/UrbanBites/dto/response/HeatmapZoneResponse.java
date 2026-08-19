package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record HeatmapZoneResponse(
        BigDecimal latitude,
        BigDecimal longitude,
        int weight
) {
}
