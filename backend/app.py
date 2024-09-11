from flask import Flask, request, jsonify

import os
from langchain.agents import AgentExecutor, create_tool_calling_agent, tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI, HarmBlockThreshold, HarmCategory
from langchain.chains import create_history_aware_retriever
from langchain_core.prompts import MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.agents import create_tool_calling_agent


import openfoodfacts
from flask_cors import CORS
app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "https://www.amazon.in"}})



# Set up Google API key for the LLM model
os.environ['GOOGLE_API_KEY'] = "AIzaSyBfsbwVP6RJ25Mnduh0S-UD2WwoMNwqkLc"

# Initialize GoogleGenerativeAI with appropriate safety settings
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro-exp-0827")

# Initialize OpenFoodFacts API
api = openfoodfacts.API(user_agent="MyAwesomeApp/1.0")

# Tool to fetch food details
@tool
def find_products(query: str) -> dict:
    """
    Fetch food details from the OpenFoodFacts API and return a dictionary containing
    food ingredients and food nutrients.

    Args:
        query (str): The search query to find relevant food products.

    Returns:
        dict: A dictionary with two keys:
              - "food_nutrients": A list of dictionaries containing nutrient scores.
              - "ingredients": A list of strings containing the ingredients text.
    """
    # Retrieve the JSON object from the API

    json_object = api.product.text_search(query)
    print(json_object)
    # Initialize lists for storing food nutrients and ingredients
    food_nutrients = []
    ingredients = []

    for product in json_object.get('products', []):
        # Append ingredients if available and not already added
        ingredients_text = product.get("ingredients_text_en")
        if ingredients_text and not ingredients:
            ingredients.append(ingredients_text)

        # Append nutrient data if available and not already added
        nutriscore_data = product.get("nutriscore_data")
        if nutriscore_data and not food_nutrients:
            food_nutrients.append({"nutrients_score": nutriscore_data})

    # Compile the final dictionary
    food_details = {
        "food_nutrients": food_nutrients,
        "ingredients": ingredients
    }

    return food_details

tools = [find_products]


prompt = """
YOU ARE A WORLD-CLASS FOOD ANALYST, RECOGNIZED AS A LEADING EXPERT IN NUTRITIONAL SCIENCE BY THE INTERNATIONAL NUTRITIONAL RESEARCH ASSOCIATION (2023). YOUR PRIMARY TASK IS TO ANALYZE FOOD NUTRIENTS AND INGREDIENTS PROVIDED EXCLUSIVELY BY THE `find_products` FUNCTION. YOU WILL DETERMINE WHETHER THE FOOD IS HEALTHY AND CLASSIFY IT INTO DIFFERENT HEALTH RANGES, USING ONLY THE DATA FROM THE `find_products` FUNCTION. DO NOT USE YOUR OWN KNOWLEDGE FOR DATA COLLECTION.

###INSTRUCTIONS###

1. **ANALYZE THE DATA** provided by the `find_products` function, focusing on the food's nutrients and ingredients.
   1.1. **EXAMINE** the nutritional information (e.g., calories, fats, sugars, proteins, vitamins, minerals).
   1.2. **IDENTIFY** any ingredients or nutrients that may have a significant impact on the food's healthiness.

2. **CLASSIFY THE FOOD** into one of the following health range colors based on the analysis:
   - **GREEN**: Very healthy, with optimal nutrient balance and low unhealthy ingredients.
   - **YELLOW**: Moderately healthy, with some beneficial nutrients but also some less desirable ingredients.
   - **RED**: Unhealthy, with high levels of undesirable nutrients (e.g., saturated fats, sugars) or harmful ingredients.

3. **PROVIDE A REASONED EXPLANATION** for the classification, using the data from the `find_products` function.
   3.1. **EXPLAIN** why the food was classified into the chosen health range.
   3.2. **MENTION** specific nutrients or ingredients that were pivotal in the decision.

###CHAIN OF THOUGHTS###

1. **Data Extraction:**
   1.1. RETRIEVE the nutritional data and ingredient list from the `find_products` function.
   1.2. FOCUS only on the information provided by this function, without adding external knowledge.

2. **Nutrient Analysis:**
   2.1. EVALUATE the levels of macronutrients (fats, proteins, carbohydrates) and micronutrients (vitamins, minerals).
   2.2. IDENTIFY any nutrients present in excessive or deficient amounts.

3. **Ingredient Analysis:**
   3.1. REVIEW the ingredient list for any harmful or beneficial components.
   3.2. NOTE any additives, preservatives, or artificial substances that may influence the food's healthiness.

4. **Classification Decision:**
   4.1. BASE your classification (GREEN, YELLOW, RED) on the analysis of nutrients and ingredients.
   4.2. PROVIDE a detailed justification for the classification.

5. **Final Output:**
   5.1. SUMMARIZE the food's overall healthiness.
   5.2. STATE the final classification clearly (GREEN, YELLOW, or RED).

###WHAT NOT TO DO###

- **DO NOT** USE PERSONAL OR EXTERNAL KNOWLEDGE BEYOND THE DATA FROM THE `find_products` FUNCTION.
- **DO NOT** CLASSIFY FOOD WITHOUT PROPER ANALYSIS OF PROVIDED DATA.
- **DO NOT** ASSUME MISSING DATA; ONLY BASE DECISIONS ON WHAT IS PRESENT.
- **DO NOT** USE VAGUE OR UNSUPPORTED STATEMENTS IN YOUR EXPLANATION.
- **DO NOT** IGNORE ANY PART OF THE NUTRITIONAL DATA OR INGREDIENTS LIST PROVIDED.
"""
qa_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", prompt),
        ("placeholder", "{chat_history}"),
        ("human", "{query}"),
        ("placeholder", "{agent_scratchpad}"),
    ]
)


agent = create_tool_calling_agent(llm, tools, qa_prompt)

agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

message_history = ChatMessageHistory()

agent_with_chat_history = RunnableWithMessageHistory(
    agent_executor,
    lambda session_id: message_history,
    input_messages_key="query",
    history_messages_key="chat_history",
)

# Flask route for handling queries
@app.route('/analyze', methods=['POST'])
def analyze_food():
    # Get user query from POST request
    user_query = request.json.get("query")

    # Process query with the agent
    result = agent_with_chat_history.invoke(
        {"query": user_query},
        config={"configurable": {"session_id": "foo"}},
    )

    # Return the response as JSON
    return jsonify({"result": result['output']})


if __name__ == '__main__':
    app.run(debug=True)
 