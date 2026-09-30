package com.aneesh.support.ai;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class AiServiceClient {

    private final WebClient webClient;

    public AiServiceClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("http://localhost:8000")
                .build();
    }

    public String analyzeTicket(String subject, String description) {

        return webClient.post()
                .uri("/analyze-ticket")
                .bodyValue(new TicketRequest(subject, description))
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }

    private record TicketRequest(
            String subject,
            String description
    ) {
    }
}