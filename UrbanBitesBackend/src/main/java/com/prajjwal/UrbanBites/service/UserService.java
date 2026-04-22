package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.PhoneOtpRequest;
import com.prajjwal.UrbanBites.dto.request.PhoneOtpVerifyRequest;
import com.prajjwal.UrbanBites.dto.request.ChangePasswordRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateProfileRequest;
import com.prajjwal.UrbanBites.dto.response.OtpResponse;
import com.prajjwal.UrbanBites.dto.response.UserProfileResponse;
import com.prajjwal.UrbanBites.entity.DeliveryAgentProfile;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.DeliveryAgentProfileRepository;
import com.prajjwal.UrbanBites.repository.RefreshTokenRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.util.AuthMapper;
import java.time.OffsetDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final DeliveryAgentProfileRepository deliveryAgentProfileRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final ImageStorageService imageStorageService;

    public UserService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            DeliveryAgentProfileRepository deliveryAgentProfileRepository,
            OtpService otpService,
            PasswordEncoder passwordEncoder,
            ImageStorageService imageStorageService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.deliveryAgentProfileRepository = deliveryAgentProfileRepository;
        this.otpService = otpService;
        this.passwordEncoder = passwordEncoder;
        this.imageStorageService = imageStorageService;
    }

    public UserProfileResponse me(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (Role.DELIVERY_AGENT.equals(user.getRole())) {
            return deliveryAgentProfileRepository.findByUserId(user.getId())
                    .map(profile -> AuthMapper.toProfile(user, profile.isOnline(), profile.isAvailable()))
                    .orElse(AuthMapper.toProfile(user));
        }

        return AuthMapper.toProfile(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(String currentEmail, UpdateProfileRequest request, String profileImagePath) {
        User user = getUserByEmail(currentEmail);
        String nextEmail = request.email().trim().toLowerCase();
        String existingProfileImagePath = user.getProfilePictureUrl();

        if (!user.getEmail().equalsIgnoreCase(nextEmail) && userRepository.existsByEmailIgnoreCase(nextEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        user.setFullName(request.fullName().trim());
        user.setEmail(nextEmail);
        user.setGender(blankToNull(request.gender()));
        if (profileImagePath != null) {
            user.setProfilePictureUrl(profileImagePath);
        }

        User saved = userRepository.save(user);
        if (profileImagePath != null
                && existingProfileImagePath != null
                && !existingProfileImagePath.equals(profileImagePath)) {
            imageStorageService.deleteImage(existingProfileImagePath);
        }

        return AuthMapper.toProfile(saved);
    }

    public OtpResponse requestPhoneOtp(String currentEmail, PhoneOtpRequest request) {
        User user = getUserByEmail(currentEmail);
        String phone = request.phone().trim();

        if (userRepository.existsByPhoneAndIdNot(phone, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone already used by another account");
        }

        return otpService.createPhoneOtp(user.getEmail(), phone, request.purpose());
    }

    @Transactional
    public UserProfileResponse verifyPhoneOtp(String currentEmail, PhoneOtpVerifyRequest request) {
        User user = getUserByEmail(currentEmail);
        String phone = request.phone().trim();

        if (userRepository.existsByPhoneAndIdNot(phone, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone already used by another account");
        }

        otpService.verifyPhoneOtp(user.getEmail(), phone, request.purpose(), request.otp());
        user.setPhone(phone);
        user.setPhoneVerified(true);

        return AuthMapper.toProfile(userRepository.save(user));
    }

    @Transactional
    public void deleteMyProfile(String currentEmail) {
        User user = getUserByEmail(currentEmail);
        Long userId = user.getId();
        String existingProfileImagePath = user.getProfilePictureUrl();

        // Safe delete: keep relational integrity but disable access and remove direct identifiers.
        user.setEnabled(false);
        user.setEmail("deleted.user." + userId + "@deleted.urbanbites.local");
        user.setFullName("Deleted User");
        user.setPhone(null);
        user.setPhoneVerified(false);
        user.setEmailVerified(false);
        user.setGender(null);
        user.setProfilePictureUrl(null);

        userRepository.save(user);
        refreshTokenRepository.revokeAllActiveByUserId(userId, OffsetDateTime.now());
        imageStorageService.deleteImage(existingProfileImagePath);
    }

    @Transactional
    public void changeMyPassword(String currentEmail, ChangePasswordRequest request) {
        User user = getUserByEmail(currentEmail);

        if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New password must be different from current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Revoke existing refresh tokens so all active sessions must re-authenticate.
        refreshTokenRepository.revokeAllActiveByUserId(user.getId(), OffsetDateTime.now());
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

