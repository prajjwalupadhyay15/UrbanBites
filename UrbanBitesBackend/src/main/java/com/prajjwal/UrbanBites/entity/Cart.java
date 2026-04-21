package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.CartState;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "carts")
public class Cart {
    @Id
    @GeneratedValue(strategy =GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch =FetchType.LAZY,optional = false)
    @JoinColumn(name="user_id",nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY,optional = false)
    @JoinColumn(name = "restaurant_id",nullable = false)
    private Restaurant restaurant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false,length = 20)
    private CartState state = CartState.ACTIVE;

    @Column(name="created_at",nullable = false)
    private OffsetDateTime createdAt;

    @Column(name="updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist(){
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate(){
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() {return id;}
    public User getUser() {return user;}
    public void setUser(User user) {this.user = user;}
    public Restaurant getRestaurant() {return restaurant;}
    public void setRestaurant(Restaurant restaurant) {this.restaurant = restaurant;}
    public CartState getState(){return state;}
    public void setState(CartState state){this.state = state;}
    public OffsetDateTime getCreatedAt() {return createdAt;}
    public OffsetDateTime getUpdatedAt() {return updatedAt;}
}
