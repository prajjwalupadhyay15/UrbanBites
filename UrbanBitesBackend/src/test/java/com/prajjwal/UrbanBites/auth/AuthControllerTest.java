package com.prajjwal.UrbanBites.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.dto.request.LoginRequest;
import com.prajjwal.UrbanBites.dto.request.PasswordResetConfirmRequest;
import com.prajjwal.UrbanBites.dto.request.PasswordResetOtpRequest;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.enums.OtpPurpose;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.UrbanBitesApplication;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = UrbanBitesApplication.class)
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerAndLogin_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer1@example.com",
                "TestPass123",
                "Customer One",
                Role.CUSTOMER
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.loggedIn").value(false));

        LoginRequest loginRequest = new LoginRequest("customer1@example.com", null, "TestPass123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Email not verified. Please verify OTP to continue."));
    }

    @Test
    void passwordResetWithOtp_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer4@example.com",
                "TestPass123",
                "Customer Four",
                Role.CUSTOMER
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        PasswordResetOtpRequest otpRequest = new PasswordResetOtpRequest("customer4@example.com", null);
        MvcResult otpResult = mockMvc.perform(post("/api/v1/auth/password-reset/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(otpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otp").isNotEmpty())
                .andReturn();

        String otp = objectMapper.readTree(otpResult.getResponse().getContentAsString()).get("otp").asText();

        PasswordResetConfirmRequest confirmRequest = new PasswordResetConfirmRequest(
                "customer4@example.com",
                null,
                otp,
                "NewPass123"
        );

        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password reset successful"));

        LoginRequest newLoginRequest = new LoginRequest("customer4@example.com", null, "NewPass123");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLoginRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Email not verified. Please verify OTP to continue."));

        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("OTP not found"));
    }

    @Test
    void passwordResetWithPhoneUsingExistingEndpoints_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer6@example.com",
                "TestPass123",
                "Customer Six",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("accessToken").asText();

        Map<String, Object> phoneOtpRequest = Map.of(
                "phone", "9998887775",
                "purpose", OtpPurpose.PHONE_VERIFICATION.name()
        );

        MvcResult phoneOtpResult = mockMvc.perform(post("/api/v1/users/me/phone/request-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(phoneOtpRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String phoneOtp = objectMapper.readTree(phoneOtpResult.getResponse().getContentAsString()).get("otp").asText();

        Map<String, Object> verifyPhoneRequest = Map.of(
                "phone", "9998887775",
                "purpose", OtpPurpose.PHONE_VERIFICATION.name(),
                "otp", phoneOtp
        );

        mockMvc.perform(post("/api/v1/users/me/phone/verify-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyPhoneRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerified").value(true));

        PasswordResetOtpRequest resetOtpRequest = new PasswordResetOtpRequest(null, "9998887775");
        MvcResult resetOtpResult = mockMvc.perform(post("/api/v1/auth/password-reset/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otp").isNotEmpty())
                .andReturn();

        String resetOtp = objectMapper.readTree(resetOtpResult.getResponse().getContentAsString()).get("otp").asText();

        PasswordResetConfirmRequest confirmRequest = new PasswordResetConfirmRequest(
                null,
                "9998887775",
                resetOtp,
                "NewPass123"
        );

        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password reset successful"));

        LoginRequest newLoginRequest = new LoginRequest("customer6@example.com", null, "NewPass123");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLoginRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Email not verified. Please verify OTP to continue."));
    }

    @Test
    void loginWithVerifiedPhone_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer9@example.com",
                "TestPass123",
                "Customer Nine",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("accessToken").asText();

        Map<String, Object> phoneOtpRequest = Map.of(
                "phone", "9998887765",
                "purpose", OtpPurpose.PHONE_VERIFICATION.name()
        );

        MvcResult phoneOtpResult = mockMvc.perform(post("/api/v1/users/me/phone/request-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(phoneOtpRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String phoneOtp = objectMapper.readTree(phoneOtpResult.getResponse().getContentAsString()).get("otp").asText();

        Map<String, Object> verifyPhoneRequest = Map.of(
                "phone", "9998887765",
                "purpose", OtpPurpose.PHONE_VERIFICATION.name(),
                "otp", phoneOtp
        );

        mockMvc.perform(post("/api/v1/users/me/phone/verify-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyPhoneRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerified").value(true));

        LoginRequest phoneLoginRequest = new LoginRequest(null, "9998887765", "TestPass123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(phoneLoginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value("customer9@example.com"));
    }

    @Test
    void loginWithPhoneOtp_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer10@example.com",
                "TestPass123",
                "Customer Ten",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("accessToken").asText();

        Map<String, Object> phoneOtpRequest = Map.of(
                "phone", "9998887764",
                "purpose", OtpPurpose.PHONE_VERIFICATION.name()
        );

        MvcResult phoneOtpResult = mockMvc.perform(post("/api/v1/users/me/phone/request-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(phoneOtpRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String phoneOtp = objectMapper.readTree(phoneOtpResult.getResponse().getContentAsString()).get("otp").asText();

        Map<String, Object> verifyPhoneRequest = Map.of(
                "phone", "9998887764",
                "purpose", OtpPurpose.PHONE_VERIFICATION.name(),
                "otp", phoneOtp
        );

        mockMvc.perform(post("/api/v1/users/me/phone/verify-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyPhoneRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerified").value(true));

        Map<String, Object> loginOtpRequest = Map.of("phone", "9998887764");
        MvcResult loginOtpResult = mockMvc.perform(post("/api/v1/auth/login/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otp").isNotEmpty())
                .andReturn();

        String loginOtp = objectMapper.readTree(loginOtpResult.getResponse().getContentAsString()).get("otp").asText();
        Map<String, Object> verifyLoginOtpRequest = Map.of(
                "phone", "9998887764",
                "otp", loginOtp
        );

        mockMvc.perform(post("/api/v1/auth/login/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyLoginOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value("customer10@example.com"));
    }

    @Test
    void phoneFirstSignup_thenOtpLogin_thenPasswordLoginByPhone_success() throws Exception {
        Map<String, Object> registerRequest = Map.of(
                "phone", "9998887763",
                "password", "TestPass123",
                "fullName", "Customer Eleven",
                "role", Role.CUSTOMER.name()
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(org.hamcrest.Matchers.containsString("@phone.urbanbites.local")));

        Map<String, Object> loginOtpRequest = Map.of("phone", "9998887763");
        MvcResult loginOtpResult = mockMvc.perform(post("/api/v1/auth/login/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otp").isNotEmpty())
                .andReturn();

        String loginOtp = objectMapper.readTree(loginOtpResult.getResponse().getContentAsString()).get("otp").asText();
        Map<String, Object> verifyLoginOtpRequest = Map.of(
                "phone", "9998887763",
                "otp", loginOtp
        );

        mockMvc.perform(post("/api/v1/auth/login/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyLoginOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());

        Map<String, Object> passwordLoginRequest = Map.of(
                "phone", "9998887763",
                "password", "TestPass123"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(passwordLoginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void refreshTokenRotation_rejectsReusingOldRefreshToken() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer7@example.com",
                "TestPass123",
                "Customer Seven",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String oldRefreshToken = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("refreshToken").asText();

        Map<String, Object> refreshRequest = Map.of("refreshToken", oldRefreshToken);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Refresh token expired or revoked"));
    }

    @Test
    void logout_blacklistsAccessTokenAndRevokesRefreshToken() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer8@example.com",
                "TestPass123",
                "Customer Eight",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String accessToken = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("accessToken").asText();
        String refreshToken = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("refreshToken").asText();

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("OTP verification required before accessing this resource"));

        Map<String, Object> logoutRequest = Map.of("refreshToken", refreshToken);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out successfully"));

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Refresh token expired or revoked"));
    }

}

