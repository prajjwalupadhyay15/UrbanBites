package com.prajjwal.UrbanBites.restaurant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.UrbanBitesApplication;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = UrbanBitesApplication.class)
@AutoConfigureMockMvc
class RestaurantPhase4ControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Test
    void ownerCanUploadRestaurantAndMenuImages_andDiscoverByLocation() throws Exception {
        String ownerToken = registerAndGetAccessToken("owner.phase4@example.com", Role.RESTAURANT_OWNER);

        MockMultipartFile restaurantImage = new MockMultipartFile(
                "image",
                "restaurant.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-jpg-content".getBytes(StandardCharsets.UTF_8)
        );

        MvcResult restaurantResult = mockMvc.perform(multipart("/api/v1/restaurants/me")
                        .file(restaurantImage)
                        .param("name", "Urban Veg House")
                        .param("description", "Fresh veg and non-veg meals")
                        .param("addressLine", "MG Road")
                        .param("city", "Pune")
                        .param("latitude", "18.5204")
                        .param("longitude", "73.8567")
                        .param("openNow", "true")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imagePath").value(org.hamcrest.Matchers.startsWith("/api/v1/images/restaurants/")))
                .andReturn();

        JsonNode restaurantJson = objectMapper.readTree(restaurantResult.getResponse().getContentAsString());
        Long restaurantId = restaurantJson.get("id").asLong();
        String restaurantImagePath = restaurantJson.get("imagePath").asText();

        MockMultipartFile menuImage = new MockMultipartFile(
                "image",
                "paneer.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-paneer".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/v1/restaurants/me/{restaurantId}/menu", restaurantId)
                        .file(menuImage)
                        .param("name", "Paneer Tikka")
                        .param("description", "Smoky paneer cubes")
                        .param("price", "249.00")
                        .param("veg", "true")
                        .param("available", "true")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imagePath").value(org.hamcrest.Matchers.startsWith("/api/v1/images/menu-items/")))
                .andExpect(jsonPath("$.veg").value(true));

        mockMvc.perform(get("/api/v1/restaurants/discovery")
                        .param("latitude", "18.5204")
                        .param("longitude", "73.8567")
                        .param("radiusKm", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(restaurantId.intValue())))
                .andExpect(jsonPath("$[*].imagePath", hasItem(org.hamcrest.Matchers.startsWith("/api/v1/images/restaurants/"))));

        MvcResult menuListResult = mockMvc.perform(get("/api/v1/restaurants/{restaurantId}/menu", restaurantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].imagePath").value(org.hamcrest.Matchers.startsWith("/api/v1/images/menu-items/")))
                .andReturn();

        String menuImagePath = objectMapper.readTree(menuListResult.getResponse().getContentAsString()).get(0).get("imagePath").asText();

        mockMvc.perform(get(restaurantImagePath))
                .andExpect(status().isOk());

        mockMvc.perform(get(menuImagePath))
                .andExpect(status().isOk());
    }

    @Test
    void customerCannotCreateRestaurant() throws Exception {
        String customerToken = registerAndGetAccessToken("customer.phase4@example.com", Role.CUSTOMER);

        MockMultipartFile restaurantImage = new MockMultipartFile(
                "image",
                "restaurant.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-jpg-content".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/v1/restaurants/me")
                        .file(restaurantImage)
                        .param("name", "Blocked")
                        .param("addressLine", "Road")
                        .param("city", "Pune")
                        .param("latitude", "18.5204")
                        .param("longitude", "73.8567")
                        .param("openNow", "true")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void discoverySupportsAdvancedFacets() throws Exception {
        String ownerToken = registerAndGetAccessToken("owner.facets@example.com", Role.RESTAURANT_OWNER);

        Long vegRestaurantId = createRestaurant(ownerToken, "Green Bowl", "18.5204", "73.8567");
        createMenuItem(ownerToken, vegRestaurantId, "Salad Bowl", "149.00", true);
        updateRating(vegRestaurantId, "4.70", 130);

        Long nonVegRestaurantId = createRestaurant(ownerToken, "Smoky Grill", "18.5205", "73.8568");
        createMenuItem(ownerToken, nonVegRestaurantId, "Chicken Grill", "649.00", false);
        updateRating(nonVegRestaurantId, "3.90", 85);

        mockMvc.perform(get("/api/v1/restaurants/discovery")
                        .param("latitude", "18.5204")
                        .param("longitude", "73.8567")
                        .param("radiusKm", "5")
                        .param("foodType", "VEG")
                        .param("priceBracket", "BUDGET")
                        .param("minRating", "4.5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(vegRestaurantId.intValue()))
                .andExpect(jsonPath("$[0].avgRating").value(4.70))
                .andExpect(jsonPath("$[0].ratingCount").value(130));

        mockMvc.perform(get("/api/v1/restaurants/discovery")
                        .param("latitude", "18.5204")
                        .param("longitude", "73.8567")
                        .param("radiusKm", "5")
                        .param("foodType", "NON-VEG")
                        .param("priceBracket", "PREMIUM")
                        .param("minRating", "3.5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(nonVegRestaurantId.intValue()))
                .andExpect(jsonPath("$[0].avgRating").value(3.90))
                .andExpect(jsonPath("$[0].ratingCount").value(85));
    }

    private String registerAndGetAccessToken(String email, Role role) throws Exception {
        RegisterRequest request = new RegisterRequest(email, "TestPass123", "Phase Four User", role);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private Long createRestaurant(String token, String name, String latitude, String longitude) throws Exception {
        MockMultipartFile restaurantImage = new MockMultipartFile(
                "image",
                "restaurant.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                ("image-" + name).getBytes(StandardCharsets.UTF_8)
        );
        MvcResult result = mockMvc.perform(multipart("/api/v1/restaurants/me")
                        .file(restaurantImage)
                        .param("name", name)
                        .param("description", "Discovery facets")
                        .param("addressLine", "Main Road")
                        .param("city", "Pune")
                        .param("latitude", latitude)
                        .param("longitude", longitude)
                        .param("openNow", "true")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void createMenuItem(String token, Long restaurantId, String itemName, String price, boolean veg) throws Exception {
        MockMultipartFile menuImage = new MockMultipartFile(
                "image",
                "menu.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                ("menu-" + itemName).getBytes(StandardCharsets.UTF_8)
        );
        mockMvc.perform(multipart("/api/v1/restaurants/me/{restaurantId}/menu", restaurantId)
                        .file(menuImage)
                        .param("name", itemName)
                        .param("description", "Item for facets")
                        .param("price", price)
                        .param("veg", String.valueOf(veg))
                        .param("available", "true")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());
    }

    private void updateRating(Long restaurantId, String avgRating, int ratingCount) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElseThrow();
        restaurant.setAvgRating(new BigDecimal(avgRating));
        restaurant.setRatingCount(ratingCount);
        restaurantRepository.save(restaurant);
    }
}

