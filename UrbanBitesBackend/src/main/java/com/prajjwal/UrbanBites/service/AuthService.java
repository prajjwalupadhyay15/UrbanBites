package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.LogoutRequest;
import com.prajjwal.UrbanBites.dto.request.LoginRequest;
import com.prajjwal.UrbanBites.dto.request.PhoneLoginOtpRequest;
import com.prajjwal.UrbanBites.dto.request.PhoneLoginVerifyOtpRequest;
import com.prajjwal.UrbanBites.dto.request.PasswordResetConfirmRequest;
import com.prajjwal.UrbanBites.dto.request.PasswordResetOtpRequest;
import com.prajjwal.UrbanBites.dto.request.RefreshTokenRequest;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.dto.response.OtpResponse;
import com.prajjwal.UrbanBites.dto.response.AuthResponse;
import com.prajjwal.UrbanBites.dto.response.UserProfileResponse;
import com.prajjwal.UrbanBites.entity.RefreshToken;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.ApprovalStatus;
import com.prajjwal.UrbanBites.enums.NotificationType;
import com.prajjwal.UrbanBites.enums.OtpPurpose;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.RefreshTokenRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.security.JwtService;
import com.prajjwal.UrbanBites.util.AuthMapper;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final EmailSender emailSender;
    private final NotificationService notificationService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenRevocationService tokenRevocationService;

    private static final DateTimeFormatter LOGIN_TIME_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       OtpService otpService,
                       EmailSender emailSender,
                       NotificationService notificationService,
                       RefreshTokenRepository refreshTokenRepository,
                       TokenRevocationService tokenRevocationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.emailSender = emailSender;
        this.notificationService = notificationService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenRevocationService = tokenRevocationService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        String normalizedPhone = normalizePhone(request.phone());

        if (normalizedEmail != null && userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        if (normalizedPhone != null && userRepository.existsByPhone(normalizedPhone)) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone already used by another account");
        }

        boolean phoneFirstSignup = normalizedEmail == null;
        String loginEmail = phoneFirstSignup ? buildPhoneAliasEmail(normalizedPhone) : normalizedEmail;

        User user = new User();
        user.setEmail(loginEmail);
        user.setPhone(normalizedPhone);
        user.setPhoneVerified(false);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        user.setEnabled(true);

        // Set approval status for partner roles (PENDING for review)
        if (Role.RESTAURANT_OWNER.equals(request.role()) || Role.DELIVERY_AGENT.equals(request.role())) {
            user.setApprovalStatus(ApprovalStatus.PENDING);
        }

        User saved = userRepository.save(user);
        if (saved.getPhone() != null) {
            otpService.createPhoneOtp(saved.getEmail(), saved.getPhone(), OtpPurpose.PHONE_VERIFICATION);
        } else if (isEmailableAddress(saved.getEmail())) {
            otpService.createEmailVerificationOtp(saved.getEmail(), saved.getFullName());
        }

        notificationService.publish(
                saved,
                NotificationType.ACCOUNT_REGISTERED,
                "auth:register:user:" + saved.getId(),
                "Welcome to UrbanBites",
                "Your account has been created successfully.",
                "User ID: " + saved.getId(),
                false
        );

        return issueTokenPair(saved, false);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent, String locationLabel) {
        User user = resolveLoginUser(request);

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getEmail(), request.password())
            );
        } catch (AuthenticationException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return finalizeSuccessfulLogin(user, ipAddress, userAgent, locationLabel);
    }

    public OtpResponse requestPhoneLoginOtp(PhoneLoginOtpRequest request) {
        User user = getUserByPhone(request.phone());
        return otpService.createPhoneLoginOtp(user.getEmail(), user.getPhone());
    }

    @Transactional
    public AuthResponse verifyPhoneLoginOtp(PhoneLoginVerifyOtpRequest request, String ipAddress, String userAgent, String locationLabel) {
        User user = getUserByPhone(request.phone());
        otpService.verifyPhoneLoginOtp(user.getEmail(), user.getPhone(), request.otp());
        if (!user.isPhoneVerified()) {
            user.setPhoneVerified(true);
        }
        return finalizeSuccessfulLogin(user, ipAddress, userAgent, locationLabel);
    }

    @Transactional
    public AuthResponse refreshTokens(RefreshTokenRequest request) {
        String refreshTokenValue = request.refreshToken();
        String tokenType = jwtService.extractTokenType(refreshTokenValue);
        if (!JwtService.TOKEN_TYPE_REFRESH.equalsIgnoreCase(tokenType)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        String tokenId = jwtService.extractTokenId(refreshTokenValue);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenIdAndRevokedFalse(tokenId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked"));

        User user = refreshToken.getUser();
        if (!jwtService.isTokenValid(refreshTokenValue, user.getEmail(), JwtService.TOKEN_TYPE_REFRESH)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (refreshToken.getExpiresAt().isBefore(now)) {
            refreshToken.setRevoked(true);
            refreshToken.setRevokedAt(now);
            refreshTokenRepository.save(refreshToken);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked");
        }

        refreshToken.setRevoked(true);
        refreshToken.setRevokedAt(now);
        refreshTokenRepository.save(refreshToken);

        return issueTokenPair(user, true);
    }

    @Transactional
    public void logout(String currentEmail, String authorizationHeader, LogoutRequest request) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        String accessToken = extractBearerToken(authorizationHeader);
        if (accessToken != null) {
            try {
                String tokenType = jwtService.extractTokenType(accessToken);
                String tokenUser = jwtService.extractUsername(accessToken);
                if (JwtService.TOKEN_TYPE_ACCESS.equalsIgnoreCase(tokenType)
                        && tokenUser.equalsIgnoreCase(user.getEmail())) {
                    tokenRevocationService.blacklistToken(
                            jwtService.extractTokenId(accessToken),
                            jwtService.extractExpiration(accessToken)
                    );
                }
            } catch (Exception ignored) {
                // Invalid token during logout is treated as no-op for access token revocation.
            }
        }

        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            try {
                String refreshType = jwtService.extractTokenType(request.refreshToken());
                String refreshUser = jwtService.extractUsername(request.refreshToken());
                String refreshTokenId = jwtService.extractTokenId(request.refreshToken());
                if (JwtService.TOKEN_TYPE_REFRESH.equalsIgnoreCase(refreshType)
                        && refreshUser.equalsIgnoreCase(user.getEmail())) {
                    refreshTokenRepository.findByTokenIdAndRevokedFalse(refreshTokenId)
                            .ifPresent(token -> {
                                token.setRevoked(true);
                                token.setRevokedAt(OffsetDateTime.now());
                                refreshTokenRepository.save(token);
                            });
                }
            } catch (Exception ignored) {
                // Invalid refresh token input should not break logout.
            }
        } else {
            refreshTokenRepository.revokeAllActiveByUserId(user.getId(), OffsetDateTime.now());
        }
    }

    public OtpResponse requestPasswordResetOtp(PasswordResetOtpRequest request) {
        PasswordResetTarget target = getPasswordResetTarget(request.email(), request.phone());
        String phone = target.byPhone() ? target.user().getPhone() : null;
        return otpService.createPasswordResetOtp(target.user().getEmail(), phone, target.user().getFullName());
    }

    public OtpResponse requestEmailVerificationOtp(String currentEmail) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return otpService.createEmailVerificationOtp(user.getEmail(), user.getFullName());
    }

    @Transactional
    public UserProfileResponse verifyEmailOtp(String currentEmail, String otpCode) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.isEmailVerified()) {
            return AuthMapper.toProfile(user);
        }

        otpService.verifyEmailOtp(user.getEmail(), otpCode);
        user.setEmailVerified(true);
        User saved = userRepository.save(user);
        sendPostVerificationWelcome(saved);
        return AuthMapper.toProfile(saved);
    }

    private void sendPostVerificationWelcome(User user) {
        if (!isEmailableAddress(user.getEmail())) {
            return;
        }
        if (Role.RESTAURANT_OWNER.equals(user.getRole())) {
            emailSender.sendPartnerSignupEmail(user.getEmail(), user.getFullName(), "Restaurant Partner");
            return;
        }
        if (Role.DELIVERY_AGENT.equals(user.getRole())) {
            emailSender.sendPartnerSignupEmail(user.getEmail(), user.getFullName(), "Delivery Agent");
            return;
        }
        emailSender.sendWelcomeEmail(user.getEmail(), user.getFullName());
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        PasswordResetTarget target = getPasswordResetTarget(request.email(), request.phone());
        User user = target.user();
        String phone = target.byPhone() ? user.getPhone() : null;

        otpService.verifyPasswordResetOtp(user.getEmail(), phone, request.otp());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private User resolveLoginUser(LoginRequest request) {
        String email = normalizeEmail(request.email());
        String phone = normalizePhone(request.phone());

        if (email != null) {
            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
            if (isEmailableAddress(user.getEmail()) && !user.isEmailVerified()) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Email not verified. Please verify OTP to continue.");
            }
            return user;
        }

        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!user.isPhoneVerified()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return user;
    }

    private User getVerifiedUserByPhone(String phone) {
        User user = userRepository.findByPhone(normalizePhone(phone))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid phone or OTP"));
        if (!user.isPhoneVerified()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Phone number is not verified");
        }
        return user;
    }

    private User getUserByPhone(String phone) {
        return userRepository.findByPhone(normalizePhone(phone))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid phone or OTP"));
    }

    private AuthResponse finalizeSuccessfulLogin(User user, String ipAddress, String userAgent, String locationLabel) {
        LoginContext context = new LoginContext(ipAddress, userAgent, locationLabel, OffsetDateTime.now());
        boolean unknownContext = isUnknownLoginContext(user, context);

        notificationService.publish(
                user,
                NotificationType.LOGIN_ALERT,
                "auth:login:user:" + user.getId() + ":" + context.loggedInAt().toInstant().toEpochMilli(),
                "New login detected",
                "A login was recorded for your account from " + normalizeText(context.locationLabel(), "Unknown location") + ".",
                "IP: " + normalizeText(context.ipAddress(), "Unknown IP"),
                false
        );

        if (unknownContext && isEmailableAddress(user.getEmail())) {
            emailSender.sendUnknownLoginAlert(
                    user.getEmail(),
                    user.getFullName(),
                    normalizeText(context.ipAddress(), "Unknown IP"),
                    normalizeText(context.locationLabel(), "Unknown location"),
                    normalizeText(context.userAgent(), "Unknown device"),
                    LOGIN_TIME_FORMAT.format(context.loggedInAt())
            );
        }

        updateLastLoginMetadata(user, context);
        userRepository.save(user);
        return issueTokenPair(user, true);
    }

    private String normalizeEmail(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? null : normalized.toLowerCase();
    }

    private String normalizePhone(String value) {
        return trimToNull(value);
    }

    private String buildPhoneAliasEmail(String phone) {
        return "phone." + phone + "@phone.urbanbites.local";
    }

    private PasswordResetTarget getPasswordResetTarget(String email, String phone) {
        if (hasText(email)) {
            User user = userRepository.findByEmailIgnoreCase(email.trim().toLowerCase())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
            return new PasswordResetTarget(user, false);
        }

        User user = userRepository.findByPhone(phone.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (!user.isPhoneVerified()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Phone is not verified");
        }
        return new PasswordResetTarget(user, true);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean isUnknownLoginContext(User user, LoginContext context) {
        if (user.getLastLoginAt() == null) {
            return false;
        }
        return isContextChanged(user.getLastLoginIp(), context.ipAddress())
                || isContextChanged(user.getLastLoginUserAgent(), context.userAgent())
                || isContextChanged(user.getLastLoginLocation(), context.locationLabel());
    }

    private boolean isContextChanged(String previousValue, String currentValue) {
        return !sameValueIgnoreCase(previousValue, currentValue);
    }

    private void updateLastLoginMetadata(User user, LoginContext context) {
        user.setLastLoginIp(trimToNull(context.ipAddress()));
        user.setLastLoginUserAgent(trimToNull(context.userAgent()));
        user.setLastLoginLocation(trimToNull(context.locationLabel()));
        user.setLastLoginAt(context.loggedInAt());
    }

    private boolean sameValueIgnoreCase(String left, String right) {
        String normalizedLeft = trimToNull(left);
        String normalizedRight = trimToNull(right);
        if (normalizedLeft == null && normalizedRight == null) {
            return true;
        }
        if (normalizedLeft == null || normalizedRight == null) {
            return false;
        }
        return normalizedLeft.equalsIgnoreCase(normalizedRight);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeText(String value, String fallback) {
        String normalized = trimToNull(value);
        return normalized == null ? fallback : normalized;
    }

    private boolean isEmailableAddress(String email) {
        String normalized = normalizeEmail(email);
        return normalized != null && !normalized.endsWith("@phone.urbanbites.local");
    }

    private AuthResponse issueTokenPair(User user, boolean loggedIn) {
        JwtService.TokenDetails accessToken = jwtService.generateAccessToken(user.getEmail());
        JwtService.TokenDetails refreshToken = jwtService.generateRefreshToken(user.getEmail());

        RefreshToken refreshTokenEntity = new RefreshToken();
        refreshTokenEntity.setUser(user);
        refreshTokenEntity.setTokenId(refreshToken.tokenId());
        refreshTokenEntity.setExpiresAt(refreshToken.expiresAt());
        refreshTokenRepository.save(refreshTokenEntity);

        return new AuthResponse(
                user.getId(),
                accessToken.token(),
                refreshToken.token(),
                "Bearer",
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                loggedIn
        );
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        return authorizationHeader.substring(7).trim();
    }

    private record LoginContext(String ipAddress, String userAgent, String locationLabel, OffsetDateTime loggedInAt) {
    }

    private record PasswordResetTarget(User user, boolean byPhone) {
    }
}


