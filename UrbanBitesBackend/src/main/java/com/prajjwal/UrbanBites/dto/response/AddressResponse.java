package com.prajjwal.UrbanBites.dto.response;

import java.math.BigDecimal;

public record AddressResponse(
        Long id,
        String label,
        String line1,
        String line2,
        String city,
        String state,
        String pincode,
        String landmark,
        BigDecimal latitude,
        BigDecimal longitude,
        String contactName,
        String contactPhone,
        boolean isDefault
) {
}

