package com.prajjwal.UrbanBites.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.prajjwal.UrbanBites.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageStorageService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of("restaurants", "menu-items", "profiles", "refund-evidence");
    private static final Logger log = LoggerFactory.getLogger(ImageStorageService.class);

    private final Path rootPath;
    private final boolean cloudinaryEnabled;
    private final Cloudinary cloudinary;
    private final String cloudinaryFolderRoot;

    public ImageStorageService(
            @Value("${app.upload.dir:uploads}") String uploadDir,
            @Value("${app.image.provider:local}") String imageProvider,
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret,
            @Value("${app.cloudinary.folder-root:urbanbites}") String folderRoot
    ) {
        this.rootPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.cloudinaryFolderRoot = sanitizeFolderRoot(folderRoot);

        boolean useCloudinary = "cloudinary".equalsIgnoreCase(imageProvider);
        if (useCloudinary) {
            if (isBlank(cloudName) || isBlank(apiKey) || isBlank(apiSecret)) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Cloudinary is enabled but credentials are missing");
            }
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName.trim(),
                    "api_key", apiKey.trim(),
                    "api_secret", apiSecret.trim(),
                    "secure", true
            ));
            this.cloudinaryEnabled = true;
        } else {
            this.cloudinary = null;
            this.cloudinaryEnabled = false;
        }

        try {
            Files.createDirectories(this.rootPath.resolve("restaurants"));
            Files.createDirectories(this.rootPath.resolve("menu-items"));
            Files.createDirectories(this.rootPath.resolve("profiles"));
            Files.createDirectories(this.rootPath.resolve("refund-evidence"));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to initialize image storage");
        }
    }

    public String saveRestaurantImage(MultipartFile image) {
        return saveImage(image, "restaurants");
    }

    public String saveMenuItemImage(MultipartFile image) {
        return saveImage(image, "menu-items");
    }

    public String saveProfileImage(MultipartFile image) {
        return saveImage(image, "profiles");
    }

    public String saveRefundEvidenceImage(MultipartFile image) {
        return saveImage(image, "refund-evidence");
    }

    public void deleteImage(String imagePath) {
        if (imagePath == null || imagePath.isBlank()) {
            return;
        }
        if (isCloudinaryUrl(imagePath)) {
            deleteCloudinaryImageByUrl(imagePath);
            return;
        }
        deleteLocalImage(imagePath);
    }

    public Resource loadImage(String category, String fileName) {
        validateCategory(category);
        Path filePath = rootPath.resolve(category).resolve(fileName).normalize();
        if (!filePath.startsWith(rootPath)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid image path");
        }
        if (!Files.exists(filePath)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Image not found");
        }
        try {
            return new UrlResource(filePath.toUri());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to read image");
        }
    }

    private String saveImage(MultipartFile image, String category) {
        validateCategory(category);
        if (image == null || image.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image file is required");
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only image files are allowed");
        }

        if (cloudinaryEnabled) {
            return uploadToCloudinary(image, category);
        }

        return saveLocally(image, category);
    }

    private String saveLocally(MultipartFile image, String category) {
        String extension = detectExtension(image.getOriginalFilename());
        String fileName = UUID.randomUUID() + extension;
        Path target = rootPath.resolve(category).resolve(fileName).normalize();
        if (!target.startsWith(rootPath)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid image path");
        }

        try {
            Files.copy(image.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/api/v1/images/" + category + "/" + fileName;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store image");
        }
    }

    private String uploadToCloudinary(MultipartFile image, String category) {
        String folder = cloudinaryFolderRoot + "/" + category;
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    image.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "image",
                            "overwrite", false,
                            "unique_filename", true
                    )
            );
            Object secureUrl = result.get("secure_url");
            if (secureUrl == null || secureUrl.toString().isBlank()) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Cloudinary upload did not return a URL");
            }
            return secureUrl.toString();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to upload image");
        }
    }

    private void deleteLocalImage(String imagePath) {
        if (!imagePath.startsWith("/api/v1/images/")) {
            return;
        }
        String relative = imagePath.substring("/api/v1/images/".length());
        Path target = rootPath.resolve(relative).normalize();
        if (!target.startsWith(rootPath)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ex) {
            log.warn("Failed to delete local image: {}", imagePath);
        }
    }

    private void deleteCloudinaryImageByUrl(String imageUrl) {
        if (!cloudinaryEnabled || cloudinary == null) {
            return;
        }
        String publicId = extractCloudinaryPublicId(imageUrl);
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image", "invalidate", true));
        } catch (IOException ex) {
            log.warn("Failed to delete Cloudinary image: {}", imageUrl);
        }
    }

    private String extractCloudinaryPublicId(String imageUrl) {
        String normalized = imageUrl;
        int queryIndex = normalized.indexOf('?');
        if (queryIndex >= 0) {
            normalized = normalized.substring(0, queryIndex);
        }
        String marker = "/upload/";
        int markerIndex = normalized.indexOf(marker);
        if (markerIndex < 0) {
            return null;
        }
        String tail = normalized.substring(markerIndex + marker.length());
        if (tail.isBlank()) {
            return null;
        }

        String[] segments = tail.split("/");
        int start = 0;
        if (segments.length > 0 && segments[0].matches("v\\d+")) {
            start = 1;
        }
        if (start >= segments.length) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        for (int i = start; i < segments.length; i++) {
            if (segments[i].isBlank()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append('/');
            }
            builder.append(segments[i]);
        }

        String withExtension = builder.toString();
        int extensionIndex = withExtension.lastIndexOf('.');
        if (extensionIndex > 0) {
            return withExtension.substring(0, extensionIndex);
        }
        return withExtension;
    }

    private boolean isCloudinaryUrl(String value) {
        return value != null && value.contains("res.cloudinary.com/");
    }

    private String sanitizeFolderRoot(String folderRoot) {
        if (folderRoot == null || folderRoot.isBlank()) {
            return "urbanbites";
        }
        String normalized = folderRoot.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized.isBlank() ? "urbanbites" : normalized;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void validateCategory(String category) {
        if (!ALLOWED_CATEGORIES.contains(category)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid image category");
        }
    }

    private String detectExtension(String originalFileName) {
        if (originalFileName == null || originalFileName.isBlank()) {
            return ".jpg";
        }
        int index = originalFileName.lastIndexOf('.');
        if (index < 0 || index >= originalFileName.length() - 1) {
            return ".jpg";
        }
        String ext = originalFileName.substring(index).toLowerCase(Locale.ROOT);
        return ext.length() <= 8 ? ext : ".jpg";
    }
}


