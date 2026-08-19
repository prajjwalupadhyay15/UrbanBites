package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.SubmitReviewRequest;
import com.prajjwal.UrbanBites.dto.response.ReviewResponse;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.entity.RestaurantReview;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import com.prajjwal.UrbanBites.repository.RestaurantReviewRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final RestaurantRepository restaurantRepository;
    private final RestaurantReviewRepository reviewRepository;

    public ReviewService(
            UserRepository userRepository,
            OrderRepository orderRepository,
            RestaurantRepository restaurantRepository,
            RestaurantReviewRepository reviewRepository
    ) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.restaurantRepository = restaurantRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional
    public ReviewResponse submitReview(String currentEmail, Long orderId, SubmitReviewRequest request) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You can only review delivered orders");
        }

        boolean alreadyReviewed = reviewRepository.existsByOrderIdAndUserId(orderId, user.getId());
        if (alreadyReviewed) {
            throw new ApiException(HttpStatus.CONFLICT, "You have already reviewed this order");
        }

        RestaurantReview review = new RestaurantReview();
        review.setOrder(order);
        review.setUser(user);
        review.setRestaurant(order.getRestaurant());
        review.setRating(request.rating());
        review.setComment(request.comment() != null ? request.comment().trim() : null);
        RestaurantReview saved = reviewRepository.save(review);

        // Update restaurant average rating and count
        Restaurant restaurant = order.getRestaurant();
        long count = reviewRepository.countByRestaurantId(restaurant.getId());
        double avg = reviewRepository.findAverageRatingByRestaurantId(restaurant.getId());
        restaurant.setAvgRating(BigDecimal.valueOf(avg));
        restaurant.setRatingCount((int) count);
        restaurantRepository.save(restaurant);

        return toReviewResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getRestaurantReviews(Long restaurantId) {
        if (!restaurantRepository.existsById(restaurantId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found");
        }
        return reviewRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId)
                .stream()
                .map(this::toReviewResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews(String currentEmail) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toReviewResponse)
                .toList();
    }

    private ReviewResponse toReviewResponse(RestaurantReview review) {
        String reviewerName = maskName(review.getUser().getFullName());
        return new ReviewResponse(
                review.getId(),
                review.getOrder().getId(),
                review.getRestaurant().getId(),
                review.getRestaurant().getName(),
                reviewerName,
                review.getRating(),
                review.getComment(),
                review.getOwnerReply(),
                review.getReplyAt(),
                review.getCreatedAt()
        );
    }

    private String maskName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "Anonymous Customer";
        }
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) {
            String name = parts[0];
            if (name.length() <= 2) return name;
            return name.substring(0, 1) + "***" + name.substring(name.length() - 1);
        }
        String first = parts[0];
        String last = parts[parts.length - 1];
        return first + " " + last.substring(0, 1) + ".";
    }

    @Transactional
    public ReviewResponse replyToReview(String currentEmail, Long restaurantId, Long reviewId, String replyText) {
        User owner = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Owner not found"));

        Restaurant restaurant = restaurantRepository.findByIdAndOwnerId(restaurantId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "You do not own this restaurant"));

        RestaurantReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));

        if (!review.getRestaurant().getId().equals(restaurant.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Review does not belong to this restaurant");
        }

        review.setOwnerReply(replyText);
        review.setReplyAt(OffsetDateTime.now());
        
        return toReviewResponse(reviewRepository.save(review));
    }
}
