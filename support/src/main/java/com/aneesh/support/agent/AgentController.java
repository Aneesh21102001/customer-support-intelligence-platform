package com.aneesh.support.agent;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/agents")
public class AgentController {

    private final AgentRepository agentRepository;

    public AgentController(AgentRepository agentRepository) {
        this.agentRepository = agentRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Agent createAgent(
            @Valid @RequestBody CreateAgentRequest request) {

        Agent agent = new Agent(
                request.name(),
                request.email()
        );

        return agentRepository.save(agent);
    }

    @GetMapping
    public List<Agent> getAgents() {
        return agentRepository.findAll();
    }

    public record CreateAgentRequest(

            @NotBlank(message = "name is required")
            String name,

            @NotBlank(message = "email is required")
            @Email(message = "email must be valid")
            String email

    ) {}
}