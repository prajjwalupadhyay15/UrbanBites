package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.LoginRequest;
import com.prajjwal.UrbanBites.dto.request.LogoutRequest;
import com.prajjwal.UrbanBites.dto.request.EmailOtpVerifyRequest;
import com.prajjwal.UrbanBites.dto.request.PasswordResetConfirmRequest;
import com.prajjwal.UrbanBites.dto.request.PasswordResetOtpRequest;
import com.prajjwal.UrbanBites.dto.request.PhoneLoginOtpRequest;
import com.prajjwal.UrbanBites.dto.request.PhoneLoginVerifyOtpRequest;
import com.prajjwal.UrbanBites.dto.request.RefreshTokenRequest;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.dto.response.AuthResponse;
import com.prajjwal.UrbanBites.dto.response.OtpResponse;
import com.prajjwal.UrbanBites.dto.response.UserProfileResponse;
import com.prajjwal.UrbanBites.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(
                request,
                extractIpAddress(httpRequest),
                httpRequest.getHeader("User-Agent"),
                extractLocationLabel(httpRequest)
        ));
    }

    @PostMapping("/login/request-otp")
    public ResponseEntity<OtpResponse> requestPhoneLoginOtp(@Valid @RequestBody PhoneLoginOtpRequest request) {
        return ResponseEntity.ok(authService.requestPhoneLoginOtp(request));
    }

    @PostMapping("/login/verify-otp")
    public ResponseEntity<AuthResponse> verifyPhoneLoginOtp(
            @Valid @RequestBody PhoneLoginVerifyOtpRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(authService.verifyPhoneLoginOtp(
                request,
                extractIpAddress(httpRequest),
                httpRequest.getHeader("User-Agent"),
                extractLocationLabel(httpRequest)
        ));
    }

    @PostMapping("/password-reset/request-otp")
    public ResponseEntity<OtpResponse> requestPasswordResetOtp(@Valid @RequestBody PasswordResetOtpRequest request) {
        return ResponseEntity.ok(authService.requestPasswordResetOtp(request));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Map<String, String>> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request
    ) {
        authService.confirmPasswordReset(request);
        return ResponseEntity.ok(Map.of("message", "Password reset successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshTokens(request));
    }

    @PostMapping("/email-verification/request-otp")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<OtpResponse> requestEmailVerificationOtp(Principal principal) {
        return ResponseEntity.ok(authService.requestEmailVerificationOtp(principal.getName()));
    }

    @PostMapping("/email-verification/verify-otp")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<UserProfileResponse> verifyEmailOtp(
            Principal principal,
            @Valid @RequestBody EmailOtpVerifyRequest request
    ) {
        return ResponseEntity.ok(authService.verifyEmailOtp(principal.getName(), request.otp()));
    }

    @PostMapping("/logout")
    @PreAuthorize("hasAnyRole('CUSTOMER','RESTAURANT_OWNER','DELIVERY_AGENT','ADMIN')")
    public ResponseEntity<Map<String, String>> logout(
            Principal principal,
            HttpServletRequest httpRequest,
            @RequestBody(required = false) LogoutRequest request
    ) {
        authService.logout(principal.getName(), httpRequest.getHeader("Authorization"), request);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    private String extractIpAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            int commaIndex = forwardedFor.indexOf(',');
            return (commaIndex > 0 ? forwardedFor.substring(0, commaIndex) : forwardedFor).trim();
        }
        return request.getRemoteAddr();
    }

    private String extractLocationLabel(HttpServletRequest request) {
        String location = request.getHeader("X-User-Location");
        if (location == null || location.isBlank()) {
            location = request.getHeader("X-Country");
        }
        return location;
    }
}

