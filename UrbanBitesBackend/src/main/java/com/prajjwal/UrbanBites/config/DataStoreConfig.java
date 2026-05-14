package com.prajjwal.UrbanBites.config;

import org.springframework.context.annotation.ComponentScan.Filter;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableJpaRepositories(
    basePackages = "com.prajjwal.UrbanBites.repository",
    excludeFilters = @Filter(type = FilterType.ASSIGNABLE_TYPE, classes = MongoRepository.class)
)
@EnableMongoRepositories(
    basePackages = "com.prajjwal.UrbanBites.repository",
    excludeFilters = @Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JpaRepository.class)
)
public class DataStoreConfig {
}
