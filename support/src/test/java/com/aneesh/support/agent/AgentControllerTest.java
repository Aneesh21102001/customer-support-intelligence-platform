package com.aneesh.support.agent;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AgentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateAgent() throws Exception {
        String email = "agent-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(
                        post("/api/agents")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                    "name": "Test Agent",
                                    "email": "%s"
                                }
                                """.formatted(email))
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Agent"))
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void shouldRejectAgentWithMissingFields() throws Exception {
        mockMvc.perform(
                        post("/api/agents")
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
    void shouldRejectAgentWithInvalidEmail() throws Exception {
        mockMvc.perform(
                        post("/api/agents")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "Invalid Email Agent",
                                "email": "not-an-email"
                            }
                            """)
                )
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {
        String email = "duplicate-agent-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(
                        post("/api/agents")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "First Agent",
                                "email": "%s"
                            }
                            """.formatted(email))
                )
                .andExpect(status().isCreated());

        mockMvc.perform(
                        post("/api/agents")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "Second Agent",
                                "email": "%s"
                            }
                            """.formatted(email))
                )
                .andExpect(status().isConflict());
    }

    @Test
    void shouldGetAgents() throws Exception {
        String email = "get-agent-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(
                        post("/api/agents")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "name": "Get Test Agent",
                                "email": "%s"
                            }
                            """.formatted(email))
                )
                .andExpect(status().isCreated());

        mockMvc.perform(
                        get("/api/agents")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.email == '%s')]".formatted(email)).exists());
    }
}
