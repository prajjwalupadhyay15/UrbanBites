package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.CreateAddressRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateAddressRequest;
import com.prajjwal.UrbanBites.dto.response.AddressResponse;
import com.prajjwal.UrbanBites.entity.Address;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.AddressRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.util.AddressMapper;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final GeocodingService geocodingService;

    public AddressService(
            AddressRepository addressRepository,
            UserRepository userRepository,
            GeocodingService geocodingService
    ) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
        this.geocodingService = geocodingService;
    }

    public List<AddressResponse> listMyAddresses(String currentEmail) {
        User user = getUserByEmail(currentEmail);
        return addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId())
                .stream()
                .map(AddressMapper::toResponse)
                .toList();
    }

    @Transactional
    public AddressResponse createAddress(String currentEmail, CreateAddressRequest request) {
        User user = getUserByEmail(currentEmail);

        Address address = new Address();
        address.setUser(user);
        applyRequest(address, request.label(), request.line1(), request.line2(), request.city(), request.state(),
                request.pincode(), request.landmark(), request.latitude(), request.longitude(),
                request.contactName(), request.contactPhone());

        boolean firstAddress = addressRepository.countByUserId(user.getId()) == 0;
        boolean makeDefault = request.isDefault() || firstAddress;
        if (makeDefault) {
            addressRepository.clearDefaultForUser(user.getId());
        }
        address.setDefault(makeDefault);

        return AddressMapper.toResponse(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse updateAddress(String currentEmail, Long addressId, UpdateAddressRequest request) {
        User user = getUserByEmail(currentEmail);
        Address address = getAddressByOwner(addressId, user.getId());

        applyRequest(address, request.label(), request.line1(), request.line2(), request.city(), request.state(),
                request.pincode(), request.landmark(), request.latitude(), request.longitude(),
                request.contactName(), request.contactPhone());

        if (request.isDefault() && !address.isDefault()) {
            addressRepository.clearDefaultForUser(user.getId());
            address.setDefault(true);
        }

        if (!request.isDefault() && address.isDefault()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one default address must exist");
        }

        return AddressMapper.toResponse(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(String currentEmail, Long addressId) {
        User user = getUserByEmail(currentEmail);
        Address address = getAddressByOwner(addressId, user.getId());
        boolean wasDefault = address.isDefault();

        addressRepository.delete(address);

        if (wasDefault) {
            addressRepository.findTopByUserIdAndIdNotOrderByCreatedAtAsc(user.getId(), addressId)
                    .ifPresent(nextDefault -> {
                        nextDefault.setDefault(true);
                        addressRepository.save(nextDefault);
                    });
        }
    }

    @Transactional
    public AddressResponse setDefaultAddress(String currentEmail, Long addressId) {
        User user = getUserByEmail(currentEmail);
        Address address = getAddressByOwner(addressId, user.getId());

        if (!address.isDefault()) {
            addressRepository.clearDefaultForUser(user.getId());
            address.setDefault(true);
            address = addressRepository.save(address);
        }

        return AddressMapper.toResponse(address);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Address getAddressByOwner(Long addressId, Long userId) {
        return addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));
    }

    private void applyRequest(
            Address address,
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
            String contactPhone
    ) {
        String normalizedLabel = label.trim();
        String normalizedLine1 = line1.trim();
        String normalizedLine2 = blankToNull(line2);
        String normalizedCity = city.trim();
        String normalizedState = state.trim();
        String normalizedPincode = pincode.trim();
        String normalizedLandmark = blankToNull(landmark);

        GeocodingService.Coordinates coordinates = resolveCoordinates(
                normalizedLine1,
                normalizedLine2,
                normalizedCity,
                normalizedState,
                normalizedPincode,
                latitude,
                longitude
        );

        address.setLabel(normalizedLabel);
        address.setLine1(normalizedLine1);
        address.setLine2(normalizedLine2);
        address.setCity(normalizedCity);
        address.setState(normalizedState);
        address.setPincode(normalizedPincode);
        address.setLandmark(normalizedLandmark);
        address.setLatitude(coordinates.latitude());
        address.setLongitude(coordinates.longitude());
        address.setContactName(contactName.trim());
        address.setContactPhone(contactPhone.trim());
    }

    private GeocodingService.Coordinates resolveCoordinates(
            String line1,
            String line2,
            String city,
            String state,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        if (latitude != null && longitude != null) {
            return new GeocodingService.Coordinates(latitude, longitude);
        }

        if (latitude != null || longitude != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Both latitude and longitude are required when set manually");
        }

        return geocodingService.geocodeAddress(line1, line2, city, state, pincode);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}


