package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.CreateAddressRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateAddressRequest;
import com.prajjwal.UrbanBites.dto.response.AddressResponse;
import com.prajjwal.UrbanBites.service.AddressService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me/addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<AddressResponse>> list(Principal principal) {
        return ResponseEntity.ok(addressService.listMyAddresses(principal.getName()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<AddressResponse> create(Principal principal, @Valid @RequestBody CreateAddressRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(addressService.createAddress(principal.getName(), request));
    }

    @PutMapping("/{addressId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<AddressResponse> update(
            Principal principal,
            @PathVariable Long addressId,
            @Valid @RequestBody UpdateAddressRequest request
    ) {
        return ResponseEntity.ok(addressService.updateAddress(principal.getName(), addressId, request));
    }

    @DeleteMapping("/{addressId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Map<String, String>> delete(Principal principal, @PathVariable Long addressId) {
        addressService.deleteAddress(principal.getName(), addressId);
        return ResponseEntity.ok(Map.of("message", "Address deleted"));
    }

    @PatchMapping("/{addressId}/default")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<AddressResponse> setDefault(Principal principal, @PathVariable Long addressId) {
        return ResponseEntity.ok(addressService.setDefaultAddress(principal.getName(), addressId));
    }
}

