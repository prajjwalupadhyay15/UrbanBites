package com.prajjwal.UrbanBites.enums;

import com.prajjwal.UrbanBites.exception.ApiException;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;

public enum DiscoveryPriceBracket {
    BUDGET(BigDecimal.ZERO, new BigDecimal("200.00")),
    MID_RANGE(new BigDecimal("200.01"), new BigDecimal("500.00")),
    PREMIUM(new BigDecimal("500.01"), null);

    private final BigDecimal minInclusive;
    private final BigDecimal maxInclusive;

    DiscoveryPriceBracket(BigDecimal minInclusive, BigDecimal maxInclusive) {
        this.minInclusive = minInclusive;
        this.maxInclusive = maxInclusive;
    }

    public boolean matches(BigDecimal price) {
        if (price == null || price.compareTo(minInclusive) < 0) {
            return false;
        }
        return maxInclusive == null || price.compareTo(maxInclusive) <= 0;
    }

    public static DiscoveryPriceBracket fromQuery(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        try {
            return DiscoveryPriceBracket.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Invalid priceBracket. Supported values: BUDGET, MID_RANGE, PREMIUM");
        }
    }
}

