package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.response.OtpResponse;
import com.prajjwal.UrbanBites.entity.OtpVerification;
import com.prajjwal.UrbanBites.enums.OtpPurpose;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.OtpVerificationRepository;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OtpService {

    private static final int OTP_TTL_MINUTES = 5;
    private static final int OTP_MAX_ATTEMPTS = 5;
    private static final int OTP_LOCK_MINUTES = 10;
    private static final int OTP_RESEND_COOLDOWN_SECONDS = 30;
    private static final DateTimeFormatter EXPIRY_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final OtpVerificationRepository otpVerificationRepository;
    private final EmailSender emailSender;
    private final SmsSender smsSender;

    public OtpService(OtpVerificationRepository otpVerificationRepository, EmailSender emailSender, SmsSender smsSender) {
        this.otpVerificationRepository = otpVerificationRepository;
        this.emailSender = emailSender;
        this.smsSender = smsSender;
    }

    @Transactional
    public OtpResponse createPhoneOtp(String email, String phone, OtpPurpose purpose) {
        if (purpose != OtpPurpose.PHONE_VERIFICATION && purpose != OtpPurpose.PHONE_UPDATE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid OTP purpose for phone flow");
        }
        OtpVerification otp = buildOtp(email, normalizePhone(phone), purpose);
        otpVerificationRepository.save(otp);
        smsSender.sendOtp(otp.getPhone(), "Customer", otp.getOtpCode(), EXPIRY_FORMAT.format(otp.getExpiresAt()));
        return new OtpResponse("OTP sent", otp.getOtpCode(), otp.getExpiresAt());
    }

    @Transactional
    public OtpResponse createPhoneLoginOtp(String email, String phone) {
        OtpVerification otp = buildOtp(normalizeEmail(email), normalizePhone(phone), OtpPurpose.PHONE_LOGIN);
        otpVerificationRepository.save(otp);
        smsSender.sendOtp(otp.getPhone(), "Customer", otp.getOtpCode(), EXPIRY_FORMAT.format(otp.getExpiresAt()));
        return new OtpResponse("OTP sent", otp.getOtpCode(), otp.getExpiresAt());
    }

    @Transactional
    public void verifyPhoneOtp(String email, String phone, OtpPurpose purpose, String otpCode) {
        OtpVerification otp = otpVerificationRepository
                .findTopByEmailAndPhoneAndPurposeAndUsedFalseOrderByCreatedAtDesc(email, normalizePhone(phone), purpose)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "OTP not found"));

        verifyAndConsume(otp, otpCode);
    }

    @Transactional
    public void verifyPhoneLoginOtp(String email, String phone, String otpCode) {
        OtpVerification otp = otpVerificationRepository
                .findTopByEmailAndPhoneAndPurposeAndUsedFalseOrderByCreatedAtDesc(
                        normalizeEmail(email),
                        normalizePhone(phone),
                        OtpPurpose.PHONE_LOGIN
                )
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "OTP not found"));

        verifyAndConsume(otp, otpCode);
    }

    @Transactional
    public OtpResponse createPasswordResetOtp(String email, String phone, String fullName) {
        OtpVerification otp = buildOtp(email, normalizePhone(phone), OtpPurpose.PASSWORD_RESET);
        otpVerificationRepository.save(otp);
        if (otp.getPhone() != null && !otp.getPhone().isBlank()) {
            smsSender.sendOtp(otp.getPhone(), fullName, otp.getOtpCode(), EXPIRY_FORMAT.format(otp.getExpiresAt()));
        }
        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            emailSender.sendPasswordResetOtp(normalizedEmail, fullName, otp.getOtpCode(), EXPIRY_FORMAT.format(otp.getExpiresAt()));
        }
        return new OtpResponse("OTP sent", otp.getOtpCode(), otp.getExpiresAt());
    }

    @Transactional
    public OtpResponse createEmailVerificationOtp(String email, String fullName) {
        OtpVerification otp = buildOtp(email.trim().toLowerCase(), null, OtpPurpose.EMAIL_VERIFICATION);
        otpVerificationRepository.save(otp);
        emailSender.sendEmailVerificationOtp(email, fullName, otp.getOtpCode(), EXPIRY_FORMAT.format(otp.getExpiresAt()));
        return new OtpResponse("OTP sent", otp.getOtpCode(), otp.getExpiresAt());
    }

    @Transactional
    public void verifyPasswordResetOtp(String email, String phone, String otpCode) {
        OtpVerification otp = otpVerificationRepository
                .findTopByEmailAndPhoneAndPurposeAndUsedFalseOrderByCreatedAtDesc(
                        normalizeEmail(email),
                        normalizePhone(phone),
                        OtpPurpose.PASSWORD_RESET
                )
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "OTP not found"));

        verifyAndConsume(otp, otpCode);
    }

    @Transactional
    public void verifyEmailOtp(String email, String otpCode) {
        OtpVerification otp = otpVerificationRepository
                .findTopByEmailAndPhoneAndPurposeAndUsedFalseOrderByCreatedAtDesc(
                        email.trim().toLowerCase(),
                        null,
                        OtpPurpose.EMAIL_VERIFICATION
                )
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "OTP not found"));

        verifyAndConsume(otp, otpCode);
    }

    private OtpVerification buildOtp(String email, String phone, OtpPurpose purpose) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedPhone = normalizePhone(phone);
        validateResendCooldown(normalizedEmail, normalizedPhone, purpose);
        otpVerificationRepository.invalidateActiveOtps(normalizedEmail, normalizedPhone, purpose, OffsetDateTime.now());

        OtpVerification otp = new OtpVerification();
        otp.setEmail(normalizedEmail);
        otp.setPhone(normalizedPhone);
        otp.setPurpose(purpose);
        otp.setOtpCode(generateOtp());
        otp.setExpiresAt(OffsetDateTime.now().plusMinutes(OTP_TTL_MINUTES));
        otp.setUsed(false);
        otp.setAttemptCount(0);
        otp.setLockedUntil(null);
        otp.setUsedAt(null);
        return otp;
    }

    private void verifyAndConsume(OtpVerification otp, String otpCode) {
        OffsetDateTime now = OffsetDateTime.now();
        if (otp.getLockedUntil() != null && otp.getLockedUntil().isAfter(now)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Try again later");
        }

        if (otp.getExpiresAt().isBefore(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP expired");
        }

        if (!otp.getOtpCode().equals(otpCode)) {
            int nextAttemptCount = otp.getAttemptCount() + 1;
            otp.setAttemptCount(nextAttemptCount);
            if (nextAttemptCount >= OTP_MAX_ATTEMPTS) {
                otp.setLockedUntil(now.plusMinutes(OTP_LOCK_MINUTES));
                otpVerificationRepository.save(otp);
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Try again later");
            }
            otpVerificationRepository.save(otp);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        otp.setUsed(true);
        otp.setUsedAt(now);
        otpVerificationRepository.save(otp);
    }

    private void validateResendCooldown(String email, String phone, OtpPurpose purpose) {
        otpVerificationRepository
                .findTopByEmailAndPhoneAndPurposeOrderByCreatedAtDesc(email, phone, purpose)
                .ifPresent(existing -> {
                    OffsetDateTime nextAllowedAt = existing.getCreatedAt().plusSeconds(OTP_RESEND_COOLDOWN_SECONDS);
                    if (nextAllowedAt.isAfter(OffsetDateTime.now())) {
                        throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another OTP");
                    }
                });
    }

    private String generateOtp() {
        int number = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return String.valueOf(number);
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String normalized = phone.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String normalized = email.trim().toLowerCase();
        return normalized.isEmpty() ? null : normalized;
    }
}

