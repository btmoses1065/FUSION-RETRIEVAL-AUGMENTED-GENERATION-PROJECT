# Fusion RAG Chatbot

A polished FastAPI + static frontend app that upgrades basic RAG with:

- multi-query Fusion RAG retrieval
- reciprocal-rank fusion across lexical and semantic search
- grounded answering that refuses weak context instead of guessing
- citations for retrieved chunks
- upload support for PDF, DOCX, DOC, PPTX, XLSX, XLS, CSV, TSV, TXT, MD, JSON, HTML, and XML
- chat export to PDF or CSV

## How it reduces hallucinations

Instead of retrieving with only the original user query, this app expands the question into multiple retrieval queries, runs both sparse and semantic search, and fuses the result rankings. That makes recall stronger and lowers the chance that the answer is built from a narrow or partially relevant context window.

It also uses a grounded-answer prompt that tells the model to stay inside the retrieved evidence and explicitly say when the evidence is not enough.

## Run locally

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Create a `.env` file in the project root and add your Groq key there, or export the variables in your shell.

3. Start the app:

```bash
uvicorn app.main:app --reload
```

You can also run:

```bash
python app/main.py
```

4. Open `http://127.0.0.1:8000`

## Notes

- If `GROQ_API_KEY` is set, the app uses `langchain-groq` for query expansion and grounded answer generation.
- Dense retrieval still works locally through `sentence-transformers`, and if no Groq key is set the app falls back to extractive grounded excerpts.
- `.doc` parsing depends on optional `textract` support and matching system binaries. Modern `.docx` files work out of the box.
