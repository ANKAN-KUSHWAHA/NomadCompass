# NomadCompass  — A Multi-Agent Travel Planner 

**Plan a trip in one prompt.** NomadCompass is an AI travel-planning web app that combines flight information, hotel research, and a day-by-day itinerary in one response.

It uses a LangGraph workflow behind a FastAPI service and a lightweight browser UI.

## What it does

- Accepts natural-language trip requests, including destination, origin, duration, and budget.
- Looks up live flight status data with AviationStack.
- Searches the web for hotel information with Tavily.
- Uses Groq to create a practical itinerary and a formatted final plan.
- Stores LangGraph conversation checkpoints in PostgreSQL.
- Provides copy and PDF download actions in the web interface.

> **Flight data note:** AviationStack supplies flight status information, not ticket prices. Flight results depend on your AviationStack plan and the data available for the requested route.

## How the app works

```mermaid
flowchart LR
    U[Trip request in browser] --> A[FastAPI]
    A --> F[Flight agent · AviationStack]
    F --> H[Hotel research · Tavily]
    H --> I[Itinerary agent · Groq]
    I --> R[Final response agent · Groq]
    R --> P[(PostgreSQL checkpoint)]
    R --> U
```

The LangGraph workflow runs the flight lookup, hotel search, itinerary generation, and final response in sequence.

## Technology

| Area | Technology |
| --- | --- |
| API and web server | FastAPI, Uvicorn |
| Agent workflow | LangGraph |
| Language model | Groq via LangChain Groq |
| Hotel research | Tavily |
| Flight status | AviationStack |
| Conversation persistence | PostgreSQL with LangGraph Postgres checkpointer |
| Frontend | HTML, CSS, JavaScript |

## Requirements

- Python 3.11 or newer
- A PostgreSQL database and its connection URL
- API keys for Groq, Tavily, and AviationStack

## Setup

1. Clone the repository and open a terminal in the project directory.

2. Create and activate a virtual environment:

   **Windows PowerShell**

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   **macOS / Linux**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install the pinned dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root with your credentials:

   ```dotenv
   GROQ_API_KEY=your_groq_api_key
   TAVILY_API_KEY=your_tavily_api_key
   AVIATIONSTACK_API_KEY=your_aviationstack_api_key
   DATABASE_URL=postgresql://username:password@host:5432/database
   DEFAULT_ORIGIN_IATA=DAC
   ```

   `DATABASE_URL` should be a PostgreSQL connection URL. The app adds `sslmode=require` if it is not already present. `DEFAULT_ORIGIN_IATA` is optional and defaults to `DAC` (Dhaka); set it to your preferred three-letter IATA airport code.

5. Ensure the Groq model configured in `backend.py` is active and available to your account. The previous `llama-3.3-70b-versatile` setting has been retired for free/developer use. Groq currently recommends `openai/gpt-oss-120b` as a replacement for this app's itinerary generation. To use it, set the `model` argument in `backend.py` to:

   ```python
   model="openai/gpt-oss-120b",
   ```

6. Start the app:

   ```bash
   python app.py
   ```

7. Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

The server runs with reload enabled for local development. The PostgreSQL checkpointer is initialized when the backend starts, so the database must be reachable at startup.

## Example requests

- `Plan a 7 day Japan trip from Dhaka under 2000 USD with hotels and sightseeing.`
- `Plan a 5 day Dubai trip from Delhi with flights, hotels, and sightseeing.`
- `Find live flights from DAC to DXB.`

For better flight matching, include both the departure and destination cities or countries. The app resolves common city and country names to airport codes; if only a destination is provided, it uses `DEFAULT_ORIGIN_IATA`.


## API Endpoints

- **GET `/health`** - Health check
- **POST `/api/travel`** - Submit a travel request

Example request:

```bash
curl -X POST http://127.0.0.1:8000/api/travel \
  -H "Content-Type: application/json" \
  -d '{"message":"Plan a 3-day trip to Tokyo with a budget of $1200"}'
```


## Project layout

```text
NomadCompass/
├── app.py                  # FastAPI application and HTTP endpoints
├── backend.py              # LangGraph workflow, Groq model, and PostgreSQL checkpointer
├── requirements.txt        # Pinned Python dependencies
├── static/
│   ├── script.js            # Browser interactions
│   └── style.css            # Page styling
├── templates/
│   └── index.html           # Main web page
└── tools/
    ├── flight_tool.py       # AviationStack lookup and route parsing
    └── tavily_tool.py       # Hotel research search
```