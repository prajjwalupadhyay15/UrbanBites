package com.prajjwal.UrbanBites.cart;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prajjwal.UrbanBites.UrbanBitesApplication;
import com.prajjwal.UrbanBites.dto.request.RegisterRequest;
import com.prajjwal.UrbanBites.entity.PricingRule;
import com.prajjwal.UrbanBites.enums.PackingPolicyType;
import com.prajjwal.UrbanBites.enums.PlatformFeeType;
import com.prajjwal.UrbanBites.enums.Role;
import com.prajjwal.UrbanBites.repository.MenuItemRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleRepository;
import java.math.BigDecimal;
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

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = UrbanBitesApplication.class)
@AutoConfigureMockMvc
class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PricingRuleRepository pricingRuleRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Test
    void cartCrud_addUpdateRemoveClear_success() throws Exception {
        String ownerToken = registerAndGetAccessToken("owner.cart.crud@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Cart CRUD Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Paneer Bowl", "199.00");

        String customerToken = registerAndGetAccessToken("customer.cart.crud@example.com", Role.CUSTOMER);

        MvcResult addResult = mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", 2,
                                "notes", "Less spicy"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.restaurantId").value(restaurantId))
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[0].menuItemId").value(menuItemId))
                .andReturn();

        JsonNode addJson = objectMapper.readTree(addResult.getResponse().getContentAsString());
        Long cartItemId = addJson.get("items").get(0).get("id").asLong();

        mockMvc.perform(put("/api/v1/cart/items/{itemId}", cartItemId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "quantity", 3,
                                "notes", "No onion"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.items[0].notes").value("No onion"));

        mockMvc.perform(delete("/api/v1/cart/items/{itemId}", cartItemId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Item removed"));

        mockMvc.perform(get("/api/v1/cart")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(0))
                .andExpect(jsonPath("$.items").isEmpty());

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", 1
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/cart/clear")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Cart cleared"));

        mockMvc.perform(get("/api/v1/cart")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(0))
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void addItem_fromDifferentRestaurant_returnsConflict() throws Exception {
        String ownerToken = registerAndGetAccessToken("owner.cart.conflict@example.com", Role.RESTAURANT_OWNER);
        Long restaurantA = createRestaurant(ownerToken, "Restaurant A", "18.5204", "73.8567");
        Long restaurantB = createRestaurant(ownerToken, "Restaurant B", "18.5300", "73.8600");
        Long itemA = createMenuItem(ownerToken, restaurantA, "A Item", "149.00");
        Long itemB = createMenuItem(ownerToken, restaurantB, "B Item", "179.00");

        String customerToken = registerAndGetAccessToken("customer.cart.conflict@example.com", Role.CUSTOMER);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", itemA,
                                "quantity", 1
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", itemB,
                                "quantity", 1
                        ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Cart already contains items from another restaurant"));
    }

    @Test
    void checkoutPreview_returnsFeeBreakupAndRuleVersion() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.cart.preview@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Preview Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Preview Meal", "249.00");

        String customerToken = registerAndGetAccessToken("customer.cart.preview@example.com", Role.CUSTOMER);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", 2
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/users/me/addresses")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "label", "Home",
                                "line1", "Street 1",
                                "city", "Pune",
                                "state", "MH",
                                "pincode", "411001",
                                "latitude", 18.5310,
                                "longitude", 73.8470,
                                "contactName", "Cart Customer",
                                "contactPhone", "9998881111",
                                "isDefault", true
                        ))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/cart/checkout-preview")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceable").value(true))
                .andExpect(jsonPath("$.serviceabilityReason").value("Serviceable"))
                .andExpect(jsonPath("$.fees.pricingRuleVersion").value("v1"))
                .andExpect(jsonPath("$.fees.subtotal").value(498.00))
                .andExpect(jsonPath("$.fees.deliveryFee").value(0.00))
                .andExpect(jsonPath("$.fees.grandTotal").value(greaterThan(0.0)));
    }

    @Test
    void addItem_withInvalidQuantity_returnsBadRequest() throws Exception {
        String ownerToken = registerAndGetAccessToken("owner.cart.validation@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Validation Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Validation Meal", "129.00");

        String customerToken = registerAndGetAccessToken("customer.cart.validation@example.com", Role.CUSTOMER);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", 0
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("quantity must be greater than or equal to 1"));
    }

    @Test
    void addItem_withUnavailableMenuItem_returnsBadRequest() throws Exception {
        String ownerToken = registerAndGetAccessToken("owner.cart.unavailable@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Unavailable Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Unavailable Meal", "139.00", false);

        // Sanity check that the item is actually unavailable.
        menuItemRepository.findById(menuItemId).ifPresent(item -> item.setAvailable(false));
        menuItemRepository.findById(menuItemId).ifPresent(menuItemRepository::save);

        String customerToken = registerAndGetAccessToken("customer.cart.unavailable@example.com", Role.CUSTOMER);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", 1
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Menu item not available"));
    }

    @Test
    void checkoutPreview_withoutDefaultAddress_returnsBadRequest() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.cart.noaddress@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "No Address Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "No Address Meal", "199.00");

        String customerToken = registerAndGetAccessToken("customer.cart.noaddress@example.com", Role.CUSTOMER);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", 1
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/cart/checkout-preview")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Default address not found"));
    }

    @Test
    void cartEndpoints_forbiddenForRestaurantOwner() throws Exception {
        String ownerToken = registerAndGetAccessToken("owner.cart.forbidden@example.com", Role.RESTAURANT_OWNER);

        mockMvc.perform(get("/api/v1/cart")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void checkoutPreview_withActiveCartButNoItems_returnsBadRequest() throws Exception {
        ensureActivePricingRule();

        String ownerToken = registerAndGetAccessToken("owner.cart.emptypreview@example.com", Role.RESTAURANT_OWNER);
        Long restaurantId = createRestaurant(ownerToken, "Empty Preview Restaurant", "18.5204", "73.8567");
        Long menuItemId = createMenuItem(ownerToken, restaurantId, "Temp Meal", "159.00");

        String customerToken = registerAndGetAccessToken("customer.cart.emptypreview@example.com", Role.CUSTOMER);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "menuItemId", menuItemId,
                                "quantity", 1
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/cart/clear")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/cart/checkout-preview")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cart is empty"));
    }

    private String registerAndGetAccessToken(String email, Role role) throws Exception {
        RegisterRequest request = new RegisterRequest(email, "TestPass123", "Cart Test User", role);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private Long createRestaurant(String ownerToken, String name, String latitude, String longitude) throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "restaurant.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "restaurant-image".getBytes(StandardCharsets.UTF_8)
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/restaurants/me")
                        .file(image)
                        .param("name", name)
                        .param("description", "Test restaurant")
                        .param("addressLine", "MG Road")
                        .param("city", "Pune")
                        .param("latitude", latitude)
                        .param("longitude", longitude)
                        .param("openNow", "true")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createMenuItem(String ownerToken, Long restaurantId, String name, String price) throws Exception {
        return createMenuItem(ownerToken, restaurantId, name, price, true);
    }

    private Long createMenuItem(String ownerToken, Long restaurantId, String name, String price, boolean available) throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "menu.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "menu-image".getBytes(StandardCharsets.UTF_8)
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/restaurants/me/{restaurantId}/menu", restaurantId)
                        .file(image)
                        .param("name", name)
                        .param("description", "Test item")
                        .param("price", price)
                        .param("veg", "true")
                        .param("available", String.valueOf(available))
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void ensureActivePricingRule() {
        if (pricingRuleRepository.findTopByActiveTrueOrderByVersionDesc().isPresent()) {
            return;
        }

        PricingRule rule = new PricingRule();
        rule.setVersion("v1");
        rule.setActive(true);
        rule.setBaseFee(BigDecimal.valueOf(20));
        rule.setSlabKmCutoff(BigDecimal.valueOf(3));
        rule.setSlabFee(BigDecimal.valueOf(10));
        rule.setPerKmRate(BigDecimal.valueOf(8));
        rule.setSurgePeakMultiplier(BigDecimal.valueOf(1.2));
        rule.setSurgeRainMultiplier(BigDecimal.valueOf(1.1));
        rule.setMinDeliveryFee(BigDecimal.valueOf(15));
        rule.setMaxDeliveryFee(BigDecimal.valueOf(120));
        rule.setFreeDeliveryThreshold(BigDecimal.valueOf(299));
        rule.setPlatformFeeType(PlatformFeeType.FIXED);
        rule.setPlatformFeeValue(BigDecimal.valueOf(5));
        rule.setTaxPercent(BigDecimal.valueOf(5));
        rule.setPackingPolicy(PackingPolicyType.ITEM_LEVEL);
        rule.setPackingValue(BigDecimal.ZERO);
        pricingRuleRepository.save(rule);
    }
}





