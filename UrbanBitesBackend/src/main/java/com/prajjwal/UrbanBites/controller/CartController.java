package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.AddCartItemRequest;
import com.prajjwal.UrbanBites.dto.request.CheckoutPreviewRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateCartItemRequest;
import com.prajjwal.UrbanBites.dto.response.CartResponse;
import com.prajjwal.UrbanBites.dto.response.CheckoutPreviewResponse;
import com.prajjwal.UrbanBites.service.CartService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CartResponse> getMyCart(Principal principal) {
        return ResponseEntity.ok(cartService.getMyCart(principal.getName()));
    }

    @PostMapping("/items")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CartResponse> addItem(
            Principal principal,
            @Valid @RequestBody AddCartItemRequest request
    ) {
        return ResponseEntity.ok(cartService.addItem(principal.getName(), request));
    }

    @PutMapping("/items/{itemId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CartResponse> updateItem(
            Principal principal,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {
        return ResponseEntity.ok(cartService.updateItem(principal.getName(), itemId, request));
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Map<String, String>> removeItem(
            Principal principal,
            @PathVariable Long itemId
    ) {
        cartService.removeItem(principal.getName(), itemId);
        return ResponseEntity.ok(Map.of("message", "Item removed"));
    }

    @DeleteMapping("/clear")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Map<String, String>> clearCart(Principal principal) {
        cartService.clearCart(principal.getName());
        return ResponseEntity.ok(Map.of("message", "Cart cleared"));
    }

    @PostMapping("/checkout-preview")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CheckoutPreviewResponse> checkoutPreview(
            Principal principal,
            @RequestBody(required = false) CheckoutPreviewRequest request
    ) {
        return ResponseEntity.ok(cartService.checkoutPreview(principal.getName(), request));
    }
}

