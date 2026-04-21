package com.prajjwal.UrbanBites.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.UrbanBitesApplication;
import com.prajjwal.UrbanBites.dto.request.LoginRequest;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.enums.OtpPurpose;
import com.prajjwal.UrbanBites.enums.Role;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = UrbanBitesApplication.class)
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void me_requiresAuthAndReturnsProfile() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer2@example.com",
                "TestPass123",
                "Customer Two",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("accessToken").asText();

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("customer2@example.com"))
                .andExpect(jsonPath("$.fullName").value("Customer Two"));
    }

    @Test
    void updateProfileAndPhoneOtp_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer3@example.com",
                "TestPass123",
                "Customer Three",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("accessToken").asText();

        MockMultipartFile profileImage = new MockMultipartFile(
                "profileImage",
                "profile.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-profile-image".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/v1/users/me")
                        .file(profileImage)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        })
                        .header("Authorization", "Bearer " + token)
                        .param("fullName", "Customer Three Updated")
                        .param("email", "customer3.updated@example.com")
                        .param("gender", "MALE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("customer3.updated@example.com"))
                .andExpect(jsonPath("$.gender").value("MALE"))
                .andExpect(jsonPath("$.profilePictureUrl").value(org.hamcrest.Matchers.startsWith("/api/v1/images/profiles/")));

        LoginRequest reloginRequest = new LoginRequest("customer3.updated@example.com", null, "TestPass123");
        MvcResult reloginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reloginRequest)))
                .andExpect(status().isOk())
                .andReturn();
        token = objectMapper.readTree(reloginResult.getResponse().getContentAsString()).get("accessToken").asText();

        Map<String, Object> phoneOtpRequest = Map.of(
                "phone", "9998887776",
                "purpose", OtpPurpose.PHONE_UPDATE.name()
        );

        MvcResult otpResult = mockMvc.perform(post("/api/v1/users/me/phone/request-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(phoneOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otp").isNotEmpty())
                .andReturn();

        String otpCode = objectMapper.readTree(otpResult.getResponse().getContentAsString()).get("otp").asText();

        Map<String, Object> phoneVerifyRequest = Map.of(
                "phone", "9998887776",
                "purpose", OtpPurpose.PHONE_UPDATE.name(),
                "otp", otpCode
        );

        mockMvc.perform(post("/api/v1/users/me/phone/verify-otp")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(phoneVerifyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("9998887776"))
                .andExpect(jsonPath("$.phoneVerified").value(true));
    }

    @Test
    void addressCrudAndDefaultSwitch_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "customer5@example.com",
                "TestPass123",
                "Customer Five",
                Role.CUSTOMER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("accessToken").asText();

        Map<String, Object> firstAddress = Map.of(
                "label", "Home",
                "line1", "Street 1",
                "city", "Pune",
                "state", "MH",
                "pincode", "411001",
                "contactName", "Customer Five",
                "contactPhone", "9998887771",
                "isDefault", false
        );

        MvcResult firstAddressResult = mockMvc.perform(post("/api/v1/users/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstAddress)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isDefault").value(true))
                .andReturn();

        Long firstAddressId = objectMapper.readTree(firstAddressResult.getResponse().getContentAsString()).get("id").asLong();

        Map<String, Object> secondAddress = Map.of(
                "label", "Work",
                "line1", "Street 2",
                "city", "Pune",
                "state", "MH",
                "pincode", "411002",
                "contactName", "Customer Five",
                "contactPhone", "9998887772",
                "isDefault", false
        );

        MvcResult secondAddressResult = mockMvc.perform(post("/api/v1/users/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secondAddress)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isDefault").value(false))
                .andReturn();

        Long secondAddressId = objectMapper.readTree(secondAddressResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/v1/users/me/addresses/{addressId}/default", secondAddressId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(secondAddressId))
                .andExpect(jsonPath("$.isDefault").value(true));

        mockMvc.perform(get("/api/v1/users/me/addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(secondAddressId))
                .andExpect(jsonPath("$[0].isDefault").value(true));

        mockMvc.perform(delete("/api/v1/users/me/addresses/{addressId}", secondAddressId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Address deleted"));

        mockMvc.perform(get("/api/v1/users/me/addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(firstAddressId))
                .andExpect(jsonPath("$[0].isDefault").value(true));
    }

    @Test
    void addressEndpoints_forbiddenForRestaurantOwner() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "owner1@example.com",
                "TestPass123",
                "Restaurant Owner",
                Role.RESTAURANT_OWNER
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(registerResult.getResponse().getContentAsString()).get("accessToken").asText();

        mockMvc.perform(get("/api/v1/users/me/addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}


