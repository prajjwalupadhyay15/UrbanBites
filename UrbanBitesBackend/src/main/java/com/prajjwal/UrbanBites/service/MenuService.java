package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.CreateMenuItemRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateMenuItemRequest;
import com.prajjwal.UrbanBites.dto.response.MenuItemResponse;
import com.prajjwal.UrbanBites.entity.MenuItem;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.MenuItemRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MenuService {

    private final MenuItemRepository menuItemRepository;
    private final RestaurantService restaurantService;
    private final ImageStorageService imageStorageService;

    public MenuService(
            MenuItemRepository menuItemRepository,
            RestaurantService restaurantService,
            ImageStorageService imageStorageService
    ) {
        this.menuItemRepository = menuItemRepository;
        this.restaurantService = restaurantService;
        this.imageStorageService = imageStorageService;
    }

    @Transactional
    public MenuItemResponse createMenuItem(
            String currentEmail,
            Long restaurantId,
            CreateMenuItemRequest request,
            String imagePath
    ) {
        Restaurant restaurant = restaurantService.getOwnedRestaurant(currentEmail, restaurantId);
        MenuItem item = new MenuItem();
        item.setRestaurant(restaurant);
        apply(item, request.name(), request.description(), request.price(), request.veg(), request.available(), imagePath);
        return toResponse(menuItemRepository.save(item));
    }

    @Transactional
    public MenuItemResponse updateMenuItem(
            String currentEmail,
            Long restaurantId,
            Long menuItemId,
            UpdateMenuItemRequest request,
            String imagePath
    ) {
        restaurantService.getOwnedRestaurant(currentEmail, restaurantId);
        MenuItem item = menuItemRepository.findByIdAndRestaurantId(menuItemId, restaurantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Menu item not found"));
        String existingImagePath = item.getImagePath();
        apply(item, request.name(), request.description(), request.price(), request.veg(), request.available(), imagePath);
        MenuItem saved = menuItemRepository.save(item);
        if (imagePath != null && existingImagePath != null && !existingImagePath.equals(saved.getImagePath())) {
            imageStorageService.deleteImage(existingImagePath);
        }
        return toResponse(saved);
    }

    public List<MenuItemResponse> listOwnerMenu(String currentEmail, Long restaurantId) {
        restaurantService.getOwnedRestaurant(currentEmail, restaurantId);
        return menuItemRepository.findByRestaurantIdOrderByIdDesc(restaurantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<MenuItemResponse> listPublicMenu(Long restaurantId) {
        restaurantService.getActiveRestaurant(restaurantId);
        return menuItemRepository.findByRestaurantIdAndAvailableTrueOrderByIdDesc(restaurantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteMenuItem(String currentEmail, Long restaurantId, Long menuItemId) {
        restaurantService.getOwnedRestaurant(currentEmail, restaurantId);
        MenuItem item = menuItemRepository.findByIdAndRestaurantId(menuItemId, restaurantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Menu item not found"));
        String existingImagePath = item.getImagePath();
        menuItemRepository.delete(item);
        imageStorageService.deleteImage(existingImagePath);
    }

    private void apply(
            MenuItem item,
            String name,
            String description,
            java.math.BigDecimal price,
            boolean veg,
            boolean available,
            String imagePath
    ) {
        if (name == null || name.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (price == null || price.signum() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "price must be greater than 0");
        }
        item.setName(name.trim());
        item.setDescription(blankToNull(description));
        item.setPrice(price);
        item.setVeg(veg);
        item.setAvailable(available);
        if (imagePath != null) {
            item.setImagePath(imagePath);
        }
        if (item.getImagePath() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "menu item image is required");
        }
    }

    private MenuItemResponse toResponse(MenuItem item) {
        return new MenuItemResponse(
                item.getId(),
                item.getRestaurant().getId(),
                item.getName(),
                item.getDescription(),
                item.getPrice(),
                item.getImagePath(),
                item.isVeg(),
                item.isAvailable()
        );
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}

