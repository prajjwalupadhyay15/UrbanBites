package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.response.FeeBreakupResponse;
import com.prajjwal.UrbanBites.entity.PricingRule;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;

@Service
public class PricingEngineService {

    public FeeBreakupResponse preview(
            PricingRule rule,
            BigDecimal subtotal,
            BigDecimal itemLevelPackingTotal,
            BigDecimal distanceKm,
            boolean peakDemand,
            boolean raining
    ) {
        BigDecimal surgeMultiplier = BigDecimal.ONE;
        if (peakDemand) {
            surgeMultiplier = surgeMultiplier.multiply(rule.getSurgePeakMultiplier());
        }
        if (raining) {
            surgeMultiplier = surgeMultiplier.multiply(rule.getSurgeRainMultiplier());
        }

        BigDecimal distanceAboveSlab = distanceKm.subtract(rule.getSlabKmCutoff()).max(BigDecimal.ZERO);
        BigDecimal deliveryRaw = rule.getBaseFee()
                .add(rule.getSlabFee())
                .add(rule.getPerKmRate().multiply(distanceAboveSlab));

        BigDecimal deliveryWithSurge = deliveryRaw.multiply(surgeMultiplier);
        BigDecimal deliveryFee = clamp(deliveryWithSurge, rule.getMinDeliveryFee(), rule.getMaxDeliveryFee());

        if (rule.getFreeDeliveryThreshold() != null
                && subtotal.compareTo(rule.getFreeDeliveryThreshold()) >= 0) {
            deliveryFee = BigDecimal.ZERO;
        }

        BigDecimal packingCharge = switch (rule.getPackingPolicy()) {
            case ITEM_LEVEL -> itemLevelPackingTotal;
            case FIXED -> rule.getPackingValue();
            case PERCENT -> percentage(subtotal, rule.getPackingValue());
        };

        BigDecimal platformFee = switch (rule.getPlatformFeeType()) {
            case FIXED -> rule.getPlatformFeeValue();
            case PERCENT -> percentage(subtotal, rule.getPlatformFeeValue());
        };

        BigDecimal taxableBase = subtotal.add(deliveryFee).add(packingCharge).add(platformFee);
        BigDecimal tax = percentage(taxableBase, rule.getTaxPercent());

        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal grandTotal = subtotal
                .add(deliveryFee)
                .add(packingCharge)
                .add(platformFee)
                .add(tax)
                .subtract(discount);

        return new FeeBreakupResponse(
                rule.getVersion(),
                round(distanceKm, 2),
                round(surgeMultiplier, 3),
                round(subtotal, 2),
                round(deliveryFee, 2),
                round(packingCharge, 2),
                round(platformFee, 2),
                round(tax, 2),
                round(discount, 2),
                round(grandTotal, 2)
        );
    }

    private BigDecimal percentage(BigDecimal base, BigDecimal percent) {
        return base.multiply(percent).divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
    }

    private BigDecimal clamp(BigDecimal value, BigDecimal min, BigDecimal max) {
        BigDecimal current = value;
        if (current.compareTo(min) < 0) {
            current = min;
        }
        if (current.compareTo(max) > 0) {
            current = max;
        }
        return current;
    }

    private BigDecimal round(BigDecimal value, int scale) {
        return value.setScale(scale, RoundingMode.HALF_UP);
    }
}

