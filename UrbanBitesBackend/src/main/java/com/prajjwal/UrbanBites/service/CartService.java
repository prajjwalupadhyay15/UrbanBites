package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.AddCartItemRequest;
import com.prajjwal.UrbanBites.dto.request.CheckoutPreviewRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateCartItemRequest;
import com.prajjwal.UrbanBites.dto.response.CartItemResponse;
import com.prajjwal.UrbanBites.dto.response.CartResponse;
import com.prajjwal.UrbanBites.dto.response.CheckoutPreviewResponse;
import com.prajjwal.UrbanBites.dto.response.FeeBreakupResponse;
import com.prajjwal.UrbanBites.entity.Address;
import com.prajjwal.UrbanBites.entity.Cart;
import com.prajjwal.UrbanBites.entity.CartItem;
import com.prajjwal.UrbanBites.entity.MenuItem;
import com.prajjwal.UrbanBites.entity.PricingRule;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.CartState;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.AddressRepository;
import com.prajjwal.UrbanBites.repository.CartItemRepository;
import com.prajjwal.UrbanBites.repository.CartRepository;
import com.prajjwal.UrbanBites.repository.MenuItemRepository;
import com.prajjwal.UrbanBites.repository.PricingRuleRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final AddressRepository addressRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final PricingEngineService pricingEngineService;
    private final RealtimePublisher realtimePublisher;
    private final GeocodingService geocodingService;

    public CartService(
            UserRepository userRepository,
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            MenuItemRepository menuItemRepository,
            AddressRepository addressRepository,
            PricingRuleRepository pricingRuleRepository,
            PricingEngineService pricingEngineService,
            RealtimePublisher realtimePublisher,
            GeocodingService geocodingService
    ) {
        this.userRepository = userRepository;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.menuItemRepository = menuItemRepository;
        this.addressRepository = addressRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.pricingEngineService = pricingEngineService;
        this.realtimePublisher = realtimePublisher;
        this.geocodingService = geocodingService;
    }

    @Transactional(readOnly = true)
    public CartResponse getMyCart(String currentEmail) {
        User user = getUserByEmail(currentEmail);
        return cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .map(this::toCartResponse)
                .orElseGet(() -> new CartResponse(null, null, null, 0, BigDecimal.ZERO, List.of()));
    }

    @Transactional
    public CartResponse addItem(String currentEmail, AddCartItemRequest request) {
        User user = getUserByEmail(currentEmail);
        MenuItem menuItem = menuItemRepository.findByIdAndAvailableTrue(request.menuItemId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Menu item not available"));

        Restaurant restaurant = menuItem.getRestaurant();
        if (!restaurant.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Restaurant not active");
        }

        lockUserRow(user.getId());
        Cart cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE).orElse(null);
        if (cart != null && !cart.getRestaurant().getId().equals(restaurant.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Cart already contains items from another restaurant");
        }

        if (cart == null) {
            cart = new Cart();
            cart.setUser(user);
            cart.setRestaurant(restaurant);
            cart.setState(CartState.ACTIVE);
            try {
                cart = cartRepository.saveAndFlush(cart);
            } catch (DataIntegrityViolationException ex) {
                // Another request created the active cart first; reuse it.
                cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                        .orElseThrow(() -> ex);
            }
        }

        CartItem existing = cartItemRepository.findByCartIdAndMenuItemId(cart.getId(), menuItem.getId()).orElse(null);
        if (existing == null) {
            existing = new CartItem();
            existing.setCart(cart);
            existing.setMenuItem(menuItem);
            existing.setQuantity(request.quantity());
            existing.setUnitPriceSnapshot(menuItem.getPrice());
            existing.setItemPackingFeeSnapshot(BigDecimal.ZERO);
        } else {
            existing.setQuantity(existing.getQuantity() + request.quantity());
        }
        existing.setNotes(blankToNull(request.notes()));
        cartItemRepository.save(existing);

        CartResponse response = toCartResponse(cart);
        realtimePublisher.publishUserCart(user.getId(), response.cartId(), "CART_UPDATED", response);
        return response;
    }

    @Transactional
    public CartResponse updateItem(String currentEmail, Long itemId, UpdateCartItemRequest request) {
        User user = getUserByEmail(currentEmail);
        Cart cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Active cart not found"));

        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart item not found"));

        item.setQuantity(request.quantity());
        item.setNotes(blankToNull(request.notes()));
        cartItemRepository.save(item);

        CartResponse response = toCartResponse(cart);
        realtimePublisher.publishUserCart(user.getId(), response.cartId(), "CART_UPDATED", response);
        return response;
    }

    @Transactional
    public void removeItem(String currentEmail, Long itemId) {
        User user = getUserByEmail(currentEmail);
        Cart cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Active cart not found"));

        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart item not found"));

        cartItemRepository.delete(item);
        CartResponse response = toCartResponse(cart);
        realtimePublisher.publishUserCart(user.getId(), response.cartId(), "CART_UPDATED", response);
    }

    @Transactional
    public void clearCart(String currentEmail) {
        User user = getUserByEmail(currentEmail);
        cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .ifPresent(cart -> {
                    cartItemRepository.deleteByCartId(cart.getId());
                    CartResponse response = toCartResponse(cart);
                    realtimePublisher.publishUserCart(user.getId(), response.cartId(), "CART_CLEARED", response);
                    cartRepository.delete(cart);
                });
    }

    @Transactional(readOnly = true)
    public CheckoutPreviewResponse checkoutPreview(String currentEmail) {
        return checkoutPreview(currentEmail, null);
    }

    @Transactional(readOnly = true)
    public CheckoutPreviewResponse checkoutPreview(String currentEmail, CheckoutPreviewRequest request) {
        User user = getUserByEmail(currentEmail);

        Cart cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty"));

        List<CartItem> items = cartItemRepository.findByCartIdOrderByIdDesc(cart.getId());
        if (items.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        Address selectedAddress = resolveAddressForCheckout(user.getId(), request == null ? null : request.addressId());

        GeocodingService.Coordinates checkoutCoordinates = ensureCoordinates(selectedAddress);

        PricingRule rule = pricingRuleRepository.findTopByActiveTrueOrderByVersionDesc()
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No active pricing rule"));

        BigDecimal subtotal = items.stream()
                .map(item -> item.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal itemLevelPackingTotal = items.stream()
                .map(item -> item.getItemPackingFeeSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal distanceKm = haversineKm(
                checkoutCoordinates.latitude(),
                checkoutCoordinates.longitude(),
                cart.getRestaurant().getLatitude(),
                cart.getRestaurant().getLongitude()
        );

        FeeBreakupResponse fees = pricingEngineService.preview(
                rule,
                subtotal,
                itemLevelPackingTotal,
                distanceKm,
                false,
                false
        );

        return new CheckoutPreviewResponse(toCartResponse(cart), fees, true, "Serviceable");
    }

    private Address resolveAddressForCheckout(Long userId, Long requestedAddressId) {
        if (requestedAddressId != null) {
            return addressRepository.findByIdAndUserId(requestedAddressId, userId)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected address not found"));
        }
        return addressRepository.findTopByUserIdAndIsDefaultTrue(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Default address not found"));
    }

    private GeocodingService.Coordinates ensureCoordinates(Address address) {
        if (address.getLatitude() != null && address.getLongitude() != null) {
            return new GeocodingService.Coordinates(address.getLatitude(), address.getLongitude());
        }
        return geocodingService.geocodeAddress(
                address.getLine1(),
                address.getLine2(),
                address.getCity(),
                address.getState(),
                address.getPincode()
        );
    }

    private CartResponse toCartResponse(Cart cart) {
        List<CartItemResponse> items = cartItemRepository.findByCartIdOrderByIdDesc(cart.getId())
                .stream()
                .map(item -> {
                    BigDecimal lineTotal = item.getUnitPriceSnapshot()
                            .multiply(BigDecimal.valueOf(item.getQuantity()))
                            .setScale(2, RoundingMode.HALF_UP);
                    return new CartItemResponse(
                            item.getId(),
                            item.getMenuItem().getId(),
                            item.getMenuItem().getName(),
                            item.getQuantity(),
                            item.getUnitPriceSnapshot().setScale(2, RoundingMode.HALF_UP),
                            lineTotal,
                            item.getNotes()
                    );
                })
                .toList();

        int totalItems = items.stream().mapToInt(CartItemResponse::quantity).sum();
        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        return new CartResponse(
                cart.getId(),
                cart.getRestaurant().getId(),
                cart.getRestaurant().getName(),
                totalItems,
                subtotal,
                items
        );
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void lockUserRow(Long userId) {
        userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private BigDecimal haversineKm(BigDecimal lat1, BigDecimal lon1, BigDecimal lat2, BigDecimal lon2) {
        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLon = Math.toRadians(lon2.doubleValue() - lon1.doubleValue());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1.doubleValue()))
                * Math.cos(Math.toRadians(lat2.doubleValue()))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double distance = 6371.0d * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        return BigDecimal.valueOf(distance).setScale(2, RoundingMode.HALF_UP);
    }
}


