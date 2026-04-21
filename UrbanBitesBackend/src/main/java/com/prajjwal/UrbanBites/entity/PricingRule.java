package com.prajjwal.UrbanBites.entity;

import com.prajjwal.UrbanBites.enums.PackingPolicyType;
import com.prajjwal.UrbanBites.enums.PlatformFeeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "pricing_rules")
public class PricingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String version;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "base_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFee;

    @Column(name = "slab_km_cutoff", nullable = false, precision = 10, scale = 2)
    private BigDecimal slabKmCutoff;

    @Column(name = "slab_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal slabFee;

    @Column(name = "per_km_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal perKmRate;

    @Column(name = "surge_peak_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal surgePeakMultiplier;

    @Column(name = "surge_rain_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal surgeRainMultiplier;

    @Column(name = "min_delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal minDeliveryFee;

    @Column(name = "max_delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxDeliveryFee;

    @Column(name = "free_delivery_threshold", precision = 10, scale = 2)
    private BigDecimal freeDeliveryThreshold;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform_fee_type", nullable = false, length = 20)
    private PlatformFeeType platformFeeType;

    @Column(name = "platform_fee_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFeeValue;

    @Column(name = "tax_percent", nullable = false, precision = 6, scale = 3)
    private BigDecimal taxPercent;

    @Enumerated(EnumType.STRING)
    @Column(name = "packing_policy", nullable = false, length = 20)
    private PackingPolicyType packingPolicy;

    @Column(name = "packing_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal packingValue;

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
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public BigDecimal getBaseFee() { return baseFee; }
    public void setBaseFee(BigDecimal baseFee) { this.baseFee = baseFee; }
    public BigDecimal getSlabKmCutoff() { return slabKmCutoff; }
    public void setSlabKmCutoff(BigDecimal slabKmCutoff) { this.slabKmCutoff = slabKmCutoff; }
    public BigDecimal getSlabFee() { return slabFee; }
    public void setSlabFee(BigDecimal slabFee) { this.slabFee = slabFee; }
    public BigDecimal getPerKmRate() { return perKmRate; }
    public void setPerKmRate(BigDecimal perKmRate) { this.perKmRate = perKmRate; }
    public BigDecimal getSurgePeakMultiplier() { return surgePeakMultiplier; }
    public void setSurgePeakMultiplier(BigDecimal surgePeakMultiplier) { this.surgePeakMultiplier = surgePeakMultiplier; }
    public BigDecimal getSurgeRainMultiplier() { return surgeRainMultiplier; }
    public void setSurgeRainMultiplier(BigDecimal surgeRainMultiplier) { this.surgeRainMultiplier = surgeRainMultiplier; }
    public BigDecimal getMinDeliveryFee() { return minDeliveryFee; }
    public void setMinDeliveryFee(BigDecimal minDeliveryFee) { this.minDeliveryFee = minDeliveryFee; }
    public BigDecimal getMaxDeliveryFee() { return maxDeliveryFee; }
    public void setMaxDeliveryFee(BigDecimal maxDeliveryFee) { this.maxDeliveryFee = maxDeliveryFee; }
    public BigDecimal getFreeDeliveryThreshold() { return freeDeliveryThreshold; }
    public void setFreeDeliveryThreshold(BigDecimal freeDeliveryThreshold) { this.freeDeliveryThreshold = freeDeliveryThreshold; }
    public PlatformFeeType getPlatformFeeType() { return platformFeeType; }
    public void setPlatformFeeType(PlatformFeeType platformFeeType) { this.platformFeeType = platformFeeType; }
    public BigDecimal getPlatformFeeValue() { return platformFeeValue; }
    public void setPlatformFeeValue(BigDecimal platformFeeValue) { this.platformFeeValue = platformFeeValue; }
    public BigDecimal getTaxPercent() { return taxPercent; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }
    public PackingPolicyType getPackingPolicy() { return packingPolicy; }
    public void setPackingPolicy(PackingPolicyType packingPolicy) { this.packingPolicy = packingPolicy; }
    public BigDecimal getPackingValue() { return packingValue; }
    public void setPackingValue(BigDecimal packingValue) { this.packingValue = packingValue; }
}

