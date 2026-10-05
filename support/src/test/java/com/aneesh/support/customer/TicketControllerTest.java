package com.aneesh.support.customer;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.aneesh.support.agent.Agent;
import com.aneesh.support.agent.AgentRepository;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TicketControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Test
    void shouldCreateTicket() throws Exception {

        String email = "ticket-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Ticket Test Customer", email)
        );

        mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                    "customerId": %d,
                                    "subject": "Payment failed",
                                    "description": "Customer payment is failing during checkout"
                                }
                                """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subject").value("Payment failed"))
                .andExpect(jsonPath("$.description")
                        .value("Customer payment is failing during checkout"))
                .andExpect(jsonPath("$.customer.id").value(customer.getId()));
    }

    @Test
    void shouldRejectTicketForUnknownCustomer() throws Exception {

        mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": 999999999,
                                "subject": "Payment failed",
                                "description": "Customer payment is failing during checkout"
                            }
                            """)
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldGetTicketById() throws Exception {

        String email = "ticket-get-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Ticket Get Customer", email)
        );

        String response = mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "Login issue",
                                "description": "Customer cannot log in"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long ticketId = com.fasterxml.jackson.databind.json.JsonMapper
                .builder()
                .build()
                .readTree(response)
                .get("id")
                .asLong();

        mockMvc.perform(
                        get("/api/tickets/" + ticketId)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ticketId))
                .andExpect(jsonPath("$.subject").value("Login issue"))
                .andExpect(jsonPath("$.description").value("Customer cannot log in"))
                .andExpect(jsonPath("$.customer.id").value(customer.getId()));
    }

    @Test
    void shouldReturnNotFoundForUnknownTicket() throws Exception {

        mockMvc.perform(
                        get("/api/tickets/999999999")
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldGetTickets() throws Exception {

        String email = "ticket-list-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Ticket List Customer", email)
        );

        mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "List test ticket",
                                "description": "Testing ticket listing"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated());

        mockMvc.perform(
                        get("/api/tickets")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void shouldUpdateTicket() throws Exception {

        String email = "ticket-update-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Ticket Update Customer", email)
        );

        String response = mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "Original subject",
                                "description": "Original description"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long ticketId = com.fasterxml.jackson.databind.json.JsonMapper
                .builder()
                .build()
                .readTree(response)
                .get("id")
                .asLong();

        mockMvc.perform(
                        patch("/api/tickets/" + ticketId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "status": "IN_PROGRESS",
                                "priority": "HIGH",
                                "subject": "Updated subject",
                                "description": "Updated description"
                            }
                            """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.subject").value("Updated subject"))
                .andExpect(jsonPath("$.description").value("Updated description"));
    }

    @Test
    void shouldReturnNotFoundWhenUpdatingUnknownTicket() throws Exception {

        mockMvc.perform(
                        patch("/api/tickets/999999999")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "status": "IN_PROGRESS",
                                "priority": "HIGH"
                            }
                            """)
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldGetTicketActivity() throws Exception {

        String email = "ticket-activity-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Ticket Activity Customer", email)
        );

        String response = mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "Activity test",
                                "description": "Testing ticket activity"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long ticketId = com.fasterxml.jackson.databind.json.JsonMapper
                .builder()
                .build()
                .readTree(response)
                .get("id")
                .asLong();

        mockMvc.perform(
                        get("/api/tickets/" + ticketId + "/activity")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].activityType").value("TICKET_CREATED"))
                .andExpect(jsonPath("$[0].description").value("Ticket created"));
    }

    @Test
    void shouldReturnNotFoundForUnknownTicketActivity() throws Exception {

        mockMvc.perform(
                        get("/api/tickets/999999999/activity")
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldAssignAgentToTicket() throws Exception {

        String customerEmail = "ticket-agent-" + UUID.randomUUID() + "@example.com";
        String agentEmail = "agent-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Assignment Customer", customerEmail)
        );

        Agent agent = agentRepository.save(
                new Agent("Test Agent", agentEmail)
        );

        String response = mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "Agent assignment test",
                                "description": "Testing agent assignment"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long ticketId = com.fasterxml.jackson.databind.json.JsonMapper
                .builder()
                .build()
                .readTree(response)
                .get("id")
                .asLong();

        mockMvc.perform(
                        patch("/api/tickets/" + ticketId + "/agent/" + agent.getId())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agent.id").value(agent.getId()))
                .andExpect(jsonPath("$.agent.name").value("Test Agent"))
                .andExpect(jsonPath("$.agent.email").value(agentEmail));
    }

    @Test
    void shouldGetAssignmentHistory() throws Exception {

        String customerEmail = "history-" + UUID.randomUUID() + "@example.com";
        String agentEmail = "history-agent-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("History Customer", customerEmail)
        );

        Agent agent = agentRepository.save(
                new Agent("History Agent", agentEmail)
        );

        String response = mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "Assignment history test",
                                "description": "Testing assignment history"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long ticketId = com.fasterxml.jackson.databind.json.JsonMapper
                .builder()
                .build()
                .readTree(response)
                .get("id")
                .asLong();

        mockMvc.perform(
                        patch("/api/tickets/" + ticketId + "/agent/" + agent.getId())
                )
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/api/tickets/" + ticketId + "/assignment-history")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].agentId").value(agent.getId()))
                .andExpect(jsonPath("$[0].agentName").value("History Agent"))
                .andExpect(jsonPath("$[0].agentEmail").value(agentEmail));
    }

    @Test
    void shouldReturnNotFoundWhenAssigningUnknownAgent() throws Exception {

        String email = "unknown-agent-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Unknown Agent Customer", email)
        );

        String response = mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "Unknown agent test",
                                "description": "Testing unknown agent assignment"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long ticketId = com.fasterxml.jackson.databind.json.JsonMapper
                .builder()
                .build()
                .readTree(response)
                .get("id")
                .asLong();

        mockMvc.perform(
                        patch("/api/tickets/" + ticketId + "/agent/999999999")
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnNotFoundWhenAssigningAgentToUnknownTicket() throws Exception {

        mockMvc.perform(
                        patch("/api/tickets/999999999/agent/1")
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnNotFoundForUnknownTicketAssignmentHistory() throws Exception {

        mockMvc.perform(
                        get("/api/tickets/999999999/assignment-history")
                )
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldRetryAiAnalysis() throws Exception {

        String email = "retry-ai-" + UUID.randomUUID() + "@example.com";

        Customer customer = customerRepository.save(
                new Customer("Retry AI Customer", email)
        );

        String response = mockMvc.perform(
                        post("/api/tickets")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                            {
                                "customerId": %d,
                                "subject": "AI retry test",
                                "description": "Testing AI retry"
                            }
                            """.formatted(customer.getId()))
                )
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long ticketId = com.fasterxml.jackson.databind.json.JsonMapper
                .builder()
                .build()
                .readTree(response)
                .get("id")
                .asLong();

        mockMvc.perform(
                        post("/api/tickets/" + ticketId + "/retry-ai")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ticketId))
                .andExpect(jsonPath("$.subject").value("AI retry test"));

        mockMvc.perform(
                        get("/api/tickets/" + ticketId + "/activity")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.activityType == 'AI_RETRY')]").exists())
                .andExpect(jsonPath("$[?(@.description == 'AI analysis retry requested')]").exists());
    }
}