package com.prajjwal.UrbanBites.util;

import com.prajjwal.UrbanBites.dto.response.UserProfileResponse;
import com.prajjwal.UrbanBites.entity.User;

public final class AuthMapper {

    private AuthMapper() {
    }

    public static UserProfileResponse toProfile(User user) {
        return toProfile(user, false, false);
    }

    public static UserProfileResponse toProfile(User user, boolean online, boolean available) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getPhone(),
                user.getGender(),
                user.getProfilePictureUrl(),
                user.isPhoneVerified(),
                user.isEmailVerified(),
                user.getApprovalStatus(),
                online,
                available
        );
    }
}

