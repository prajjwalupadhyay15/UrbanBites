package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.PhoneOtpRequest;
import com.prajjwal.UrbanBites.dto.request.PhoneOtpVerifyRequest;
import com.prajjwal.UrbanBites.dto.request.ChangePasswordRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateProfileRequest;
import com.prajjwal.UrbanBites.dto.response.OtpResponse;
import com.prajjwal.UrbanBites.dto.response.UserProfileResponse;
import com.prajjwal.UrbanBites.service.ImageStorageService;
import com.prajjwal.UrbanBites.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final ImageStorageService imageStorageService;

    public UserController(UserService userService, ImageStorageService imageStorageService) {
        this.userService = userService;
        this.imageStorageService = imageStorageService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<UserProfileResponse> me(Principal principal) {
        return ResponseEntity.ok(userService.me(principal.getName()));
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<UserProfileResponse> updateProfile(
            Principal principal,
            @RequestParam @NotBlank @Size(min = 2, max = 120) String fullName,
            @RequestParam @NotBlank @Email String email,
            @RequestParam(required = false) @Size(max = 20) String gender,
            @RequestParam(value = "profileImage", required = false) MultipartFile profileImage
    ) {
        UpdateProfileRequest request = new UpdateProfileRequest(fullName, email, gender);
        String profileImagePath = profileImage == null || profileImage.isEmpty()
                ? null
                : imageStorageService.saveProfileImage(profileImage);
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), request, profileImagePath));
    }

    @PostMapping("/me/phone/request-otp")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<OtpResponse> requestPhoneOtp(
            Principal principal,
            @Valid @RequestBody PhoneOtpRequest request
    ) {
        return ResponseEntity.ok(userService.requestPhoneOtp(principal.getName(), request));
    }

    @PostMapping("/me/phone/verify-otp")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<UserProfileResponse> verifyPhoneOtp(
            Principal principal,
            @Valid @RequestBody PhoneOtpVerifyRequest request
    ) {
        return ResponseEntity.ok(userService.verifyPhoneOtp(principal.getName(), request));
    }

    @DeleteMapping("/me")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<Map<String, String>> deleteMyProfile(Principal principal) {
        userService.deleteMyProfile(principal.getName());
        return ResponseEntity.ok(Map.of("message", "Profile deleted successfully"));
    }

    @PutMapping("/me/password")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<Map<String, String>> changeMyPassword(
            Principal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changeMyPassword(principal.getName(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}

