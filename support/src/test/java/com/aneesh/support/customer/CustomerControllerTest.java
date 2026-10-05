package com.aneesh.support.customer;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateCustomer() throws Exception {

        String email = "integration-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(
                        post("/api/customers")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                    "name": "Test Customer",
                                    "email": "%s"
                                }
                                """.formatted(email))
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Customer"))
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void shouldRejectCustomerWithMissingFields() throws Exception {

        mockMvc.perform(
                        post("/api/customers")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "",
                                "email": ""
                            }
                            """)
                )
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {

        String email = "duplicate-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(
                        post("/api/customers")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "First Customer",
                                "email": "%s"
                            }
                            """.formatted(email))
                )
                .andExpect(status().isCreated());

        mockMvc.perform(
                        post("/api/customers")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "Second Customer",
                                "email": "%s"
                            }
                            """.formatted(email))
                )
                .andExpect(status().isConflict());
    }

    @Test
    void shouldGetCustomers() throws Exception {

        String email = "get-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(
                        post("/api/customers")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "Get Test Customer",
                                "email": "%s"
                            }
                            """.formatted(email))
                )
                .andExpect(status().isCreated());

        mockMvc.perform(
                        get("/api/customers")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.email == '%s')]".formatted(email)).exists());
    }
}