package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.CouponUsageStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "coupon_usages")
public class CouponUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private AdminCouponCampaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CouponUsageStatus status = CouponUsageStatus.APPLIED;

    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "applied_at", nullable = false)
    private OffsetDateTime appliedAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @PrePersist
    void prePersist() {
        if (this.appliedAt == null) {
            this.appliedAt = OffsetDateTime.now();
        }
    }

    public Long getId() { return id; }
    public AdminCouponCampaign getCampaign() { return campaign; }
    public void setCampaign(AdminCouponCampaign campaign) { this.campaign = campaign; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public CouponUsageStatus getStatus() { return status; }
    public void setStatus(CouponUsageStatus status) { this.status = status; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public OffsetDateTime getAppliedAt() { return appliedAt; }
    public OffsetDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(OffsetDateTime usedAt) { this.usedAt = usedAt; }
}
