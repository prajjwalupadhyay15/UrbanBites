package com.prajjwal.UrbanBites.dto.request;

import java.math.BigDecimal;

public record AgentAvailabilityRequest(
        boolean online,
        boolean available,
        BigDecimal latitude,
        BigDecimal longitude
) {
}

