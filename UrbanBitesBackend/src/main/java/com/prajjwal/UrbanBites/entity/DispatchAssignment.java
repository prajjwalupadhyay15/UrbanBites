package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.DispatchAssignmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dispatch_assignments")
public class DispatchAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_user_id")
    private User agentUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DispatchAssignmentStatus status;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Column(name = "offer_expires_at")
    private OffsetDateTime offerExpiresAt;

    @Column(name = "decision_at")
    private OffsetDateTime decisionAt;

    @Column(name = "retry_after")
    private OffsetDateTime retryAfter;

    @Column(name = "no_agent_retry_until")
    private OffsetDateTime noAgentRetryUntil;

    @Column(name = "admin_visibility", nullable = false)
    private boolean adminVisibility = false;

    @Column(name = "agent_payout_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal agentPayoutAmount = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public User getAgentUser() { return agentUser; }
    public void setAgentUser(User agentUser) { this.agentUser = agentUser; }
    public DispatchAssignmentStatus getStatus() { return status; }
    public void setStatus(DispatchAssignmentStatus status) { this.status = status; }
    public int getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; }
    public OffsetDateTime getOfferExpiresAt() { return offerExpiresAt; }
    public void setOfferExpiresAt(OffsetDateTime offerExpiresAt) { this.offerExpiresAt = offerExpiresAt; }
    public OffsetDateTime getDecisionAt() { return decisionAt; }
    public void setDecisionAt(OffsetDateTime decisionAt) { this.decisionAt = decisionAt; }
    public OffsetDateTime getRetryAfter() { return retryAfter; }
    public void setRetryAfter(OffsetDateTime retryAfter) { this.retryAfter = retryAfter; }
    public OffsetDateTime getNoAgentRetryUntil() { return noAgentRetryUntil; }
    public void setNoAgentRetryUntil(OffsetDateTime noAgentRetryUntil) { this.noAgentRetryUntil = noAgentRetryUntil; }
    public boolean isAdminVisibility() { return adminVisibility; }
    public void setAdminVisibility(boolean adminVisibility) { this.adminVisibility = adminVisibility; }
    public BigDecimal getAgentPayoutAmount() { return agentPayoutAmount; }
    public void setAgentPayoutAmount(BigDecimal agentPayoutAmount) { this.agentPayoutAmount = agentPayoutAmount; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}

