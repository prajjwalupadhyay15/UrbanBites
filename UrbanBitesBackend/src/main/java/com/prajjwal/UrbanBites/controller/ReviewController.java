package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.request.SubmitReviewRequest;
import com.prajjwal.UrbanBites.dto.response.ReviewResponse;
import com.prajjwal.UrbanBites.service.ReviewService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/orders/{orderId}/review")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ReviewResponse> submitReview(
            Principal principal,
            @PathVariable Long orderId,
            @Valid @RequestBody SubmitReviewRequest request
    ) {
        return ResponseEntity.ok(reviewService.submitReview(principal.getName(), orderId, request));
    }

    @GetMapping("/restaurants/{restaurantId}/reviews")
    public ResponseEntity<List<ReviewResponse>> getRestaurantReviews(
            @PathVariable Long restaurantId
    ) {
        return ResponseEntity.ok(reviewService.getRestaurantReviews(restaurantId));
    }

    @GetMapping("/users/me/reviews")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<ReviewResponse>> getMyReviews(Principal principal) {
        return ResponseEntity.ok(reviewService.getMyReviews(principal.getName()));
    }
}
