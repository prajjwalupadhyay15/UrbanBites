package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.service.ImageStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/images")
public class ImageController {

    private final ImageStorageService imageStorageService;

    public ImageController(ImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    @GetMapping("/{category}/{fileName:.+}")
    public ResponseEntity<Resource> getImage(@PathVariable String category, @PathVariable String fileName) {
        Resource resource = imageStorageService.loadImage(category, fileName);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}

