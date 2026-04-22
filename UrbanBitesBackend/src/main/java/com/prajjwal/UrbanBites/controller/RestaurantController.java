package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.AssignRestaurantZoneRequest;
import com.prajjwal.UrbanBites.dto.request.CreateMenuItemRequest;
import com.prajjwal.UrbanBites.dto.request.CreateRestaurantRequest;
import com.prajjwal.UrbanBites.dto.request.CreateServiceZoneRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateMenuItemRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateRestaurantRequest;
import com.prajjwal.UrbanBites.dto.response.MenuItemResponse;
import com.prajjwal.UrbanBites.dto.response.RestaurantResponse;
import com.prajjwal.UrbanBites.dto.response.ServiceZoneResponse;
import com.prajjwal.UrbanBites.service.ImageStorageService;
import com.prajjwal.UrbanBites.service.MenuService;
import com.prajjwal.UrbanBites.service.RestaurantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Validated
@RestController
@RequestMapping("/api/v1/restaurants")
public class RestaurantController {

    private final RestaurantService restaurantService;
    private final MenuService menuService;
    private final ImageStorageService imageStorageService;

    public RestaurantController(
            RestaurantService restaurantService,
            MenuService menuService,
            ImageStorageService imageStorageService
    ) {
        this.restaurantService = restaurantService;
        this.menuService = menuService;
        this.imageStorageService = imageStorageService;
    }

    @PostMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<RestaurantResponse> createMyRestaurant(
            Principal principal,
            @RequestParam @NotBlank String name,
            @RequestParam(required = false) String description,
            @RequestParam @NotBlank String addressLine,
            @RequestParam @NotBlank String city,
            @RequestParam(required = false) @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
            @RequestParam(required = false) @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
            @RequestParam boolean openNow,
            @RequestParam("image") MultipartFile image
    ) {
        String imagePath = imageStorageService.saveRestaurantImage(image);
        CreateRestaurantRequest request = new CreateRestaurantRequest(name, description, addressLine, city, latitude, longitude, openNow);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(restaurantService.createMyRestaurant(principal.getName(), request, imagePath));
    }

    @PutMapping(value = "/me/{restaurantId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<RestaurantResponse> updateMyRestaurant(
            Principal principal,
            @PathVariable Long restaurantId,
            @RequestParam @NotBlank String name,
            @RequestParam(required = false) String description,
            @RequestParam @NotBlank String addressLine,
            @RequestParam @NotBlank String city,
            @RequestParam(required = false) @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
            @RequestParam(required = false) @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
            @RequestParam boolean openNow,
            @RequestParam boolean active,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        String imagePath = image == null || image.isEmpty() ? null : imageStorageService.saveRestaurantImage(image);
        UpdateRestaurantRequest request = new UpdateRestaurantRequest(name, description, addressLine, city, latitude, longitude, openNow, active);
        return ResponseEntity.ok(restaurantService.updateMyRestaurant(principal.getName(), restaurantId, request, imagePath));
    }

