package com.prajjwal.UrbanBites.repository;

import com.prajjwal.UrbanBites.entity.CartItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartIdAndMenuItemId(Long cartId, Long menuItemId);

    Optional<CartItem> findByIdAndCartId(Long id, Long cartId);

    List<CartItem> findByCartIdOrderByIdDesc(Long cartId);

    void deleteByCartId(Long cartId);
}

