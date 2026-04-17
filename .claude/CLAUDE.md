# Prelegal Project

## Overview

This is a Saas product to allow users to draft legal documents based on templates in the templates directory. The user can use AI chat in order to establish what document they want and how to fill the fields. The available documents are covered in the catalog.json file in the project folder, included here :

@catalog.json

Before we start: the initial implementation is a frontend-only prototype that only supports the Mutual NDA document with no AI chat.

## Development Process

When instructed to build a feature:
    1.Use your Atlassian tools to read the feature instructions in Jira.
    2. Develop the feature - do not skip any step from the feature-dev 7 step process.
    3. Thoroughly test the feature with unit tests and integration tests and fix any issues.
    4. Submit a PR using your github tools.

## AI Design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use the Structured Outputs so that you can interpret the results and populate fields in the legal document. 

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical Design

The entire project should be packaged into a Docker container. 
The backend should be in backend/ and be a uv project, using FastAPI. 
The frontend should be in frontend/.
The database should use SQLLite and be created from scratch each time the docker container is brought up allowing for a users table with sign up and sign in.
Consider statically building the frontend and serving it via FastAPI, if that will work. 
There should be scripts in scripts/ for:

    # Mac
    scripts/start-mac.sh  # start
    scripts/stop-mac.sh   # stop

    # Linux
    scripts/start-linux.sh 
    scripts/stop-linux.sh
    
    # Windows
    scripts/start-windows.sh
    scripts/stop-windows.sh

Backend available at http://localhost:8000

## Color Scheme 

- #D6F4ED- background
- #53629E
- #87BAC3
- #473472 - headings
- #A3B087 - submit button