    @PostMapping(value = "/me/{restaurantId}/menu", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<MenuItemResponse> createMenuItem(
            Principal principal,
            @PathVariable Long restaurantId,
            @RequestParam @NotBlank String name,
            @RequestParam(required = false) String description,
            @RequestParam @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal price,
            @RequestParam boolean veg,
            @RequestParam boolean available,
            @RequestParam(required = false) String category,
            @RequestParam("image") MultipartFile image
    ) {
        String imagePath = imageStorageService.saveMenuItemImage(image);
        CreateMenuItemRequest request = new CreateMenuItemRequest(name, description, price, veg, available, category);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(menuService.createMenuItem(principal.getName(), restaurantId, request, imagePath));
    }

    @PutMapping(value = "/me/{restaurantId}/menu/{menuItemId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<MenuItemResponse> updateMenuItem(
            Principal principal,
            @PathVariable Long restaurantId,
            @PathVariable Long menuItemId,
            @RequestParam @NotBlank String name,
            @RequestParam(required = false) String description,
            @RequestParam @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal price,
            @RequestParam boolean veg,
            @RequestParam boolean available,
            @RequestParam(required = false) String category,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        String imagePath = image == null || image.isEmpty() ? null : imageStorageService.saveMenuItemImage(image);
        UpdateMenuItemRequest request = new UpdateMenuItemRequest(name, description, price, veg, available, category);
        return ResponseEntity.ok(menuService.updateMenuItem(principal.getName(), restaurantId, menuItemId, request, imagePath));
    }

    @DeleteMapping("/me/{restaurantId}")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<Map<String, String>> deleteMyRestaurant(Principal principal, @PathVariable Long restaurantId) {
        restaurantService.deleteMyRestaurant(principal.getName(), restaurantId);
        return ResponseEntity.ok(Map.of("message", "Restaurant deleted"));
    }

    @DeleteMapping("/me/{restaurantId}/menu/{menuItemId}")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<Map<String, String>> deleteMenuItem(
            Principal principal,
            @PathVariable Long restaurantId,
            @PathVariable Long menuItemId
    ) {
        menuService.deleteMenuItem(principal.getName(), restaurantId, menuItemId);
        return ResponseEntity.ok(Map.of("message", "Menu item deleted"));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<List<RestaurantResponse>> listMyRestaurants(Principal principal) {
        return ResponseEntity.ok(restaurantService.listMyRestaurants(principal.getName()));
    }

    @GetMapping("/me/{restaurantId}/menu")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<List<MenuItemResponse>> listOwnerMenu(Principal principal, @PathVariable Long restaurantId) {
        return ResponseEntity.ok(menuService.listOwnerMenu(principal.getName(), restaurantId));
    }

    @GetMapping("/{restaurantId}/menu")
    public ResponseEntity<List<MenuItemResponse>> listPublicMenu(@PathVariable Long restaurantId) {
        return ResponseEntity.ok(menuService.listPublicMenu(restaurantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantResponse> getRestaurantById(@PathVariable Long id) {
        return ResponseEntity.ok(restaurantService.getRestaurantById(id));
    }

    @GetMapping("/discovery")
    public ResponseEntity<List<RestaurantResponse>> discoverRestaurants(
            @RequestParam @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
            @RequestParam @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
            @RequestParam(defaultValue = "10") @DecimalMin("0.1") @DecimalMax("50.0") double radiusKm,
            @RequestParam(required = false) String foodType,
            @RequestParam(required = false) String priceBracket,
            @RequestParam(required = false) @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal minRating
    ) {
        return ResponseEntity.ok(restaurantService.discoverByLocation(
                latitude,
                longitude,
                radiusKm,
                foodType,
                priceBracket,
                minRating));
    }

    @GetMapping("/search")
    public ResponseEntity<List<RestaurantResponse>> searchRestaurants(@RequestParam String q) {
        return ResponseEntity.ok(restaurantService.searchRestaurants(q));
    }

    @PostMapping("/zones")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServiceZoneResponse> createServiceZone(@Valid @RequestBody CreateServiceZoneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(restaurantService.createServiceZone(request));
    }

    @GetMapping("/zones")
    @PreAuthorize("hasAnyRole('ADMIN','RESTAURANT_OWNER')")
    public ResponseEntity<List<ServiceZoneResponse>> listZones() {
        return ResponseEntity.ok(restaurantService.listActiveServiceZones());
    }

    @PostMapping("/me/{restaurantId}/zones")
    @PreAuthorize("hasRole('RESTAURANT_OWNER')")
    public ResponseEntity<Map<String, String>> assignZoneRule(
            Principal principal,
            @PathVariable Long restaurantId,
            @Valid @RequestBody AssignRestaurantZoneRequest request
    ) {
        return ResponseEntity.ok(restaurantService.assignZoneRule(
                principal.getName(),
                restaurantId,
                request.serviceZoneId(),
                request.ruleType()
        ));
    }
}

