from unittest.mock import patch, MagicMock

from app import rag


def test_chunk_text_splits_long_text():
    text = " ".join(f"word{i}" for i in range(11))

    chunks = rag.chunk_text(text, chunk_size=5)

    assert len(chunks) == 3
    assert len(chunks[0].split()) == 5
    assert len(chunks[1].split()) == 5
    assert len(chunks[2].split()) == 1


def test_chunk_text_empty_input():
    assert rag.chunk_text("") == []



def test_load_documents_reads_markdown_files():
    mock_file = MagicMock()
    mock_file.name = "account-access.md"
    mock_file.read_text.return_value = "Password reset help"

    with patch.object(
            rag,
            "KNOWLEDGE_BASE_DIR"
    ) as mock_dir:
        mock_dir.glob.return_value = [mock_file]

        documents = rag.load_documents()

    assert documents == [
        {
            "source": "account-access.md",
            "content": "Password reset help",
        }
    ]

    mock_file.read_text.assert_called_once_with(encoding="utf-8")



def test_search_knowledge_filters_distances_over_one():
    fake_results = {
        "documents": [["relevant answer", "weak answer"]],
        "metadatas": [[
            {"source": "account-access.md"},
            {"source": "refund-policy.md"},
        ]],
        "distances": [[0.4, 1.2]],
    }

    with patch.object(rag.collection, "query", return_value=fake_results):
        results = rag.search_knowledge("reset password")

    assert results["documents"][0] == ["relevant answer"]
    assert results["metadatas"][0] == [
        {"source": "account-access.md"}
    ]
    assert results["distances"][0] == [0.4]


def test_build_rag_context_includes_source_and_document():
    results = {
        "documents": [["Use the password reset link."]],
        "metadatas": [[{"source": "account-access.md"}]],
    }

    context = rag.build_rag_context(results)

    assert "Source: account-access.md" in context
    assert "Use the password reset link." in context


def test_get_knowledge_sources_removes_duplicates():
    results = {
        "metadatas": [[
            {"source": "account-access.md"},
            {"source": "payment-troubleshooting.md"},
            {"source": "account-access.md"},
        ]]
    }

    assert rag.get_knowledge_sources(results) == [
        "account-access.md",
        "payment-troubleshooting.md",
    ]
