package com.prajjwal.UrbanBites.security;

import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class OtpVerificationAccessFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_EXACT_PATHS = Set.of(
            "/api/v1/auth/email-verification/request-otp",
            "/api/v1/auth/email-verification/verify-otp",
            "/api/v1/users/me/phone/request-otp",
            "/api/v1/users/me/phone/verify-otp",
            "/api/v1/auth/logout",
            "/api/v1/auth/refresh"
    );

    private final UserRepository userRepository;

    public OtpVerificationAccessFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String normalizedPath = normalizePath(request);
        if (HttpMethod.OPTIONS.matches(request.getMethod()) || isAllowedWithoutVerification(normalizedPath)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        String email = authentication.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || isOtpVerifiedForAccess(user)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"OTP verification required before accessing this resource\"}");
    }

    private boolean isAllowedWithoutVerification(String path) {
        if (ALLOWED_EXACT_PATHS.contains(path)) {
            return true;
        }
        return ALLOWED_EXACT_PATHS.stream().anyMatch(allowed -> path.startsWith(allowed + "/"));
    }

    private String normalizePath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        if (requestUri == null || requestUri.isBlank()) {
            requestUri = request.getServletPath();
        }

        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isBlank() && requestUri.startsWith(contextPath)) {
            return requestUri.substring(contextPath.length());
        }
        return requestUri;
    }

    private boolean isOtpVerifiedForAccess(User user) {
        if (user.getPhone() != null && !user.getPhone().isBlank()) {
            return user.isPhoneVerified();
        }
        return user.isEmailVerified();
    }
}


