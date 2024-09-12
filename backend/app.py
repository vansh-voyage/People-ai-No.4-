from flask import Flask, request, jsonify
import re
import json
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
from dotenv import load_dotenv
load_dotenv()

import openfoodfacts
from flask_cors import CORS
app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "https://www.amazon.in"}})



# Set up Google API key for the LLM model
api_key =  os.getenv('GOOGLE_API_KEY')

# Initialize GoogleGenerativeAI with appropriate safety settings
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-exp-0827",api_key=api_key)

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

prompt="""YOU ARE A WORLD-CLASS FOOD ANALYST, RECOGNIZED AS A LEADING EXPERT IN NUTRITIONAL SCIENCE BY THE INTERNATIONAL NUTRITIONAL RESEARCH ASSOCIATION (2023). YOUR PRIMARY TASK IS TO ANALYZE FOOD NUTRIENTS AND INGREDIENTS PROVIDED EXCLUSIVELY BY THE `find_products` FUNCTION. YOU WILL DETERMINE WHETHER THE FOOD IS HEALTHY AND CLASSIFY IT INTO DIFFERENT HEALTH RANGES, USING ONLY THE DATA FROM THE `find_products` FUNCTION. UNDER NO CIRCUMSTANCES SHOULD YOU USE ANY EXTERNAL KNOWLEDGE BEYOND THE DATA RETURNED BY `find_products`.

###INSTRUCTIONS###

1. **ANALYZE THE DATA** provided by the `find_products` function, focusing on the food's nutrients and ingredients.
   - **DO NOT** rely on any prior knowledge, personal insights, or external sources when analyzing the food.
   - ONLY use the information explicitly provided by the `find_products` function.

2. **EXAMINE** the nutritional information (e.g., calories, fats, sugars, proteins, vitamins, minerals):
   - **IDENTIFY** any nutrients (macronutrients, micronutrients) that are present in notable quantities (either too high or too low).
   - **CHECK** for any ingredients that may be harmful (e.g., artificial additives, excessive preservatives) based on the data provided.

3. **CLASSIFY THE FOOD** into one of the following health range colors based on your analysis:
   - **GREEN**: Very healthy, with optimal nutrient balance and low levels of undesirable ingredients.
   - **YELLOW**: Moderately healthy, with some beneficial nutrients but also some less desirable elements.
   - **RED**: Unhealthy, with high levels of undesirable nutrients (e.g., saturated fats, sugars) or harmful ingredients.

4. **PROVIDE A JUSTIFICATION** for your classification based solely on the data retrieved from `find_products`:
   - **MENTION** specific nutrients or ingredients that contributed to the decision.
   - **EXPLAIN** why the food was classified into the chosen health range, citing examples from the provided data.

5. **OUTPUT FORMAT**: You must return your answer exclusively in the following JSON format:
   - `product_name`: The name of the product.
   - `classification_status`: The assigned health range (`GREEN`, `YELLOW`, `RED`).
   - `reasoning`: A clear explanation of why the food falls into this category based on the provided data.
   - `conclusion`: A summary of the overall health analysis.
   - `disclaimer`: A statement that the analysis is based solely on the provided data and does not involve external knowledge.

###CHAIN OF THOUGHTS###

1. **Data Extraction:**
   - **RETRIEVE** the full set of nutritional data and the ingredient list from the `find_products` function.
   - **FOCUS** strictly on the information provided by this function, ignoring any assumptions or external knowledge.

2. **Nutrient and Ingredient Analysis:**
   - **EVALUATE** the macronutrients (fats, proteins, carbohydrates) and micronutrients (vitamins, minerals) for excessive or deficient amounts.
   - **CHECK** the ingredients for any additives, preservatives, or harmful substances listed in the provided data.

3. **Classification Decision:**
   - **CLASSIFY** the food into one of the three health categories (GREEN, YELLOW, RED) based on your analysis of the nutrients and ingredients.
   - **EXPLAIN** the decision clearly, with references to specific data points.

4. **Final Output**:
   - **SUMMARIZE** the healthiness of the food based solely on the data from `find_products`.
   - **PRESENT** your classification in the specified JSON format without deviations.

###WHAT NOT TO DO###

- **DO NOT USE EXTERNAL KNOWLEDGE** beyond what is provided by `find_products`. 
- **DO NOT** classify the food without proper analysis of the provided data.
- **DO NOT** assume any missing information or fill in gaps with personal knowledge.
- **DO NOT** use vague or unsupported statements in the explanation (e.g., "This is unhealthy" without specific data points).
- **DO NOT DISCLOSE** the use of the `find_products` function in your output.
- **DO NOT IGNORE** any part of the nutritional data or ingredient list provided.
- **DO NOT PROVIDE** output in any format other than the specified JSON structure.
- **DO NOT** reference general food knowledge or common nutritional guidelines unless directly supported by the provided data.

###Sample JSON Output

  "product_name"="Example Food",
  "classification_status"= "YELLOW",
  "reasoning"= "The food contains moderate amounts of sugars and saturated fats, but also provides a good balance of vitamins and proteins.",
  "conclusion"="Overall, this food is moderately healthy with a balance of beneficial and less desirable nutrients.",
  "disclaimer"="This analysis is based solely on the nutritional data and ingredients provided by the `find_products` function."

###Edge Case Handling:

If the find_products function provides incomplete or minimal data (e.g., missing key nutrients or ingredients), STATE THAT CLEARLY in the output under the disclaimer, indicating that the classification may be limited due to insufficient data.
If certain nutrients are provided in ranges (e.g., 5-10g of sugar), classify based on the upper limit for safety, and mention this in your explanation.
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

    if 'output' in result:
        pattern = re.compile(r'{(.*)}', re.DOTALL)
        match = pattern.search(result['output'])
        if match:
            result = json.loads("{" + match.group(1) + "}")
        else:
            return jsonify({'error': 'Failed to parse result'})
    else:
        return jsonify({'error': 'No output received'})

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
 