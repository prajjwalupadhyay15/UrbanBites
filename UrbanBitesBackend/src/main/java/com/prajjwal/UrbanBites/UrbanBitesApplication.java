package com.prajjwal.UrbanBites;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class UrbanBitesApplication {

	public static void main(String[] args) {
		SpringApplication.run(UrbanBitesApplication.class, args);
	}

}
