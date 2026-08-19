package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.MenuItemReviewRequest;
import com.prajjwal.UrbanBites.entity.MenuItem;
import com.prajjwal.UrbanBites.entity.MenuItemReview;
import com.prajjwal.UrbanBites.entity.Order;
import com.prajjwal.UrbanBites.entity.OrderItem;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.OrderStatus;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.MenuItemRepository;
import com.prajjwal.UrbanBites.repository.MenuItemReviewRepository;
import com.prajjwal.UrbanBites.repository.OrderItemRepository;
import com.prajjwal.UrbanBites.repository.OrderRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class MenuItemReviewService {

    private final MenuItemReviewRepository menuItemReviewRepository;
    private final MenuItemRepository menuItemRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    public MenuItemReviewService(MenuItemReviewRepository menuItemReviewService,
                                 MenuItemRepository menuItemRepository,
                                 UserRepository userRepository,
                                 OrderRepository orderRepository,
                                 OrderItemRepository orderItemRepository) {
        this.menuItemReviewRepository = menuItemReviewService;
        this.menuItemRepository = menuItemRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
    }

    @Transactional
    public void addReview(String userEmail, Long restaurantId, Long menuItemId, MenuItemReviewRequest request) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        MenuItem menuItem = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Menu item not found"));

        if (!menuItem.getRestaurant().getId().equals(restaurantId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Menu item does not belong to this restaurant");
        }

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!order.getUser().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only review your own orders");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You can only review items from delivered orders");
        }

        boolean itemInOrder = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId()).stream()
                .anyMatch(item -> item.getMenuItemId().equals(menuItemId));
        
        if (!itemInOrder) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This menu item was not part of the specified order");
        }

        menuItemReviewRepository.findByUserIdAndMenuItemIdAndOrderId(user.getId(), menuItemId, order.getId())
                .ifPresent(r -> {
                    throw new ApiException(HttpStatus.CONFLICT, "You have already reviewed this item for this order");
                });

        MenuItemReview review = new MenuItemReview();
        review.setUser(user);
        review.setMenuItem(menuItem);
        review.setOrder(order);
        review.setRating(request.getRating());
        review.setComment(request.getComment());

        menuItemReviewRepository.save(review);

        // Update cached rating
        Double avg = menuItemReviewRepository.calculateAverageRating(menuItemId);
        if (avg != null) {
            menuItem.setAverageRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        } else {
            menuItem.setAverageRating(BigDecimal.valueOf(request.getRating()).setScale(2, RoundingMode.HALF_UP));
        }
        menuItem.setReviewCount(menuItem.getReviewCount() + 1);
        menuItemRepository.save(menuItem);
    }
}
