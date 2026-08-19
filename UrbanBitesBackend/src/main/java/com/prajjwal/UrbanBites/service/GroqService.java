package com.prajjwal.UrbanBites.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GroqService {

    @Value("${groq.api.key:YOUR_API_KEY_HERE}")
    private String apiKey;

    private final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private final String MODEL = "llama-3.3-70b-versatile"; // We can use qwen/qwen3.6-27b if image is present

    private final RestTemplate restTemplate;

    public GroqService() {
        this.restTemplate = new RestTemplate();
    }

    public String generateContent(String prompt) {
        return generateContent(prompt, null);
    }

    public String generateContent(String prompt, String imageUrl) {
        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("YOUR_API_KEY_HERE")) {
            return "{\"reply\": \"I'm sorry, my AI backend is not configured with a Groq API key yet.\"}";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        // Use vision model if image is present, otherwise standard fast model
        requestBody.put("model", (imageUrl != null && !imageUrl.isEmpty()) ? "qwen/qwen3.6-27b" : MODEL);

        List<Map<String, Object>> messages = new ArrayList<>();
        Map<String, Object> userMessage = new HashMap<>();
        userMessage.put("role", "user");

        if (imageUrl != null && !imageUrl.isEmpty()) {
            List<Map<String, Object>> contentList = new ArrayList<>();
            Map<String, Object> textContent = new HashMap<>();
            textContent.put("type", "text");
            textContent.put("text", prompt);
            contentList.add(textContent);

            try {
                byte[] imageBytes = restTemplate.getForObject(imageUrl, byte[].class);
                if (imageBytes != null) {
                    String base64Image = Base64.getEncoder().encodeToString(imageBytes);
                    Map<String, Object> imageContent = new HashMap<>();
                    imageContent.put("type", "image_url");
                    Map<String, Object> imageUrlMap = new HashMap<>();
                    imageUrlMap.put("url", "data:image/jpeg;base64," + base64Image);
                    imageContent.put("image_url", imageUrlMap);
                    contentList.add(imageContent);
                }
            } catch (Exception e) {
                System.err.println("Failed to fetch image for Groq: " + e.getMessage());
            }
            userMessage.put("content", contentList);
        } else {
            userMessage.put("content", prompt);
        }

        messages.add(userMessage);
        requestBody.put("messages", messages);
        requestBody.put("response_format", Map.of("type", "json_object"));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            URI uri = URI.create(GROQ_API_URL);
            ResponseEntity<Map> response = restTemplate.postForEntity(uri, request, Map.class);
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            System.err.println("Groq API Error: " + e.getResponseBodyAsString());
            return "{\"reply\": \"I'm currently unable to connect to my Groq brain. Please check your API key.\"}";
        } catch (Exception e) {
            System.err.println("Unexpected error calling Groq API: " + e.getMessage());
            return "{\"reply\": \"Sorry, I encountered an error while processing your request.\"}";
        }

        return "{\"reply\": \"I could not generate a response.\"}";
    }
}
