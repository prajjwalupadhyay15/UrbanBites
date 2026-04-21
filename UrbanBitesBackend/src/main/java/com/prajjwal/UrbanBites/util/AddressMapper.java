package com.prajjwal.UrbanBites.util;

import com.prajjwal.UrbanBites.dto.response.AddressResponse;
import com.prajjwal.UrbanBites.entity.Address;

public final class AddressMapper {

    private AddressMapper() {
    }

    public static AddressResponse toResponse(Address address) {
        return new AddressResponse(
                address.getId(),
                address.getLabel(),
                address.getLine1(),
                address.getLine2(),
                address.getCity(),
                address.getState(),
                address.getPincode(),
                address.getLandmark(),
                address.getLatitude(),
                address.getLongitude(),
                address.getContactName(),
                address.getContactPhone(),
                address.isDefault()
        );
    }
}

