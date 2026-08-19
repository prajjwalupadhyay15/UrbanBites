package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.response.CouponResponse;
import com.prajjwal.UrbanBites.entity.AdminCouponCampaign;
import com.prajjwal.UrbanBites.entity.Cart;
import com.prajjwal.UrbanBites.entity.CouponUsage;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.CartState;
import com.prajjwal.UrbanBites.enums.CouponUsageStatus;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.AdminCouponCampaignRepository;
import com.prajjwal.UrbanBites.repository.CartRepository;
import com.prajjwal.UrbanBites.repository.CouponUsageRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CouponService {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final AdminCouponCampaignRepository couponCampaignRepository;
    private final CouponUsageRepository couponUsageRepository;

    public CouponService(
            UserRepository userRepository,
            CartRepository cartRepository,
            AdminCouponCampaignRepository couponCampaignRepository,
            CouponUsageRepository couponUsageRepository
    ) {
        this.userRepository = userRepository;
        this.cartRepository = cartRepository;
        this.couponCampaignRepository = couponCampaignRepository;
        this.couponUsageRepository = couponUsageRepository;
    }

    @Transactional
    public CouponResponse applyCoupon(String currentEmail, String code) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        Cart cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Active cart not found"));

        AdminCouponCampaign campaign = couponCampaignRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon code not found"));

        if (!campaign.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon is not active");
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(campaign.getStartsAt()) || now.isAfter(campaign.getEndsAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon is expired or not yet active");
        }

        // Check global usages
        if (campaign.getMaxUses() != null) {
            if (campaign.getCurrentUses() >= campaign.getMaxUses()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon usage limit reached");
            }
        }

        // Check if user has already used this coupon (status USED)
        boolean alreadyUsed = couponUsageRepository.existsByUserIdAndCampaignIdAndStatusIn(
                user.getId(),
                campaign.getId(),
                List.of(CouponUsageStatus.USED)
        );
        if (alreadyUsed) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You have already used this coupon code");
        }

        // Release any currently APPLIED coupon usage for this user
        releaseAppliedCouponForUser(user.getId());

        // Create new usage record
        CouponUsage usage = new CouponUsage();
        usage.setUser(user);
        usage.setCampaign(campaign);
        usage.setStatus(CouponUsageStatus.APPLIED);
        usage.setDiscountAmount(BigDecimal.ZERO); // Calculated dynamically during checkout-preview
        couponUsageRepository.save(usage);

        // Update cart
        cart.setAppliedCouponCode(campaign.getCode());
        cartRepository.save(cart);

        return new CouponResponse(
                campaign.getCode(),
                campaign.getDescription(),
                campaign.getDiscountPercent(),
                true,
                "Coupon applied successfully"
        );
    }

    @Transactional
    public CouponResponse removeCoupon(String currentEmail) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        Cart cart = cartRepository.findByUserIdAndState(user.getId(), CartState.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Active cart not found"));

        if (cart.getAppliedCouponCode() == null) {
            return new CouponResponse(null, null, BigDecimal.ZERO, false, "No coupon applied to cart");
        }

        releaseAppliedCouponForUser(user.getId());

        cart.setAppliedCouponCode(null);
        cartRepository.save(cart);

        return new CouponResponse(null, null, BigDecimal.ZERO, false, "Coupon removed successfully");
    }

    @Transactional
    public void releaseAppliedCouponForUser(Long userId) {
        // Find any usage with status APPLIED and delete or mark it REMOVED
        // We delete it to clean up temp APPLIED records
        List<CouponUsage> appliedUsages = couponUsageRepository.findAll().stream()
                .filter(u -> u.getUser().getId().equals(userId) && u.getStatus() == CouponUsageStatus.APPLIED)
                .toList();
        couponUsageRepository.deleteAll(appliedUsages);
    }

    @Transactional(readOnly = true)
    public List<CouponResponse> getAvailableCoupons(String currentEmail) {
        User user = userRepository.findByEmailIgnoreCase(currentEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        OffsetDateTime now = OffsetDateTime.now();
        List<AdminCouponCampaign> activeCampaigns = couponCampaignRepository.findAll().stream()
                .filter(AdminCouponCampaign::isActive)
                .filter(c -> c.getStartsAt().isBefore(now) && c.getEndsAt().isAfter(now))
                .toList();

        return activeCampaigns.stream()
                .filter(campaign -> {
                    // Check global usages
                    if (campaign.getMaxUses() != null && campaign.getCurrentUses() >= campaign.getMaxUses()) {
                        return false;
                    }
                    // Check if user has already used this coupon
                    boolean alreadyUsed = couponUsageRepository.existsByUserIdAndCampaignIdAndStatusIn(
                            user.getId(),
                            campaign.getId(),
                            List.of(CouponUsageStatus.USED)
                    );
                    return !alreadyUsed;
                })
                .map(c -> new CouponResponse(
                        c.getCode(),
                        c.getDescription(),
                        c.getDiscountPercent(),
                        true,
                        "Available"
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<AdminCouponCampaign> getAppliedCoupon(Cart cart) {
        if (cart.getAppliedCouponCode() == null) {
            return Optional.empty();
        }
        return couponCampaignRepository.findByCodeIgnoreCase(cart.getAppliedCouponCode());
    }

    public BigDecimal calculateDiscount(AdminCouponCampaign campaign, BigDecimal subtotal) {
        if (campaign == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal discountPercent = campaign.getDiscountPercent();
        return subtotal.multiply(discountPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
