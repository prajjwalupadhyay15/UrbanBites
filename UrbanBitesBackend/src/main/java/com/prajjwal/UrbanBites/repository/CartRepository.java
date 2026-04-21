package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.Cart;
import com.prajjwal.UrbanBites.enums.CartState;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartRepository extends JpaRepository<Cart, Long> {

    Optional<Cart> findByUserIdAndState(Long userId, CartState state);

    Optional<Cart> findByIdAndUserId(Long cartId, Long userId);
}

