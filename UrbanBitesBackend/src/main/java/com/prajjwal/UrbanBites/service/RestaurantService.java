package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.dto.request.CreateRestaurantRequest;
import com.prajjwal.UrbanBites.dto.request.CreateServiceZoneRequest;
import com.prajjwal.UrbanBites.dto.request.UpdateRestaurantRequest;
import com.prajjwal.UrbanBites.dto.response.RestaurantResponse;
import com.prajjwal.UrbanBites.dto.response.ServiceZoneResponse;
import com.prajjwal.UrbanBites.entity.MenuItem;
import com.prajjwal.UrbanBites.entity.Restaurant;
import com.prajjwal.UrbanBites.entity.RestaurantServiceZone;
import com.prajjwal.UrbanBites.entity.ServiceZone;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.enums.DiscoveryFoodType;
import com.prajjwal.UrbanBites.enums.DiscoveryPriceBracket;
import com.prajjwal.UrbanBites.enums.ZoneRuleType;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.repository.MenuItemRepository;
import com.prajjwal.UrbanBites.repository.RestaurantRepository;
import com.prajjwal.UrbanBites.repository.RestaurantServiceZoneRepository;
import com.prajjwal.UrbanBites.repository.ServiceZoneRepository;
import com.prajjwal.UrbanBites.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantService {

    private static final double EARTH_RADIUS_KM = 6371.0d;
    private static final String APPROVED_STATUS = "APPROVED";
    private static final Logger log = LoggerFactory.getLogger(RestaurantService.class);

    private final RestaurantRepository restaurantRepository;
    private final MenuItemRepository menuItemRepository;
    private final ServiceZoneRepository serviceZoneRepository;
    private final RestaurantServiceZoneRepository restaurantServiceZoneRepository;
    private final UserRepository userRepository;
    private final EmailSender emailSender;
    private final GeocodingService geocodingService;
    private final ImageStorageService imageStorageService;

    public RestaurantService(
            RestaurantRepository restaurantRepository,
            MenuItemRepository menuItemRepository,
            ServiceZoneRepository serviceZoneRepository,
            RestaurantServiceZoneRepository restaurantServiceZoneRepository,
            UserRepository userRepository,
            EmailSender emailSender,
            GeocodingService geocodingService,
            ImageStorageService imageStorageService
    ) {
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
        this.serviceZoneRepository = serviceZoneRepository;
        this.restaurantServiceZoneRepository = restaurantServiceZoneRepository;
        this.userRepository = userRepository;
        this.emailSender = emailSender;
        this.geocodingService = geocodingService;
        this.imageStorageService = imageStorageService;
    }

    @Transactional
    public RestaurantResponse createMyRestaurant(String currentEmail, CreateRestaurantRequest request, String imagePath) {
        User owner = getUserByEmail(currentEmail);
        try {
            Restaurant restaurant = new Restaurant();
            restaurant.setOwner(owner);
            apply(restaurant, request.name(), request.description(), request.addressLine(), request.city(),
                    request.latitude(), request.longitude(), request.openNow(), false, imagePath);
            restaurant.setApprovalStatus("PENDING");
            Restaurant saved = restaurantRepository.save(restaurant);
            sendRestaurantOnboardingStatus(
                    owner,
                    saved.getName(),
                    "Restaurant added successfully",
                    "Your restaurant has been added and submitted for admin review. It will be discoverable once approved."
            );
            return toResponse(saved, null);
        } catch (RuntimeException ex) {
            sendRestaurantOnboardingStatus(
                    owner,
                    request.name(),
                    "Restaurant onboarding failed",
                    "We could not add your restaurant. Reason: " + normalizeFailureReason(ex.getMessage())
            );
            throw ex;
        }
    }

    @Transactional
    public RestaurantResponse updateMyRestaurant(
            String currentEmail,
            Long restaurantId,
            UpdateRestaurantRequest request,
            String imagePath
    ) {
        User owner = getUserByEmail(currentEmail);
        Restaurant restaurant = restaurantRepository.findByIdAndOwnerId(restaurantId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));
        boolean wasActive = restaurant.isActive();
        String existingImagePath = restaurant.getImagePath();
        apply(restaurant, request.name(), request.description(), request.addressLine(), request.city(),
                request.latitude(), request.longitude(), request.openNow(), request.active(), imagePath);
        Restaurant updated = restaurantRepository.save(restaurant);
        if (imagePath != null && existingImagePath != null && !existingImagePath.equals(updated.getImagePath())) {
            imageStorageService.deleteImage(existingImagePath);
        }
        if (!wasActive && updated.isActive()) {
            sendRestaurantApprovalStatus(owner, updated.getName(), true);
        }
        return toResponse(updated, null);
    }

    public List<RestaurantResponse> listMyRestaurants(String currentEmail) {
        User owner = getUserByEmail(currentEmail);
        return restaurantRepository.findByOwnerIdOrderByIdDesc(owner.getId())
                .stream()
                .map(r -> toResponse(r, null))
                .toList();
    }

    public List<RestaurantResponse> discoverByLocation(
            BigDecimal latitude,
            BigDecimal longitude,
            double radiusKm,
            String foodType,
            String priceBracket,
            BigDecimal minRating
    ) {
        DiscoveryFoodType foodTypeFilter = DiscoveryFoodType.fromQuery(foodType);
        DiscoveryPriceBracket priceBracketFilter = DiscoveryPriceBracket.fromQuery(priceBracket);
        BigDecimal minRatingFilter = minRating == null ? null : minRating.setScale(2, RoundingMode.HALF_UP);

        List<RestaurantDistance> candidates = restaurantRepository.findByActiveTrue()
                .stream()
                .filter(r -> APPROVED_STATUS.equals(r.getApprovalStatus()))
                .map(restaurant -> new RestaurantDistance(
                        restaurant,
                        haversineKm(
                                latitude.doubleValue(),
                                longitude.doubleValue(),
                                restaurant.getLatitude().doubleValue(),
                                restaurant.getLongitude().doubleValue())))
                .toList();

        List<Long> zoneIds = serviceZoneRepository
                .findByActiveTrueAndMinLatitudeLessThanEqualAndMaxLatitudeGreaterThanEqualAndMinLongitudeLessThanEqualAndMaxLongitudeGreaterThanEqual(
                        latitude,
                        latitude,
                        longitude,
                        longitude)
                .stream()
                .map(ServiceZone::getId)
                .toList();

        Map<Long, List<ZoneRuleType>> rulesByRestaurant = new HashMap<>();
        if (!zoneIds.isEmpty() && !candidates.isEmpty()) {
            List<Long> restaurantIds = candidates.stream().map(c -> c.restaurant().getId()).toList();
            List<RestaurantServiceZone> rules = restaurantServiceZoneRepository
                    .findByRestaurantIdInAndServiceZoneIdIn(restaurantIds, zoneIds);
            for (RestaurantServiceZone rule : rules) {
                rulesByRestaurant.computeIfAbsent(rule.getRestaurant().getId(), k -> new ArrayList<>())
                        .add(rule.getRuleType());
            }
        }

        List<Long> candidateIds = candidates.stream().map(c -> c.restaurant().getId()).toList();
        Map<Long, DiscoveryFacetStats> statsByRestaurant = buildFacetStats(candidateIds);

        return candidates.stream()
                .filter(c -> isServiceable(c.distanceKm(), radiusKm, rulesByRestaurant.get(c.restaurant().getId())))
                .filter(c -> matchesFoodType(statsByRestaurant.get(c.restaurant().getId()), foodTypeFilter))
                .filter(c -> matchesPriceBracket(statsByRestaurant.get(c.restaurant().getId()), priceBracketFilter))
                .filter(c -> matchesMinRating(c.restaurant(), minRatingFilter))
                // Open restaurants first, closed ones at the end (Zomato-style)
                .sorted(Comparator
                        .comparing((RestaurantDistance c) -> !c.restaurant().isOpenNow())
                        .thenComparingDouble(RestaurantDistance::distanceKm))
                .map(c -> toResponse(c.restaurant(), round2(c.distanceKm())))
                .toList();
    }

    @Transactional
    public ServiceZoneResponse createServiceZone(CreateServiceZoneRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (request.minLatitude() == null || request.maxLatitude() == null
                || request.minLongitude() == null || request.maxLongitude() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "zone bounds are required");
        }
        if (request.minLatitude().compareTo(request.maxLatitude()) > 0
                || request.minLongitude().compareTo(request.maxLongitude()) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "invalid zone bounds");
        }

        ServiceZone zone = new ServiceZone();
        zone.setName(request.name().trim());
        zone.setMinLatitude(request.minLatitude());
        zone.setMaxLatitude(request.maxLatitude());
        zone.setMinLongitude(request.minLongitude());
        zone.setMaxLongitude(request.maxLongitude());
        zone.setActive(request.active());
        return toZoneResponse(serviceZoneRepository.save(zone));
    }

    public List<ServiceZoneResponse> listActiveServiceZones() {
        return serviceZoneRepository.findByActiveTrueOrderByNameAsc().stream().map(this::toZoneResponse).toList();
    }

    @Transactional
    public Map<String, String> assignZoneRule(String currentEmail, Long restaurantId, Long zoneId, ZoneRuleType ruleType) {
        if (zoneId == null || ruleType == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "serviceZoneId and ruleType are required");
        }
        Restaurant restaurant = getOwnedRestaurant(currentEmail, restaurantId);
        ServiceZone zone = serviceZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Service zone not found"));

        RestaurantServiceZone link = restaurantServiceZoneRepository.findByRestaurantIdAndServiceZoneId(restaurantId, zoneId)
                .orElseGet(RestaurantServiceZone::new);
        link.setRestaurant(restaurant);
        link.setServiceZone(zone);
        link.setRuleType(ruleType);
        restaurantServiceZoneRepository.save(link);
        return Map.of("message", "Zone rule saved");
    }

    public Restaurant getOwnedRestaurant(String currentEmail, Long restaurantId) {
        User owner = getUserByEmail(currentEmail);
        return restaurantRepository.findByIdAndOwnerId(restaurantId, owner.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));
    }

    public Restaurant getActiveRestaurant(Long restaurantId) {
        return restaurantRepository.findByIdAndActiveTrueAndApprovalStatus(restaurantId, APPROVED_STATUS)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));
    }

    @Transactional(readOnly = true)
    public RestaurantResponse getRestaurantById(Long id) {
        Restaurant restaurant = restaurantRepository.findByIdAndActiveTrueAndApprovalStatus(id, APPROVED_STATUS)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Restaurant not found"));
        return toResponse(restaurant, null);
    }

    @Transactional
    public void deleteMyRestaurant(String currentEmail, Long restaurantId) {
        Restaurant restaurant = getOwnedRestaurant(currentEmail, restaurantId);
        String restaurantImagePath = restaurant.getImagePath();
        List<String> menuItemImagePaths = menuItemRepository.findByRestaurantIdOrderByIdDesc(restaurant.getId())
                .stream()
                .map(MenuItem::getImagePath)
                .filter(path -> path != null && !path.isBlank())
                .toList();
        try {
            restaurantRepository.delete(restaurant);
            restaurantRepository.flush();
            imageStorageService.deleteImage(restaurantImagePath);
            menuItemImagePaths.forEach(imageStorageService::deleteImage);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Cannot delete restaurant with existing order history. Deactivate it instead."
            );
        }
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void apply(
            Restaurant restaurant,
            String name,
            String description,
            String addressLine,
            String city,
            BigDecimal latitude,
            BigDecimal longitude,
            boolean openNow,
            boolean active,
            String imagePath
    ) {
        if (name == null || name.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (addressLine == null || addressLine.isBlank() || city == null || city.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "addressLine and city are required");
        }

        GeocodingService.Coordinates coordinates = resolveCoordinates(addressLine.trim(), city.trim(), latitude, longitude);

        restaurant.setName(name.trim());
        restaurant.setDescription(blankToNull(description));
        restaurant.setAddressLine(addressLine.trim());
        restaurant.setCity(city.trim());
        restaurant.setLatitude(coordinates.latitude());
        restaurant.setLongitude(coordinates.longitude());
        restaurant.setOpenNow(openNow);
        restaurant.setActive(active);
        if (imagePath != null) {
            restaurant.setImagePath(imagePath);
        }
        if (restaurant.getImagePath() == null || restaurant.getImagePath().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "restaurant image is required");
        }
    }

    private GeocodingService.Coordinates resolveCoordinates(
            String addressLine,
            String city,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        if (latitude != null && longitude != null) {
            return new GeocodingService.Coordinates(latitude, longitude);
        }
        if (latitude != null || longitude != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Both latitude and longitude are required when set manually");
        }
        return geocodingService.geocodeAddress(addressLine, null, city, null, null);
    }

    private RestaurantResponse toResponse(Restaurant restaurant, Double distanceKm) {
        List<String> categories = menuItemRepository.findByRestaurantIdAndAvailableTrueOrderByIdDesc(restaurant.getId())
                .stream()
                .map(MenuItem::getCategory)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .toList();
        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getDescription(),
                restaurant.getImagePath(),
                restaurant.getAddressLine(),
                restaurant.getCity(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                restaurant.isOpenNow(),
                restaurant.isActive(),
                restaurant.getAvgRating().setScale(2, RoundingMode.HALF_UP),
                restaurant.getRatingCount(),
                distanceKm,
                categories
        );
    }

    private Map<Long, DiscoveryFacetStats> buildFacetStats(List<Long> restaurantIds) {
        if (restaurantIds == null || restaurantIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, DiscoveryFacetStats> statsByRestaurant = new HashMap<>();
        for (Long restaurantId : restaurantIds) {
            statsByRestaurant.put(restaurantId, new DiscoveryFacetStats(false, false, null));
        }

        List<MenuItem> availableItems = menuItemRepository.findByRestaurantIdInAndAvailableTrue(restaurantIds);
        for (MenuItem item : availableItems) {
            Long restaurantId = item.getRestaurant().getId();
            DiscoveryFacetStats current = statsByRestaurant.getOrDefault(restaurantId, new DiscoveryFacetStats(false, false, null));
            boolean hasVeg = current.hasVeg() || item.isVeg();
            boolean hasNonVeg = current.hasNonVeg() || !item.isVeg();
            BigDecimal minPrice = current.minAvailablePrice();
            if (minPrice == null || item.getPrice().compareTo(minPrice) < 0) {
                minPrice = item.getPrice();
            }
            statsByRestaurant.put(restaurantId, new DiscoveryFacetStats(hasVeg, hasNonVeg, minPrice));
        }

        return statsByRestaurant;
    }

    private boolean matchesFoodType(DiscoveryFacetStats stats, DiscoveryFoodType filter) {
        if (filter == null) {
            return true;
        }
        if (stats == null) {
            return false;
        }
        return switch (filter) {
            case VEG -> stats.hasVeg();
            case NON_VEG -> stats.hasNonVeg();
        };
    }

    private boolean matchesPriceBracket(DiscoveryFacetStats stats, DiscoveryPriceBracket filter) {
        if (filter == null) {
            return true;
        }
        if (stats == null || stats.minAvailablePrice() == null) {
            return false;
        }
        return filter.matches(stats.minAvailablePrice());
    }

    private boolean matchesMinRating(Restaurant restaurant, BigDecimal minRating) {
        if (minRating == null) {
            return true;
        }
        BigDecimal avgRating = restaurant.getAvgRating() == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : restaurant.getAvgRating().setScale(2, RoundingMode.HALF_UP);
        return avgRating.compareTo(minRating) >= 0;
    }

    private ServiceZoneResponse toZoneResponse(ServiceZone zone) {
        return new ServiceZoneResponse(
                zone.getId(),
                zone.getName(),
                zone.getMinLatitude(),
                zone.getMaxLatitude(),
                zone.getMinLongitude(),
                zone.getMaxLongitude(),
                zone.isActive()
        );
    }

    private boolean isServiceable(double distanceKm, double radiusKm, List<ZoneRuleType> rules) {
        if (rules != null && !rules.isEmpty()) {
            if (rules.stream().anyMatch(r -> r == ZoneRuleType.EXCLUDE)) {
                return false;
            }
            if (rules.stream().anyMatch(r -> r == ZoneRuleType.INCLUDE)) {
                return true;
            }
        }
        return distanceKm <= radiusKm;
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private void sendRestaurantOnboardingStatus(User owner, String restaurantName, String title, String message) {
        if (!isEmailableAddress(owner.getEmail())) {
            return;
        }
        try {
            emailSender.sendRestaurantOnboardingStatus(owner.getEmail(), owner.getFullName(), restaurantName, title, message);
        } catch (Exception ex) {
            log.warn("Failed to send restaurant onboarding email to {}", owner.getEmail(), ex);
        }
    }

    private void sendRestaurantApprovalStatus(User owner, String restaurantName, boolean approved) {
        if (!isEmailableAddress(owner.getEmail())) {
            return;
        }
        try {
            emailSender.sendRestaurantApprovalStatus(owner.getEmail(), owner.getFullName(), restaurantName, approved);
        } catch (Exception ex) {
            log.warn("Failed to send restaurant approval email to {}", owner.getEmail(), ex);
        }
    }

    private String normalizeFailureReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "Unexpected server error";
        }
        return reason;
    }

    private boolean isEmailableAddress(String email) {
        return email != null && !email.isBlank() && !email.toLowerCase().endsWith("@phone.urbanbites.local");
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    private double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private record RestaurantDistance(Restaurant restaurant, double distanceKm) {
    }

    private record DiscoveryFacetStats(boolean hasVeg, boolean hasNonVeg, BigDecimal minAvailablePrice) {
    }
}

