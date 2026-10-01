"use client";

import { useEffect, useState } from "react";

type Ticket = {
    id: number;
    subject: string;
    description: string;
    status: string;
    priority: string;
    category: string | null;
    sentiment: string | null;
    suggestedResponse: string | null;
    knowledgeSources: string | null;
    aiProcessing?: boolean;
};

export default function Home() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [customerId, setCustomerId] = useState("1");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [createMessage, setCreateMessage] = useState("");
    const [updating, setUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState("");
    const [updatePriority, setUpdatePriority] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [priorityFilter, setPriorityFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, priorityFilter]);

    useEffect(() => {
        fetch("http://localhost:8080/api/tickets")
            .then((response) => response.json())
            .then((data) => {
                setTickets(data);
                setSelectedTicket(data[0] ?? null);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Failed to fetch tickets:", error);
                setLoading(false);
            });
    }, []);

    const createTicket = async () => {
        if (!subject.trim() || !description.trim()) {
            setCreateMessage("Subject and description are required.");
            return;
        }

        setCreateMessage("");

        setCreating(true);

        try {
            const response = await fetch(
                "http://localhost:8080/api/tickets",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        customerId: Number(customerId),
                        subject,
                        description,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create ticket");
            }

            const newTicket = await response.json();

            setSubject("");
            setDescription("");

            // Show the newly created ticket immediately
            newTicket.aiProcessing = true;
            setSelectedTicket(newTicket);

            // Give Kafka + AI time to process the ticket
            const pollForAiResult = async (attempt = 1) => {
                try {
                    const updatedResponse = await fetch(
                        `http://localhost:8080/api/tickets/${newTicket.id}`
                    );

                    if (!updatedResponse.ok) {
                        throw new Error("Failed to fetch updated ticket");
                    }

                    const updatedTicket = await updatedResponse.json();

                    updatedTicket.aiProcessing = !(
                        updatedTicket.category &&
                        updatedTicket.suggestedResponse
                    );

                    setTickets((currentTickets) =>
                        currentTickets.map((ticket) =>
                            ticket.id === updatedTicket.id
                                ? updatedTicket
                                : ticket
                        )
                    );

                    setSelectedTicket(updatedTicket);

                    // AI processing is complete
                    if (
                        updatedTicket.category &&
                        updatedTicket.suggestedResponse
                    ) {
                        return;
                    }

                    // Try again every second, up to 10 attempts
                    if (attempt < 10) {
                        setTimeout(() => {
                            pollForAiResult(attempt + 1);
                        }, 1000);
                    }
                } catch (error) {
                    console.error(
                        "Failed to refresh ticket:",
                        error
                    );
                }
            };

            pollForAiResult();

            // Add the new ticket to the list
            setTickets((currentTickets) => [
                ...currentTickets,
                newTicket,
            ]);

        } catch (error) {
            console.error("Failed to create ticket:", error);
        } finally {
            setCreating(false);
        }
    };

    const updateTicket = async () => {
        if (!selectedTicket) {
            return;
        }

        setUpdating(true);

        try {
            const response = await fetch(
                `http://localhost:8080/api/tickets/${selectedTicket.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        status: updateStatus || selectedTicket.status,
                        priority: updatePriority || selectedTicket.priority,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update ticket");
            }

            const updatedTicket = await response.json();

            setTickets((currentTickets) =>
                currentTickets.map((ticket) =>
                    ticket.id === updatedTicket.id
                        ? updatedTicket
                        : ticket
                )
            );

            setSelectedTicket(updatedTicket);
        } catch (error) {
            console.error("Failed to update ticket:", error);
        } finally {
            setUpdating(false);
        }
    };

    const filteredTickets = tickets.filter((ticket) =>
        (statusFilter === "ALL" || ticket.status === statusFilter) &&
        (priorityFilter === "ALL" || ticket.priority === priorityFilter) &&
        (
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const ticketsPerPage = 10;

    const totalPages = Math.ceil(
        filteredTickets.length / ticketsPerPage
    );

    const startIndex = (currentPage - 1) * ticketsPerPage;

    const paginatedTickets = filteredTickets.slice(
        startIndex,
        startIndex + ticketsPerPage
    );

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-100 p-8">
                <p className="text-gray-600">Loading tickets...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold text-gray-900">
                Customer Support Dashboard
            </h1>

            <p className="mt-2 text-gray-600">
                Manage customer tickets and AI-powered support insights.
            </p>

            <div
                className="mt-8"
                style={{
                    display: "flex",
                    gap: "24px",
                    alignItems: "flex-start",
                }}
            >
                {/* Ticket List */}
                <section
                    style={{
                        width: "320px",
                        flexShrink: 0,
                    }}
                >
                    <div className="mt-4 rounded-lg bg-white p-4 shadow">
                        <h3 className="font-semibold text-gray-900">
                            Create Ticket
                        </h3>

                        <input
                            type="text"
                            placeholder="Subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />

                        <textarea
                            placeholder="Describe the customer's issue..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />

                        <button
                            onClick={createTicket}
                            disabled={creating}
                            className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {creating ? "Creating..." : "Create Ticket"}
                        </button>
                        {createMessage && (
                            <p className="mt-2 text-sm text-red-600">
                                {createMessage}
                            </p>
                        )}
                    </div>

                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="ALL">All Priorities</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                    </select>

                    <div
                        className="mt-4 flex flex-col gap-3 overflow-y-auto"
                        style={{ maxHeight: "600px" }}
                    >
                        {paginatedTickets.map((ticket) => (
                            <button
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={`block w-full rounded-lg p-4 text-left shadow ${
                                    selectedTicket?.id === ticket.id
                                        ? "bg-blue-50 ring-2 ring-blue-500"
                                        : "bg-white hover:bg-gray-50"
                                }`}
                            >
                                <h3 className="font-semibold text-gray-900">
                                    #{ticket.id} {ticket.subject}
                                </h3>

                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                                        {ticket.status}
                                    </span>

                                    <span
                                        className={`rounded-full px-2 py-1 font-medium ${
                                            ticket.priority === "URGENT"
                                                ? "bg-red-100 text-red-700"
                                                : ticket.priority === "HIGH"
                                                    ? "bg-orange-100 text-orange-700"
                                                    : ticket.priority === "MEDIUM"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-green-100 text-green-700"
                                        }`}
                                    >
                                        {ticket.priority}
                                    </span>

                                    {ticket.category && (
                                        <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700">
                                            {ticket.category}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage((page) => page - 1)}
                            disabled={currentPage === 1}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:opacity-50"
                        >
                            Previous
                        </button>

                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages || 1}
                        </span>

                        <button
                            onClick={() => setCurrentPage((page) => page + 1)}
                            disabled={currentPage >= totalPages}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </section>

                {/* Ticket Details */}
                <section
                    style={{
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {selectedTicket ? (
                        <div className="rounded-lg bg-white p-6 shadow">
                            <h2 className="text-2xl font-bold text-gray-900">
                                #{selectedTicket.id} {selectedTicket.subject}
                            </h2>

                            <p className="mt-4 text-gray-900">
                                {selectedTicket.description}
                            </p>

                            <div className="mt-6 flex flex-wrap gap-2 text-sm">
                              <span
                                  className={`rounded-full px-3 py-1 font-medium ${
                                      selectedTicket.status === "IN_PROGRESS"
                                          ? "bg-blue-100 text-blue-700"
                                          : selectedTicket.status === "RESOLVED"
                                              ? "bg-green-100 text-green-700"
                                              : selectedTicket.status === "CLOSED"
                                                  ? "bg-gray-200 text-gray-700"
                                                  : "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                {selectedTicket.status}
                              </span>

                                <span
                                    className={`rounded-full px-3 py-1 font-medium ${
                                        selectedTicket.priority === "URGENT"
                                            ? "bg-red-100 text-red-700"
                                            : selectedTicket.priority === "HIGH"
                                                ? "bg-orange-100 text-orange-700"
                                                : selectedTicket.priority === "MEDIUM"
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-green-100 text-green-700"
                                    }`}
                                >
                                    {selectedTicket.priority}
                                </span>

                                <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                                    {selectedTicket.category ?? "Pending"}
                                </span>

                                <span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700">
                                    {selectedTicket.sentiment ?? "Pending"}
                                </span>
                            </div>

                            <div className="mt-6 rounded-lg border border-gray-200 p-4">
                                <h3 className="font-semibold text-gray-900">
                                    Update Ticket
                                </h3>

                                <div className="mt-3 flex items-center gap-3">
                                    <select
                                        value={updateStatus || selectedTicket.status}
                                        onChange={(e) => setUpdateStatus(e.target.value)}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                    >
                                        <option value="OPEN">OPEN</option>
                                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                                        <option value="RESOLVED">RESOLVED</option>
                                        <option value="CLOSED">CLOSED</option>
                                    </select>

                                    <select
                                        value={updatePriority || selectedTicket.priority}
                                        onChange={(e) => setUpdatePriority(e.target.value)}
                                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                                    >
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="URGENT">URGENT</option>
                                    </select>

                                    <button
                                        onClick={updateTicket}
                                        disabled={updating}
                                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {updating ? "Updating..." : "Update Ticket"}
                                    </button>
                                </div>
                            </div>

                            {selectedTicket.aiProcessing && (
                                <div className="mt-5 rounded-lg bg-yellow-50 p-4">
                                    <p className="text-sm font-medium text-yellow-800">
                                        AI analysis is still processing...
                                    </p>
                                </div>
                            )}

                            {selectedTicket.suggestedResponse && (
                                <div className="mt-8 rounded-lg bg-blue-50 p-5">
                                    <h3 className="font-semibold text-gray-900">
                                        AI Suggested Response
                                    </h3>

                                    <p className="mt-2 text-gray-900">
                                        {selectedTicket.suggestedResponse}
                                    </p>
                                </div>
                            )}

                            {selectedTicket.knowledgeSources && (
                                <div className="mt-5">
                                    <h3 className="font-semibold text-gray-900">
                                        Knowledge Sources
                                    </h3>

                                    <p className="mt-2 text-sm text-gray-600">
                                        {selectedTicket.knowledgeSources}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-white p-6 shadow">
                            <p className="text-gray-600">
                                Select a ticket to view its details.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}