package com.prajjwal.UrbanBites.enums;

import com.prajjwal.UrbanBites.exception.ApiException;
import org.springframework.http.HttpStatus;

public enum DiscoveryFoodType {
    VEG,
    NON_VEG;

    public static DiscoveryFoodType fromQuery(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        try {
            return DiscoveryFoodType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid foodType. Supported values: VEG, NON_VEG");
        }
    }
}

